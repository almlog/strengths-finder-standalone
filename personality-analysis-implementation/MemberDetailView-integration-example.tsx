/**
 * メンバー詳細画面への統合例
 * 
 * @description
 * 既存のMemberDetailView.tsxにプロファイル分析カードを追加する方法
 */

import React from 'react';
import ProfileAnalysisCard from '../analysis/ProfileAnalysisCard';
// ... 他のインポート

interface MemberDetailViewProps {
  member: Member;
}

const MemberDetailView: React.FC<MemberDetailViewProps> = ({ member }) => {
  return (
    <div className="container mx-auto px-4 py-6">
      {/* 2カラムレイアウト */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* 左カラム */}
        <div className="space-y-6">
          {/* 基本情報カード（既存） */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-bold mb-2">{member.name}</h2>
            <p className="text-gray-600">{member.department}</p>
            {member.position && (
              <p className="text-gray-500">{member.position}</p>
            )}
            {member.mbtiType && (
              <div className="mt-4">
                <span className="inline-block px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full text-sm font-medium">
                  {member.mbtiType}
                </span>
              </div>
            )}
          </div>

          {/* レーダーチャート（既存） */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold mb-4">ストレングスレーダー</h3>
            {/* レーダーチャートコンポーネント */}
            <StrengthsRadarChart strengths={member.strengths} />
          </div>
        </div>

        {/* 右カラム */}
        <div className="space-y-6">
          {/* ストレングスファインダーカード（既存） */}
          {member.strengths && member.strengths.length > 0 && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-xl font-bold mb-4">ストレングスファインダー</h3>
              <div className="space-y-2">
                {member.strengths.slice(0, 5).map((strength, index) => (
                  <div key={strength.id} className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 mr-2">
                      {index + 1}.
                    </span>
                    <span className="font-medium">
                      {STRENGTH_NAMES[strength.id]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ★ プロファイル分析カード（新規追加） */}
          <ProfileAnalysisCard member={member} />
        </div>
      </div>
    </div>
  );
};

export default MemberDetailView;

/**
 * レスポンシブ対応
 * 
 * PC: 2カラム表示
 * ┌─────────────┬─────────────┐
 * │  基本情報    │ 資質リスト   │
 * ├─────────────┤             │
 * │レーダーチャート│             │
 * │             ├─────────────┤
 * │             │プロファイル   │
 * │             │分析カード    │
 * └─────────────┴─────────────┘
 * 
 * スマホ: 1カラム表示
 * ┌─────────────┐
 * │  基本情報    │
 * ├─────────────┤
 * │レーダーチャート│
 * ├─────────────┤
 * │ 資質リスト   │
 * ├─────────────┤
 * │プロファイル   │
 * │分析カード    │
 * └─────────────┘
 */
