/**
 * 遅延情報ティッカーコンポーネント
 * @module components/traffic/DelayTicker
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Loader2, RefreshCw, History } from 'lucide-react';
import { getTrainDelayService } from '../../services/TrainDelayService';
import { TrainDelayInfo } from '../../types/trainDelay';

interface DelayTickerProps {
  /** ODPTトークン */
  token: string;
  /** クリック時のコールバック（モーダルを開く） */
  onClick?: () => void;
  /** 更新間隔（ミリ秒） */
  updateInterval?: number;
}

/**
 * 遅延情報ティッカー
 * - 遅延がある場合: マーキー形式で遅延情報を表示
 * - 遅延がない場合: 「平常運転」を表示
 */
const DelayTicker: React.FC<DelayTickerProps> = ({
  token,
  onClick,
  updateInterval = 5 * 60 * 1000, // 5分
}) => {
  // シングルトンを使用して履歴を共有
  const [service] = useState(() => getTrainDelayService(token));
  const [delays, setDelays] = useState<TrainDelayInfo[]>([]);
  const [tickerText, setTickerText] = useState<string>('情報取得中...');
  const [isLoading, setIsLoading] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // 遅延情報を取得
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await service.fetchDelayInfo();
      const currentDelays = service.getCurrentDelays();
      setDelays(currentDelays);
      setTickerText(service.getTickerText());
      setLastUpdated(service.getLastUpdated());
    } catch (error) {
      console.error('[DelayTicker] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // 初回ロードと定期更新
  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, updateInterval);
    return () => clearInterval(interval);
  }, [fetchData, updateInterval]);

  // 遅延があるかどうか
  const hasDelays = delays.length > 0;

  // アイコン
  const StatusIcon = isLoading ? Loader2 : hasDelays ? AlertTriangle : CheckCircle;
  const iconColor = isLoading
    ? 'text-gray-400'
    : hasDelays
    ? 'text-amber-500'
    : 'text-green-500';

  // 背景色
  const bgColor = hasDelays
    ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';

  // テキスト色
  const textColor = hasDelays
    ? 'text-amber-700 dark:text-amber-300'
    : 'text-green-700 dark:text-green-300';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={`
        flex-1 min-w-0 flex items-center gap-2 px-3 py-1.5 rounded-lg border
        transition-all cursor-pointer hover:opacity-80
        ${bgColor}
      `}
      title={`タップで過去6時間の遅延履歴を表示${lastUpdated ? `\n最終更新: ${lastUpdated.toLocaleTimeString('ja-JP')}` : ''}`}
    >
      {/* ステータスアイコン */}
      <StatusIcon
        className={`w-4 h-4 flex-shrink-0 ${iconColor} ${isLoading ? 'animate-spin' : ''}`}
      />

      {/* ティッカーテキスト */}
      <div className="flex-1 min-w-0 overflow-hidden h-5">
        <div
          className={`
            whitespace-nowrap text-xs sm:text-sm font-medium leading-5
            ${textColor}
            ${hasDelays ? 'animate-marquee' : ''}
          `}
          style={{
            animationPlayState: isPaused ? 'paused' : 'running',
          }}
        >
          {tickerText}
        </div>
      </div>

      {/* 履歴ボタンのヒント（平常運転時のみ表示） */}
      {!hasDelays && !isLoading && (
        <span className="hidden sm:flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
          <History className="w-3 h-3" />
          履歴
        </span>
      )}

      {/* 更新アイコン（クリックイベントは親ボタンが処理） */}
      <span
        onClick={(e) => {
          e.stopPropagation();
          fetchData();
        }}
        className={`
          flex-shrink-0 p-1 rounded hover:bg-black/10 dark:hover:bg-white/10
          transition-colors cursor-pointer
          ${isLoading ? 'opacity-50 pointer-events-none' : ''}
          ${textColor}
        `}
        title={`更新${lastUpdated ? ` (最終: ${lastUpdated.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })})` : ''}`}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.stopPropagation();
            fetchData();
          }
        }}
      >
        <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
      </span>

      {/* マーキーアニメーション用CSS */}
      <style>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          display: inline-block;
          padding-right: 100%;
          animation: marquee 15s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee {
            animation: none;
            padding-right: 0;
          }
        }
      `}</style>
    </button>
  );
};

export default DelayTicker;
