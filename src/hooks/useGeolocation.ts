/**
 * 位置情報取得フック
 * @module hooks/useGeolocation
 */

import { useState, useCallback } from 'react';
import { GeoCoordinate, GeolocationStatus } from '../types/station';

/**
 * useGeolocationの戻り値の型
 */
export interface UseGeolocationReturn {
  /** 現在の座標 */
  coordinate: GeoCoordinate | null;
  /** ステータス */
  status: GeolocationStatus;
  /** エラーメッセージ */
  error: string | null;
  /** 位置情報を取得 */
  requestLocation: () => void;
}

/**
 * Geolocation API オプション
 */
const GEOLOCATION_OPTIONS: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // 1分間キャッシュ
};

/**
 * エラーコードからステータスを取得
 */
function getStatusFromError(error: GeolocationPositionError): GeolocationStatus {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return 'denied';
    case error.POSITION_UNAVAILABLE:
      return 'unavailable';
    case error.TIMEOUT:
      return 'timeout';
    default:
      return 'error';
  }
}

/**
 * エラーコードからメッセージを取得
 */
function getErrorMessage(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED:
      return '位置情報の使用が許可されていません。ブラウザの設定を確認してください。';
    case error.POSITION_UNAVAILABLE:
      return '位置情報を取得できませんでした。';
    case error.TIMEOUT:
      return '位置情報の取得がタイムアウトしました。';
    default:
      return '位置情報の取得中にエラーが発生しました。';
  }
}

/**
 * 位置情報取得フック
 */
export function useGeolocation(): UseGeolocationReturn {
  const [coordinate, setCoordinate] = useState<GeoCoordinate | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  const requestLocation = useCallback(() => {
    // Geolocation APIが利用可能かチェック
    if (!navigator.geolocation) {
      setStatus('unavailable');
      setError('このブラウザでは位置情報がサポートされていません。');
      return;
    }

    setStatus('requesting');
    setError(null);

    navigator.geolocation.getCurrentPosition(
      // 成功コールバック
      (position) => {
        setCoordinate({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setStatus('success');
        setError(null);
      },
      // エラーコールバック
      (positionError) => {
        setStatus(getStatusFromError(positionError));
        setError(getErrorMessage(positionError));
        setCoordinate(null);
      },
      GEOLOCATION_OPTIONS
    );
  }, []);

  return {
    coordinate,
    status,
    error,
    requestLocation,
  };
}
