// src/components/attendance/UserFilterPanel.tsx
// 勤怠分析：ユーザーフィルターパネル
// SPEC: docs/specs/SPEC_USER_FILTER.md

import React, { useMemo } from 'react';
import { Users, Check, X, ChevronDown, ChevronRight } from 'lucide-react';
import { AttendanceRecord } from '../../models/AttendanceTypes';

/**
 * ユニークなユーザー情報
 */
interface UniqueUser {
  employeeId: string;
  employeeName: string;
  department: string;
}

/**
 * 部門別ユーザーグループ
 */
interface DepartmentGroup {
  department: string;
  users: UniqueUser[];
}

/**
 * UserFilterPanelのProps
 */
export interface UserFilterPanelProps {
  /** インポートされた勤怠レコード */
  records: AttendanceRecord[];
  /** ユーザーごとの選択状態 (employeeId -> isSelected) */
  userSelections: Map<string, boolean>;
  /** 選択状態変更時のコールバック */
  onSelectionChange: (employeeId: string, isSelected: boolean) => void;
  /** 全員選択ボタンのコールバック */
  onSelectAll: () => void;
  /** 全員解除ボタンのコールバック */
  onDeselectAll: () => void;
  /** 確定ボタンのコールバック */
  onConfirm: () => void;
  /** キャンセルボタンのコールバック */
  onCancel?: () => void;
}

/**
 * レコードからユニークなユーザー一覧を抽出
 */
function extractUniqueUsers(records: AttendanceRecord[]): UniqueUser[] {
  const userMap = new Map<string, UniqueUser>();

  records.forEach(record => {
    if (!userMap.has(record.employeeId)) {
      userMap.set(record.employeeId, {
        employeeId: record.employeeId,
        employeeName: record.employeeName,
        department: record.department,
      });
    }
  });

  return Array.from(userMap.values());
}

/**
 * ユーザーを部門別にグルーピング
 */
function groupByDepartment(users: UniqueUser[]): DepartmentGroup[] {
  const groups = new Map<string, UniqueUser[]>();

  users.forEach(user => {
    const dept = user.department || '未所属';
    if (!groups.has(dept)) {
      groups.set(dept, []);
    }
    groups.get(dept)!.push(user);
  });

  // 部門名でソートして返す（未所属は最後）
  return Array.from(groups.entries())
    .sort((a, b) => {
      if (a[0] === '未所属') return 1;
      if (b[0] === '未所属') return -1;
      return a[0].localeCompare(b[0], 'ja');
    })
    .map(([department, users]) => ({
      department,
      users: users.sort((a, b) => a.employeeId.localeCompare(b.employeeId)),
    }));
}

/**
 * ユーザーフィルターパネルコンポーネント
 * 分析対象ユーザーを選択するためのUI
 */
const UserFilterPanel: React.FC<UserFilterPanelProps> = ({
  records,
  userSelections,
  onSelectionChange,
  onSelectAll,
  onDeselectAll,
  onConfirm,
  onCancel,
}) => {
  // ユニークユーザーと部門別グループを計算
  const uniqueUsers = useMemo(() => extractUniqueUsers(records), [records]);
  const departmentGroups = useMemo(() => groupByDepartment(uniqueUsers), [uniqueUsers]);

  // 選択数を計算
  const selectedCount = useMemo(() => {
    let count = 0;
    uniqueUsers.forEach(user => {
      if (userSelections.get(user.employeeId)) {
        count++;
      }
    });
    return count;
  }, [uniqueUsers, userSelections]);

  const totalCount = uniqueUsers.length;
  const isConfirmDisabled = selectedCount === 0;

  // 部門の展開状態（デフォルトで全て展開）
  const [expandedDepts, setExpandedDepts] = React.useState<Set<string>>(
    new Set(departmentGroups.map(g => g.department))
  );

  const toggleDepartment = (dept: string) => {
    setExpandedDepts(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
      {/* ヘッダー */}
      <div className="flex items-center mb-4">
        <Users className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          分析対象ユーザーの選択
        </h3>
      </div>

      {/* コントロールバー */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <button
            type="button"
            onClick={onSelectAll}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md
                     bg-blue-50 text-blue-700 hover:bg-blue-100
                     dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50
                     transition-colors"
          >
            <Check className="w-4 h-4 mr-1" />
            全員選択
          </button>
          <button
            type="button"
            onClick={onDeselectAll}
            className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md
                     bg-gray-50 text-gray-700 hover:bg-gray-100
                     dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600
                     transition-colors"
          >
            <X className="w-4 h-4 mr-1" />
            全員解除
          </button>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400" data-testid="selection-count">
          選択中: <span className="font-semibold text-blue-600 dark:text-blue-400">{selectedCount}</span> / {totalCount}名
        </div>
      </div>

      {/* ユーザー一覧（部門別） */}
      <div className="max-h-80 overflow-y-auto mb-4 border border-gray-200 dark:border-gray-700 rounded-lg">
        {departmentGroups.map(group => (
          <div key={group.department} className="border-b border-gray-100 dark:border-gray-700 last:border-b-0">
            {/* 部門ヘッダー */}
            <button
              type="button"
              onClick={() => toggleDepartment(group.department)}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-700/50
                       hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center">
                {expandedDepts.has(group.department) ? (
                  <ChevronDown className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 mr-2 text-gray-500 dark:text-gray-400" />
                )}
                <span className="font-medium text-gray-700 dark:text-gray-200">
                  {group.department}（{group.users.length}名）
                </span>
              </div>
            </button>

            {/* ユーザーリスト */}
            {expandedDepts.has(group.department) && (
              <div className="divide-y divide-gray-100 dark:divide-gray-700">
                {group.users.map(user => {
                  const isSelected = userSelections.get(user.employeeId) ?? true;
                  return (
                    <label
                      key={user.employeeId}
                      className="flex items-center px-4 py-2 pl-10 cursor-pointer
                               hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onSelectionChange(user.employeeId, !isSelected)}
                        className="w-4 h-4 rounded border-gray-300 text-blue-600
                                 focus:ring-blue-500 dark:border-gray-600
                                 dark:bg-gray-700 dark:checked:bg-blue-600"
                        aria-label={user.employeeName}
                      />
                      <span className="ml-3 text-gray-900 dark:text-white">
                        {user.employeeName}
                      </span>
                      <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">
                        ({user.employeeId})
                      </span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* アクションボタン */}
      <div className="flex justify-end space-x-3">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-md
                     text-gray-700 bg-gray-100 hover:bg-gray-200
                     dark:text-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600
                     transition-colors"
          >
            キャンセル
          </button>
        )}
        <button
          type="button"
          onClick={onConfirm}
          disabled={isConfirmDisabled}
          className={`px-4 py-2 text-sm font-medium rounded-md transition-colors
                    ${isConfirmDisabled
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
                      : 'bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600'
                    }`}
        >
          分析を開始
        </button>
      </div>

      {/* 0名選択時の警告 */}
      {isConfirmDisabled && (
        <p className="mt-2 text-sm text-red-500 dark:text-red-400 text-right">
          1名以上を選択してください
        </p>
      )}
    </div>
  );
};

export default UserFilterPanel;
