/**
 * 遅延報告メッセージ作成コンポーネント
 * @module components/traffic/DelayReportComposer
 *
 * 2つのモードをサポート:
 * 1. 自動モード: 遅延情報がある場合、遅延情報から自動入力
 * 2. 手動モード: 遅延情報がない場合、路線名・遅延理由を自由入力
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
 * 路線名の英語→日本語マッピング
 * ODPT APIの路線ID（英語）とYahoo等から取得する遅延情報の路線名（日本語）をマッチングするため
 */
const RAILWAY_NAME_MAP: Record<string, string[]> = {
  // 東急
  'Setagaya': ['世田谷線', '東急世田谷線'],
  'Toyoko': ['東横線', '東急東横線'],
  'DenEnToshi': ['田園都市線', '東急田園都市線'],
  'Meguro': ['目黒線', '東急目黒線'],
  'Oimachi': ['大井町線', '東急大井町線'],
  'Ikegami': ['池上線', '東急池上線'],
  'TokyuTamagawa': ['東急多摩川線', '多摩川線'],
  // JR
  'ChuoRapid': ['中央線快速', '中央線', '中央快速線'],
  'ChuoSobuLocal': ['中央・総武線各停', '中央総武線', '総武線各停', '中央線各停'],
  'Yamanote': ['山手線'],
  'KeihinTohoku': ['京浜東北線'],
  'Tokaido': ['東海道線'],
  'Yokosuka': ['横須賀線'],
  'SobuRapid': ['総武線快速', '総武快速線'],
  'Saikyo': ['埼京線'],
  'ShonanShinjuku': ['湘南新宿ライン'],
  'Takasaki': ['高崎線'],
  'Utsunomiya': ['宇都宮線'],
  'Joban': ['常磐線'],
  'Musashino': ['武蔵野線'],
  'Nambu': ['南武線'],
  'Yokohama': ['横浜線'],
  'Chuo': ['中央線'],
  // 東京メトロ
  'Ginza': ['銀座線', '東京メトロ銀座線'],
  'Marunouchi': ['丸ノ内線', '丸の内線', '東京メトロ丸ノ内線'],
  'Hibiya': ['日比谷線', '東京メトロ日比谷線'],
  'Tozai': ['東西線', '東京メトロ東西線'],
  'Chiyoda': ['千代田線', '東京メトロ千代田線'],
  'Yurakucho': ['有楽町線', '東京メトロ有楽町線'],
  'Hanzomon': ['半蔵門線', '東京メトロ半蔵門線'],
  'Namboku': ['南北線', '東京メトロ南北線'],
  'Fukutoshin': ['副都心線', '東京メトロ副都心線'],
  // 都営
  'Asakusa': ['浅草線', '都営浅草線'],
  'Mita': ['三田線', '都営三田線'],
  'ToeiShinjuku': ['新宿線', '都営新宿線'],
  'Oedo': ['大江戸線', '都営大江戸線'],
  // 小田急
  'Odawara': ['小田原線', '小田急小田原線', '小田急線'],
  'Enoshima': ['江ノ島線', '小田急江ノ島線'],
  'OdakyuTama': ['多摩線', '小田急多摩線'],
  // 京王
  'KeioLine': ['京王線'],
  'Inokashira': ['井の頭線', '京王井の頭線'],
  'Sagamihara': ['相模原線', '京王相模原線'],
  // 西武
  'SeibuIkebukuro': ['池袋線', '西武池袋線'],
  'SeibuShinjuku': ['新宿線', '西武新宿線'],
  // 東武
  'Tojo': ['東上線', '東武東上線'],
  'Skytree': ['スカイツリーライン', '東武スカイツリーライン', '伊勢崎線'],
  'Isesaki': ['伊勢崎線', '東武伊勢崎線'],
};

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
  // 駅名の手動入力
  const [isManualStationInput, setIsManualStationInput] = useState(false);
  const [manualStationName, setManualStationName] = useState('');

  // 位置情報フック
  const { coordinate, status: geoStatus, error: geoError, requestLocation } = useGeolocation();

  // サービス
  const stationDataService = useMemo(() => new StationDataService(token), [token]);
  const nearestStationService = useMemo(() => new NearestStationService(), []);

  // 選択中の遅延情報（外部から選択された場合はそれを優先）
  const selectedDelay = hasExternalDelay
    ? externalDelay
    : currentDelays[selectedDelayIndex] || null;

  // 路線名のマッチング（部分一致・類似名対応）
  const matchRailwayName = useCallback((stationRailway: string, delayRailway: string): boolean => {
    if (!stationRailway || !delayRailway) return false;

    // 完全一致
    if (stationRailway === delayRailway) return true;

    // 正規化関数
    const normalize = (name: string) =>
      name
        .replace(/[・\s　]/g, '')
        .replace(/各停$|各駅停車$|快速$|急行$/, '')
        .replace(/^東急|^東京メトロ|^都営|^JR|^ＪＲ/, '');

    const normalizedStation = normalize(stationRailway);
    const normalizedDelay = normalize(delayRailway);

    // 正規化後の完全一致
    if (normalizedStation === normalizedDelay) return true;

    // 部分一致（一方が他方を含む）
    if (normalizedStation.includes(normalizedDelay) || normalizedDelay.includes(normalizedStation)) {
      return true;
    }

    // 英語名→日本語名のマッピングでチェック
    for (const [engName, jpNames] of Object.entries(RAILWAY_NAME_MAP)) {
      // 駅側が英語名の場合
      if (stationRailway.includes(engName)) {
        // 遅延側が対応する日本語名のいずれかに一致するか
        if (jpNames.some(jp => delayRailway.includes(jp) || normalize(delayRailway).includes(normalize(jp)))) {
          return true;
        }
      }
      // 遅延側が日本語名の場合
      if (jpNames.some(jp => delayRailway.includes(jp))) {
        // 駅側が英語名を含むか
        if (stationRailway.includes(engName)) {
          return true;
        }
        // 駅側も日本語名のいずれかに一致するか
        if (jpNames.some(jp => stationRailway.includes(jp) || normalize(stationRailway).includes(normalize(jp)))) {
          return true;
        }
      }
    }

    // 「線」を除去した名前で比較
    const stripLine = (name: string) => normalize(name).replace(/線$/, '');
    if (stripLine(stationRailway) === stripLine(delayRailway)) return true;

    return false;
  }, []);

  // 現在選択されている路線名を取得（自動モード or 手動モード）
  const currentRailwayName = useMemo(() => {
    if (isManualMode) {
      // 手動モードの場合、選択された路線名を取得
      if (manualRailway === 'custom') {
        return manualRailwayCustom;
      }
      const railway = COMMON_RAILWAYS.find(r => r.id === manualRailway);
      return railway?.name || '';
    } else {
      // 自動モードの場合、遅延情報の路線名を使用
      return selectedDelay?.railwayName || '';
    }
  }, [isManualMode, manualRailway, manualRailwayCustom, selectedDelay?.railwayName]);

  // 選択された路線の駅をフィルタリング（自動・手動両モード対応）
  const filteredStationsByRailway = useMemo(() => {
    console.log('[DelayReportComposer] Filtering - currentRailwayName:', currentRailwayName);
    console.log('[DelayReportComposer] Filtering - total stations:', stations.length);

    if (!currentRailwayName || stations.length === 0) {
      console.log('[DelayReportComposer] Filtering - early return (no railway or no stations)');
      return [];
    }

    // デバッグ: 最初の数駅のrailway情報を表示
    if (stations.length > 0) {
      console.log('[DelayReportComposer] Sample station railways:', stations.slice(0, 5).map(s => ({
        name: s.name,
        railway: s.railway,
        railwayName: s.railwayName
      })));
    }

    const filtered = stations.filter(station => {
      // railwayName同士でマッチング
      if (matchRailwayName(station.railwayName, currentRailwayName)) {
        return true;
      }
      // 駅のrailway ID（例: odpt.Railway:Tokyu.Setagaya）から路線名部分を抽出してマッチング
      const railwayIdParts = station.railway.split('.');
      const railwayIdName = railwayIdParts[railwayIdParts.length - 1] || '';
      if (matchRailwayName(railwayIdName, currentRailwayName)) {
        return true;
      }
      return false;
    });

    console.log('[DelayReportComposer] Filtered stations:', filtered.length);
    if (filtered.length > 0) {
      console.log('[DelayReportComposer] First few filtered:', filtered.slice(0, 3).map(s => s.name));
    }

    return filtered;
  }, [stations, currentRailwayName, matchRailwayName]);

  // 駅データの読み込み
  useEffect(() => {
    const loadStations = async () => {
      setIsLoadingStations(true);
      console.log('[DelayReportComposer] Starting station load...');
      console.log('[DelayReportComposer] Token status:', token ? `set (${token.substring(0, 8)}...)` : 'NOT SET');

      try {
        // キャッシュが有効ならキャッシュから、そうでなければAPIから取得
        if (stationDataService.isCacheValid()) {
          console.log('[DelayReportComposer] Cache is valid, loading from cache');
          const cached = stationDataService.loadFromCache();
          if (cached) {
            console.log('[DelayReportComposer] Loaded from cache:', cached.length, 'stations');
            setStations(cached);
            setIsLoadingStations(false);
            return;
          }
        }
        console.log('[DelayReportComposer] Fetching from API...');
        const data = await stationDataService.fetchStations();
        console.log('[DelayReportComposer] Loaded stations:', data.length);
        if (data.length > 0) {
          console.log('[DelayReportComposer] Sample railways:', [...new Set(data.slice(0, 20).map(s => s.railwayName))]);
        }
        setStations(data);
      } catch (error) {
        console.error('[DelayReportComposer] Failed to load stations:', error);
      } finally {
        setIsLoadingStations(false);
      }
    };

    loadStations();
  }, [stationDataService, token]);

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
    // 手動入力の場合はその値を使用、そうでなければ選択された駅名
    const stationText = isManualStationInput
      ? (manualStationName || '【駅名を入力】')
      : (selectedStation?.name || '▼▼');

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

      // 遅延理由を追加（cause または informationText から抽出）
      if (selectedDelay.cause) {
        delayText += ` ${selectedDelay.cause}`;
      } else if (selectedDelay.informationText) {
        // informationTextから遅延理由を抽出
        const reasonMatch = selectedDelay.informationText.match(/(人身事故|車両点検|信号トラブル|車両故障|線路内点検|急病人|お客様対応|混雑|強風|大雨|地震|踏切|ダイヤ乱れ|運転見合わせ|直通運転中止|振替輸送)/);
        if (reasonMatch) {
          delayText += ` ${reasonMatch[1]}`;
        } else if (selectedDelay.status === 'suspended') {
          delayText += ' 運転見合わせ';
        } else if (selectedDelay.status === 'delayed') {
          delayText += ' 遅延';
        }
      } else if (selectedDelay.status === 'suspended') {
        delayText += ' 運転見合わせ';
      } else {
        delayText += ' 遅延';
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

  // 入力完了チェック（駅は手動入力または選択のどちらかがあればOK）
  const hasStation = isManualStationInput ? !!manualStationName : !!selectedStation;
  const isComplete = isManualMode
    ? (manualRailway && (manualRailway !== 'custom' || manualRailwayCustom) && manualReason && delayMinutes && hasStation)
    : (selectedDelay && delayMinutes && hasStation);

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

      {/* コンテンツ（コンパクトなスペーシング） */}
      {isExpanded && (
        <div className={`px-3 py-3 space-y-3 ${isManualMode ? 'bg-blue-50 dark:bg-blue-900/10' : 'bg-amber-50 dark:bg-amber-900/10'}`}>
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

            {/* 自動モードで遅延情報が選択されている場合 → その路線の駅を直接表示 */}
            {!isManualMode && selectedDelay ? (
              <div>
                {/* 路線の駅リスト（フィルタリング済み or 全駅から検索） */}
                {filteredStationsByRailway.length > 0 ? (
                  <>
                    <select
                      value={selectedStation?.id || ''}
                      onChange={(e) => {
                        if (e.target.value === '__manual__') {
                          setIsManualStationInput(true);
                          return;
                        }
                        const station = filteredStationsByRailway.find((s) => s.id === e.target.value);
                        if (station) {
                          setSelectedStation(station);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-amber-300 dark:border-amber-600 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">🚃 {selectedDelay.railwayName}の駅を選択</option>
                      {filteredStationsByRailway.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                      <option value="__manual__">📝 駅名を直接入力する</option>
                    </select>
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      📍 {selectedDelay.railwayName}（{filteredStationsByRailway.length}駅）
                    </p>
                  </>
                ) : isManualStationInput ? (
                  /* 手動入力モード */
                  <div>
                    <input
                      type="text"
                      value={manualStationName}
                      onChange={(e) => setManualStationName(e.target.value)}
                      placeholder="駅名を入力（例：新宿）"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      💡 コピー後にLINEWORKS等で修正も可能です
                    </p>
                  </div>
                ) : (
                  /* 駅データがマッチしない場合 → 直接手動入力UIを表示 */
                  <div>
                    <input
                      type="text"
                      value={manualStationName}
                      onChange={(e) => {
                        setManualStationName(e.target.value);
                        setIsManualStationInput(true);
                      }}
                      placeholder="駅名を入力（例：新宿）"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-amber-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      💡 現在地ボタンで最寄り駅を検索、または直接入力してください
                    </p>
                    <button
                      onClick={() => requestLocation()}
                      disabled={geoStatus === 'requesting'}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {geoStatus === 'requesting' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                      現在地から最寄り駅を検索
                    </button>
                  </div>
                )}

                {/* 別の方法で選択するオプション */}
                {filteredStationsByRailway.length > 0 && !isManualStationInput && (
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={() => {
                        setIsManualStationInput(false);
                        requestLocation();
                      }}
                      disabled={geoStatus === 'requesting'}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                    >
                      {geoStatus === 'requesting' ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        <MapPin className="w-3 h-3" />
                      )}
                      <span>現在地から探す</span>
                    </button>
                    <button
                      onClick={() => setIsManualStationInput(true)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>手動入力</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              /* 手動モード or 遅延情報未選択 */
              <>
                {/* 手動モードで路線が選択されている場合 → その路線の駅を表示 */}
                {isManualMode && currentRailwayName && filteredStationsByRailway.length > 0 ? (
                  <div>
                    <select
                      value={selectedStation?.id || ''}
                      onChange={(e) => {
                        if (e.target.value === '__manual__') {
                          setIsManualStationInput(true);
                          return;
                        }
                        const station = filteredStationsByRailway.find((s) => s.id === e.target.value);
                        if (station) {
                          setSelectedStation(station);
                        }
                      }}
                      className="w-full px-3 py-2 text-sm border border-blue-300 dark:border-blue-600 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">🚃 {currentRailwayName}の駅を選択</option>
                      {filteredStationsByRailway.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                      <option value="__manual__">📝 駅名を直接入力する</option>
                    </select>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                      📍 {currentRailwayName}（{filteredStationsByRailway.length}駅）
                    </p>
                    {/* 補助オプション */}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => {
                          requestLocation();
                        }}
                        disabled={geoStatus === 'requesting'}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
                      >
                        {geoStatus === 'requesting' ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <MapPin className="w-3 h-3" />
                        )}
                        <span>現在地から探す</span>
                      </button>
                      <button
                        onClick={() => setIsManualStationInput(true)}
                        className="flex-1 flex items-center justify-center gap-1 px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>手動入力</span>
                      </button>
                    </div>
                  </div>
                ) : isManualMode && currentRailwayName && filteredStationsByRailway.length === 0 ? (
                  /* 手動モードで路線選択済みだが駅データがない場合 → 直接入力UI */
                  <div>
                    <input
                      type="text"
                      value={manualStationName}
                      onChange={(e) => {
                        setManualStationName(e.target.value);
                        setIsManualStationInput(true);
                      }}
                      placeholder="駅名を入力（例：新宿）"
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      💡 現在地ボタンで最寄り駅を検索、または直接入力してください
                    </p>
                    <button
                      onClick={() => requestLocation()}
                      disabled={geoStatus === 'requesting'}
                      className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {geoStatus === 'requesting' ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <MapPin className="w-4 h-4" />
                      )}
                      現在地から最寄り駅を検索
                    </button>
                  </div>
                ) : (
                  /* 路線未選択の場合 → 従来のUI */
                  <>
                    {/* 入力モード切り替え */}
                    <div className="flex gap-2 mb-2">
                      <button
                        onClick={() => {
                          setIsManualStationInput(false);
                          requestLocation();
                        }}
                        disabled={geoStatus === 'requesting' || isLoadingStations}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                          !isManualStationInput
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        } disabled:opacity-50`}
                      >
                        {geoStatus === 'requesting' || isLoadingStations ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <MapPin className="w-3 h-3" />
                        )}
                        <span>現在地から</span>
                      </button>
                      <button
                        onClick={() => setIsManualStationInput(true)}
                        className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 text-xs rounded-lg transition-colors ${
                          isManualStationInput
                            ? 'bg-purple-600 text-white'
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                        }`}
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>手動入力</span>
                      </button>
                    </div>

                    {/* エラー表示 */}
                    {geoError && !isManualStationInput && (
                      <p className="text-sm text-red-500 dark:text-red-400 mb-2">
                        {geoError}
                      </p>
                    )}

                    {isManualStationInput ? (
                      /* 手動入力モード */
                      <div>
                        <input
                          type="text"
                          value={manualStationName}
                          onChange={(e) => setManualStationName(e.target.value)}
                          placeholder="駅名を入力（例：新宿）"
                          className={`w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 ${isManualMode ? 'focus:ring-blue-500' : 'focus:ring-amber-500'}`}
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          💡 コピー後にLINEWORKS等で修正も可能です
                        </p>
                      </div>
                    ) : nearestStations.length > 0 ? (
                      /* 最寄り駅ドロップダウン（位置情報から） */
              <select
                value={selectedStation?.id || ''}
                onChange={(e) => {
                  if (e.target.value === '__manual__') {
                    setIsManualStationInput(true);
                    return;
                  }
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
                <option value="__manual__">📝 その他（手動入力）</option>
              </select>
            ) : stations.length > 0 ? (
              /* 位置情報なしの場合は全駅から選択 */
              <select
                value={selectedStation?.id || ''}
                onChange={(e) => {
                  if (e.target.value === '__manual__') {
                    setIsManualStationInput(true);
                    return;
                  }
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
                <option value="__manual__">📝 その他（手動入力）</option>
              </select>
            ) : (
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {isLoadingStations ? '駅データを読み込み中...' : '上のボタンで駅を選択または手動入力してください'}
              </p>
            )}
                  </>
                )}
              </>
            )}
          </div>

          {/* メッセージプレビュー */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              プレビュー
            </label>
            <div className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg max-h-24 overflow-y-auto">
              <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap font-sans leading-relaxed">
                {generateMessage()}
              </pre>
            </div>
          </div>

          {/* コピーボタン */}
          <button
            onClick={handleCopy}
            disabled={!isComplete}
            className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg font-medium text-sm transition-colors ${
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
                <Check className="w-4 h-4" />
                コピー完了
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                メッセージをコピー
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default DelayReportComposer;
