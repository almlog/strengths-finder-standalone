/**
 * 遅延情報履歴モーダルコンポーネント
 * @module components/traffic/DelayHistoryModal
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Train,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from 'lucide-react';
import { getTrainDelayService } from '../../services/TrainDelayService';
import { DelayHistoryEntry, OperatorGroup, TrainDelayInfo } from '../../types/trainDelay';
import DelayReportComposer from './DelayReportComposer';

interface DelayHistoryModalProps {
  /** モーダルが開いているか */
  isOpen: boolean;
  /** 閉じるコールバック */
  onClose: () => void;
  /** ODPTトークン */
  token: string;
  /** 外部から選択された路線名（電車クリック時など） */
  externalRailwayName?: string | null;
  /** 外部路線名のクリアコールバック */
  onClearExternalRailway?: () => void;
}

/**
 * 事業者グループの選択肢
 */
const OPERATOR_GROUP_OPTIONS: { value: OperatorGroup; label: string }[] = [
  { value: 'all', label: '全て' },
  { value: 'JR', label: 'JR' },
  { value: 'metro', label: '地下鉄' },
  { value: 'private', label: '私鉄' },
];

/**
 * 遅延履歴モーダル
 */
const DelayHistoryModal: React.FC<DelayHistoryModalProps> = ({
  isOpen,
  onClose,
  token,
  externalRailwayName,
  onClearExternalRailway,
}) => {
  // シングルトンを使用して履歴を共有（DelayTickerと同じインスタンス）
  const [service] = useState(() => getTrainDelayService(token));
  const [history, setHistory] = useState<DelayHistoryEntry[]>([]);
  const [currentDelays, setCurrentDelays] = useState<TrainDelayInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterGroup, setFilterGroup] = useState<OperatorGroup>('all');
  const [showDelayedOnly, setShowDelayedOnly] = useState(false);
  // 履歴から選択された遅延情報
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<DelayHistoryEntry | null>(null);
  // 診断モード
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [allOperatorInfo, setAllOperatorInfo] = useState<TrainDelayInfo[]>([]);
  // 遅延報告セクションの展開状態
  const [isReportExpanded, setIsReportExpanded] = useState(false);

  // データ取得（ODPT API + 外部ソース）
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. ODPT APIからリアルタイム情報を取得
      await service.fetchDelayInfo();

      // 2. 外部ソース（Yahoo!路線情報、JR RSS）から履歴を取得
      console.log('[DelayHistoryModal] Fetching external sources...');
      await service.fetchExternalHistory();

      setHistory(service.getHistory());
      setCurrentDelays(service.getCurrentDelays());
      setAllOperatorInfo(service.getAllInfo());
      setLastUpdated(service.getLastUpdated());

      // 診断ログ
      console.log('[DelayHistoryModal] Fetch complete:', {
        historyCount: service.getHistory().length,
        currentDelaysCount: service.getCurrentDelays().length,
        allOperatorInfoCount: service.getAllInfo().length,
      });
    } catch (error) {
      console.error('[DelayHistoryModal] Fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  // モーダルが開いたときにデータ取得
  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, fetchData]);

  // フィルタリングされた履歴
  const filteredHistory = history.filter((entry) => {
    // 事業者グループフィルタ
    if (filterGroup !== 'all') {
      const group = getOperatorGroup(entry.operator);
      if (group !== filterGroup) return false;
    }
    // 遅延中のみフィルタ
    if (showDelayedOnly && entry.status === 'normal') {
      return false;
    }
    return true;
  });

  // モーダルが閉じているときは何も表示しない
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-lg sm:mx-4 max-h-[90vh] sm:max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Train className="w-5 h-5" />
            遅延情報履歴
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* フィルター・更新バー */}
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <div className="flex flex-wrap items-center justify-between gap-2">
            {/* フィルター */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value as OperatorGroup)}
                className="text-xs px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              >
                {OPERATOR_GROUP_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-1 text-xs text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={showDelayedOnly}
                  onChange={(e) => setShowDelayedOnly(e.target.checked)}
                  className="w-3 h-3"
                />
                遅延中のみ
              </label>
            </div>

            {/* 更新 */}
            <div className="flex items-center gap-2">
              {lastUpdated && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {lastUpdated.toLocaleTimeString('ja-JP', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              )}
              <button
                onClick={fetchData}
                disabled={isLoading}
                className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
                更新
              </button>
            </div>
          </div>
        </div>

        {/* 現在の遅延サマリー */}
        {currentDelays.length > 0 && (
          <div className="px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border-b border-amber-200 dark:border-amber-800">
            <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4" />
              <span className="text-sm font-medium">
                現在 {currentDelays.length} 路線で遅延発生中
              </span>
            </div>
          </div>
        )}

        {/* 遅延報告メッセージ作成（折りたたみ可能・スクロール対応） */}
        <div className="flex-shrink-0 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setIsReportExpanded(!isReportExpanded)}
            className="w-full px-4 py-2 flex items-center justify-between bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors"
          >
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              遅延報告メッセージを作成
            </span>
            {isReportExpanded ? (
              <ChevronUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            )}
          </button>
          {isReportExpanded && (
            <div className="overflow-y-auto overscroll-contain max-h-[35vh] sm:max-h-[40vh] px-3 py-2 bg-gray-50 dark:bg-gray-800/50">
              <DelayReportComposer
                currentDelays={currentDelays}
                token={token}
                externalDelay={selectedHistoryEntry}
                onClearExternalDelay={() => setSelectedHistoryEntry(null)}
                externalRailwayName={externalRailwayName}
                onClearExternalRailway={onClearExternalRailway}
              />
            </div>
          )}
        </div>

        {/* 履歴リスト - スクロール可能なメイン領域 */}
        <div className="flex-1 overflow-y-auto overscroll-contain min-h-[120px]">
          <div className="px-4 py-3">
            {/* セクションヘッダー */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                <Clock className="w-4 h-4" />
                直近6時間の遅延履歴
              </h3>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {filteredHistory.length}件
              </span>
            </div>

            {isLoading && history.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500 dark:text-gray-400">
                <CheckCircle className="w-16 h-16 mb-3 text-green-500" />
                <p className="text-base font-medium">遅延情報はありません</p>
                <p className="text-xs mt-2 text-center">
                  直近6時間の遅延情報が表示されます<br />
                  Yahoo!路線情報から自動取得しています
                </p>
              </div>
            ) : (
              <>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
                  💡 項目をタップすると遅延報告メッセージに反映できます
                </p>
                <div className="space-y-2 pb-4">
                  {filteredHistory.map((entry, index) => (
                    <HistoryItem
                      key={`${entry.id}-${entry.recordedAt}-${index}`}
                      entry={entry}
                      onSelect={(e) => {
                        setSelectedHistoryEntry(e);
                        setIsReportExpanded(true); // 選択時にレポートセクションを開く
                      }}
                      isSelected={selectedHistoryEntry?.id === entry.id && selectedHistoryEntry?.recordedAt === entry.recordedAt}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* フッター */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 flex-shrink-0">
          <div className="flex flex-col gap-2">
            {/* データソース */}
            <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
              <p className="flex items-center gap-1">
                <span>データ提供:</span>
              </p>
              <p className="pl-2 flex items-center gap-1">
                • 公共交通オープンデータセンター (CC BY 4.0)
              </p>
              <p className="pl-2 flex items-center gap-1">
                •{' '}
                <a
                  href="https://transit.yahoo.co.jp/traininfo/area/4/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-500 hover:text-blue-700 dark:text-blue-400 inline-flex items-center gap-0.5"
                >
                  Yahoo!路線情報
                  <ExternalLink className="w-3 h-3" />
                </a>
                （遅延履歴）
              </p>
            </div>

            {/* 診断ボタン */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowDiagnostics(!showDiagnostics)}
                className="text-xs text-blue-500 hover:text-blue-700 dark:text-blue-400"
              >
                {showDiagnostics ? '診断を閉じる' : '診断'}
              </button>
            </div>
          </div>

          {/* 診断パネル */}
          {showDiagnostics && (
            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg text-xs space-y-2">
              <div className="font-bold text-gray-700 dark:text-gray-300">診断情報</div>

              <div>
                <span className="text-gray-600 dark:text-gray-400">履歴エントリ数: </span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{history.length}</span>
              </div>

              <div>
                <span className="text-gray-600 dark:text-gray-400">現在遅延中: </span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{currentDelays.length}</span>
              </div>

              <div>
                <span className="text-gray-600 dark:text-gray-400">全路線情報: </span>
                <span className="font-mono text-gray-900 dark:text-gray-100">{allOperatorInfo.length}</span>
              </div>

              <div>
                <span className="text-gray-600 dark:text-gray-400">最終更新: </span>
                <span className="font-mono text-gray-900 dark:text-gray-100">
                  {lastUpdated ? lastUpdated.toLocaleString('ja-JP') : 'なし'}
                </span>
              </div>

              {/* 全路線のステータス */}
              <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">API取得データ（全路線）:</div>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {allOperatorInfo.map((info, idx) => (
                    <div key={idx} className={`flex justify-between ${
                      info.status === 'delayed' || info.status === 'suspended'
                        ? 'text-amber-600 dark:text-amber-400 font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}>
                      <span>{info.railwayName || info.operatorName}</span>
                      <span className="font-mono">
                        {info.status === 'delayed' ? '遅延' :
                         info.status === 'suspended' ? '運休' :
                         info.status === 'normal' ? '平常' : '不明'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* 履歴データ */}
              {history.length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                  <div className="font-bold text-gray-700 dark:text-gray-300 mb-1">履歴データ:</div>
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {history.map((entry, idx) => (
                      <div key={idx} className="text-gray-600 dark:text-gray-400">
                        <span>{new Date(entry.recordedAt).toLocaleTimeString('ja-JP')}</span>
                        <span className="mx-1">-</span>
                        <span>{entry.railwayName}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 履歴アイテムコンポーネント
 */
interface HistoryItemProps {
  entry: DelayHistoryEntry;
  onSelect: (entry: DelayHistoryEntry) => void;
  isSelected: boolean;
}

const HistoryItem: React.FC<HistoryItemProps> = ({ entry, onSelect, isSelected }) => {
  const isDelayed = entry.status === 'delayed' || entry.status === 'suspended';
  const StatusIcon = isDelayed ? AlertTriangle : CheckCircle;
  const statusColor = entry.status === 'suspended'
    ? 'text-red-500'
    : isDelayed
    ? 'text-amber-500'
    : 'text-green-500';

  const bgColor = isSelected
    ? 'bg-green-100 dark:bg-green-900/30 border-green-400 dark:border-green-600 ring-2 ring-green-400 dark:ring-green-600'
    : entry.status === 'suspended'
    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800 hover:border-red-400 dark:hover:border-red-600'
    : isDelayed
    ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800 hover:border-amber-400 dark:hover:border-amber-600'
    : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-500';

  const recordedTime = new Date(entry.recordedAt).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div
      className={`p-3 rounded-lg border cursor-pointer transition-all ${bgColor}`}
      onClick={() => onSelect(entry)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(entry);
        }
      }}
    >
      <div className="flex items-start gap-2">
        <StatusIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${statusColor}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {entry.railwayName}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {recordedTime}
            </span>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
            {entry.informationText}
          </p>
          {entry.delayMinutes && (
            <span className="inline-block mt-1 px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded">
              約{entry.delayMinutes}分遅れ
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 事業者IDからグループを取得
 */
function getOperatorGroup(operatorId: string): OperatorGroup {
  if (operatorId.includes('JR')) return 'JR';
  if (operatorId.includes('TokyoMetro') || operatorId.includes('Toei')) return 'metro';
  return 'private';
}

export default DelayHistoryModal;
