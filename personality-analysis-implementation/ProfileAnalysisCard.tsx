/**
 * プロファイル分析カード
 * 
 * @description
 * メンバーの性格分析結果を表示するカードコンポーネント
 * ストレングスファインダーカードの右側に配置
 */

import React, { useEffect, useState } from 'react';
import PersonalityAnalysisEngine from '../../services/PersonalityAnalysisEngine';
import { Member, AnalysisResult } from '../../models/PersonalityAnalysis';

interface ProfileAnalysisCardProps {
  member: Member;
}

const ProfileAnalysisCard: React.FC<ProfileAnalysisCardProps> = ({ member }) => {
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const performAnalysis = async () => {
      setIsLoading(true);
      try {
        const result = PersonalityAnalysisEngine.analyze(member);
        setAnalysis(result);
      } catch (error) {
        console.error('分析エラー:', error);
        setAnalysis(null);
      } finally {
        setIsLoading(false);
      }
    };

    performAnalysis();
  }, [member]);

  // 分析データがない場合は非表示
  if (isLoading) {
    return <LoadingCard />;
  }

  if (!analysis) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-gray-900 flex items-center">
          <span className="text-2xl mr-2">🧠</span>
          プロファイル分析
        </h3>
        <AnalysisModeBadge mode={analysis.analysisMode} />
      </div>

      {/* データ不足の警告 */}
      {analysis.analysisMode !== 'full' && (
        <DataWarning mode={analysis.analysisMode} />
      )}

      {/* 主要な役割 */}
      <div className="mb-6">
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg p-4">
          <div className="text-sm text-gray-600 mb-1">主要な役割</div>
          <div className="text-xl font-bold text-indigo-900">{analysis.primaryRole}</div>
        </div>
      </div>

      {/* スコア */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">スコア</h4>
        <div className="space-y-3">
          {analysis.analysisMode === 'full' && (
            <ScoreItem
              label="強み適合度"
              score={analysis.synergyScore}
              color="blue"
              icon="🎯"
            />
          )}
          <ScoreItem
            label="チーム適合度"
            score={analysis.teamFitScore}
            color="green"
            icon="🤝"
          />
          <ScoreItem
            label="リーダーシップ"
            score={analysis.leadershipPotential}
            color="purple"
            icon="👑"
          />
        </div>
      </div>

      {/* プロファイル統合メッセージ */}
      <div className="mb-6">
        <h4 className="text-sm font-semibold text-gray-700 mb-3">プロファイル</h4>
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          {analysis.profileSummary.map((text, index) => (
            <p key={index} className="text-sm text-gray-700 leading-relaxed">
              {text}
            </p>
          ))}
        </div>
      </div>

      {/* 詳細情報（折りたたみ可能） */}
      <DetailedInfo analysis={analysis} />
    </div>
  );
};

// =============================================================================
// サブコンポーネント
// =============================================================================

/**
 * 分析モードバッジ
 */
interface AnalysisModeBadgeProps {
  mode: 'full' | 'mbti-only' | 'strengths-only';
}

const AnalysisModeBadge: React.FC<AnalysisModeBadgeProps> = ({ mode }) => {
  const configs = {
    full: {
      label: '完全分析',
      color: 'bg-green-100 text-green-800',
    },
    'mbti-only': {
      label: 'MBTI分析',
      color: 'bg-blue-100 text-blue-800',
    },
    'strengths-only': {
      label: '資質分析',
      color: 'bg-purple-100 text-purple-800',
    },
  };

  const config = configs[mode];

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${config.color}`}>
      {config.label}
    </span>
  );
};

/**
 * データ不足の警告
 */
interface DataWarningProps {
  mode: 'mbti-only' | 'strengths-only';
}

const DataWarning: React.FC<DataWarningProps> = ({ mode }) => {
  const messages = {
    'mbti-only': 'ストレングスファインダーのデータがないため、一部の分析が制限されています。',
    'strengths-only': 'MBTIタイプが登録されていないため、一部の分析が制限されています。',
  };

  return (
    <div className="mb-4 bg-yellow-50 border-l-4 border-yellow-400 p-3">
      <div className="flex items-start">
        <svg
          className="h-5 w-5 text-yellow-400 mt-0.5 flex-shrink-0"
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path
            fillRule="evenodd"
            d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
            clipRule="evenodd"
          />
        </svg>
        <p className="ml-3 text-sm text-yellow-700">{messages[mode]}</p>
      </div>
    </div>
  );
};

/**
 * スコア項目
 */
interface ScoreItemProps {
  label: string;
  score: number;
  color: 'blue' | 'green' | 'purple';
  icon: string;
}

const ScoreItem: React.FC<ScoreItemProps> = ({ label, score, color, icon }) => {
  const colorClasses = {
    blue: {
      bar: 'bg-blue-500',
      text: 'text-blue-900',
    },
    green: {
      bar: 'bg-green-500',
      text: 'text-green-900',
    },
    purple: {
      bar: 'bg-purple-500',
      text: 'text-purple-900',
    },
  };

  const classes = colorClasses[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700 flex items-center">
          <span className="mr-1.5">{icon}</span>
          {label}
        </span>
        <span className={`text-sm font-bold ${classes.text}`}>{score}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${classes.bar} h-2 rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${score}%` }}
        />
      </div>
    </div>
  );
};

/**
 * 詳細情報（折りたたみ可能）
 */
interface DetailedInfoProps {
  analysis: AnalysisResult;
}

const DetailedInfo: React.FC<DetailedInfoProps> = ({ analysis }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border-t border-gray-200 pt-4">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
      >
        <span>詳細情報</span>
        <svg
          className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="mt-4 space-y-4 animate-fadeIn">
          {/* 強み */}
          {analysis.strengths.length > 0 && (
            <InfoSection title="💪 強み" items={analysis.strengths} />
          )}

          {/* 仕事のスタイル */}
          {analysis.workStyle && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">💼 仕事のスタイル</h5>
              <p className="text-sm text-gray-600">{analysis.workStyle}</p>
            </div>
          )}

          {/* コミュニケーション */}
          {analysis.communicationStyle && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">💬 コミュニケーション</h5>
              <p className="text-sm text-gray-600">{analysis.communicationStyle}</p>
            </div>
          )}

          {/* 理想的な環境 */}
          {analysis.idealEnvironment && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">🌟 理想的な環境</h5>
              <p className="text-sm text-gray-600">{analysis.idealEnvironment}</p>
            </div>
          )}

          {/* モチベーション要因 */}
          {analysis.motivators.length > 0 && (
            <InfoSection title="⚡ モチベーション要因" items={analysis.motivators} />
          )}

          {/* ストレス要因 */}
          {analysis.stressors.length > 0 && (
            <InfoSection title="⚠️ ストレス要因" items={analysis.stressors} color="yellow" />
          )}

          {/* 相性の良いタイプ */}
          {analysis.compatibleTypes && analysis.compatibleTypes.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">🤝 相性の良いタイプ</h5>
              <div className="flex flex-wrap gap-2">
                {analysis.compatibleTypes.map((type) => (
                  <span
                    key={type}
                    className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium"
                  >
                    {type}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* TOP資質 */}
          {analysis.topStrengthNames && analysis.topStrengthNames.length > 0 && (
            <div>
              <h5 className="text-sm font-semibold text-gray-700 mb-2">⭐ TOP資質</h5>
              <div className="flex flex-wrap gap-2">
                {analysis.topStrengthNames.map((name, index) => (
                  <span
                    key={index}
                    className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-medium"
                  >
                    {index + 1}. {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/**
 * 情報セクション
 */
interface InfoSectionProps {
  title: string;
  items: string[];
  color?: 'blue' | 'green' | 'yellow';
}

const InfoSection: React.FC<InfoSectionProps> = ({ title, items, color = 'blue' }) => {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
  };

  return (
    <div>
      <h5 className="text-sm font-semibold text-gray-700 mb-2">{title}</h5>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li key={index} className="text-sm text-gray-600 flex items-start">
            <span className={`mr-2 mt-0.5 ${colorClasses[color]}`}>•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

/**
 * ローディングカード
 */
const LoadingCard: React.FC = () => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="animate-pulse space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="h-20 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
      </div>
    </div>
  );
};

export default ProfileAnalysisCard;
