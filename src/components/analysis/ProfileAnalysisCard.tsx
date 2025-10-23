/**
 * ProfileAnalysisCard Component
 *
 * @module components/analysis/ProfileAnalysisCard
 * @description Displays personality profile analysis combining MBTI and StrengthsFinder data.
 * Shows synergy scores, team fit, leadership potential, and profile summary.
 * Supports three modes: full (MBTI + Strengths), MBTI-only, and Strengths-only.
 */

import React, { useMemo, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Member } from '../../models/PersonalityAnalysis';
import PersonalityAnalysisEngine, { PersonalityAnalysisEngine as PersonalityAnalysisEngineClass } from '../../services/PersonalityAnalysisEngine';
import { ChevronDown, ChevronUp } from 'lucide-react';

/**
 * MBTI type name mapping
 */
const MBTI_NAMES: Record<string, string> = {
  INTJ: '建築家',
  INTP: '論理学者',
  ENTJ: '指揮官',
  ENTP: '討論者',
  INFJ: '提唱者',
  INFP: '仲介者',
  ENFJ: '主人公',
  ENFP: '運動家',
  ISTJ: '管理者',
  ISFJ: '擁護者',
  ESTJ: '幹部',
  ESFJ: '領事官',
  ISTP: '巨匠',
  ISFP: '冒険家',
  ESTP: '起業家',
  ESFP: 'エンターテイナー',
};

/**
 * Props for ProfileAnalysisCard component
 */
interface ProfileAnalysisCardProps {
  /** Member data to analyze */
  member: Member;
  /** All members for MBTI type owner lookup */
  allMembers?: Member[];
}

/**
 * ProfileAnalysisCard functional component
 *
 * @param {ProfileAnalysisCardProps} props - Component props
 * @returns {JSX.Element | null} Card element or null if no analyzable data
 */
const ProfileAnalysisCard: React.FC<ProfileAnalysisCardProps> = ({ member, allMembers = [] }) => {
  // Get current theme for color selection
  const { themeId } = useTheme();
  const isDark = themeId === 'dark';

  // State for collapsible section
  const [isExpanded, setIsExpanded] = useState(false);

  // Analyze member profile using the analysis engine
  const analysisResult = useMemo(() => {
    return PersonalityAnalysisEngine.analyze(member);
  }, [member]);

  // Return null if no analyzable data
  if (!analysisResult) {
    return null;
  }

  const {
    analysisMode,
    primaryRole,
    synergyScore,
    teamFitScore,
    leadershipPotential,
    profileSummary,
    strengths,
    idealEnvironment,
    motivators,
    stressors,
    naturalPartners,
    complementaryPartners,
  } = analysisResult;

  // Get members by MBTI type
  const getMembersByMBTIType = (mbtiType: string): string[] => {
    return allMembers
      .filter(m => m.mbtiType === mbtiType)
      .map(m => m.name);
  };

  // Convert score to pattern type with tooltip
  const getSynergyPattern = (score: number): { label: string; tooltip: string } => {
    if (score >= 85) {
      return {
        label: '統合型',
        tooltip: 'MBTIタイプと資質が相乗効果を発揮しています。性格特性と強みが一貫しており、予測可能な行動パターンを示します。',
      };
    }
    if (score >= 55) {
      return {
        label: 'バランス型',
        tooltip: 'MBTIタイプと資質がバランス良く組み合わさっています。性格と強みが補完し合い、柔軟な対応が可能です。',
      };
    }
    return {
      label: '多面型',
      tooltip: 'MBTIタイプと資質が異なる面を補完し、多様な強みを持っています。意外性のある組み合わせで、独自の価値を発揮します。',
    };
  };

  const getTeamFitPattern = (score: number): { label: string; tooltip: string } => {
    if (score >= 70) {
      return {
        label: 'チーム協調型',
        tooltip: 'チームワークを重視し、他者と協力して成果を上げることが得意です。コミュニケーションを通じて相乗効果を生み出します。',
      };
    }
    if (score >= 50) {
      return {
        label: 'バランス型',
        tooltip: 'チームワークと個人作業の両方に対応できます。状況に応じて協調と独立を使い分けることができます。',
      };
    }
    return {
      label: '個人作業型',
      tooltip: '独立して業務を進めることが得意で、集中力を発揮します。自律的に判断し、深い思考が必要な作業で力を発揮します。',
    };
  };

  const getLeadershipPattern = (score: number): { label: string; tooltip: string } => {
    if (score >= 70) {
      return {
        label: 'リーダー型',
        tooltip: 'チームを牽引し、方向性を示すことが得意です。意思決定を行い、他者を動機づけて目標達成に導きます。',
      };
    }
    if (score >= 50) {
      return {
        label: 'バランス型',
        tooltip: '状況に応じてリーダーシップとサポートを使い分けます。必要な時にリードし、適切な時にサポートに回ることができます。',
      };
    }
    return {
      label: '専門家型',
      tooltip: '専門性を活かし、深い知識やスキルで貢献することが得意です。特定分野のエキスパートとして価値を提供します。',
    };
  };

  return (
    <div
      role="region"
      data-testid="profile-analysis-card"
      className={`rounded-lg p-6 ${
        isDark ? 'bg-gray-800 dark:bg-gray-800' : 'bg-white'
      } border ${isDark ? 'border-gray-700' : 'border-gray-200'}`}
    >
      {/* Header */}
      <div className="mb-6">
        <h3 className={`text-2xl font-bold ${isDark ? 'text-white dark:text-white' : 'text-gray-900'}`}>
          プロファイル分析
        </h3>
      </div>

      {/* Pattern Analysis Section */}
      <div className={`grid grid-cols-1 gap-4 mb-6 ${
        analysisMode === 'full' ? 'md:grid-cols-3' : 'md:grid-cols-2'
      }`}>
        {/* MBTI×Strengths Pattern - Only show for full analysis */}
        {analysisMode === 'full' && (
          <div className="text-center">
            <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              MBTI×資質パターン
            </p>
            <p
              data-testid="synergy-pattern"
              title={getSynergyPattern(synergyScore).tooltip}
              className={`text-lg font-bold ${isDark ? 'text-blue-400' : 'text-blue-600'}`}
            >
              {getSynergyPattern(synergyScore).label}
            </p>
          </div>
        )}

        {/* Team Style */}
        <div className="text-center">
          <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            チームスタイル
          </p>
          <p
            data-testid="team-fit-pattern"
            title={getTeamFitPattern(teamFitScore).tooltip}
            className={`text-lg font-bold ${isDark ? 'text-green-400' : 'text-green-600'}`}
          >
            {getTeamFitPattern(teamFitScore).label}
          </p>
        </div>

        {/* Role Tendency */}
        <div className="text-center">
          <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            役割傾向
          </p>
          <p
            data-testid="leadership-pattern"
            title={getLeadershipPattern(leadershipPotential).tooltip}
            className={`text-lg font-bold ${isDark ? 'text-purple-400' : 'text-purple-600'}`}
          >
            {getLeadershipPattern(leadershipPotential).label}
          </p>
        </div>
      </div>

      {/* 統合分析結果 */}
      <div className={`mb-6 pb-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
        <p className={`text-xs font-medium mb-2 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
          統合分析結果
        </p>
        <p className={`text-lg font-semibold mb-2 ${isDark ? 'text-white dark:text-white' : 'text-gray-900'}`}>
          {primaryRole}
        </p>
        {PersonalityAnalysisEngineClass.getRoleDescription(primaryRole) && (
          <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            {PersonalityAnalysisEngineClass.getRoleDescription(primaryRole)}
          </p>
        )}
      </div>

      {/* Profile Summary */}
      {profileSummary && profileSummary.length > 0 && (
        <div className="mb-6">
          <h4 className={`text-sm font-semibold mb-3 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            プロファイルサマリー
          </h4>
          <div data-testid="profile-summary" className="space-y-2">
            {profileSummary.map((message, index) => (
              <p
                key={index}
                className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'} leading-relaxed`}
              >
                {message}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* 16Personalities追加を促すメッセージ（SF-onlyモード） */}
      {analysisMode === 'strengths-only' && (
        <div className={`mt-6 pt-6 border-t ${isDark ? 'border-gray-700' : 'border-gray-200'}`}>
          <p className={`text-sm text-center ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
            💡 16Personalities診断結果を追加すると、より詳細な性格分析が表示されます
          </p>
        </div>
      )}

      {/* 詳細情報の折りたたみボタン（MBTI情報がある場合のみ） */}
      {analysisMode !== 'strengths-only' && (
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className={`w-full flex items-center justify-center gap-2 py-3 mt-6 border-t ${
            isDark ? 'border-gray-700' : 'border-gray-200'
          } ${isDark ? 'text-gray-300 hover:text-white' : 'text-gray-700 hover:text-gray-900'} transition-colors`}
        >
          <span className="text-sm font-medium">
            {isExpanded ? '詳細情報を閉じる' : '詳細情報を見る'}
          </span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      )}

      {/* 詳細情報セクション（MBTI情報がある場合のみ） */}
      {analysisMode !== 'strengths-only' && isExpanded && (
        <div className="space-y-5 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          {/* MBTI特性の強み */}
          {strengths && strengths.length > 0 && (
            <div>
              <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                MBTI特性の強み
              </h4>
              <div className="flex flex-wrap gap-2">
                {strengths.map((strength, index) => (
                  <span
                    key={index}
                    className={`px-3 py-1 rounded-full text-xs font-medium ${
                      isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
                    }`}
                  >
                    {strength}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* 理想的な環境 */}
          {idealEnvironment && (
            <div>
              <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                理想的な環境
              </h4>
              <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {idealEnvironment}
              </p>
            </div>
          )}

          {/* モチベーション要因 */}
          {motivators && motivators.length > 0 && (
            <div>
              <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                モチベーション要因
              </h4>
              <ul className={`list-disc list-inside space-y-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {motivators.map((motivator, index) => (
                  <li key={index}>{motivator}</li>
                ))}
              </ul>
            </div>
          )}

          {/* ストレス要因 */}
          {stressors && stressors.length > 0 && (
            <div>
              <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                ストレス要因
              </h4>
              <ul className={`list-disc list-inside space-y-1 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                {stressors.map((stressor, index) => (
                  <li key={index}>{stressor}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 相性の良いMBTIタイプ */}
          {(naturalPartners || complementaryPartners) && (
            <div>
              <h4 className={`text-sm font-semibold mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                相性の良いMBTIタイプ
              </h4>
              <div className="space-y-3">
                {/* 自然な相性 */}
                {naturalPartners && naturalPartners.length > 0 && (
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      自然な相性
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {naturalPartners.map((type, index) => {
                        const owners = getMembersByMBTIType(type);
                        const typeName = MBTI_NAMES[type] || type;
                        const tooltipText = owners.length > 0
                          ? `${type}\n${typeName}\n\n所有者:\n${owners.join('\n')}`
                          : `${type}\n${typeName}`;

                        return (
                          <span
                            key={index}
                            title={tooltipText}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isDark ? 'bg-purple-900/30 text-purple-300' : 'bg-purple-50 text-purple-700'
                            }`}
                          >
                            {type}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* 補完的な相性 */}
                {complementaryPartners && complementaryPartners.length > 0 && (
                  <div>
                    <p className={`text-xs mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      補完的な相性
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {complementaryPartners.map((type, index) => {
                        const owners = getMembersByMBTIType(type);
                        const typeName = MBTI_NAMES[type] || type;
                        const tooltipText = owners.length > 0
                          ? `${type}\n${typeName}\n\n所有者:\n${owners.join('\n')}`
                          : `${type}\n${typeName}`;

                        return (
                          <span
                            key={index}
                            title={tooltipText}
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              isDark ? 'bg-blue-900/30 text-blue-300' : 'bg-blue-50 text-blue-700'
                            }`}
                          >
                            {type}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProfileAnalysisCard;
