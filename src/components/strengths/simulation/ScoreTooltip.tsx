/**
 * スコアツールチップコンポーネント
 *
 * @module components/strengths/simulation/ScoreTooltip
 * @description スコアの内訳と改善提案を表示するツールチップ
 */

import React, { useState } from 'react';
import { ScoreBreakdown } from '../../../types/simulation';

interface ScoreTooltipProps {
  /** 表示するスコア値 */
  score: number;
  /** スコアの種類に応じたブレークダウン */
  breakdown: ScoreBreakdown;
  /** 子要素（スコア表示部分） */
  children: React.ReactNode;
}

/**
 * スコアツールチップ
 *
 * ホバー時にスコアの計算内訳と改善提案を表示
 * 300ms の遅延でツールチップを表示
 */
const ScoreTooltip: React.FC<ScoreTooltipProps> = ({ score, breakdown, children }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);

  const handleMouseEnter = () => {
    const id = setTimeout(() => {
      setIsVisible(true);
    }, 300); // 300ms 遅延
    setTimeoutId(id);
  };

  const handleMouseLeave = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      setTimeoutId(null);
    }
    setIsVisible(false);
  };

  // スコアに基づく評価を取得
  const getEvaluation = () => {
    if (score >= breakdown.threshold.high.min) {
      return breakdown.threshold.high;
    } else if (score >= breakdown.threshold.balanced.min) {
      return breakdown.threshold.balanced;
    } else {
      return breakdown.threshold.low;
    }
  };

  const evaluation = getEvaluation();

  return (
    <div
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* トリガー要素 */}
      <div className="cursor-help">
        {children}
      </div>

      {/* ツールチップ */}
      {isVisible && (
        <div
          className="absolute z-50 w-80 p-4 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-xl border border-gray-700"
          style={{
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px'
          }}
        >
          {/* 矢印 */}
          <div
            className="absolute w-3 h-3 bg-gray-900 dark:bg-gray-800 border-r border-b border-gray-700"
            style={{
              bottom: '-6px',
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)'
            }}
          />

          {/* ヘッダー */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold">
                {breakdown.type === 'synergy' && '相性スコア'}
                {breakdown.type === 'teamFit' && 'チーム適合度'}
                {breakdown.type === 'leadership' && 'リーダーシップ'}
              </span>
              <span className="text-xl font-bold">{breakdown.totalScore}</span>
            </div>
            <div className="text-xs text-gray-300">
              {evaluation.label} - {evaluation.description}
            </div>
          </div>

          {/* スコア内訳 */}
          <div className="mb-3">
            <div className="text-xs font-semibold text-gray-300 mb-2">計算内訳</div>
            <div className="space-y-1">
              {breakdown.components.map((component, index) => (
                <div key={index} className="flex justify-between text-xs">
                  <span className="text-gray-300">{component.label}</span>
                  <span className="font-medium">
                    {component.value > 0 ? '+' : ''}{component.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 改善提案 */}
          {breakdown.improvements.length > 0 && (
            <div className="pt-3 border-t border-gray-700">
              <div className="text-xs font-semibold text-gray-300 mb-2">
                {score >= breakdown.threshold.high.min ? '維持のポイント' : '改善提案'}
              </div>
              <ul className="text-xs text-gray-300 space-y-1">
                {breakdown.improvements.map((improvement, index) => (
                  <li key={index} className="flex items-start">
                    <span className="mr-1">•</span>
                    <span>{improvement}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ScoreTooltip;
