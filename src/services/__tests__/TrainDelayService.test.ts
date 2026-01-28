/**
 * TrainDelayService テスト
 * @module services/__tests__/TrainDelayService.test
 */

import {
  TrainDelayService,
  parseDelayStatus,
  extractDelayMinutes,
  getRailwayName,
  getOperatorName,
} from '../TrainDelayService';
import {
  TrainDelayInfo,
  DelayHistoryEntry,
  ODPTTrainInformationResponse,
  DELAY_STORAGE_KEY,
} from '../../types/trainDelay';

// fetchのモック
const mockFetch = jest.fn();
global.fetch = mockFetch;

// LocalStorageのモック
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: jest.fn((key: string) => store[key] || null),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: mockLocalStorage });

describe('TrainDelayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  describe('parseDelayStatus', () => {
    it('should return "normal" for normal operation text', () => {
      expect(parseDelayStatus('現在、平常どおり運転しています。')).toBe('normal');
      expect(parseDelayStatus('平常運転')).toBe('normal');
    });

    it('should return "delayed" for delay text', () => {
      expect(parseDelayStatus('人身事故の影響で約15分の遅れ')).toBe('delayed');
      expect(parseDelayStatus('遅延が発生しています')).toBe('delayed');
      expect(parseDelayStatus('約10分遅れ')).toBe('delayed');
    });

    it('should return "suspended" for suspended operation text', () => {
      expect(parseDelayStatus('運転を見合わせています')).toBe('suspended');
      expect(parseDelayStatus('運休')).toBe('suspended');
      expect(parseDelayStatus('運転見合わせ')).toBe('suspended');
    });

    it('should return "unknown" for unrecognized text', () => {
      expect(parseDelayStatus('')).toBe('unknown');
      expect(parseDelayStatus('その他の情報')).toBe('unknown');
    });
  });

  describe('extractDelayMinutes', () => {
    it('should extract delay minutes from text', () => {
      expect(extractDelayMinutes('約15分の遅れ')).toBe(15);
      expect(extractDelayMinutes('10分程度の遅延')).toBe(10);
      expect(extractDelayMinutes('最大30分の遅れが発生')).toBe(30);
    });

    it('should return undefined for text without delay minutes', () => {
      expect(extractDelayMinutes('平常運転')).toBeUndefined();
      expect(extractDelayMinutes('運転見合わせ')).toBeUndefined();
    });
  });

  describe('getRailwayName', () => {
    it('should return mapped railway name', () => {
      expect(getRailwayName('odpt.Railway:JR-East.ChuoRapid')).toBe('中央線快速');
      expect(getRailwayName('odpt.Railway:TokyoMetro.Ginza')).toBe('銀座線');
    });

    it('should return extracted name for unknown railway', () => {
      expect(getRailwayName('odpt.Railway:Unknown.TestLine')).toBe('TestLine');
    });
  });

  describe('getOperatorName', () => {
    it('should return mapped operator name', () => {
      expect(getOperatorName('odpt.Operator:JR-East')).toBe('JR東日本');
      expect(getOperatorName('odpt.Operator:TokyoMetro')).toBe('東京メトロ');
    });

    it('should return extracted name for unknown operator', () => {
      expect(getOperatorName('odpt.Operator:Unknown')).toBe('Unknown');
    });
  });

  describe('fetchDelayInfo', () => {
    const mockODPTResponse: ODPTTrainInformationResponse[] = [
      {
        '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
        '@id': 'urn:test:1',
        '@type': 'odpt:TrainInformation',
        'dc:date': '2024-01-28T09:00:00+09:00',
        'odpt:operator': 'odpt.Operator:JR-East',
        'odpt:railway': 'odpt.Railway:JR-East.ChuoRapid',
        'odpt:trainInformationText': '人身事故の影響で約15分の遅れ',
      },
      {
        '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
        '@id': 'urn:test:2',
        '@type': 'odpt:TrainInformation',
        'dc:date': '2024-01-28T09:00:00+09:00',
        'odpt:operator': 'odpt.Operator:TokyoMetro',
        'odpt:railway': 'odpt.Railway:TokyoMetro.Ginza',
        'odpt:trainInformationText': '現在、平常どおり運転しています。',
      },
    ];

    it('should fetch and parse delay info correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockODPTResponse,
      });

      const service = new TrainDelayService('test-token');
      const result = await service.fetchDelayInfo();

      expect(result).toHaveLength(2);
      expect(result[0].railwayName).toBe('中央線快速');
      expect(result[0].status).toBe('delayed');
      expect(result[0].delayMinutes).toBe(15);
      expect(result[1].railwayName).toBe('銀座線');
      expect(result[1].status).toBe('normal');
    });

    it('should return cached data on API error', async () => {
      // First, populate cache
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockODPTResponse,
      });

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();

      // Then, simulate API error
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.fetchDelayInfo();
      expect(result).toHaveLength(2);
    });

    it('should return empty array when no cache and API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const service = new TrainDelayService('test-token');
      const result = await service.fetchDelayInfo();

      expect(result).toHaveLength(0);
    });
  });

  describe('getCurrentDelays', () => {
    it('should return only delayed/suspended trains', async () => {
      const mockResponse: ODPTTrainInformationResponse[] = [
        {
          '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
          '@id': 'urn:test:1',
          '@type': 'odpt:TrainInformation',
          'dc:date': '2024-01-28T09:00:00+09:00',
          'odpt:operator': 'odpt.Operator:JR-East',
          'odpt:railway': 'odpt.Railway:JR-East.ChuoRapid',
          'odpt:trainInformationText': '人身事故の影響で約15分の遅れ',
        },
        {
          '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
          '@id': 'urn:test:2',
          '@type': 'odpt:TrainInformation',
          'dc:date': '2024-01-28T09:00:00+09:00',
          'odpt:operator': 'odpt.Operator:TokyoMetro',
          'odpt:railway': 'odpt.Railway:TokyoMetro.Ginza',
          'odpt:trainInformationText': '現在、平常どおり運転しています。',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();
      const delays = service.getCurrentDelays();

      expect(delays).toHaveLength(1);
      expect(delays[0].railwayName).toBe('中央線快速');
    });
  });

  describe('filterByOperatorGroup', () => {
    it('should filter by operator group', async () => {
      const mockResponse: ODPTTrainInformationResponse[] = [
        {
          '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
          '@id': 'urn:test:1',
          '@type': 'odpt:TrainInformation',
          'dc:date': '2024-01-28T09:00:00+09:00',
          'odpt:operator': 'odpt.Operator:JR-East',
          'odpt:railway': 'odpt.Railway:JR-East.ChuoRapid',
          'odpt:trainInformationText': '約10分の遅れ',
        },
        {
          '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
          '@id': 'urn:test:2',
          '@type': 'odpt:TrainInformation',
          'dc:date': '2024-01-28T09:00:00+09:00',
          'odpt:operator': 'odpt.Operator:TokyoMetro',
          'odpt:railway': 'odpt.Railway:TokyoMetro.Ginza',
          'odpt:trainInformationText': '約5分の遅れ',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();

      const jrDelays = service.filterByOperatorGroup('JR');
      expect(jrDelays).toHaveLength(1);
      expect(jrDelays[0].operatorName).toBe('JR東日本');

      const metroDelays = service.filterByOperatorGroup('metro');
      expect(metroDelays).toHaveLength(1);
      expect(metroDelays[0].operatorName).toBe('東京メトロ');

      const allDelays = service.filterByOperatorGroup('all');
      expect(allDelays).toHaveLength(2);
    });
  });

  describe('History management', () => {
    it('should save history to localStorage', async () => {
      const mockResponse: ODPTTrainInformationResponse[] = [
        {
          '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
          '@id': 'urn:test:1',
          '@type': 'odpt:TrainInformation',
          'dc:date': '2024-01-28T09:00:00+09:00',
          'odpt:operator': 'odpt.Operator:JR-East',
          'odpt:railway': 'odpt.Railway:JR-East.ChuoRapid',
          'odpt:trainInformationText': '約10分の遅れ',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        DELAY_STORAGE_KEY,
        expect.any(String)
      );
    });

    it('should load history from localStorage', () => {
      const mockHistory: DelayHistoryEntry[] = [
        {
          id: 'test-1',
          railway: 'odpt.Railway:JR-East.ChuoRapid',
          railwayName: '中央線快速',
          operator: 'odpt.Operator:JR-East',
          operatorName: 'JR東日本',
          status: 'delayed',
          delayMinutes: 10,
          informationText: '約10分の遅れ',
          fetchedAt: new Date().toISOString(),
          recordedAt: new Date().toISOString(),
        },
      ];

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(mockHistory));

      const service = new TrainDelayService('test-token');
      const history = service.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].railwayName).toBe('中央線快速');
    });

    it('should prune old history entries', () => {
      const now = Date.now();
      const oldEntry: DelayHistoryEntry = {
        id: 'old-1',
        railway: 'odpt.Railway:JR-East.ChuoRapid',
        railwayName: '中央線快速',
        operator: 'odpt.Operator:JR-East',
        operatorName: 'JR東日本',
        status: 'delayed',
        informationText: '古い遅延情報',
        fetchedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(), // 7時間前
        recordedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
      };

      const recentEntry: DelayHistoryEntry = {
        id: 'recent-1',
        railway: 'odpt.Railway:TokyoMetro.Ginza',
        railwayName: '銀座線',
        operator: 'odpt.Operator:TokyoMetro',
        operatorName: '東京メトロ',
        status: 'delayed',
        informationText: '最近の遅延情報',
        fetchedAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(), // 1時間前
        recordedAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      };

      mockLocalStorage.getItem.mockReturnValueOnce(
        JSON.stringify([oldEntry, recentEntry])
      );

      const service = new TrainDelayService('test-token');
      const history = service.getHistory();

      // 6時間以上古いエントリは削除される
      expect(history).toHaveLength(1);
      expect(history[0].railwayName).toBe('銀座線');
    });
  });

  describe('getTickerText', () => {
    it('should return normal operation message when no delays', async () => {
      const mockResponse: ODPTTrainInformationResponse[] = [
        {
          '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
          '@id': 'urn:test:1',
          '@type': 'odpt:TrainInformation',
          'dc:date': '2024-01-28T09:00:00+09:00',
          'odpt:operator': 'odpt.Operator:JR-East',
          'odpt:railway': 'odpt.Railway:JR-East.ChuoRapid',
          'odpt:trainInformationText': '現在、平常どおり運転しています。',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();
      const text = service.getTickerText();

      expect(text).toBe('主要路線は平常運転です');
    });

    it('should return delay info when delays exist', async () => {
      const mockResponse: ODPTTrainInformationResponse[] = [
        {
          '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
          '@id': 'urn:test:1',
          '@type': 'odpt:TrainInformation',
          'dc:date': '2024-01-28T09:00:00+09:00',
          'odpt:operator': 'odpt.Operator:JR-East',
          'odpt:railway': 'odpt.Railway:JR-East.ChuoRapid',
          'odpt:trainInformationText': '人身事故の影響で約15分の遅れ',
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
      });

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();
      const text = service.getTickerText();

      expect(text).toContain('中央線快速');
      expect(text).toContain('15分');
    });
  });
});
