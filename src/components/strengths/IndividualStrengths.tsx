// src/components/strengths/IndividualStrengths.tsx
import React from 'react';
import { User, AlertCircle, Crown } from 'lucide-react';
import { useStrengths } from '../../contexts/StrengthsContext';
import StrengthsService, { GROUP_LABELS, GROUP_COLORS } from '../../services/StrengthsService';
import { StrengthGroup, Position } from '../../models/StrengthsTypes';
import Personality16Card from './Personality16Card';
import ProfileAnalysisCard from '../analysis/ProfileAnalysisCard';
import { Member as AnalysisMember, MBTIType } from '../../models/PersonalityAnalysis';
import { PERSONALITY_TYPES_DATA } from '../../services/Personality16Service';

interface IndividualStrengthsProps {
  memberId: string | null;
}

const IndividualStrengths: React.FC<IndividualStrengthsProps> = ({ memberId }) => {
  const { members, getPositionInfo } = useStrengths();

  const member = members.find(m => m.id === memberId);

  // ProfileAnalysisCard用のMemberオブジェクトを作成（Hooksルールのため早期returnの前に配置）
  const analysisMember: AnalysisMember | null = React.useMemo(() => {
    if (!member) return null;

    // personalityIdからMBTITypeへの変換
    const getMBTIType = (personalityId?: number): MBTIType | undefined => {
      if (!personalityId) return undefined;
      const personality = PERSONALITY_TYPES_DATA.find(p => p.id === personalityId);
      return personality?.code as MBTIType | undefined;
    };

    const mbtiType = getMBTIType(member.personalityId);

    // MBTIまたは資質のいずれかが存在する場合のみAnalysisMemberを作成
    if (!mbtiType && (!member.strengths || member.strengths.length === 0)) {
      return null;
    }

    return {
      id: member.id,
      name: member.name,
      department: member.department,
      mbtiType: mbtiType,
      strengths: member.strengths.map(s => ({
        id: s.id,
        score: s.score
      }))
    };
  }, [member]);

  if (!memberId) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <User className="w-16 h-16 mb-4 text-gray-300" />
        <p>左のメンバーリストから分析したいメンバーを選択してください</p>
      </div>
    );
  }

  if (!member) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        <p>メンバーが見つかりません</p>
      </div>
    );
  }

  // 全ての資質データを取得
  const allStrengths = StrengthsService.getAllStrengths();
  
  // メンバーの強みを取得
  const memberStrengths = member.strengths.map(rankedStrength => {
    const strength = StrengthsService.getStrengthById(rankedStrength.id);
    return {
      ...rankedStrength,
      strength: strength
    };
  }).filter(item => item.strength !== undefined);

  // メンバーの強みIDをマップとして保持（高速検索用）
  const memberStrengthsMap = new Map();
  memberStrengths.forEach(item => {
    memberStrengthsMap.set(item.strength?.id, item.score);
  });
  
  // 全資質のデータを作成（カテゴリごとに分類する）
  const allStrengthsData = allStrengths.map(strength => {
    // メンバーが持つ強みの場合はスコアを設定、そうでなければ0
    const score = memberStrengthsMap.has(strength.id) ? memberStrengthsMap.get(strength.id) : 0;
    return {
      name: strength.name,
      id: strength.id,
      group: strength.group,
      groupName: GROUP_LABELS[strength.group],
      color: GROUP_COLORS[strength.group],
      score: score,
      // 不透明度はスコアに比例（スコアが0の場合は薄く表示）
      // スコア1が一番濃く、スコアが高いほど薄くなる (1が最強の場合)
      opacity: score ? (6 - score) / 5 : 0.1
    };
  });
  
  // カテゴリごとに資質をグループ化
  const groupedStrengths = {
    [StrengthGroup.EXECUTING]: allStrengthsData.filter(s => s.group === StrengthGroup.EXECUTING),
    [StrengthGroup.INFLUENCING]: allStrengthsData.filter(s => s.group === StrengthGroup.INFLUENCING),
    [StrengthGroup.RELATIONSHIP_BUILDING]: allStrengthsData.filter(s => s.group === StrengthGroup.RELATIONSHIP_BUILDING),
    [StrengthGroup.STRATEGIC_THINKING]: allStrengthsData.filter(s => s.group === StrengthGroup.STRATEGIC_THINKING)
  };
  
  // TOP5の強みを取得（スコア順に並び替え - スコア1が最初に来るように）
  const sortedStrengths = [...memberStrengths]
    .sort((a, b) => a.score - b.score) // スコアが小さい順（1が最強）
    .map(item => ({
      ...item,
      // スコア1が一番濃く、スコアが高いほど薄くなる
      opacity: (6 - item.score) / 5
    }));

  // 役職情報を取得
  const positionInfo = member.position ? getPositionInfo(member.position) : null;

  return (
    <div className="space-y-6">
      {/* 名前情報と16Personalities を横並びに */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-4">
          <div className="flex items-center">
            <h3 className="text-xl font-bold mb-2 dark:text-gray-100">{member.name}</h3>
            {positionInfo && member.position !== Position.GENERAL && (
              <div
                className="ml-2 relative group"
                title={positionInfo.displayName}
              >
                {positionInfo.icon === 'circle' ? (
                  <div className="w-5 h-5 rounded-full" style={{ backgroundColor: positionInfo.color }}></div>
                ) : positionInfo.icon === 'star' ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill={positionInfo.color} stroke={positionInfo.color}>
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                ) : (
                  <Crown
                    className="w-5 h-5"
                    color={positionInfo.color}
                    fill={positionInfo.color}
                  />
                )}
              </div>
            )}
          </div>
          <p className="text-gray-600 dark:text-gray-400">社員番号: {member.id}</p>
          <p className="text-gray-600 dark:text-gray-400">部署コード: {member.department}</p>
        </div>

        {/* 16Personalities Card - Only shown if personality data exists */}
        {member.personalityId && (
          <Personality16Card
            personalityId={member.personalityId}
            variant={member.personalityVariant}
          />
        )}
      </div>

      {/* 強みのバランスとプロファイル分析を横並びに */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 強みのバランス（4つのカテゴリごとに4行で表示） */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="text-lg font-semibold mb-4 dark:text-gray-100">強みのバランス（全34資質）</h4>

          {/* 実行力 */}
          <div className="mb-4">
            <h5 className="font-medium flex items-center mb-2">
              <span className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[StrengthGroup.EXECUTING] }}></span>
              {GROUP_LABELS[StrengthGroup.EXECUTING]}
            </h5>
            <div className="flex flex-wrap gap-1">
              {groupedStrengths[StrengthGroup.EXECUTING].map(item => (
                <div
                  key={item.id} 
                className="relative m-1 flex flex-col items-center justify-center rounded-lg"
                style={{ 
                  width: '50px',
                  height: '50px',
                  backgroundColor: item.color,
                  opacity: item.opacity,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: item.score > 0 ? '2px solid white' : '1px solid #eee',
                  boxShadow: item.score > 0 ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                }}
                title={`${item.name} (${item.groupName}): ${item.score > 0 ? item.score : '未選択'}`}
              >
                {item.score > 0 && (
                  <div className="absolute top-0 right-0 bg-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                    {item.score}
                  </div>
                )}
                <span className="text-xs text-center text-white font-medium" style={{ 
                  textShadow: '0px 0px 2px rgba(0,0,0,0.7)',
                  fontSize: '8px',
                  lineHeight: '1.1'
                }}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 影響力 */}
        <div className="mb-4">
          <h5 className="font-medium flex items-center mb-2">
            <span className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[StrengthGroup.INFLUENCING] }}></span>
            {GROUP_LABELS[StrengthGroup.INFLUENCING]}
          </h5>
          <div className="flex flex-wrap gap-1">
            {groupedStrengths[StrengthGroup.INFLUENCING].map(item => (
              <div 
                key={item.id} 
                className="relative m-1 flex flex-col items-center justify-center rounded-lg"
                style={{ 
                  width: '50px',
                  height: '50px',
                  backgroundColor: item.color,
                  opacity: item.opacity,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: item.score > 0 ? '2px solid white' : '1px solid #eee',
                  boxShadow: item.score > 0 ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                }}
                title={`${item.name} (${item.groupName}): ${item.score > 0 ? item.score : '未選択'}`}
              >
                {item.score > 0 && (
                  <div className="absolute top-0 right-0 bg-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                    {item.score}
                  </div>
                )}
                <span className="text-xs text-center text-white font-medium" style={{ 
                  textShadow: '0px 0px 2px rgba(0,0,0,0.7)',
                  fontSize: '8px',
                  lineHeight: '1.1'
                }}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 人間関係構築力 */}
        <div className="mb-4">
          <h5 className="font-medium flex items-center mb-2">
            <span className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[StrengthGroup.RELATIONSHIP_BUILDING] }}></span>
            {GROUP_LABELS[StrengthGroup.RELATIONSHIP_BUILDING]}
          </h5>
          <div className="flex flex-wrap gap-1">
            {groupedStrengths[StrengthGroup.RELATIONSHIP_BUILDING].map(item => (
              <div 
                key={item.id} 
                className="relative m-1 flex flex-col items-center justify-center rounded-lg"
                style={{ 
                  width: '50px',
                  height: '50px',
                  backgroundColor: item.color,
                  opacity: item.opacity,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: item.score > 0 ? '2px solid white' : '1px solid #eee',
                  boxShadow: item.score > 0 ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                }}
                title={`${item.name} (${item.groupName}): ${item.score > 0 ? item.score : '未選択'}`}
              >
                {item.score > 0 && (
                  <div className="absolute top-0 right-0 bg-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                    {item.score}
                  </div>
                )}
                <span className="text-xs text-center text-white font-medium" style={{ 
                  textShadow: '0px 0px 2px rgba(0,0,0,0.7)',
                  fontSize: '8px',
                  lineHeight: '1.1'
                }}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* 戦略的思考力 */}
        <div className="mb-4">
          <h5 className="font-medium flex items-center mb-2">
            <span className="w-4 h-4 mr-2 rounded-full" style={{ backgroundColor: GROUP_COLORS[StrengthGroup.STRATEGIC_THINKING] }}></span>
            {GROUP_LABELS[StrengthGroup.STRATEGIC_THINKING]}
          </h5>
          <div className="flex flex-wrap gap-1">
            {groupedStrengths[StrengthGroup.STRATEGIC_THINKING].map(item => (
              <div 
                key={item.id} 
                className="relative m-1 flex flex-col items-center justify-center rounded-lg"
                style={{ 
                  width: '50px',
                  height: '50px',
                  backgroundColor: item.color,
                  opacity: item.opacity,
                  transition: 'all 0.3s ease',
                  cursor: 'pointer',
                  border: item.score > 0 ? '2px solid white' : '1px solid #eee',
                  boxShadow: item.score > 0 ? '0 2px 4px rgba(0,0,0,0.2)' : 'none'
                }}
                title={`${item.name} (${item.groupName}): ${item.score > 0 ? item.score : '未選択'}`}
              >
                {item.score > 0 && (
                  <div className="absolute top-0 right-0 bg-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shadow">
                    {item.score}
                  </div>
                )}
                <span className="text-xs text-center text-white font-medium" style={{ 
                  textShadow: '0px 0px 2px rgba(0,0,0,0.7)',
                  fontSize: '8px',
                  lineHeight: '1.1'
                }}>
                  {item.name}
                </span>
              </div>
            ))}
          </div>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2 text-center">
            ※ 色の濃さはスコアの強さを表しています。スコア1が最強となり、スコアがない資質は薄く表示されています。
          </div>
        </div>

        {/* ProfileAnalysisCard - Show when MBTI or strengths data exists */}
        {analysisMember && (
          <ProfileAnalysisCard member={analysisMember} />
        )}
      </div>

      {/* 強み詳細説明 - スコア1から順に表示 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h4 className="text-lg font-semibold mb-4 dark:text-gray-100">強みの詳細説明</h4>
        <div className="space-y-4">
          {sortedStrengths.map(item => {
            const strength = item.strength;
            if (!strength) return null;
            
            return (
              <div
                key={strength.id}
                className="border-l-4 p-3 rounded-r-lg bg-gray-50 dark:bg-gray-700"
                style={{ borderLeftColor: GROUP_COLORS[strength.group] }}
              >
                <div className="flex items-center mb-1">
                  <div className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">
                    {item.score}
                  </div>
                  <h5 className="font-medium dark:text-gray-100">{strength.name}</h5>
                  <span className="text-xs ml-2 bg-gray-200 dark:bg-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                    {GROUP_LABELS[strength.group]}
                  </span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300">{strength.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default IndividualStrengths;
