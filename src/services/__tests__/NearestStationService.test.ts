/**
 * NearestStationService テスト
 * @module services/__tests__/NearestStationService.test
 */

import { NearestStationService } from '../NearestStationService';
import { StationInfo, GeoCoordinate } from '../../types/station';

describe('NearestStationService', () => {
  // テスト用の駅データ
  const testStations: StationInfo[] = [
    {
      id: 'tokyo',
      name: '東京',
      railway: 'odpt.Railway:JR-East.ChuoRapid',
      railwayName: '中央線快速',
      operator: 'odpt.Operator:JR-East',
      coordinate: { latitude: 35.681382, longitude: 139.766084 },
    },
    {
      id: 'shinjuku',
      name: '新宿',
      railway: 'odpt.Railway:JR-East.ChuoRapid',
      railwayName: '中央線快速',
      operator: 'odpt.Operator:JR-East',
      coordinate: { latitude: 35.689738, longitude: 139.700464 },
    },
    {
      id: 'shibuya',
      name: '渋谷',
      railway: 'odpt.Railway:JR-East.Yamanote',
      railwayName: '山手線',
      operator: 'odpt.Operator:JR-East',
      coordinate: { latitude: 35.658034, longitude: 139.701636 },
    },
    {
      id: 'ikebukuro',
      name: '池袋',
      railway: 'odpt.Railway:JR-East.Yamanote',
      railwayName: '山手線',
      operator: 'odpt.Operator:JR-East',
      coordinate: { latitude: 35.728926, longitude: 139.710454 },
    },
    {
      id: 'suidobashi',
      name: '水道橋',
      railway: 'odpt.Railway:JR-East.ChuoSobuLocal',
      railwayName: '中央・総武線各停',
      operator: 'odpt.Operator:JR-East',
      coordinate: { latitude: 35.702165, longitude: 139.754374 },
    },
  ];

  describe('calculateDistance', () => {
    it('should calculate distance between Tokyo and Shinjuku (approximately 6.5km)', () => {
      const tokyo: GeoCoordinate = { latitude: 35.681382, longitude: 139.766084 };
      const shinjuku: GeoCoordinate = { latitude: 35.689738, longitude: 139.700464 };

      const distance = NearestStationService.calculateDistance(tokyo, shinjuku);

      // 東京-新宿間は約6.0-6.5km
      expect(distance).toBeGreaterThan(5800);
      expect(distance).toBeLessThan(6500);
    });

    it('should return 0 for the same coordinates', () => {
      const tokyo: GeoCoordinate = { latitude: 35.681382, longitude: 139.766084 };

      const distance = NearestStationService.calculateDistance(tokyo, tokyo);

      expect(distance).toBe(0);
    });

    it('should calculate distance correctly for short distances', () => {
      // 東京駅と100m程度離れた座標
      const tokyo: GeoCoordinate = { latitude: 35.681382, longitude: 139.766084 };
      const nearby: GeoCoordinate = { latitude: 35.681382 + 0.0009, longitude: 139.766084 };

      const distance = NearestStationService.calculateDistance(tokyo, nearby);

      // 約100m（緯度0.0009度 ≒ 約100m）
      expect(distance).toBeGreaterThan(90);
      expect(distance).toBeLessThan(110);
    });
  });

  describe('findNearest', () => {
    it('should find the nearest station correctly', () => {
      const service = new NearestStationService();
      // 水道橋駅の近くの座標
      const userLocation: GeoCoordinate = { latitude: 35.702, longitude: 139.754 };

      const result = service.findNearest(userLocation, testStations);

      expect(result).not.toBeNull();
      expect(result?.station.name).toBe('水道橋');
      expect(result?.distance).toBeLessThan(100); // 100m以内
    });

    it('should return null when no stations provided', () => {
      const service = new NearestStationService();
      const userLocation: GeoCoordinate = { latitude: 35.681382, longitude: 139.766084 };

      const result = service.findNearest(userLocation, []);

      expect(result).toBeNull();
    });

    it('should handle single station', () => {
      const service = new NearestStationService();
      const userLocation: GeoCoordinate = { latitude: 35.7, longitude: 139.7 };
      const singleStation = [testStations[0]];

      const result = service.findNearest(userLocation, singleStation);

      expect(result).not.toBeNull();
      expect(result?.station.name).toBe('東京');
    });
  });

  describe('findNearestN', () => {
    it('should return top N nearest stations', () => {
      const service = new NearestStationService();
      // 東京駅付近の座標
      const userLocation: GeoCoordinate = { latitude: 35.681382, longitude: 139.766084 };

      const results = service.findNearestN(userLocation, testStations, 3);

      expect(results).toHaveLength(3);
      // 最も近い駅が東京であること
      expect(results[0].station.name).toBe('東京');
    });

    it('should return results sorted by distance (ascending)', () => {
      const service = new NearestStationService();
      const userLocation: GeoCoordinate = { latitude: 35.681382, longitude: 139.766084 };

      const results = service.findNearestN(userLocation, testStations, 5);

      // 距離が昇順であること
      for (let i = 1; i < results.length; i++) {
        expect(results[i].distance).toBeGreaterThanOrEqual(results[i - 1].distance);
      }
    });

    it('should handle when n is greater than available stations', () => {
      const service = new NearestStationService();
      const userLocation: GeoCoordinate = { latitude: 35.681382, longitude: 139.766084 };

      const results = service.findNearestN(userLocation, testStations, 100);

      // 全駅数が返される
      expect(results).toHaveLength(testStations.length);
    });

    it('should return empty array when no stations provided', () => {
      const service = new NearestStationService();
      const userLocation: GeoCoordinate = { latitude: 35.681382, longitude: 139.766084 };

      const results = service.findNearestN(userLocation, [], 5);

      expect(results).toHaveLength(0);
    });
  });
});
