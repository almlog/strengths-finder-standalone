/**
 * グループカード（ドロップゾーン + 統計表示）
 *
 * @module components/strengths/simulation/GroupCard
 */

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { X, Edit2, Check } from 'lucide-react';
import { SimulationGroup, GroupStats } from '../../../types/simulation';
import { MemberStrengths } from '../../../models/StrengthsTypes';
import MemberCard from './MemberCard';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { GROUP_LABELS, GROUP_COLORS } from '../../../services/StrengthsService';
import { StrengthGroup } from '../../../models/StrengthsTypes';
import { useManagerMode } from '../../../hooks/useManagerMode';

interface GroupCardProps {
  group: SimulationGroup;
  members: MemberStrengths[];
  stats: GroupStats;
  onRemove: () => void;
  onRename: (newName: string) => void;
  isOver?: boolean;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  members,
  stats,
  onRemove,
  onRename,
  isOver
}) => {
  const { setNodeRef } = useDroppable({ id: group.id });
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const isManagerMode = useManagerMode();

  const handleRename = () => {
    if (editName.trim()) {
      onRename(editName.trim());
    }
    setIsEditing(false);
  };

  // グラフデータ
  const chartData = Object.entries(stats.groupDistribution)
    .filter(([_, count]) => count > 0)
    .map(([group, count]) => ({
      name: GROUP_LABELS[group as StrengthGroup],
      value: count,
      fill: GROUP_COLORS[group as StrengthGroup]
    }));

  // 利益率の色分け
  const getProfitMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
    if (margin >= 20) return 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
    if (margin >= 0) return 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
    return 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
  };

  return (
    <div
      ref={setNodeRef}
      className={`bg-white dark:bg-gray-800 rounded-lg border-2 p-4 transition-colors ${
        isOver
          ? 'border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-1">
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRename()}
              className="flex-1 px-2 py-1 border dark:border-gray-600 rounded dark:bg-gray-700 dark:text-gray-100"
              autoFocus
            />
            <button
              onClick={handleRename}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <Check className="w-4 h-4 text-green-600 dark:text-green-400" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <h3 className="font-semibold dark:text-gray-100">{group.name}</h3>
            <span className="text-sm text-gray-500 dark:text-gray-400">({stats.memberCount}人)</span>
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
            >
              <Edit2 className="w-3 h-3 text-gray-400" />
            </button>
          </div>
        )}
        <button
          onClick={onRemove}
          className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
          title="グループを削除"
        >
          <X className="w-4 h-4 text-gray-400 hover:text-red-600" />
        </button>
      </div>

      {/* メンバーリスト */}
      <div className="min-h-[100px] mb-3">
        {stats.memberCount === 0 ? (
          <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
            メンバーをドロップ
          </div>
        ) : (
          <SortableContext items={members.map(m => m.id)} strategy={verticalListSortingStrategy}>
            {members.map(member => (
              <MemberCard key={member.id} member={member} />
            ))}
          </SortableContext>
        )}
      </div>

      {/* 統計情報 */}
      {stats.memberCount > 0 && (
        <div className="border-t dark:border-gray-700 pt-3">
          {/* 強み分布グラフ */}
          <div className="mb-3">
            <h4 className="text-sm font-medium mb-2 dark:text-gray-100">強み分布</h4>
            <div style={{ width: '100%', height: 150 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    outerRadius={50}
                    label={({ name, percent }) => `${name.substring(0, 2)}: ${(percent * 100).toFixed(0)}%`}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* マネージャーモード: 利益率表示 */}
          {isManagerMode && stats.profitability && (
            <div className="bg-gray-50 dark:bg-gray-900/30 rounded p-3">
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">総売上:</span>
                  <span className="font-medium dark:text-gray-100">
                    ¥{stats.profitability.totalRevenue.toLocaleString()}/月
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">総原価:</span>
                  <span className="font-medium dark:text-gray-100">
                    ¥{stats.profitability.totalCost.toLocaleString()}/月
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">総利益:</span>
                  <span className="font-medium dark:text-gray-100">
                    ¥{stats.profitability.totalProfit.toLocaleString()}/月
                  </span>
                </div>
                <div className="flex justify-between items-center mt-2 pt-2 border-t dark:border-gray-700">
                  <span className="text-gray-600 dark:text-gray-400">利益率:</span>
                  <span className={`px-2 py-1 rounded font-semibold ${getProfitMarginColor(stats.profitability.profitMargin)}`}>
                    {stats.profitability.profitMargin.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupCard;
