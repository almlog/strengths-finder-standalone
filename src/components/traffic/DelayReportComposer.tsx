/**
 * 遅延報告メッセージ作成コンポーネント
 * @module components/traffic/DelayReportComposer
 *
 * 2つのモードをサポート:
 * 1. 自動モード: 遅延情報がある場合、遅延情報から自動入力
 * 2. 手動モード: 遅延情報がない場合、路線名・遅延理由を自由入力
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  AlertTriangle,
  Clock,
  MapPin,
  Copy,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  Edit3,
  Train,
} from 'lucide-react';
import { TrainDelayInfo } from '../../types/trainDelay';
import { StationInfo, NearestStationResult } from '../../types/station';
import { useGeolocation } from '../../hooks/useGeolocation';
import { StationDataService } from '../../services/StationDataService';
import { NearestStationService } from '../../services/NearestStationService';

interface DelayReportComposerProps {
  /** 現在の遅延情報リスト */
  currentDelays: TrainDelayInfo[];
  /** ODPTトークン */
  token: string;
  /** 外部から選択された遅延情報（履歴クリック時など） */
  externalDelay?: TrainDelayInfo | null;
  /** 外部遅延情報のクリアコールバック */
  onClearExternalDelay?: () => void;
  /** 外部から選択された路線名（電車クリック時など） */
  externalRailwayName?: string | null;
  /** 外部路線名のクリアコールバック */
  onClearExternalRailway?: () => void;
}

/**
 * 入力モード
 */
type InputMode = 'auto' | 'manual';

/**
 * 主要路線リスト（手動入力用）
 */
const COMMON_RAILWAYS = [
  { id: 'chuo-rapid', name: '中央線快速' },
  { id: 'chuo-sobu', name: '中央・総武線各停' },
  { id: 'yamanote', name: '山手線' },
  { id: 'keihin-tohoku', name: '京浜東北線' },
  { id: 'sobu-rapid', name: '総武線快速' },
  { id: 'tokaido', name: '東海道線' },
  { id: 'saikyo', name: '埼京線' },
  { id: 'takasaki', name: '高崎線' },
  { id: 'utsunomiya', name: '宇都宮線' },
  { id: 'ginza', name: '銀座線' },
  { id: 'marunouchi', name: '丸ノ内線' },
  { id: 'hibiya', name: '日比谷線' },
  { id: 'tozai', name: '東西線' },
  { id: 'chiyoda', name: '千代田線' },
  { id: 'yurakucho', name: '有楽町線' },
  { id: 'hanzomon', name: '半蔵門線' },
  { id: 'namboku', name: '南北線' },
  { id: 'fukutoshin', name: '副都心線' },
  { id: 'asakusa', name: '都営浅草線' },
  { id: 'mita', name: '都営三田線' },
  { id: 'shinjuku', name: '都営新宿線' },
  { id: 'oedo', name: '都営大江戸線' },
  { id: 'tokyu-toyoko', name: '東急東横線' },
  { id: 'tokyu-denentoshi', name: '東急田園都市線' },
  { id: 'odakyu', name: '小田急小田原線' },
  { id: 'keio', name: '京王線' },
  { id: 'keio-inokashira', name: '京王井の頭線' },
  { id: 'seibu-ikebukuro', name: '西武池袋線' },
  { id: 'seibu-shinjuku', name: '西武新宿線' },
  { id: 'tobu-tojo', name: '東武東上線' },
  { id: 'tobu-skytree', name: '東武スカイツリーライン' },
];

/**
 * 遅延報告メッセージ作成コンポーネント
 */
const DelayReportComposer: React.FC<DelayReportComposerProps> = ({
  currentDelays,
  token,
  externalDelay,
  onClearExternalDelay,
  externalRailwayName,
  onClearExternalRailway,
}) => {
  // 外部から選択された遅延情報があるか
  const hasExternalDelay = !!externalDelay;
  // 外部から路線名が選択されたか（電車クリック）
  const hasExternalRailway = !!externalRailwayName;

  // 入力モード（自動/手動）- ユーザーが切り替え可能
  // 外部遅延がある場合は自動、外部路線名がある場合は手動をデフォルト
  const [inputMode, setInputMode] = useState<InputMode>(
    hasExternalDelay ? 'auto' : hasExternalRailway ? 'manual' : currentDelays.length > 0 ? 'auto' : 'manual'
  );

  // 実際のモード判定
  const isManualMode = inputMode === 'manual';

  // 状態管理
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedDelayIndex, setSelectedDelayIndex] = useState(0);
  const [delayMinutes, setDelayMinutes] = useState<number | ''>('');
  const [selectedStation, setSelectedStation] = useState<StationInfo | null>(null);
  const [nearestStations, setNearestStations] = useState<NearestStationResult[]>([]);
  const [stations, setStations] = useState<StationInfo[]>([]);
  const [isLoadingStations, setIsLoadingStations] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // 手動入力用の状態
  const [manualRailway, setManualRailway] = useState('');
  const [manualRailwayCustom, setManualRailwayCustom] = useState('');
  const [manualReason, setManualReason] = useState('');

  // 位置情報フック
  const { coordinate, status: geoStatus, error: geoError, requestLocation } = useGeolocation();

  // サービス
  const stationDataService = useMemo(() => new StationDataService(token), [token]);
  const nearestStationService = useMemo(() => new NearestStationService(), []);

  // 選択中の遅延情報（外部から選択された場合はそれを優先）
  const selectedDelay = hasExternalDelay
    ? externalDelay
    : currentDelays[selectedDelayIndex] || null;

  // 駅データの読み込み
  useEffect(() => {
    const loadStations = async () => {
      setIsLoadingStations(true);
      try {
        // キャッシュが有効ならキャッシュから、そうでなければAPIから取得
        if (stationDataService.isCacheValid()) {
          const cached = stationDataService.loadFromCache();
          if (cached) {
            setStations(cached);
            setIsLoadingStations(false);
            return;
          }
        }
        const data = await stationDataService.fetchStations();
        setStations(data);
      } catch (error) {
        console.error('[DelayReportComposer] Failed to load stations:', error);
      } finally {
        setIsLoadingStations(false);
      }
    };

    loadStations();
  }, [stationDataService]);

  // 位置情報から最寄り駅を検出
  // coordinateが変わったら常に最寄り駅を更新する
  useEffect(() => {
    if (coordinate && stations.length > 0) {
      const nearest = nearestStationService.findNearestN(coordinate, stations, 5);
      setNearestStations(nearest);
      // coordinateが新しく取得された場合は常に最寄り駅を設定
      if (nearest.length > 0) {
        setSelectedStation(nearest[0].station);
      }
    }
  }, [coordinate, stations, nearestStationService]);

  // 遅延情報が1件の場合は自動選択
  useEffect(() => {
    if (currentDelays.length === 1) {
      setSelectedDelayIndex(0);
    }
  }, [currentDelays]);

  // 外部遅延情報が選択された場合は自動モードに切り替え
  useEffect(() => {
    if (hasExternalDelay) {
      setInputMode('auto');
    }
  }, [hasExternalDelay]);

  // 外部路線名が選択された場合は手動モードに切り替えて路線名を設定
  useEffect(() => {
    if (externalRailwayName) {
      setInputMode('manual');
      // COMMON_RAILWAYSで一致するものを探す
      const matchingRailway = COMMON_RAILWAYS.find(r => r.name === externalRailwayName);
      if (matchingRailway) {
        setManualRailway(matchingRailway.id);
        setManualRailwayCustom('');
      } else {
        setManualRailway('custom');
        setManualRailwayCustom(externalRailwayName);
      }
    }
  }, [externalRailwayName]);

  // 手動入力の路線名を取得
  const getManualRailwayName = (): string => {
    if (manualRailway === 'custom') {
      return manualRailwayCustom;
    }
    const railway = COMMON_RAILWAYS.find(r => r.id === manualRailway);
    return railway?.name || '';
  };

  // メッセージ生成
  const generateMessage = (): string => {
    const delayTimeText = delayMinutes ? `${delayMinutes}` : '○○';
    const stationText = selectedStation?.name || '▼▼';

    if (isManualMode) {
      // 手動モード
      const railwayName = getManualRailwayName() || '○○線';
      const reasonText = manualReason || '遅延';

      return `おはようございます。
"${railwayName} ${reasonText}"の影響で遅延が発生しています。
その影響で現場到着が${delayTimeText}分遅れる見込みです。
現在${stationText}です。`;
    } else {
      // 自動モード
      if (!selectedDelay) return '';

      // 路線名 + 遅延理由で自然な日本語にする
      // 例: "中央線快速 人身事故"
      let delayText = selectedDelay.railwayName;
      if (selectedDelay.cause) {
        delayText += ` ${selectedDelay.cause}`;
      } else if (selectedDelay.status === 'suspended') {
        delayText += ' 運転見合わせ';
      }
      if (selectedDelay.delayMinutes) {
        delayText += `（約${selectedDelay.delayMinutes}分遅れ）`;
      }

      return `おはようございます。
"${delayText}"の影響で遅延が発生しています。
その影響で現場到着が${delayTimeText}分遅れる見込みです。
現在${stationText}です。`;
    }
  };

  // コピー機能
  const handleCopy = async () => {
    const message = generateMessage();
    try {
      await navigator.clipboard.writeText(message);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (error) {
      console.error('[DelayReportComposer] Copy failed:', error);
    }
  };

  // 入力完了チェック
  const isComplete = isManualMode
    ? (manualRailway && (manualRailway !== 'custom' || manualRailwayCustom) && manualReason && delayMinutes && selectedStation)
    : (selectedDelay && delayMinutes && selectedStation);

  // 遅延情報の表示テキスト
  const getDelayDisplayText = (delay: TrainDelayInfo): string => {
    let text = delay.railwayName;
    if (delay.cause) {
      text += ` - ${delay.cause}`;
    }
    if (delay.delayMinutes) {
      text += ` (約${delay.delayMinutes}分遅れ)`;
    } else if (delay.status === 'suspended') {
      text += ' (運転見合わせ)';
    }
    return text;
  };

  // 駅の表示テキスト
  const getStationDisplayText = (result: NearestStationResult): string => {
    const distanceText = result.distance < 1000
      ? `${Math.round(result.distance)}m`
      : `${(result.distance / 1000).toFixed(1)}km`;
    return `${result.station.name}（${result.station.railwayName}）- ${distanceText}`;
  };

  // 自動モードが使用可能か（遅延情報または外部遅延がある場合）
  const canUseAutoMode = currentDelays.length > 0 || hasExternalDelay;

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-750 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <Train className="w-5 h-5" />
          <span className="font-medium text-sm">遅延報告メッセージ作成</span>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
        >
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          )}
        </button>
      </div>

      {/* モード切り替えタブ */}
      {isExpanded && (
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setInputMode('auto')}
            disabled={!canUseAutoMode}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              inputMode === 'auto'
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-b-2 border-amber-500'
                : canUseAutoMode
                  ? 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                  : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>遅延情報から作成</span>
            {currentDelays.length > 0 && (
              <span className="px-1.5 py-0.5 text-xs bg-amber-500 text-white rounded-full">
                {currentDelays.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setInputMode('manual')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-colors ${
              inputMode === 'manual'
                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-b-2 border-blue-500'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
            }`}
          >
            <Edit3 className="w-4 h-4" />
            <span>手動で入力</span>
          </button>
        </div>
      )}

      {/* コンテンツ */}
      {isExpanded && (
        <div className={`px-4 py-4 space-y-4 ${isManualMode ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-amber-50 dark:bg-amber-900/10'}`}>
          {/* 外部選択された路線名バナー */}
          {hasExternalRailway && externalRailwayName && isManualMode && (
            <div className="flex items-center justify-between p-2 bg-purple-100 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-800 rounded-lg">
              <div className="flex items-center gap-2 text-purple-700 dark:text-purple-300">
                <Train className="w-4 h-4" />
                <span className="text-sm font-medium">
                  電車から選択: {externalRailwayName}
                </span>
              </div>
              {onClearExternalRailway && (
                <button
                  onClick={onClearExternalRailway}
                  className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                >
                  解除
                </button>
              )}
            </div>
          )}

          {/* 外部選択された遅延情報バナー */}
          {hasExternalDelay && externalDelay && (
            <div className="flex items-center justify-between p-2 bg-green-100 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <AlertTriangle className="w-4 h-4" />
                <span className="text-sm font-medium">
                  履歴から選択: {externalDelay.railwayName}
                </span>
              </div>
              {onClearExternalDelay && (
                <button
                  onClick={onClearExternalDelay}
                  className="text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                >
                  解除
                </button>
              )}
            </div>
          )}

          {isManualMode ? (
            /* 手動入力モード */
            <>
              {/* 路線名選択 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  <Train className="w-4 h-4 inline mr-1" />
                  路線名<span className="text-red-500">*</span>
                </label>
                <select
                  value={manualRailway}
                  onChange={(e) => setManualRailway(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">路線を選択してください</option>
                  {COMMON_RAILWAYS.map((railway) => (
                    <option key={railway.id} value={railway.id}>
                      {railway.name}
                    </option>
                  ))}
                  <option value="custom">その他（自由入力）</option>
                </select>
                {manualRailway === 'custom' && (
                  <input
                    type="text"
                    value={manualRailwayCustom}
                    onChange={(e) => setManualRailwayCustom(e.target.value)}
                    placeholder="路線名を入力（例：東武野田線）"
                    className="w-full mt-2 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                  />
                )}
              </div>

              {/* 遅延理由入力 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  遅延理由<span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={manualReason}
                  onChange={(e) => setManualReason(e.target.value)}
                  placeholder="例：人身事故、信号トラブル、混雑"
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </>
          ) : hasExternalDelay && externalDelay ? (
            /* 外部選択モード */
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                遅延情報（履歴から選択）
              </label>
              <div className="px-3 py-2 text-sm bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg text-gray-900 dark:text-gray-100">
                {getDelayDisplayText(externalDelay)}
              </div>
            </div>
          ) : (
            /* 自動入力モード */
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                遅延情報
              </label>
              <select
                value={selectedDelayIndex}
                onChange={(e) => setSelectedDelayIndex(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
              >
                {currentDelays.map((delay, index) => (
                  <option key={delay.id} value={index}>
                    {getDelayDisplayText(delay)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* 遅延見込み時間入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              遅延見込み時間（分）<span className="text-red-500">*</span>
            </label>
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-gray-400" />
              <input
                type="number"
                min={1}
                max={180}
                value={delayMinutes}
                onChange={(e) => {
                  const value = e.target.value;
                  if (value === '') {
                    setDelayMinutes('');
                  } else {
                    const num = parseInt(value, 10);
                    if (num >= 1 && num <= 180) {
                      setDelayMinutes(num);
                    }
                  }
                }}
                placeholder="例: 20"
                className={`w-24 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 ${isManualMode ? 'focus:ring-blue-500' : 'focus:ring-amber-500'}`}
              />
              <span className="text-sm text-gray-500 dark:text-gray-400">分</span>
            </div>
          </div>

          {/* 現在地（駅）入力 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              現在地（駅）<span className="text-red-500">*</span>
            </label>

            {/* 位置情報取得ボタン */}
            <button
              onClick={requestLocation}
              disabled={geoStatus === 'requesting' || isLoadingStations}
              className="flex items-center gap-2 px-3 py-2 mb-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {geoStatus === 'requesting' || isLoadingStations ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <MapPin className="w-4 h-4" />
              )}
              {geoStatus === 'requesting' ? '取得中...' : '現在地から検出'}
            </button>

            {/* エラー表示 */}
            {geoError && (
              <p className="text-sm text-red-500 dark:text-red-400 mb-2">
                {geoError}
              </p>
            )}

            {/* 最寄り駅ドロップダウン */}
            {nearestStations.length > 0 ? (
              <select
                value={selectedStation?.id || ''}
                onChange={(e) => {
                  const station = nearestStations.find(
                    (ns) => ns.station.id === e.target.value
                  )?.station;
                  if (station) {
                    setSelectedStation(station);
                  }
                }}
                className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 ${isManualMode ? 'focus:ring-blue-500' : 'focus:ring-amber-500'}`}
              >
                {nearestStations.map((result) => (
                  <option key={result.station.id} value={result.station.id}>
                    {getStationDisplayText(result)}
                  </option>
                ))}
              </select>
            ) : stations.length > 0 ? (
              // 位置情報なしの場合は全駅から選択
              <select
                value={selectedStation?.id || ''}
                onChange={(e) => {
                  const station = stations.find((s) => s.id === e.target.value);
                  if (station) {
                    setSelectedStation(station);
                  }
                }}
                className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 ${isManualMode ? 'focus:ring-blue-500' : 'focus:ring-amber-500'}`}
              >
                <option value="">駅を選択してください</option>
                {stations.slice(0, 100).map((station) => (
                  <option key={station.id} value={station.id}>
                    {station.name}（{station.railwayName}）
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isLoadingStations ? '駅データを読み込み中...' : '「現在地から検出」ボタンを押して駅を選択してください'}
              </p>
            )}
          </div>

          {/* メッセージプレビュー */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              メッセージプレビュー
            </label>
            <div className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
              <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans">
                {generateMessage()}
              </pre>
            </div>
          </div>

          {/* コピーボタン */}
          <button
            onClick={handleCopy}
            disabled={!isComplete}
            className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
              isComplete
                ? isCopied
                  ? 'bg-green-600 text-white'
                  : isManualMode
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-amber-600 text-white hover:bg-amber-700'
                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
            }`}
          >
            {isCopied ? (
              <>
                <Check className="w-5 h-5" />
                コピーしました！
              </>
            ) : (
              <>
                <Copy className="w-5 h-5" />
                メッセージをコピー
              </>
            )}
          </button>

          {/* 注意書き */}
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            ※LINEWORKSなどに貼り付けてください
          </p>
        </div>
      )}
    </div>
  );
};

export default DelayReportComposer;
