// src/components/strengths/MemberRateImportDialog.tsx
/**
 * 単価情報インポート競合ダイアログ
 *
 * @module components/strengths/MemberRateImportDialog
 * @description 単価情報のインポート時に競合がある場合の戦略選択ダイアログ
 */

import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * インポート戦略
 */
export type ImportStrategy = 'replace' | 'add' | 'merge';

/**
 * インポート競合情報
 */
export interface MemberRateImportConflictInfo {
  /** 既存の単価情報数 */
  existingCount: number;
  /** 新規インポートする単価情報数 */
  newCount: number;
  /** 重複するメンバーID */
  duplicateIds: string[];
}

interface MemberRateImportDialogProps {
  conflictInfo: MemberRateImportConflictInfo;
  onSelect: (strategy: ImportStrategy) => void;
}

/**
 * 単価情報インポート競合ダイアログコンポーネント
 */
const MemberRateImportDialog: React.FC<MemberRateImportDialogProps> = ({
  conflictInfo,
  onSelect
}) => {
  const { existingCount, newCount, duplicateIds } = conflictInfo;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* ヘッダー */}
        <div className="border-b dark:border-gray-700 px-6 py-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-amber-500" />
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              単価情報のインポート方法を選択
            </h2>
          </div>
        </div>

        {/* 競合情報 */}
        <div className="px-6 py-4 bg-amber-50 dark:bg-amber-900/20 border-b dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            既存の単価情報: <span className="font-bold">{existingCount}件</span>
          </p>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            インポートする単価情報: <span className="font-bold">{newCount}件</span>
          </p>
          {duplicateIds.length > 0 && (
            <p className="text-sm text-amber-700 dark:text-amber-400 mt-2">
              重複するメンバーID: <span className="font-bold">{duplicateIds.length}件</span>
            </p>
          )}
        </div>

        {/* 戦略選択 */}
        <div className="px-6 py-4 space-y-3">
          {/* 上書き（Replace） */}
          <button
            onClick={() => onSelect('replace')}
            className="w-full text-left p-4 border-2 border-red-300 dark:border-red-700 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center group-hover:bg-red-200 dark:group-hover:bg-red-900/50">
                <span className="text-2xl">🔄</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                  上書き（Replace）
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  既存の全単価情報を削除し、インポートするデータで置き換えます
                </p>
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  ⚠️ 既存の{existingCount}件が削除され、新規{newCount}件になります
                </p>
              </div>
            </div>
          </button>

          {/* 追加のみ（Add Only） */}
          <button
            onClick={() => onSelect('add')}
            className="w-full text-left p-4 border-2 border-green-300 dark:border-green-700 rounded-lg hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center group-hover:bg-green-200 dark:group-hover:bg-green-900/50">
                <span className="text-2xl">➕</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                  追加のみ（Add Only）
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  重複しない新規メンバーのみ追加します。既存データは変更しません
                </p>
                <p className="text-xs text-green-600 dark:text-green-400 mt-2">
                  ✓ 新規{newCount - duplicateIds.length}件を追加、重複{duplicateIds.length}件はスキップ
                </p>
              </div>
            </div>
          </button>

          {/* マージ（Merge） */}
          <button
            onClick={() => onSelect('merge')}
            className="w-full text-left p-4 border-2 border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors group"
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center group-hover:bg-blue-200 dark:group-hover:bg-blue-900/50">
                <span className="text-2xl">🔀</span>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-gray-900 dark:text-gray-100 mb-1">
                  マージ（Merge）
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  既存データを保持しつつ、新規データを追加。重複は新しいデータで更新します
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                  ✓ 新規{newCount - duplicateIds.length}件を追加、重複{duplicateIds.length}件を更新
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* フッター */}
        <div className="border-t dark:border-gray-700 px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            💡 推奨: 既存データを保護したい場合は「マージ」を選択してください
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemberRateImportDialog;
