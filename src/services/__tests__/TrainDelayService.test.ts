/**
 * TrainDelayService テスト
 * @module services/__tests__/TrainDelayService.test
 */

// firebase config のモック（import連鎖による実Firebase初期化を回避）
jest.mock('../../config/firebase', () => ({
  functions: {},
}));

// YahooDelayService（外部ソース取得）のモック
const mockFetchExternalDelayHistory = jest.fn();
jest.mock('../YahooDelayService', () => ({
  fetchExternalDelayHistory: (...args: unknown[]) => mockFetchExternalDelayHistory(...args),
}));

import {
  TrainDelayService,
  parseDelayStatus,
  extractDelayMinutes,
  getRailwayName,
  getOperatorName,
} from '../TrainDelayService';
import {
  DelayHistoryEntry,
  DELAY_STORAGE_KEY,
} from '../../types/trainDelay';

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

/** テスト用のDelayHistoryEntryを生成 */
function makeEntry(overrides: Partial<DelayHistoryEntry> = {}): DelayHistoryEntry {
  const now = new Date().toISOString();
  return {
    id: `test-${Math.random()}`,
    railway: 'yahoo.Railway:山手線',
    railwayName: '山手線',
    operator: 'yahoo',
    operatorName: 'Yahoo!路線情報',
    status: 'delayed',
    delayMinutes: 15,
    informationText: '人身事故の影響で約15分の遅れ',
    fetchedAt: now,
    recordedAt: now,
    ...overrides,
  };
}

describe('TrainDelayService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
    // resetMocks: true 対策で毎回getItem/setItemの実装を再設定
    mockLocalStorage.getItem.mockImplementation(() => null);
    mockLocalStorage.setItem.mockImplementation(() => undefined);
  });

  describe('parseDelayStatus', () => {
    it('平常運転テキストは "normal"', () => {
      expect(parseDelayStatus('現在、平常どおり運転しています。')).toBe('normal');
      expect(parseDelayStatus('平常運転')).toBe('normal');
    });

    it('遅延テキストは "delayed"', () => {
      expect(parseDelayStatus('人身事故の影響で約15分の遅れ')).toBe('delayed');
      expect(parseDelayStatus('遅延が発生しています')).toBe('delayed');
      expect(parseDelayStatus('約10分遅れ')).toBe('delayed');
    });

    it('運転見合わせテキストは "suspended"', () => {
      expect(parseDelayStatus('運転を見合わせています')).toBe('suspended');
      expect(parseDelayStatus('運休')).toBe('suspended');
      expect(parseDelayStatus('運転見合わせ')).toBe('suspended');
    });

    it('判定不能テキストは "unknown"', () => {
      expect(parseDelayStatus('')).toBe('unknown');
      expect(parseDelayStatus('その他の情報')).toBe('unknown');
    });
  });

  describe('extractDelayMinutes', () => {
    it('テキストから遅延分数を抽出する', () => {
      expect(extractDelayMinutes('約15分の遅れ')).toBe(15);
      expect(extractDelayMinutes('10分程度の遅延')).toBe(10);
      expect(extractDelayMinutes('最大30分の遅れが発生')).toBe(30);
    });

    it('分数がないテキストはundefined', () => {
      expect(extractDelayMinutes('平常運転')).toBeUndefined();
      expect(extractDelayMinutes('運転見合わせ')).toBeUndefined();
    });
  });

  describe('getRailwayName', () => {
    it('マッピング済み路線IDは路線名を返す', () => {
      expect(getRailwayName('odpt.Railway:JR-East.ChuoRapid')).toBe('中央線快速');
      expect(getRailwayName('odpt.Railway:TokyoMetro.Ginza')).toBe('銀座線');
    });

    it('未知の路線IDはIDから抽出する', () => {
      expect(getRailwayName('odpt.Railway:Unknown.TestLine')).toBe('TestLine');
    });
  });

  describe('getOperatorName', () => {
    it('マッピング済み事業者IDは事業者名を返す', () => {
      expect(getOperatorName('odpt.Operator:JR-East')).toBe('JR東日本');
      expect(getOperatorName('odpt.Operator:TokyoMetro')).toBe('東京メトロ');
    });

    it('未知の事業者IDはIDから抽出する', () => {
      expect(getOperatorName('odpt.Operator:Unknown')).toBe('Unknown');
    });
  });

  describe('fetchDelayInfo', () => {
    it('外部ソースのエントリをTrainDelayInfoに変換して返す', async () => {
      mockFetchExternalDelayHistory.mockResolvedValueOnce([
        makeEntry({ railwayName: '山手線', status: 'delayed', delayMinutes: 15 }),
        makeEntry({ railwayName: '常磐線', status: 'suspended', delayMinutes: undefined }),
      ]);

      const service = new TrainDelayService('test-token');
      const result = await service.fetchDelayInfo();

      expect(result).toHaveLength(2);
      expect(result[0].railwayName).toBe('山手線');
      expect(result[0].status).toBe('delayed');
      expect(result[0].delayMinutes).toBe(15);
      expect(result[1].railwayName).toBe('常磐線');
      expect(result[1].status).toBe('suspended');
    });

    it('外部ソースがエラーの場合は空配列を返す', async () => {
      mockFetchExternalDelayHistory.mockRejectedValueOnce(new Error('Network error'));

      const service = new TrainDelayService('test-token');
      const result = await service.fetchDelayInfo();

      expect(result).toHaveLength(0);
    });
  });

  describe('getCurrentDelays', () => {
    it('遅延・運休のみを返す', async () => {
      mockFetchExternalDelayHistory.mockResolvedValueOnce([
        makeEntry({ railwayName: '山手線', status: 'delayed' }),
        makeEntry({ railwayName: '銀座線', status: 'normal' }),
        makeEntry({ railwayName: '常磐線', status: 'suspended' }),
      ]);

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();
      const delays = service.getCurrentDelays();

      expect(delays).toHaveLength(2);
      expect(delays.map((d) => d.railwayName)).toEqual(['山手線', '常磐線']);
    });
  });

  describe('filterByOperatorGroup', () => {
    it('事業者グループでフィルタする', async () => {
      mockFetchExternalDelayHistory.mockResolvedValueOnce([
        makeEntry({ railwayName: '中央線快速', operator: 'odpt.Operator:JR-East' }),
        makeEntry({ railwayName: '銀座線', operator: 'odpt.Operator:TokyoMetro' }),
      ]);

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();

      const jrDelays = service.filterByOperatorGroup('JR');
      expect(jrDelays).toHaveLength(1);
      expect(jrDelays[0].railwayName).toBe('中央線快速');

      const metroDelays = service.filterByOperatorGroup('metro');
      expect(metroDelays).toHaveLength(1);
      expect(metroDelays[0].railwayName).toBe('銀座線');

      const allDelays = service.filterByOperatorGroup('all');
      expect(allDelays).toHaveLength(2);
    });
  });

  describe('History management', () => {
    it('遅延情報をlocalStorageに保存する', async () => {
      mockFetchExternalDelayHistory.mockResolvedValueOnce([
        makeEntry({ railwayName: '山手線', status: 'delayed' }),
      ]);

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        DELAY_STORAGE_KEY,
        expect.any(String)
      );
    });

    it('localStorageから履歴を読み込む', () => {
      const mockHistory: DelayHistoryEntry[] = [makeEntry({ railwayName: '中央線快速' })];
      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify(mockHistory));

      const service = new TrainDelayService('test-token');
      const history = service.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].railwayName).toBe('中央線快速');
    });

    it('6時間以上古い履歴エントリは削除される', () => {
      const now = Date.now();
      const oldEntry = makeEntry({
        railwayName: '中央線快速',
        fetchedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
        recordedAt: new Date(now - 7 * 60 * 60 * 1000).toISOString(),
      });
      const recentEntry = makeEntry({
        railwayName: '銀座線',
        fetchedAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
        recordedAt: new Date(now - 1 * 60 * 60 * 1000).toISOString(),
      });

      mockLocalStorage.getItem.mockReturnValueOnce(JSON.stringify([oldEntry, recentEntry]));

      const service = new TrainDelayService('test-token');
      const history = service.getHistory();

      expect(history).toHaveLength(1);
      expect(history[0].railwayName).toBe('銀座線');
    });
  });

  describe('History deduplication', () => {
    it('1回のfetchで同一路線の履歴は1件だけ追加される', async () => {
      mockFetchExternalDelayHistory.mockResolvedValueOnce([
        makeEntry({ railwayName: '小湊鉄道線', status: 'suspended' }),
      ]);

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();

      const history = service.getHistory();
      const kominato = history.filter((h) => h.railwayName === '小湊鉄道線');
      expect(kominato).toHaveLength(1);
    });

    it('5分以内の連続fetchでは同一路線の履歴を重複追加しない', async () => {
      mockFetchExternalDelayHistory.mockResolvedValue([
        makeEntry({ railwayName: '小湊鉄道線', status: 'suspended' }),
      ]);

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();
      await service.fetchDelayInfo();
      await service.fetchDelayInfo();

      const history = service.getHistory();
      const kominato = history.filter((h) => h.railwayName === '小湊鉄道線');
      expect(kominato).toHaveLength(1);
    });
  });

  describe('getTickerText', () => {
    it('遅延なしの場合は平常運転メッセージを返す', async () => {
      mockFetchExternalDelayHistory.mockResolvedValueOnce([]);

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();
      const text = service.getTickerText();

      expect(text).toBe('主要路線は平常運転です');
    });

    it('遅延ありの場合は路線名と遅延分数を含む', async () => {
      mockFetchExternalDelayHistory.mockResolvedValueOnce([
        makeEntry({ railwayName: '中央線快速', status: 'delayed', delayMinutes: 15 }),
      ]);

      const service = new TrainDelayService('test-token');
      await service.fetchDelayInfo();
      const text = service.getTickerText();

      expect(text).toContain('中央線快速');
      expect(text).toContain('15分');
    });
  });
});
