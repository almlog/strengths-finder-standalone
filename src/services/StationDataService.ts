/**
 * 駅データ取得・管理サービス
 * @module services/StationDataService
 */

import {
  StationInfo,
  StationDataCache,
  ODPTStationResponse,
  TARGET_OPERATORS,
  STATION_DATA_STORAGE_KEY,
  STATION_CACHE_TTL_MS,
} from '../types/station';
import { RAILWAY_NAMES } from '../types/trainDelay';

/**
 * 駅名を取得
 */
export function getStationName(title: string): string {
  return title;
}

/**
 * 路線IDから路線名を取得（駅用）
 */
export function getRailwayNameForStation(railwayId: string): string {
  if (RAILWAY_NAMES[railwayId]) {
    return RAILWAY_NAMES[railwayId];
  }
  // マッピングにない場合はIDから抽出
  const parts = railwayId.split('.');
  return parts[parts.length - 1] || railwayId;
}

/**
 * 駅データサービス
 */
export class StationDataService {
  private token: string;
  private stations: StationInfo[] = [];

  constructor(token: string) {
    this.token = token;
    // 起動時にキャッシュを読み込み
    const cached = this.loadFromCache();
    if (cached) {
      this.stations = cached;
    }
  }

  /**
   * ODPT APIから駅データを取得
   */
  async fetchStations(): Promise<StationInfo[]> {
    const operatorParam = TARGET_OPERATORS.join(',');
    const url = `https://api.odpt.org/api/v4/odpt:Station?odpt:operator=${operatorParam}&acl:consumerKey=${this.token}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data: ODPTStationResponse[] = await response.json();

      const stations: StationInfo[] = data
        // 座標がある駅のみ
        .filter((item) =>
          item['geo:lat'] !== undefined &&
          item['geo:long'] !== undefined &&
          TARGET_OPERATORS.includes(item['odpt:operator'] as typeof TARGET_OPERATORS[number])
        )
        .map((item) => ({
          id: item['@id'],
          name: getStationName(item['dc:title']),
          railway: item['odpt:railway'],
          railwayName: getRailwayNameForStation(item['odpt:railway']),
          operator: item['odpt:operator'],
          coordinate: {
            latitude: item['geo:lat']!,
            longitude: item['geo:long']!,
          },
        }));

      this.stations = stations;
      this.saveToCache(stations);

      return stations;
    } catch (error) {
      console.error('[StationDataService] Fetch error:', error);
      // エラー時はキャッシュを返す
      return this.stations;
    }
  }

  /**
   * キャッシュから駅データを取得
   */
  loadFromCache(): StationInfo[] | null {
    try {
      const stored = localStorage.getItem(STATION_DATA_STORAGE_KEY);
      if (stored) {
        const cache: StationDataCache = JSON.parse(stored);
        return cache.stations;
      }
    } catch (error) {
      console.error('[StationDataService] Load cache error:', error);
    }
    return null;
  }

  /**
   * キャッシュに駅データを保存
   */
  saveToCache(stations: StationInfo[]): void {
    try {
      const cache: StationDataCache = {
        stations,
        cachedAt: new Date().toISOString(),
      };
      localStorage.setItem(STATION_DATA_STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('[StationDataService] Save cache error:', error);
    }
  }

  /**
   * キャッシュが有効かどうかを確認
   */
  isCacheValid(): boolean {
    try {
      const stored = localStorage.getItem(STATION_DATA_STORAGE_KEY);
      if (!stored) return false;

      const cache: StationDataCache = JSON.parse(stored);
      const cachedTime = new Date(cache.cachedAt).getTime();
      const now = Date.now();

      return now - cachedTime < STATION_CACHE_TTL_MS;
    } catch {
      return false;
    }
  }

  /**
   * 路線IDで駅をフィルタ
   */
  filterByRailway(railwayId: string): StationInfo[] {
    return this.stations.filter((station) => station.railway === railwayId);
  }

  /**
   * 事業者IDで駅をフィルタ
   */
  filterByOperator(operatorId: string): StationInfo[] {
    return this.stations.filter((station) => station.operator === operatorId);
  }

  /**
   * 全駅データを取得
   */
  getAllStations(): StationInfo[] {
    return this.stations;
  }
}

/**
 * シングルトンインスタンス用のファクトリ
 */
let serviceInstance: StationDataService | null = null;

export function getStationDataService(token: string): StationDataService {
  if (!serviceInstance) {
    serviceInstance = new StationDataService(token);
  }
  return serviceInstance;
}

export function resetStationDataService(): void {
  serviceInstance = null;
}
