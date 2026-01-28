/**
 * StationDataService テスト
 * @module services/__tests__/StationDataService.test
 */

import { StationDataService, getStationName, getRailwayNameForStation } from '../StationDataService';
import {
  StationInfo,
  StationDataCache,
  ODPTStationResponse,
  STATION_DATA_STORAGE_KEY,
} from '../../types/station';

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

describe('StationDataService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.clear();
  });

  // モックODPTレスポンス
  const mockODPTResponse: ODPTStationResponse[] = [
    {
      '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
      '@id': 'urn:ucode:_00001C000000000000010000030FD7E5',
      '@type': 'odpt:Station',
      'dc:title': '東京',
      'odpt:operator': 'odpt.Operator:JR-East',
      'odpt:railway': 'odpt.Railway:JR-East.ChuoRapid',
      'geo:lat': 35.681382,
      'geo:long': 139.766084,
    },
    {
      '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
      '@id': 'urn:ucode:_00001C000000000000010000030FD7E6',
      '@type': 'odpt:Station',
      'dc:title': '新宿',
      'odpt:operator': 'odpt.Operator:JR-East',
      'odpt:railway': 'odpt.Railway:JR-East.ChuoRapid',
      'geo:lat': 35.689738,
      'geo:long': 139.700464,
    },
    {
      '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
      '@id': 'urn:ucode:_00001C000000000000010000030FD7E7',
      '@type': 'odpt:Station',
      'dc:title': '銀座',
      'odpt:operator': 'odpt.Operator:TokyoMetro',
      'odpt:railway': 'odpt.Railway:TokyoMetro.Ginza',
      'geo:lat': 35.671989,
      'geo:long': 139.763965,
    },
    // 座標なしの駅（除外されるべき）
    {
      '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
      '@id': 'urn:ucode:_00001C000000000000010000030FD7E8',
      '@type': 'odpt:Station',
      'dc:title': '座標なし駅',
      'odpt:operator': 'odpt.Operator:JR-East',
      'odpt:railway': 'odpt.Railway:JR-East.Yamanote',
    },
  ];

  describe('fetchStations', () => {
    it('should fetch and parse station data correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockODPTResponse,
      });

      const service = new StationDataService('test-token');
      const result = await service.fetchStations();

      // 座標がある3駅のみが返される
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('東京');
      expect(result[0].railway).toBe('odpt.Railway:JR-East.ChuoRapid');
      expect(result[0].coordinate.latitude).toBe(35.681382);
      expect(result[0].coordinate.longitude).toBe(139.766084);
    });

    it('should parse coordinates correctly', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockODPTResponse,
      });

      const service = new StationDataService('test-token');
      const result = await service.fetchStations();

      const tokyo = result.find((s) => s.name === '東京');
      expect(tokyo).toBeDefined();
      expect(tokyo?.coordinate).toEqual({
        latitude: 35.681382,
        longitude: 139.766084,
      });
    });

    it('should filter only target operators', async () => {
      const responseWithOtherOperator: ODPTStationResponse[] = [
        ...mockODPTResponse,
        {
          '@context': 'http://vocab.odpt.org/context_odpt.jsonld',
          '@id': 'urn:ucode:other',
          '@type': 'odpt:Station',
          'dc:title': '他社の駅',
          'odpt:operator': 'odpt.Operator:OtherCompany',
          'odpt:railway': 'odpt.Railway:OtherCompany.Line',
          'geo:lat': 35.0,
          'geo:long': 139.0,
        },
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => responseWithOtherOperator,
      });

      const service = new StationDataService('test-token');
      const result = await service.fetchStations();

      // 対象外事業者の駅は含まれない
      const otherStation = result.find((s) => s.name === '他社の駅');
      expect(otherStation).toBeUndefined();
    });

    it('should return cached data on API error', async () => {
      // まずキャッシュを作成
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockODPTResponse,
      });

      const service = new StationDataService('test-token');
      await service.fetchStations();

      // 次にAPIエラーを発生
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const result = await service.fetchStations();
      expect(result).toHaveLength(3);
    });

    it('should return empty array when no cache and API error', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

      const service = new StationDataService('test-token');
      const result = await service.fetchStations();

      expect(result).toHaveLength(0);
    });
  });

  describe('Cache management', () => {
    it('should load stations from localStorage', () => {
      const cachedData: StationDataCache = {
        stations: [
          {
            id: 'test-1',
            name: '東京',
            railway: 'odpt.Railway:JR-East.ChuoRapid',
            railwayName: '中央線快速',
            operator: 'odpt.Operator:JR-East',
            coordinate: { latitude: 35.681382, longitude: 139.766084 },
          },
        ],
        cachedAt: new Date().toISOString(),
      };

      // コンストラクタでloadFromCacheが呼ばれるので、最初に2回分セット
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(cachedData))  // コンストラクタ用
        .mockReturnValueOnce(JSON.stringify(cachedData)); // loadFromCache呼び出し用

      const service = new StationDataService('test-token');
      const loaded = service.loadFromCache();

      expect(loaded).toHaveLength(1);
      expect(loaded?.[0].name).toBe('東京');
    });

    it('should save stations to localStorage', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockODPTResponse,
      });

      const service = new StationDataService('test-token');
      await service.fetchStations();

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        STATION_DATA_STORAGE_KEY,
        expect.any(String)
      );
    });

    it('should return true when cache is valid (within 24 hours)', () => {
      const cachedData: StationDataCache = {
        stations: [],
        cachedAt: new Date().toISOString(), // 現在時刻
      };

      // コンストラクタとisCacheValid用に2回分セット
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(cachedData))  // コンストラクタ用
        .mockReturnValueOnce(JSON.stringify(cachedData)); // isCacheValid用

      const service = new StationDataService('test-token');
      expect(service.isCacheValid()).toBe(true);
    });

    it('should return false when cache is expired (over 24 hours)', () => {
      const cachedData: StationDataCache = {
        stations: [],
        cachedAt: new Date(Date.now() - 25 * 60 * 60 * 1000).toISOString(), // 25時間前
      };

      // コンストラクタとisCacheValid用に2回分セット
      mockLocalStorage.getItem
        .mockReturnValueOnce(JSON.stringify(cachedData))  // コンストラクタ用
        .mockReturnValueOnce(JSON.stringify(cachedData)); // isCacheValid用

      const service = new StationDataService('test-token');
      expect(service.isCacheValid()).toBe(false);
    });
  });

  describe('filterByRailway', () => {
    it('should filter stations by railway ID', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => mockODPTResponse,
      });

      const service = new StationDataService('test-token');
      await service.fetchStations();

      const chuoStations = service.filterByRailway('odpt.Railway:JR-East.ChuoRapid');
      expect(chuoStations).toHaveLength(2);
      expect(chuoStations.every((s) => s.railway === 'odpt.Railway:JR-East.ChuoRapid')).toBe(true);
    });
  });

  describe('Helper functions', () => {
    it('getStationName should return station name from title', () => {
      expect(getStationName('東京')).toBe('東京');
    });

    it('getRailwayNameForStation should return mapped railway name', () => {
      expect(getRailwayNameForStation('odpt.Railway:JR-East.ChuoRapid')).toBe('中央線快速');
      expect(getRailwayNameForStation('odpt.Railway:TokyoMetro.Ginza')).toBe('銀座線');
    });

    it('getRailwayNameForStation should extract name for unknown railway', () => {
      expect(getRailwayNameForStation('odpt.Railway:Unknown.TestLine')).toBe('TestLine');
    });
  });
});
