/**
 * Stage Master Import Conflict Dialog Component
 *
 * ステージマスタのインポート時に既存データとの重複を検出し、
 * ユーザーに上書き・追加・マージの選択を促すダイアログ
 */

import React from 'react';
import { X, AlertTriangle } from 'lucide-react';

export type StageMasterImportStrategy = 'replace' | 'add' | 'merge' | 'cancel';

export interface StageMasterImportConflictInfo {
  existingCount: number;
  newCount: number;
  duplicateIds: string[];
}

interface StageMasterImportDialogProps {
  conflictInfo: StageMasterImportConflictInfo;
  onSelect: (strategy: StageMasterImportStrategy) => void;
}

const StageMasterImportDialog: React.FC<StageMasterImportDialogProps> = ({
  conflictInfo,
  onSelect,
}) => {
  const { existingCount, newCount, duplicateIds } = conflictInfo;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center">
            <AlertTriangle className="w-6 h-6 text-yellow-500 mr-2" />
            <h3 className="text-xl font-semibold dark:text-gray-100">
              データの重複を検出
            </h3>
          </div>
          <button
            onClick={() => onSelect('cancel')}
            className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Conflict Information */}
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            <strong>既存データ:</strong> {existingCount}件のステージマスタ
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
            <strong>インポートデータ:</strong> {newCount}件のステージマスタ
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>重複:</strong> {duplicateIds.length}件のステージ（IDが既存データと重複）
          </p>

          {duplicateIds.length > 0 && duplicateIds.length <= 10 && (
            <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
              <p className="font-medium mb-1">重複しているステージID:</p>
              <p className="font-mono text-xs">{duplicateIds.join(', ')}</p>
            </div>
          )}
        </div>

        {/* Strategy Options */}
        <div className="space-y-3 mb-6">
          <button
            onClick={() => onSelect('replace')}
            className="w-full text-left p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-red-400 dark:hover:border-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mr-3 mt-0.5">
                <span className="text-red-600 dark:text-red-400 font-bold">R</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  すべて置き換え（Replace）
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  既存データをすべて削除し、インポートデータで置き換えます。
                  <br />
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    ⚠️ 既存の{existingCount}件のデータは失われます
                  </span>
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect('add')}
            className="w-full text-left p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-400 dark:hover:border-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mr-3 mt-0.5">
                <span className="text-blue-600 dark:text-blue-400 font-bold">A</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  新規のみ追加（Add New Only）
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  既存データはそのまま残し、重複していない新しいステージのみを追加します。
                  <br />
                  <span className="text-blue-600 dark:text-blue-400 font-medium">
                    📊 {newCount - duplicateIds.length}件の新規ステージを追加
                  </span>
                  （既存{existingCount}件 + 新規{newCount - duplicateIds.length}件 = 合計{existingCount + (newCount - duplicateIds.length)}件）
                </p>
              </div>
            </div>
          </button>

          <button
            onClick={() => onSelect('merge')}
            className="w-full text-left p-4 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-400 dark:hover:border-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors"
          >
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mr-3 mt-0.5">
                <span className="text-green-600 dark:text-green-400 font-bold">M</span>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  マージ（Merge & Update）
                </h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  既存データを残し、重複しているステージは新しいデータで更新します。
                  <br />
                  <span className="text-green-600 dark:text-green-400 font-medium">
                    🔄 {duplicateIds.length}件を更新、{newCount - duplicateIds.length}件を追加
                  </span>
                  （合計{Math.max(existingCount, newCount) + Math.min(existingCount, newCount - duplicateIds.length)}件）
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Cancel Button */}
        <div className="flex justify-end">
          <button
            onClick={() => onSelect('cancel')}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100"
          >
            キャンセル
          </button>
        </div>
      </div>
    </div>
  );
};

export default StageMasterImportDialog;
