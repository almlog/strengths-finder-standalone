// src/components/strengths/MemberRateSettings.tsx
/**
 * メンバー単価設定画面
 *
 * @module components/strengths/MemberRateSettings
 * @description マネージャー専用：メンバーの単価情報を一覧・編集・インポート・エクスポートする画面
 */

import React, { useState, useRef } from 'react';
import { Download, Upload, Edit, Trash2, X } from 'lucide-react';
import { useStrengths } from '../../contexts/StrengthsContext';
import { useMemberRates } from '../../hooks/useMemberRates';
import { MemberRate } from '../../types/financial';
import { FinancialService } from '../../services/FinancialService';
import MemberRateImportDialog, { MemberRateImportConflictInfo, ImportStrategy } from './MemberRateImportDialog';

/**
 * メンバー単価設定コンポーネント
 */
export const MemberRateSettings: React.FC = () => {
  const { members } = useStrengths();
  const { memberRates, setMemberRate, deleteMemberRate, exportRates, importRates } = useMemberRates();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRateType, setEditRateType] = useState<'monthly' | 'hourly' | 'contract'>('monthly');
  const [editRate, setEditRate] = useState<number>(0);
  const [editHours, setEditHours] = useState<number>(160);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // インポートダイアログ関連
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importConflictInfo, setImportConflictInfo] = useState<MemberRateImportConflictInfo | null>(null);
  const [resolveImport, setResolveImport] = useState<((strategy: ImportStrategy) => void) | null>(null);

  /**
   * エクスポート処理
   */
  const handleExport = () => {
    const jsonData = exportRates();
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `member-rates-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  };

  /**
   * インポートボタンクリック
   */
  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  /**
   * ファイル選択時の処理
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 競合チェック
      const existingIds = memberRates.map(r => r.memberId);
      const newData = Array.isArray(data) ? data : data.rates || [];
      const newIds = newData.map((r: any) => r.memberId);
      const duplicateIds = newIds.filter((id: string) => existingIds.includes(id));

      const conflictInfo: MemberRateImportConflictInfo = {
        existingCount: existingIds.length,
        newCount: newIds.length,
        duplicateIds
      };

      // インポート実行関数
      const executeImport = (strategy: ImportStrategy) => {
        importRates(text, strategy);
        setShowImportDialog(false);
        setImportConflictInfo(null);
        setResolveImport(null);
      };

      // 競合がある場合はダイアログ表示
      if (duplicateIds.length > 0 || existingIds.length > 0) {
        setImportConflictInfo(conflictInfo);
        setResolveImport(() => executeImport);
        setShowImportDialog(true);
      } else {
        // 競合なし：直接追加
        executeImport('add');
      }
    } catch (error) {
      console.error('インポート失敗:', error);
      alert('インポートに失敗しました。JSONファイルの形式を確認してください。');
    }

    // ファイル入力をリセット
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * 編集開始
   */
  const handleEdit = (memberId: string, currentRate: MemberRate) => {
    setEditingId(memberId);
    setEditRateType(currentRate.rateType);
    setEditRate(currentRate.rate);
    setEditHours(currentRate.hours || 160);
  };

  /**
   * 編集保存
   */
  const handleSave = () => {
    if (!editingId) return;

    // v3.1: 'contract' は除外
    if (editRateType === 'contract') return;

    const newRate: MemberRate = {
      rateType: editRateType,
      rate: editRate,
      hours: editRateType === 'hourly' ? editHours : undefined
    };

    setMemberRate(editingId, newRate);
    setEditingId(null);
  };

  /**
   * 編集キャンセル
   */
  const handleCancel = () => {
    setEditingId(null);
  };

  /**
   * 削除
   */
  const handleDelete = (memberId: string) => {
    if (window.confirm('この単価情報を削除しますか？')) {
      deleteMemberRate(memberId);
    }
  };

  /**
   * メンバーIDから名前を取得
   */
  const getMemberName = (memberId: string): string => {
    const member = members.find(m => m.id === memberId);
    return member ? `${member.name} (${member.id})` : memberId;
  };

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            単価情報管理
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            メンバーの単価情報を管理します（マネージャー専用）
          </p>
        </div>
        <div className="flex gap-2">
          {/* エクスポートボタン */}
          <button
            onClick={handleExport}
            className="bg-green-600 hover:bg-green-700 dark:bg-green-700 dark:hover:bg-green-800 text-white px-4 py-2 rounded flex items-center gap-2"
            title="単価情報をJSONファイルとしてエクスポート"
          >
            <Download className="w-4 h-4" />
            <span>エクスポート</span>
          </button>

          {/* インポートボタン */}
          <button
            onClick={handleImportClick}
            className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-700 dark:hover:bg-amber-800 text-white px-4 py-2 rounded flex items-center gap-2"
            title="単価情報をJSONファイルからインポート"
          >
            <Upload className="w-4 h-4" />
            <span>インポート</span>
          </button>

          {/* 非表示のファイル入力 */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".json"
            className="hidden"
          />
        </div>
      </div>

      {/* 単価情報一覧 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        {memberRates.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400">
            <p>単価情報が登録されていません</p>
            <p className="text-sm mt-2">メンバー追加時に単価を設定するか、インポートしてください</p>
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  メンバー
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  単価タイプ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  単価
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  月額換算
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {memberRates.map((record) => {
                const isEditing = editingId === record.memberId;
                const member = members.find(m => m.id === record.memberId);

                return (
                  <tr key={record.memberId} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                      {getMemberName(record.memberId)}
                    </td>

                    {isEditing ? (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <select
                            value={editRateType}
                            onChange={(e) => setEditRateType(e.target.value as 'monthly' | 'hourly')}
                            className="border dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                          >
                            <option value="monthly">月額</option>
                            <option value="hourly">時給</option>
                          </select>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              value={editRate}
                              onChange={(e) => setEditRate(Number(e.target.value))}
                              className="border dark:border-gray-600 rounded px-2 py-1 w-32 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                            />
                            {editRateType === 'hourly' && (
                              <>
                                <span className="text-gray-600 dark:text-gray-400">×</span>
                                <input
                                  type="number"
                                  value={editHours}
                                  onChange={(e) => setEditHours(Number(e.target.value))}
                                  className="border dark:border-gray-600 rounded px-2 py-1 w-20 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                                />
                                <span className="text-gray-600 dark:text-gray-400">h</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {FinancialService.formatCurrency(
                            editRateType === 'hourly' ? editRate * editHours : editRate
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={handleSave}
                            className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-3"
                          >
                            保存
                          </button>
                          <button
                            onClick={handleCancel}
                            className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-300"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {record.memberRate.rateType === 'monthly' ? '月額' : '時給'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-gray-100">
                          {record.memberRate.rateType === 'monthly' ? (
                            FinancialService.formatCurrency(record.memberRate.rate)
                          ) : (
                            `${FinancialService.formatCurrency(record.memberRate.rate)}/h × ${record.memberRate.hours || 160}h`
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-gray-100">
                          {FinancialService.formatCurrency(
                            FinancialService.calculateMonthlyRate(member || { id: record.memberId, name: '', department: '', strengths: [] }, record.memberRate)
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => handleEdit(record.memberId, record.memberRate)}
                            className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                            title="編集"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(record.memberId)}
                            className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                            title="削除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* インポート競合ダイアログ */}
      {showImportDialog && importConflictInfo && resolveImport && (
        <MemberRateImportDialog
          conflictInfo={importConflictInfo}
          onSelect={resolveImport}
        />
      )}
    </div>
  );
};
