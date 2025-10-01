// src/components/strengths/MembersList.tsx
import React from 'react';
import { Edit, Trash2, Check, Crown } from 'lucide-react';
import { useStrengths } from '../../contexts/StrengthsContext';
import { STRENGTHS_DATA, GROUP_COLORS } from '../../services/StrengthsService';
import { StrengthGroup, Position } from '../../models/StrengthsTypes';
import { useState } from 'react';
import MemberForm from './MemberForm';

// 役職ごとの王冠の色
const POSITION_CROWN_COLORS: Record<Position, string> = {
  [Position.GENERAL]: "", // 一般社員（表示なし）
  [Position.GL]: "#FFD700", // 黄色
  [Position.DEPUTY_MANAGER]: "#00C853", // 緑
  [Position.MANAGER]: "#2196F3", // 青
  [Position.DIRECTOR]: "#F44336", // 赤
  [Position.CONTRACT]: "#ADD8E6", // 薄い青
  [Position.BP]: "#90EE90", // 薄い緑
};

// 役職の日本語名
const POSITION_LABELS: Record<Position, string> = {
  [Position.GENERAL]: "一般社員",
  [Position.GL]: "グループリーダー",
  [Position.DEPUTY_MANAGER]: "副課長",
  [Position.MANAGER]: "課長",
  [Position.DIRECTOR]: "部長",
  [Position.CONTRACT]: "契約社員",
  [Position.BP]: "BP",
};

interface MembersListProps {
  onSelect: (memberId: string) => void;
  selectedMemberId: string | null;
}

const MembersList: React.FC<MembersListProps> = ({ onSelect, selectedMemberId }) => {
  const { members, toggleMemberSelection, selectedMemberIds, deleteMember } = useStrengths();
  const [editMemberId, setEditMemberId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');

  // 部署の重複なしリストを取得
  const departments = [...new Set(members.map(member => member.department))];
  
  // 選択された部署でフィルタリングされたメンバーリスト
  const filteredMembers = selectedDepartment === 'all' 
    ? members 
    : members.filter(member => member.department === selectedDepartment);
  
  // 最も強い資質でソート
  const sortedMembers = [...filteredMembers].sort((a, b) => {
    const minScoreA = Math.min(...a.strengths.map(s => s.score));
    const minScoreB = Math.min(...b.strengths.map(s => s.score));
    return minScoreA - minScoreB;  // スコアが小さい順（昇順）に並べる（TOP1が一番上に表示）
  });

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
      <div className="text-center py-8 text-gray-500">
        メンバーが登録されていません。右上の「メンバーを追加」ボタンから登録してください。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 部署コードフィルター */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">部署コードフィルター</label>
        <select 
          className="w-full border rounded p-2"
          value={selectedDepartment}
          onChange={(e) => setSelectedDepartment(e.target.value)}
        >
          <option value="all">すべての部署コード</option>
          {departments.map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
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
              className={`border-l-4 bg-white rounded-lg shadow-sm p-3 transition-all ${
                isSelected ? 'bg-blue-50' : ''
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
                      className="bg-gray-200 px-3 py-1 rounded text-sm"
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
                        <h4 className="text-md font-medium">{member.name}</h4>
                        {member.position && member.position !== Position.GENERAL && (
                          <div 
                            className="ml-2 relative group"
                            title={POSITION_LABELS[member.position]}
                          >
                            {member.position === Position.CONTRACT ? (
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: POSITION_CROWN_COLORS[member.position] }}></div>
                            ) : member.position === Position.BP ? (
                              <div className="w-4 h-4 rounded-full" style={{ backgroundColor: POSITION_CROWN_COLORS[member.position] }}></div>
                            ) : (
                              <Crown 
                                className="w-4 h-4" 
                                color={POSITION_CROWN_COLORS[member.position]} 
                                fill={POSITION_CROWN_COLORS[member.position]}
                              />
                            )}
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">部署コード: {member.department}</p>
                      <p className="text-xs text-gray-500 mt-1">
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
