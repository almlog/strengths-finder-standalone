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
} from 'lucide-react';
import { TrainDelayService } from '../../services/TrainDelayService';
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
  const [service] = useState(() => new TrainDelayService(token));
  const [history, setHistory] = useState<DelayHistoryEntry[]>([]);
  const [currentDelays, setCurrentDelays] = useState<TrainDelayInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [filterGroup, setFilterGroup] = useState<OperatorGroup>('all');
  const [showDelayedOnly, setShowDelayedOnly] = useState(false);
  // 履歴から選択された遅延情報
  const [selectedHistoryEntry, setSelectedHistoryEntry] = useState<DelayHistoryEntry | null>(null);

  // データ取得
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      await service.fetchDelayInfo();
      setHistory(service.getHistory());
      setCurrentDelays(service.getCurrentDelays());
      setLastUpdated(service.getLastUpdated());
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col"
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

        {/* 遅延報告メッセージ作成（遅延有無に関わらず常に表示） */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <DelayReportComposer
            currentDelays={currentDelays}
            token={token}
            externalDelay={selectedHistoryEntry}
            onClearExternalDelay={() => setSelectedHistoryEntry(null)}
            externalRailwayName={externalRailwayName}
            onClearExternalRailway={onClearExternalRailway}
          />
        </div>

        {/* 履歴リスト */}
        <div className="flex-1 overflow-y-auto px-4 py-2">
          {isLoading && history.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="w-6 h-6 text-gray-400 animate-spin" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-500 dark:text-gray-400">
              <CheckCircle className="w-12 h-12 mb-2 text-green-500" />
              <p className="text-sm">遅延情報はありません</p>
              <p className="text-xs mt-1">直近6時間の履歴を表示します</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                ※クリックしてメッセージ作成に使用できます
              </p>
            <div className="space-y-2">
              {filteredHistory.map((entry, index) => (
                <HistoryItem
                  key={`${entry.id}-${entry.recordedAt}-${index}`}
                  entry={entry}
                  onSelect={(e) => setSelectedHistoryEntry(e)}
                  isSelected={selectedHistoryEntry?.id === entry.id && selectedHistoryEntry?.recordedAt === entry.recordedAt}
                />
              ))}
            </div>
            </>
          )}
        </div>

        {/* フッター */}
        <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            データ提供: 公共交通オープンデータセンター (CC BY 4.0)
          </p>
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
