/**
 * ProfileAnalysisCard Component
 *
 * @module components/analysis/ProfileAnalysisCard
 * @description Displays personality profile analysis combining MBTI and StrengthsFinder data.
 * Shows synergy scores, team fit, leadership potential, and profile summary.
 * Supports three modes: full (MBTI + Strengths), MBTI-only, and Strengths-only.
 */

import React, { useMemo } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Member } from '../../models/PersonalityAnalysis';
import PersonalityAnalysisEngine from '../../services/PersonalityAnalysisEngine';

/**
 * Props for ProfileAnalysisCard component
 */
interface ProfileAnalysisCardProps {
  /** Member data to analyze */
  member: Member;
}

/**
 * ProfileAnalysisCard functional component
 *
 * @param {ProfileAnalysisCardProps} props - Component props
 * @returns {JSX.Element | null} Card element or null if no analyzable data
 */
const ProfileAnalysisCard: React.FC<ProfileAnalysisCardProps> = ({ member }) => {
  // Get current theme for color selection
  const { themeId } = useTheme();
  const isDark = themeId === 'dark';

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
  } = analysisResult;

  // Determine score color based on value
  const getScoreColor = (score: number): string => {
    if (score >= 75) return isDark ? 'text-green-400' : 'text-green-600';
    if (score >= 50) return isDark ? 'text-blue-400' : 'text-blue-600';
    if (score >= 25) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    return isDark ? 'text-gray-400' : 'text-gray-600';
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
        <h3 className={`text-2xl font-bold mb-2 ${isDark ? 'text-white dark:text-white' : 'text-gray-900'}`}>
          プロファイル分析
        </h3>
        <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
          {primaryRole}
        </p>
      </div>

      {/* Score Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Synergy Score */}
        <div className="text-center">
          <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            強み適合度
          </p>
          <p
            data-testid="synergy-score"
            className={`text-3xl font-bold ${getScoreColor(synergyScore)}`}
          >
            {synergyScore}
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            / 100
          </p>
        </div>

        {/* Team Fit Score */}
        <div className="text-center">
          <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            チーム適合度
          </p>
          <p
            data-testid="team-fit-score"
            className={`text-3xl font-bold ${getScoreColor(teamFitScore)}`}
          >
            {teamFitScore}
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            / 100
          </p>
        </div>

        {/* Leadership Potential */}
        <div className="text-center">
          <p className={`text-sm font-medium mb-2 ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            リーダーシップ潜在力
          </p>
          <p
            data-testid="leadership-score"
            className={`text-3xl font-bold ${getScoreColor(leadershipPotential)}`}
          >
            {leadershipPotential}
          </p>
          <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
            / 100
          </p>
        </div>
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

      {/* Warning Message for Incomplete Data */}
      {analysisMode !== 'full' && (
        <div className={`mt-6 p-4 rounded-md ${
          isDark ? 'bg-yellow-900/30 border border-yellow-700' : 'bg-yellow-50 border border-yellow-200'
        }`}>
          <p className={`text-sm ${isDark ? 'text-yellow-400' : 'text-yellow-800'}`}>
            {analysisMode === 'mbti-only' && '⚠️ 資質データがありません。ストレングスファインダー診断結果を追加すると、より詳細な分析が可能です。'}
            {analysisMode === 'strengths-only' && '⚠️ MBTIデータがありません。16Personalities診断結果を追加すると、より詳細な分析が可能です。'}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfileAnalysisCard;
