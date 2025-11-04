/**
 * メンバーカード（ドラッグ可能）
 *
 * @module components/strengths/simulation/MemberCard
 */

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { MemberStrengths, Position } from '../../../models/StrengthsTypes';
import { Crown } from 'lucide-react';
import StrengthsService, { GROUP_COLORS } from '../../../services/StrengthsService';

interface MemberCardProps {
  member: MemberStrengths;
  isDragging?: boolean;
}

const MemberCard: React.FC<MemberCardProps> = ({ member, isDragging }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition
  } = useSortable({ id: member.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  // TOP5資質を取得（全て表示）
  const topStrengths = [...member.strengths]
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(rs => StrengthsService.getStrengthById(rs.id))
    .filter(s => s !== null);

  // 役職情報を取得
  const positionInfo = member.position ? StrengthsService.getPositionInfo(member.position) : null;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3 mb-2 cursor-move hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h5 className="font-medium dark:text-gray-100">{member.name}</h5>
            {positionInfo && member.position !== Position.GENERAL && (
              <Crown
                className="w-3 h-3"
                style={{ color: positionInfo.color }}
              />
            )}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1 mt-2">
        {topStrengths.map(strength => (
          <div
            key={strength?.id}
            className="px-2 py-0.5 rounded text-xs"
            style={{ backgroundColor: strength ? GROUP_COLORS[strength.group] + '30' : '#ccc' }}
            title={strength?.name}
          >
            {strength?.name.substring(0, 3)}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MemberCard;
