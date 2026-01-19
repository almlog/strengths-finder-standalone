// src/components/traffic/TrafficInfoPage.tsx
// 交通情報タブ - Mini Tokyo 3D 統合

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Train, ExternalLink, AlertCircle, Maximize2, Minimize2, Info } from 'lucide-react';

// 環境変数からAPIトークンを取得
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const ODPT_TOKEN = process.env.REACT_APP_ODPT_TOKEN;
const CHALLENGE_TOKEN = process.env.REACT_APP_CHALLENGE_TOKEN;

// 起動時にトークン状態をコンソールに出力（デバッグ用）
console.log('[TrafficInfo] Token status:', {
  mapbox: MAPBOX_TOKEN ? `set (${MAPBOX_TOKEN.substring(0, 8)}...)` : 'NOT SET',
  odpt: ODPT_TOKEN ? `set (${ODPT_TOKEN.substring(0, 8)}...)` : 'NOT SET',
  challenge: CHALLENGE_TOKEN ? `set (${CHALLENGE_TOKEN.substring(0, 8)}...)` : 'NOT SET',
});

// トークンが設定されているかチェック（Mapbox + ODPTは必須、Challengeは任意）
const hasRequiredTokens = (): boolean => {
  return !!(MAPBOX_TOKEN && ODPT_TOKEN);
};

// APIトークン設定ガイドコンポーネント
const TokenSetupGuide: React.FC = () => (
  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3 sm:p-4 overflow-hidden">
    <div className="flex items-start space-x-2 sm:space-x-3">
      <AlertCircle className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <h3 className="text-sm sm:text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          APIトークン設定が必要
        </h3>
        <p className="text-xs sm:text-sm text-yellow-700 dark:text-yellow-300 mb-3">
          Mini Tokyo 3D利用には以下のトークンが必要です。
        </p>

        <div className="space-y-3">
          <div className="bg-white dark:bg-gray-800 rounded p-3 border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-sm">
              1. Mapbox
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              地図タイル表示用（月5万接続無料）
            </p>
            <a
              href="https://www.mapbox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-xs"
            >
              Mapbox登録
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded p-3 border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-sm">
              2. ODPT（必須）
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              列車リアルタイムデータ用
            </p>
            <a
              href="https://developer.odpt.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-xs"
            >
              開発者登録
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded p-3 border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-sm">
              3. Challenge2025（任意）
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              追加データ取得用
            </p>
            <a
              href="https://developer.odpt.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-xs"
            >
              チャレンジ参加
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700 rounded p-3">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1 text-sm">
              設定方法
            </h4>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
              .envファイルに設定:
            </p>
            <pre className="text-xs bg-gray-200 dark:bg-gray-600 p-2 rounded overflow-x-auto whitespace-pre-wrap break-all">
{`REACT_APP_MAPBOX_TOKEN=...
REACT_APP_ODPT_TOKEN=...
REACT_APP_CHALLENGE_TOKEN=...`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Mini Tokyo 3D マップコンポーネント
const MiniTokyo3DMap: React.FC<{ isFullscreen: boolean }> = ({ isFullscreen }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || !hasRequiredTokens()) return;

    // Mini Tokyo 3D のスクリプトを動的に読み込み
    const loadMiniTokyo3D = async () => {
      try {
        setLoadingProgress(10);

        // CSSを読み込み
        if (!document.querySelector('link[href*="mini-tokyo-3d"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.css';
          document.head.appendChild(link);
        }
        setLoadingProgress(30);

        // JSを読み込み
        if (!(window as any).mt3d) {
          await new Promise<void>((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/mini-tokyo-3d@latest/dist/mini-tokyo-3d.min.js';
            script.onload = () => resolve();
            script.onerror = () => reject(new Error('Failed to load Mini Tokyo 3D'));
            document.head.appendChild(script);
          });
        }
        setLoadingProgress(60);

        // マップを初期化
        const mt3d = (window as any).mt3d;
        if (mt3d && containerRef.current) {
          // シークレットオブジェクトを構築（Challenge tokenは任意）
          // Mini Tokyo 3D v3.6.0 は challenge2024 キーを使用
          const secrets: { odpt: string; challenge2024?: string } = {
            odpt: ODPT_TOKEN!,
          };
          if (CHALLENGE_TOKEN) {
            secrets.challenge2024 = CHALLENGE_TOKEN;
          }

          setLoadingProgress(80);

          // 水道橋駅を中心に周辺路線が見えるビュー
          mapRef.current = new mt3d.Map({
            container: containerRef.current,
            accessToken: MAPBOX_TOKEN,
            secrets,
            center: [139.7528, 35.7019], // 水道橋駅 [経度, 緯度]
            zoom: 14, // 周辺エリアが見えるズーム
            pitch: 60, // 3D表示の傾き
          });

          mapRef.current.on('load', () => {
            setLoadingProgress(100);
            setTimeout(() => {
              setIsLoading(false);
            }, 200);
          });

          mapRef.current.on('error', (e: any) => {
            console.error('[TrafficInfo] Map error event:', e);
            console.error('[TrafficInfo] Error keys:', e ? Object.keys(e) : 'null');

            // エラーメッセージを安全に取得
            let errorMsg = 'Unknown error';
            try {
              if (e?.error?.message) {
                errorMsg = e.error.message;
              } else if (e?.message) {
                errorMsg = e.message;
              } else if (e?.originalEvent?.message) {
                errorMsg = e.originalEvent.message;
              } else if (e?.sourceDataType) {
                // Mapbox source data error
                errorMsg = `Data load error: ${e.sourceDataType}`;
              } else if (typeof e === 'string') {
                errorMsg = e;
              } else if (e && typeof e === 'object') {
                // 利用可能なプロパティを探索
                const keys = Object.keys(e);
                console.error('[TrafficInfo] Available error properties:', keys);
                for (const key of keys) {
                  if (key !== 'target' && e[key] && typeof e[key] === 'string') {
                    errorMsg = e[key];
                    break;
                  }
                }
              }
            } catch (parseError) {
              console.error('[TrafficInfo] Error parsing error:', parseError);
            }

            console.error('[TrafficInfo] Final error message:', errorMsg);
            setError(`マップエラー: ${errorMsg}`);
            setIsLoading(false);
          });
        }
      } catch (err) {
        console.error('Failed to initialize Mini Tokyo 3D:', err);
        setError('Mini Tokyo 3D の初期化に失敗しました');
        setIsLoading(false);
      }
    };

    loadMiniTokyo3D();

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);


  if (error) {
    return (
      <div className="flex items-center justify-center bg-red-50 dark:bg-red-900/20 rounded-lg h-[300px] sm:h-[400px] md:h-[500px]">
        <div className="text-center p-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  // フルスクリーン時は100vh、通常時はレスポンシブ高さ
  const heightClass = isFullscreen
    ? 'h-screen'
    : 'h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px]';

  return (
    <div className={`relative w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden ${heightClass}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg z-10">
          <div className="text-center w-48 sm:w-64 px-4">
            <Train className="w-10 h-10 sm:w-12 sm:h-12 text-blue-500 animate-pulse mx-auto mb-3" />
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-3">マップを読み込み中...</p>
            {/* 進捗バー */}
            <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-2">{loadingProgress}%</p>
          </div>
        </div>
      )}
      {/* コンテナをabsolute positionで親要素いっぱいに配置 */}
      <div
        ref={containerRef}
        className="absolute inset-0"
      />
      {/* Mini Tokyo 3D / Mapbox GL JS の全ての要素を強制的にフルサイズにするCSS */}
      <style>{`
        .mini-tokyo-3d,
        .mini-tokyo-3d .mapboxgl-map,
        .mini-tokyo-3d .mapboxgl-canvas-container,
        .mini-tokyo-3d .mapboxgl-canvas,
        .mini-tokyo-3d canvas {
          width: 100% !important;
          height: 100% !important;
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
        }
        /* Mini Tokyo 3D の内部ローディングインジケーターを非表示 */
        .mini-tokyo-3d .loader,
        .mini-tokyo-3d .loading-container,
        .mini-tokyo-3d .loading,
        .mini-tokyo-3d .spinner,
        .mini-tokyo-3d .progress,
        .mini-tokyo-3d [class*="loader"],
        .mini-tokyo-3d [class*="loading"],
        .mini-tokyo-3d [class*="spinner"] {
          display: none !important;
        }
      `}</style>
    </div>
  );
};

// メインコンポーネント
const TrafficInfoPage: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
  }, []);

  // トークン未設定の場合は設定ガイドを表示
  if (!hasRequiredTokens()) {
    return (
      <div className="w-full max-w-full overflow-x-hidden space-y-3 sm:space-y-4">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Train className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 dark:text-blue-400 flex-shrink-0" />
          <h2 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
            交通情報
          </h2>
        </div>
        <TokenSetupGuide />
      </div>
    );
  }

  // フルスクリーンモード
  if (isFullscreen) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-900">
        <button
          onClick={toggleFullscreen}
          className="absolute top-4 right-4 z-50 bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700"
          title="通常表示に戻す"
        >
          <Minimize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>
        <MiniTokyo3DMap isFullscreen={true} />
      </div>
    );
  }

  return (
    <div className="w-full max-w-full overflow-x-hidden">
      <div className="space-y-3 sm:space-y-4 px-0">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <Train className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
            <h2 className="text-sm sm:text-xl font-bold text-gray-900 dark:text-gray-100 truncate">
              交通情報
            </h2>
          </div>
          <button
            onClick={toggleFullscreen}
            className="flex items-center justify-center space-x-1 px-2 sm:px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm flex-shrink-0"
            title="全画面表示"
          >
            <Maximize2 className="w-4 h-4" />
            <span className="hidden sm:inline">全画面</span>
          </button>
        </div>

        {/* マップエリア */}
        <MiniTokyo3DMap isFullscreen={false} />

        {/* 使い方ガイド */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 sm:p-4">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <Info className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-3 min-w-0 flex-1">
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1 text-sm sm:text-base">マップ操作</h3>
                <ul className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 space-y-0.5">
                  <li>• ドラッグで移動、ピンチでズーム</li>
                  <li>• 電車タップで詳細表示</li>
                </ul>
              </div>
              <div>
                <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-1 text-sm sm:text-base">ハイブリッド勤務での活用</h3>
                <ul className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 space-y-0.5">
                  <li>• 通勤路線の運行をリアルタイム確認</li>
                  <li>• 運行停止時はリモート切替を検討</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 重要な注意事項 */}
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3 sm:p-4">
          <div className="flex items-start space-x-2 sm:space-x-3">
            <AlertCircle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="min-w-0 flex-1">
              <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-1 text-sm sm:text-base">重要</h3>
              <p className="text-xs sm:text-sm text-amber-700 dark:text-amber-300">
                リモート切り替えは<strong>上長確認必須</strong>
              </p>
            </div>
          </div>
        </div>

        {/* 勤怠連携ヒント */}
        <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 sm:p-4">
          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            💡 遅延による遅刻は勤怠分析タブ参照
          </p>
        </div>

        {/* 著作権・クレジット表示 */}
        <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 sm:p-4 text-xs text-gray-600 dark:text-gray-400 space-y-2">
          <div className="font-medium text-gray-700 dark:text-gray-300 text-xs sm:text-sm">クレジット</div>
          <div className="space-y-1 text-xs break-words">
            <div>
              <span>マップ: </span>
              <a href="https://minitokyo3d.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Mini Tokyo 3D</a>
              <span> © Akihiko Kusanagi </span>
              <a href="https://github.com/nagix/mini-tokyo-3d/blob/master/LICENSE" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">(MIT)</a>
            </div>
            <div>
              <span>データ: </span>
              <a href="https://www.odpt.org/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">公共交通オープンデータセンター</a>
              <span> </span>
              <a href="https://creativecommons.org/licenses/by/4.0/deed.ja" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">(CC BY 4.0)</a>
            </div>
            <div>
              <span>地図: </span>
              <a href="https://www.mapbox.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 dark:text-blue-400 hover:underline">Mapbox</a>
              <span> © OpenStreetMap</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficInfoPage;
