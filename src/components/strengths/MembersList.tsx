// src/components/strengths/MembersList.tsx
import React, { useState } from 'react';
import { Edit, Trash2, Check, Crown, CheckSquare, XSquare } from 'lucide-react';
import { useStrengths } from '../../contexts/StrengthsContext';
import { STRENGTHS_DATA, GROUP_COLORS } from '../../services/StrengthsService';
import { StrengthGroup, Position } from '../../models/StrengthsTypes';
import MemberForm from './MemberForm';
import { useManagerMode } from '../../hooks/useManagerMode';
import { useStageMasters } from '../../hooks/useStageMasters';
import { useMemberRates } from '../../hooks/useMemberRates';
import { ProfitabilityService } from '../../services/ProfitabilityService';

interface MembersListProps {
  onSelect: (memberId: string) => void;
  selectedMemberId: string | null;
}

const MembersList: React.FC<MembersListProps> = ({ onSelect, selectedMemberId }) => {
  const { members, toggleMemberSelection, selectedMemberIds, deleteMember, getPositionInfo, selectAllMembers, clearAllSelections } = useStrengths();
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'strength' | 'profitMargin'>('strength'); // Phase 4.5.2
  const isManagerMode = useManagerMode();
  const { stageMasters } = useStageMasters();
  const { getMemberRate } = useMemberRates();

  // 部署の重複なしリストを取得
  const departments = [...new Set(members.map(member => member.department))];
  
  // 選択された部署でフィルタリングされたメンバーリスト
  const filteredMembers = selectedDepartment === 'all'
    ? members
    : members.filter(member => member.department === selectedDepartment);

  // ソート処理 (Phase 4.5.2)
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    if (sortBy === 'strength') {
      // 最も強い資質でソート
      const minScoreA = Math.min(...a.strengths.map(s => s.score));
      const minScoreB = Math.min(...b.strengths.map(s => s.score));
      return minScoreA - minScoreB;  // スコアが小さい順（昇順）に並べる（TOP1が一番上に表示）
    } else {
      // 利益率でソート（降順 - 高い利益率が上）
      const memberRateA = getMemberRate(a.id);
      const memberRateB = getMemberRate(b.id);

      let profitA = -Infinity;
      let profitB = -Infinity;

      // メンバーAの利益率計算（エラーハンドリング付き）
      if (a.stageId && memberRateA) {
        try {
          const profitability = ProfitabilityService.calculateMemberProfitability(a, stageMasters, memberRateA);
          profitA = profitability.profitMargin;
        } catch (error) {
          console.warn(`利益率計算エラー (${a.id}):`, error);
        }
      }

      // メンバーBの利益率計算（エラーハンドリング付き）
      if (b.stageId && memberRateB) {
        try {
          const profitability = ProfitabilityService.calculateMemberProfitability(b, stageMasters, memberRateB);
          profitB = profitability.profitMargin;
        } catch (error) {
          console.warn(`利益率計算エラー (${b.id}):`, error);
        }
      }

      return profitB - profitA;  // 降順
    }
  });

  // 一括選択用のロジック
  const filteredMemberIds = filteredMembers.map(m => m.id);
  const isAllSelected = filteredMemberIds.length > 0 &&
    filteredMemberIds.every(id => selectedMemberIds.includes(id));

  const handleSelectAll = () => {
    selectAllMembers(filteredMemberIds);
  };

  const handleClearAll = () => {
    clearAllSelections();
  };

  // メンバーの強みを取得して表示用の文字列に変換
  const getStrengthNames = (rankedStrengths: { id: number; score: number }[]): string => {
    return [...rankedStrengths]
      .sort((a, b) => a.score - b.score)  // スコアが低い順（昇順）に並べる（1が最強）
      .map(rs => {
        const strength = STRENGTHS_DATA.find(s => s.id === rs.id);
        return strength ? `${strength.name}(${rs.score})` : '';
      }).join(', ');
  };

  // 強みの主要グループを取得
  const getPrimaryGroup = (rankedStrengths: { id: number; score: number }[]): StrengthGroup | null => {
    const groupCounts = {
      [StrengthGroup.EXECUTING]: 0,
      [StrengthGroup.INFLUENCING]: 0,
      [StrengthGroup.RELATIONSHIP_BUILDING]: 0,
      [StrengthGroup.STRATEGIC_THINKING]: 0
    };

    rankedStrengths.forEach(rs => {
      const strength = STRENGTHS_DATA.find(s => s.id === rs.id);
      if (strength) {
        groupCounts[strength.group]++;
      }
    });

    // 最も多いグループを返す
    let maxGroup = null;
    let maxCount = 0;

    Object.entries(groupCounts).forEach(([group, count]) => {
      if (count > maxCount) {
        maxCount = count;
        maxGroup = group;
      }
    });

    return maxGroup as StrengthGroup | null;
  };

  // 利益率の色分けクラスを返す (Phase 4.4.4)
  const getProfitMarginColorClass = (profitMargin: number): string => {
    if (profitMargin >= 40) return 'text-green-700 dark:text-green-400';
    if (profitMargin >= 20) return 'text-blue-700 dark:text-blue-400';
    if (profitMargin >= 0) return 'text-yellow-700 dark:text-yellow-400';
    return 'text-red-700 dark:text-red-400';
  };

  const handleDeleteClick = (id: string) => {
    setShowDeleteConfirm(id);
  };

  const confirmDelete = (id: string) => {
    deleteMember(id);
    setShowDeleteConfirm(null);
  };

  const cancelDelete = () => {
    setShowDeleteConfirm(null);
  };

  if (members.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        メンバーが登録されていません。右上の「メンバーを追加」ボタンから登録してください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 部署コードフィルター */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">部署コードフィルター</label>
        <select
          className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="all">すべての部署コード</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* ソート選択 (Phase 4.5.2 - Manager mode only) */}
      {isManagerMode && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">並び順</label>
          <select
            className="w-full border dark:border-gray-600 rounded p-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as 'strength' | 'profitMargin')}
          >
            <option value="strength">強み順</option>
            <option value="profitMargin">利益率順</option>
          </select>
        </div>
      )}

      {/* 一括選択ボタン */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={handleSelectAll}
          disabled={filteredMembers.length === 0 || isAllSelected}
          className="flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-100 text-blue-700 hover:bg-blue-200 dark:bg-blue-900 dark:text-blue-200 dark:hover:bg-blue-800"
        >
          <CheckSquare className="w-4 h-4" />
          <span>全員選択</span>
        </button>
        <button
          onClick={handleClearAll}
          disabled={selectedMemberIds.length === 0}
          className="flex items-center space-x-1 px-3 py-1.5 rounded text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
        >
          <XSquare className="w-4 h-4" />
          <span>選択解除</span>
        </button>
        <span className={`text-sm ${selectedMemberIds.length > 0 ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}>
          現在 {selectedMemberIds.length}人選択中
        </span>
      </div>

      {/* メンバーリスト */}
      <div className="space-y-3">
        {sortedMembers.map(member => {
          const primaryGroup = getPrimaryGroup(member.strengths);
          const borderColor = primaryGroup ? GROUP_COLORS[primaryGroup] : 'transparent';
          const isSelected = selectedMemberId === member.id;
          const isCheckedForAnalysis = selectedMemberIds.includes(member.id);

          return (
            <div 
              key={member.id}
              className={`border-l-4 bg-white dark:bg-gray-700 rounded-lg shadow-sm p-3 transition-all ${
                isSelected ? 'bg-blue-50 dark:bg-blue-900' : ''
              }`}
              style={{ borderLeftColor: borderColor }}
            >
              {showDeleteConfirm === member.id ? (
                <div className="flex flex-col space-y-2">
                  <p className="text-red-600 font-medium">このメンバーを削除しますか？</p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => confirmDelete(member.id)}
                      className="bg-red-600 text-white px-3 py-1 rounded text-sm"
                    >
                      削除する
                    </button>
                    <button
                      onClick={cancelDelete}
                      className="bg-gray-200 dark:bg-gray-600 px-3 py-1 rounded text-sm text-gray-900 dark:text-gray-100"
                    >
                      キャンセル
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between">
                    <div className="flex-1" onClick={() => onSelect(member.id)}>
                      <div className="flex items-center">
                        <h4 className="text-md font-medium dark:text-gray-100">{member.name}</h4>
                        {(() => {
                          const positionInfo = member.position ? getPositionInfo(member.position) : null;
                          return positionInfo && member.position !== Position.GENERAL && (
                            <div className="ml-2 relative group">
                              {positionInfo.icon === 'circle' ? (
                                <div
                                  className="w-4 h-4 rounded-full"
                                  style={{ backgroundColor: positionInfo.color }}
                                ></div>
                              ) : positionInfo.icon === 'star' ? (
                                <svg
                                  className="w-4 h-4"
                                  viewBox="0 0 24 24"
                                  fill={positionInfo.color}
                                  stroke={positionInfo.color}
                                >
                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                </svg>
                              ) : (
                                <Crown
                                  className="w-4 h-4"
                                  color={positionInfo.color}
                                  fill={positionInfo.color}
                                />
                              )}
                              {/* 役職名ツールチップ */}
                              <div className="absolute invisible group-hover:visible bg-white dark:bg-gray-600 p-2 border dark:border-gray-500 rounded shadow-lg left-0 top-full mt-1 z-10 whitespace-nowrap">
                                <p className="text-sm font-medium dark:text-gray-100">{positionInfo.displayName}</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-300">部署コード: {member.department}</p>
                      {/* 利益率表示 (Phase 4.4.4 - Manager mode only) */}
                      {isManagerMode && member.stageId && (() => {
                        const memberRate = getMemberRate(member.id);
                        if (!memberRate) return null;

                        const profitability = ProfitabilityService.calculateMemberProfitability(member, stageMasters, memberRate);
                        if (profitability) {
                          return (
                            <p className={`text-sm font-semibold mt-1 ${getProfitMarginColorClass(profitability.profitMargin)}`}>
                              利益率: {profitability.profitMargin.toFixed(1)}%
                            </p>
                          );
                        }
                        return null;
                      })()}
                      {/* ステージバッジ表示 (Phase 4.5.1 - Manager mode only) */}
                      {isManagerMode && member.stageId && (() => {
                        const stage = stageMasters.find(s => s.id === member.stageId);
                        if (stage) {
                          const badgeColor = stage.type === 'employee'
                            ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            : 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
                          return (
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium mt-1 ${badgeColor}`}>
                              {stage.name}
                            </span>
                          );
                        }
                        return null;
                      })()}
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {getStrengthNames(member.strengths)}
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button 
                        className={`p-1 rounded ${isCheckedForAnalysis ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                        onClick={() => toggleMemberSelection(member.id)}
                        title="分析対象に選択"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-1 rounded text-gray-400 hover:text-amber-600"
                        onClick={() => setEditMemberId(member.id)}
                        title="編集"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        className="p-1 rounded text-gray-400 hover:text-red-600"
                        onClick={() => handleDeleteClick(member.id)}
                        title="削除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {editMemberId && (
        <MemberForm
          memberId={editMemberId}
          onClose={() => setEditMemberId(null)}
        />
      )}
    </div>
  );
};

export default MembersList;
