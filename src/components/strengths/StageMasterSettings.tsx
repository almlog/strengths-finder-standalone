// src/components/strengths/StageMasterSettings.tsx
/**
 * ステージマスタ設定コンポーネント
 *
 * @module components/strengths/StageMasterSettings
 * @description ステージマスタの表示・編集を行うコンポーネント
 *              SPEC: MANAGER_FEATURE_SPEC_V3.md Phase 4.2 - Story 6
 */

import React, { useState } from 'react';
import { useStageMasters } from '../../hooks/useStageMasters';
import { StageMaster } from '../../types/profitability';
import StageMasterImportDialog, {
  StageMasterImportStrategy,
  StageMasterImportConflictInfo
} from './StageMasterImportDialog';

/**
 * StageMasterSettings コンポーネント
 *
 * ステージマスタの一覧表示と編集機能を提供
 * - 社員ステージ（S1-S4）の平均給与・経費率編集
 * - BPステージの経費率編集
 * - デフォルト値へのリセット
 *
 * @example
 * ```tsx
 * <StageMasterSettings />
 * ```
 */
export const StageMasterSettings: React.FC = () => {
  const {
    stageMasters,
    updateStageMaster,
    resetToDefaults,
    addStageMaster,
    deleteStageMaster,
    exportToJson,
    importFromJson,
    importFromJsonAddOnly,
    importFromJsonMerge,
    getImportConflictInfo
  } = useStageMasters();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<StageMaster | null>(null);
  const [showAddForm, setShowAddForm] = useState(false); // Phase 4.7.3
  const [newStageForm, setNewStageForm] = useState<Partial<StageMaster>>({ // Phase 4.7.3
    id: '',
    name: '',
    type: 'employee',
    averageSalary: 0,
    expenseRate: 0.30,
    description: ''
  });

  // インポートダイアログ用の状態
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importConflictInfo, setImportConflictInfo] = useState<StageMasterImportConflictInfo | null>(null);
  const [pendingImportJson, setPendingImportJson] = useState<string | null>(null);

  /**
   * 編集モード開始
   */
  const handleEdit = (stage: StageMaster) => {
    setEditingId(stage.id);
    setEditForm({ ...stage });
  };

  /**
   * 編集キャンセル
   */
  const handleCancel = () => {
    setEditingId(null);
    setEditForm(null);
  };

  /**
   * 編集保存
   */
  const handleSave = () => {
    if (!editForm) return;

    try {
      updateStageMaster(editForm.id, editForm);
      setEditingId(null);
      setEditForm(null);
    } catch (error) {
      if (error instanceof Error) {
        alert(`保存エラー: ${error.message}`);
      }
    }
  };

  /**
   * デフォルトに戻す
   */
  const handleReset = () => {
    if (window.confirm('ステージマスタをデフォルト値にリセットしますか？')) {
      resetToDefaults();
    }
  };

  /**
   * フォーム値変更ハンドラ
   */
  const handleFormChange = (field: keyof StageMaster, value: string | number) => {
    if (!editForm) return;

    setEditForm({
      ...editForm,
      [field]: value
    });
  };

  /**
   * 新規ステージ追加フォームの表示切り替え (Phase 4.7.3)
   */
  const handleShowAddForm = () => {
    setShowAddForm(true);
    setNewStageForm({
      id: '',
      name: '',
      type: 'employee',
      averageSalary: 0,
      expenseRate: 0.30,
      description: ''
    });
  };

  /**
   * 新規ステージ追加のキャンセル (Phase 4.7.3)
   */
  const handleCancelAdd = () => {
    setShowAddForm(false);
    setNewStageForm({
      id: '',
      name: '',
      type: 'employee',
      averageSalary: 0,
      expenseRate: 0.30,
      description: ''
    });
  };

  /**
   * 新規ステージの追加 (Phase 4.7.3)
   */
  const handleAddStage = () => {
    try {
      // バリデーション
      if (!newStageForm.id || !newStageForm.name || newStageForm.type === undefined || newStageForm.expenseRate === undefined) {
        alert('必須フィールドを入力してください');
        return;
      }

      if (newStageForm.type === 'employee' && newStageForm.averageSalary === undefined) {
        alert('社員タイプの場合は平均給与が必要です');
        return;
      }

      addStageMaster(newStageForm as StageMaster);
      setShowAddForm(false);
      setNewStageForm({
        id: '',
        name: '',
        type: 'employee',
        averageSalary: 0,
        expenseRate: 0.30,
        description: ''
      });
    } catch (error) {
      if (error instanceof Error) {
        alert(`追加エラー: ${error.message}`);
      }
    }
  };

  /**
   * カスタムステージの削除 (Phase 4.7.3)
   */
  const handleDelete = (stageId: string) => {
    if (window.confirm('このステージを削除しますか？')) {
      try {
        deleteStageMaster(stageId);
      } catch (error) {
        if (error instanceof Error) {
          alert(`削除エラー: ${error.message}`);
        }
      }
    }
  };

  /**
   * エクスポート処理
   */
  const handleExport = () => {
    try {
      const json = exportToJson();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `stage-masters_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      if (error instanceof Error) {
        alert(`エクスポートエラー: ${error.message}`);
      }
    }
  };

  /**
   * インポート処理（ファイル選択からダイアログ表示まで）
   */
  const handleImport = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = e.target?.result as string;

            // 重複情報を取得してダイアログを表示
            const conflictInfo = getImportConflictInfo(json);
            setImportConflictInfo(conflictInfo);
            setPendingImportJson(json);
            setShowImportDialog(true);
          } catch (error) {
            if (error instanceof Error) {
              alert(`インポートエラー: ${error.message}`);
            }
          }
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  };

  /**
   * インポートダイアログでストラテジーが選択された時の処理
   */
  const handleImportStrategySelect = (strategy: StageMasterImportStrategy) => {
    if (strategy === 'cancel' || !pendingImportJson) {
      // キャンセルまたはJSONがない場合は閉じる
      setShowImportDialog(false);
      setImportConflictInfo(null);
      setPendingImportJson(null);
      return;
    }

    try {
      // 選択されたストラテジーに応じてインポート
      switch (strategy) {
        case 'replace':
          importFromJson(pendingImportJson);
          break;
        case 'add':
          importFromJsonAddOnly(pendingImportJson);
          break;
        case 'merge':
          importFromJsonMerge(pendingImportJson);
          break;
      }

      // 成功メッセージ
      alert('インポートが完了しました');

      // ダイアログを閉じる
      setShowImportDialog(false);
      setImportConflictInfo(null);
      setPendingImportJson(null);
    } catch (error) {
      if (error instanceof Error) {
        alert(`インポートエラー: ${error.message}`);
      }
      // エラー時もダイアログを閉じる
      setShowImportDialog(false);
      setImportConflictInfo(null);
      setPendingImportJson(null);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-gray-800">ステージマスタ設定</h2>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={handleShowAddForm}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            ステージを追加
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            title="現在の設定をJSONファイルとしてダウンロード"
          >
            エクスポート
          </button>
          <button
            onClick={handleImport}
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
            title="JSONファイルから設定を読み込み"
          >
            インポート
          </button>
          <button
            onClick={handleReset}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            デフォルトに戻す
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-4 py-2 text-left">ステージID</th>
              <th className="border px-4 py-2 text-left">ステージ名</th>
              <th className="border px-4 py-2 text-left">タイプ</th>
              <th className="border px-4 py-2 text-right">平均給与（円）</th>
              <th className="border px-4 py-2 text-right">経費率（%）</th>
              <th className="border px-4 py-2 text-center">操作</th>
            </tr>
          </thead>
          <tbody>
            {stageMasters.map((stage) => {
              const isEditing = editingId === stage.id;
              const displayStage = isEditing && editForm ? editForm : stage;

              return (
                <tr key={stage.id} className="hover:bg-gray-50">
                  <td className="border px-4 py-2 font-mono">{stage.id}</td>
                  <td className="border px-4 py-2">
                    {isEditing ? (
                      <input
                        type="text"
                        value={displayStage.name}
                        onChange={(e) => handleFormChange('name', e.target.value)}
                        className="w-full px-2 py-1 border rounded"
                      />
                    ) : (
                      stage.name
                    )}
                  </td>
                  <td className="border px-4 py-2">
                    {stage.type === 'employee' ? '社員' : 'BP'}
                  </td>
                  <td className="border px-4 py-2 text-right">
                    {stage.type === 'employee' ? (
                      isEditing ? (
                        <input
                          type="number"
                          value={displayStage.averageSalary || 0}
                          onChange={(e) => handleFormChange('averageSalary', parseInt(e.target.value, 10))}
                          className="w-full px-2 py-1 border rounded text-right"
                        />
                      ) : (
                        stage.averageSalary?.toLocaleString()
                      )
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="border px-4 py-2 text-right">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        max="1"
                        value={displayStage.expenseRate}
                        onChange={(e) => handleFormChange('expenseRate', parseFloat(e.target.value))}
                        className="w-full px-2 py-1 border rounded text-right"
                      />
                    ) : (
                      `${((stage.salaryExpenseRate ?? stage.expenseRate ?? 0) * 100).toFixed(0)}%`
                    )}
                  </td>
                  <td className="border px-4 py-2 text-center">
                    {isEditing ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={handleSave}
                          className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          保存
                        </button>
                        <button
                          onClick={handleCancel}
                          className="px-3 py-1 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                        >
                          キャンセル
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(stage)}
                          className="px-3 py-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                        >
                          編集
                        </button>
                        {stage.isCustom && (
                          <button
                            onClick={() => handleDelete(stage.id)}
                            className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                          >
                            削除
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 新規ステージ追加フォーム (Phase 4.7.3) */}
      {showAddForm && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
          <h3 className="text-lg font-semibold text-gray-800 mb-3">新規ステージ追加</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステージID *</label>
              <input
                type="text"
                value={newStageForm.id}
                onChange={(e) => setNewStageForm({ ...newStageForm, id: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="例: CUSTOM1"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ステージ名 *</label>
              <input
                type="text"
                value={newStageForm.name}
                onChange={(e) => setNewStageForm({ ...newStageForm, name: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="例: カスタムステージ"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">タイプ *</label>
              <select
                value={newStageForm.type}
                onChange={(e) => setNewStageForm({ ...newStageForm, type: e.target.value as 'employee' | 'bp' })}
                className="w-full px-3 py-2 border rounded"
              >
                <option value="employee">社員</option>
                <option value="bp">BP</option>
              </select>
            </div>
            {newStageForm.type === 'employee' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">平均給与（円） *</label>
                <input
                  type="number"
                  value={newStageForm.averageSalary || 0}
                  onChange={(e) => setNewStageForm({ ...newStageForm, averageSalary: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 border rounded"
                  placeholder="例: 400000"
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">経費率 *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="1"
                value={newStageForm.expenseRate || 0.30}
                onChange={(e) => setNewStageForm({ ...newStageForm, expenseRate: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border rounded"
                placeholder="例: 0.30"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">説明</label>
              <input
                type="text"
                value={newStageForm.description || ''}
                onChange={(e) => setNewStageForm({ ...newStageForm, description: e.target.value })}
                className="w-full px-3 py-2 border rounded"
                placeholder="例: カスタム追加ステージ"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={handleAddStage}
              className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
            >
              追加
            </button>
            <button
              onClick={handleCancelAdd}
              className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded">
        <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">💡 設定のヒント</h3>
        <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
          <li>• <strong>ステージマスタとは</strong>: 原価計算のテンプレートです（売上単価は個人編集画面で別途設定）</li>
          <li>• <strong>平均給与（社員のみ）</strong>: 各ステージの社員の平均月額給与を設定します</li>
          <li>• <strong>給与経費率（社員のみ）</strong>: 給与に対する経費率（福利厚生費、交通費など）</li>
          <li>• <strong>経費率（BPのみ）</strong>: 売上に対する経費率（管理費、手数料など）</li>
          <li>• <strong>原価計算</strong>: 社員 = 給与 + (給与 × 給与経費率)、BP = 個別単価 × 経費率</li>
        </ul>
      </div>

      {/* インポート競合ダイアログ */}
      {showImportDialog && importConflictInfo && (
        <StageMasterImportDialog
          conflictInfo={importConflictInfo}
          onSelect={handleImportStrategySelect}
        />
      )}
    </div>
  );
};
