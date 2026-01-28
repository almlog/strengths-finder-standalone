/**
 * 駅関連の型定義
 * @module types/station
 */

/**
 * 座標情報
 */
export interface GeoCoordinate {
  /** 緯度 */
  latitude: number;
  /** 経度 */
  longitude: number;
}

/**
 * 駅情報
 */
export interface StationInfo {
  /** 駅ID (例: odpt.Station:JR-East.ChuoRapid.Tokyo) */
  id: string;
  /** 駅名 (例: 東京) */
  name: string;
  /** 路線ID (例: odpt.Railway:JR-East.ChuoRapid) */
  railway: string;
  /** 路線名 (例: 中央線快速) */
  railwayName: string;
  /** 事業者ID (例: odpt.Operator:JR-East) */
  operator: string;
  /** 座標 */
  coordinate: GeoCoordinate;
}

/**
 * 最寄り駅検出結果
 */
export interface NearestStationResult {
  /** 駅情報 */
  station: StationInfo;
  /** 距離（メートル） */
  distance: number;
}

/**
 * 位置情報取得ステータス
 */
export type GeolocationStatus =
  | 'idle'        // 初期状態
  | 'requesting'  // 取得中
  | 'success'     // 取得成功
  | 'denied'      // 権限拒否
  | 'unavailable' // 位置情報利用不可
  | 'timeout'     // タイムアウト
  | 'error';      // その他のエラー

/**
 * 駅データキャッシュ
 */
export interface StationDataCache {
  /** 駅データ */
  stations: StationInfo[];
  /** キャッシュ作成時刻 (ISO8601) */
  cachedAt: string;
}

/**
 * ODPT API 駅レスポンスの型
 */
export interface ODPTStationResponse {
  '@context': string;
  '@id': string;
  '@type': 'odpt:Station';
  'dc:title': string;
  'odpt:operator': string;
  'odpt:railway': string;
  'odpt:stationCode'?: string;
  'geo:lat'?: number;
  'geo:long'?: number;
  'odpt:stationTitle'?: {
    ja?: string;
    en?: string;
  };
}

/**
 * LocalStorage キー
 */
export const STATION_DATA_STORAGE_KEY = 'station-data-cache';

/**
 * キャッシュ有効期限（24時間）
 */
export const STATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/**
 * 対象事業者リスト
 */
export const TARGET_OPERATORS = [
  'odpt.Operator:JR-East',
  'odpt.Operator:TokyoMetro',
  'odpt.Operator:Toei',
  'odpt.Operator:Tokyu',
  'odpt.Operator:Odakyu',
  'odpt.Operator:Keio',
  'odpt.Operator:Seibu',
  'odpt.Operator:Tobu',
  'odpt.Operator:Keikyu',
  'odpt.Operator:Keisei',
  'odpt.Operator:TWR',
  'odpt.Operator:MIR',
] as const;

/**
 * 地球の半径（メートル）
 * Haversine公式で使用
 */
export const EARTH_RADIUS_METERS = 6371000;
