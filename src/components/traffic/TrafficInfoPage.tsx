// src/components/traffic/TrafficInfoPage.tsx
// 交通情報タブ - Mini Tokyo 3D 統合

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Train, ExternalLink, AlertCircle, Maximize2, Minimize2, Info } from 'lucide-react';

// 環境変数からAPIトークンを取得
const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN;
const ODPT_TOKEN = process.env.REACT_APP_ODPT_TOKEN;
const CHALLENGE_TOKEN = process.env.REACT_APP_CHALLENGE_TOKEN;

// トークンが設定されているかチェック（Mapbox + ODPTは必須、Challengeは任意）
const hasRequiredTokens = (): boolean => {
  return !!(MAPBOX_TOKEN && ODPT_TOKEN);
};

// APIトークン設定ガイドコンポーネント
const TokenSetupGuide: React.FC = () => (
  <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6">
    <div className="flex items-start space-x-3">
      <AlertCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
      <div>
        <h3 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
          APIトークンの設定が必要です
        </h3>
        <p className="text-yellow-700 dark:text-yellow-300 mb-4">
          Mini Tokyo 3D を利用するには、以下のAPIトークンが必要です。
        </p>

        <div className="space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded p-4 border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              1. Mapbox
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              地図タイルの表示に必要です（月50,000接続まで無料）。
            </p>
            <a
              href="https://www.mapbox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              Mapboxで無料登録
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded p-4 border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              2. 公共交通オープンデータセンター（ODPTセンター用）
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              列車・旅客機のリアルタイムデータを取得するために必要です。登録完了まで数日かかる場合があります。
            </p>
            <a
              href="https://developer.odpt.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              開発者サイトで無料登録
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded p-4 border border-yellow-200 dark:border-yellow-800">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              3. 公共交通オープンデータチャレンジ2025（任意）
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              追加の列車・旅客機データを取得できます。チャレンジへのエントリーが必要です。
            </p>
            <a
              href="https://developer.odpt.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline text-sm"
            >
              チャレンジにエントリー
              <ExternalLink className="w-3 h-3 ml-1" />
            </a>
          </div>

          <div className="bg-gray-100 dark:bg-gray-700 rounded p-4">
            <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-2">
              設定方法
            </h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              取得したトークンを <code className="bg-gray-200 dark:bg-gray-600 px-1 rounded">.env</code> ファイルに設定してください：
            </p>
            <pre className="text-xs bg-gray-200 dark:bg-gray-600 p-2 rounded overflow-x-auto">
{`REACT_APP_MAPBOX_TOKEN=your_mapbox_token
REACT_APP_ODPT_TOKEN=your_odpt_token
REACT_APP_CHALLENGE_TOKEN=your_challenge_token（任意）`}
            </pre>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Mini Tokyo 3D マップコンポーネント
const MiniTokyo3DMap: React.FC<{ isFullscreen: boolean; containerHeight: string }> = ({ isFullscreen, containerHeight }) => {
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
          const secrets: { odpt: string; challenge2025?: string } = {
            odpt: ODPT_TOKEN!,
          };
          if (CHALLENGE_TOKEN) {
            secrets.challenge2025 = CHALLENGE_TOKEN;
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
            console.error('Mini Tokyo 3D error:', e);
            setError('マップの読み込み中にエラーが発生しました');
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
      <div className="flex items-center justify-center h-full bg-red-50 dark:bg-red-900/20 rounded-lg">
        <div className="text-center p-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-2" />
          <p className="text-red-700 dark:text-red-300">{error}</p>
        </div>
      </div>
    );
  }

  const height = isFullscreen ? '100vh' : containerHeight;

  return (
    <div className="relative w-full bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden" style={{ height }}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 rounded-lg z-10">
          <div className="text-center w-64">
            <Train className="w-12 h-12 text-blue-500 animate-pulse mx-auto mb-3" />
            <p className="text-gray-600 dark:text-gray-300 mb-3">マップを読み込み中...</p>
            {/* 進捗バー */}
            <div className="w-full bg-gray-300 dark:bg-gray-600 rounded-full h-2">
              <div
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${loadingProgress}%` }}
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">{loadingProgress}%</p>
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
      <div className="space-y-6">
        <div className="flex items-center space-x-3 mb-4">
          <Train className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            交通情報 - リアルタイム路線マップ
          </h2>
        </div>
        <TokenSetupGuide />
      </div>
    );
  }

  // マップの高さを計算
  const mapHeight = '600px';

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
        <MiniTokyo3DMap isFullscreen={true} containerHeight="100vh" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Train className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            交通情報 - リアルタイム路線マップ
          </h2>
        </div>
        <button
          onClick={toggleFullscreen}
          className="flex items-center space-x-1 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          title="全画面表示"
        >
          <Maximize2 className="w-4 h-4" />
          <span>全画面</span>
        </button>
      </div>

      {/* マップエリア */}
      <MiniTokyo3DMap isFullscreen={false} containerHeight={mapHeight} />

      {/* 使い方ガイド */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <Info className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="space-y-3">
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">マップ操作</h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• マウスドラッグで視点を移動、スクロールでズーム</li>
                <li>• 電車アイコンをクリックすると詳細情報を表示</li>
                <li>• 遅延情報は各路線の色で確認できます</li>
              </ul>
            </div>
            <div>
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">ハイブリッド勤務での活用</h3>
              <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
                <li>• 自分の通勤路線・目的地周辺の電車の動きをリアルタイムで確認できます</li>
                <li>• 明らかに電車が運行停止している場合、リモート勤務切り替えを検討しチームに相談しましょう</li>
                <li>• 他の路線が停止しているときなどに自分の利用路線が稼働している場合は出社切り替えなど積極的に提案してください</li>
                <li>• 帰宅時も同様に運行状況を確認し、臨機応変に判断しましょう</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* 重要な注意事項 */}
      <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-amber-800 dark:text-amber-200 mb-2">重要：リモート切り替えの判断について</h3>
            <p className="text-sm text-amber-700 dark:text-amber-300">
              運行状況に基づくリモート勤務への切り替えは、<strong>個人の判断では行わないでください</strong>。
              必ず<strong>リーダーまたは課長に確認</strong>の上、指示を仰いでください。
            </p>
          </div>
        </div>
      </div>

      {/* 勤怠連携ヒント */}
      <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          💡 電車遅延による遅刻の場合は、「勤怠分析」タブの電車遅延申請ガイドを参照してください。
          遅延証明書のスクリーンショットが必要です。
        </p>
      </div>

      {/* 著作権・クレジット表示 */}
      <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 text-xs text-gray-600 dark:text-gray-400 space-y-2">
        <div className="font-medium text-gray-700 dark:text-gray-300">クレジット・ライセンス</div>
        <div className="space-y-1">
          <div>
            マップエンジン:{' '}
            <a
              href="https://minitokyo3d.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mini Tokyo 3D
            </a>
            {' '}© Akihiko Kusanagi（
            <a
              href="https://github.com/nagix/mini-tokyo-3d/blob/master/LICENSE"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              MIT License
            </a>
            ）
          </div>
          <div>
            公共交通データ:{' '}
            <a
              href="https://www.odpt.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              公共交通オープンデータセンター
            </a>
            （
            <a
              href="https://creativecommons.org/licenses/by/4.0/deed.ja"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              CC BY 4.0
            </a>
            ）
          </div>
          <div>
            地図タイル:{' '}
            <a
              href="https://www.mapbox.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 dark:text-blue-400 hover:underline"
            >
              Mapbox
            </a>
            {' '}© Mapbox © OpenStreetMap
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrafficInfoPage;
