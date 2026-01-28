/**
 * 最寄り駅検出サービス
 * Haversine公式を使用して距離を計算
 * @module services/NearestStationService
 */

import {
  GeoCoordinate,
  StationInfo,
  NearestStationResult,
  EARTH_RADIUS_METERS,
} from '../types/station';

/**
 * 最寄り駅検出サービス
 */
export class NearestStationService {
  /**
   * Haversine公式で2点間の距離を計算（メートル）
   * @param coord1 座標1
   * @param coord2 座標2
   * @returns 距離（メートル）
   */
  static calculateDistance(coord1: GeoCoordinate, coord2: GeoCoordinate): number {
    // 同一座標の場合は0を返す
    if (
      coord1.latitude === coord2.latitude &&
      coord1.longitude === coord2.longitude
    ) {
      return 0;
    }

    // 度をラジアンに変換
    const lat1 = NearestStationService.toRadians(coord1.latitude);
    const lat2 = NearestStationService.toRadians(coord2.latitude);
    const deltaLat = NearestStationService.toRadians(coord2.latitude - coord1.latitude);
    const deltaLon = NearestStationService.toRadians(coord2.longitude - coord1.longitude);

    // Haversine公式
    const a =
      Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
      Math.cos(lat1) *
        Math.cos(lat2) *
        Math.sin(deltaLon / 2) *
        Math.sin(deltaLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return EARTH_RADIUS_METERS * c;
  }

  /**
   * 度をラジアンに変換
   */
  private static toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180;
  }

  /**
   * 最寄り駅を検出
   * @param coordinate ユーザーの現在座標
   * @param stations 駅リスト
   * @returns 最寄り駅の結果（駅がない場合はnull）
   */
  findNearest(
    coordinate: GeoCoordinate,
    stations: StationInfo[]
  ): NearestStationResult | null {
    if (stations.length === 0) {
      return null;
    }

    let nearestStation = stations[0];
    let minDistance = NearestStationService.calculateDistance(
      coordinate,
      nearestStation.coordinate
    );

    for (let i = 1; i < stations.length; i++) {
      const distance = NearestStationService.calculateDistance(
        coordinate,
        stations[i].coordinate
      );

      if (distance < minDistance) {
        minDistance = distance;
        nearestStation = stations[i];
      }
    }

    return {
      station: nearestStation,
      distance: minDistance,
    };
  }

  /**
   * 最寄りN駅を取得
   * @param coordinate ユーザーの現在座標
   * @param stations 駅リスト
   * @param n 取得数
   * @returns 最寄りN駅の結果（距離昇順）
   */
  findNearestN(
    coordinate: GeoCoordinate,
    stations: StationInfo[],
    n: number
  ): NearestStationResult[] {
    if (stations.length === 0) {
      return [];
    }

    // 全駅の距離を計算
    const results: NearestStationResult[] = stations.map((station) => ({
      station,
      distance: NearestStationService.calculateDistance(
        coordinate,
        station.coordinate
      ),
    }));

    // 距離でソート（昇順）
    results.sort((a, b) => a.distance - b.distance);

    // 上位N件を返す
    return results.slice(0, n);
  }
}
