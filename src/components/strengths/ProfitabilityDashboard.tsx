// src/components/strengths/ProfitabilityDashboard.tsx
/**
 * 利益率ダッシュボードコンポーネント
 *
 * @module components/strengths/ProfitabilityDashboard
 * @description チーム全体の利益率・原価・利益を可視化するダッシュボード
 *              SPEC: MANAGER_FEATURE_SPEC_V3.md Phase 4.4
 */

import React from 'react';
import { MemberStrengths } from '../../models/StrengthsTypes';
import { useStageMasters } from '../../hooks/useStageMasters';
import { useMemberRates } from '../../hooks/useMemberRates';
import { ProfitabilityService } from '../../services/ProfitabilityService';
import { FinancialService } from '../../services/FinancialService';

interface ProfitabilityDashboardProps {
  members: MemberStrengths[];
}

/**
 * 利益率の色分けクラスを返す
 * @param profitMargin - 利益率（%）
 */
const getProfitMarginColorClass = (profitMargin: number): string => {
  if (profitMargin >= 40) return 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-900/30';
  if (profitMargin >= 20) return 'text-blue-700 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/30';
  if (profitMargin >= 0) return 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/30';
  return 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-900/30';
};

/**
 * ステージIDの表示順序（固定）
 */
const STAGE_ORDER = ['S1', 'S2', 'S3', 'S4', 'CONTRACT', 'BP'];

/**
 * マネージャー専用: 利益率ダッシュボード
 * 選択されたメンバーの利益率情報を集計・表示
 */
const ProfitabilityDashboard: React.FC<ProfitabilityDashboardProps> = ({ members }) => {
  const { stageMasters } = useStageMasters();
  const { memberRates, getMemberRate, refreshRates } = useMemberRates();

  // 単価情報を最新に更新（マウント時とメンバー変更時）
  React.useEffect(() => {
    refreshRates();
  }, [members, refreshRates]);

  // ステージIDと単価情報を持つメンバーのみをフィルタ
  const validMembers = members.filter(m => {
    const memberRate = getMemberRate(m.id);
    return m.stageId && memberRate;
  });

  if (validMembers.length === 0) {
    return (
      <div className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-6 mb-6">
        <div className="mb-4">
          <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
            <span>📊</span>
            <span>利益率分析</span>
          </h3>
        </div>
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>ステージ情報を持つメンバーがいません</p>
          <p className="text-sm mt-1">メンバー追加時にステージと単価を設定してください</p>
        </div>
      </div>
    );
  }

  // チーム全体の利益率を計算
  const teamProfitability = ProfitabilityService.calculateTeamProfitability(validMembers, stageMasters, memberRates);

  return (
    <div className="bg-gradient-to-br from-purple-50 to-indigo-100 dark:from-purple-900/20 dark:to-indigo-900/20 border-2 border-purple-300 dark:border-purple-700 rounded-lg p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 flex items-center gap-2">
          <span>📊</span>
          <span>利益率分析</span>
        </h3>
      </div>

      {/* メイン指標 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* 総売上 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
            <span>💰</span>
            <span>総売上（月額）</span>
          </div>
          <div className="text-2xl font-bold text-purple-700 dark:text-purple-400">
            {FinancialService.formatCurrency(teamProfitability.totalRevenue)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            平均: {FinancialService.formatCurrency(teamProfitability.averageRevenue)}/人
          </div>
        </div>

        {/* 総原価 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
            <span>💸</span>
            <span>総原価（月額）</span>
          </div>
          <div className="text-2xl font-bold text-orange-700 dark:text-orange-400">
            {FinancialService.formatCurrency(teamProfitability.totalCost)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {teamProfitability.memberCount}名
          </div>
        </div>

        {/* 総利益 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
            <span>📈</span>
            <span>総利益（月額）</span>
          </div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {FinancialService.formatCurrency(teamProfitability.totalProfit)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            平均: {FinancialService.formatCurrency(teamProfitability.averageProfit)}/人
          </div>
        </div>
      </div>

      {/* 利益率 */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm mb-6">
        <div className="text-center">
          <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
            チーム全体の利益率
          </div>
          <div className={`inline-block px-6 py-3 rounded-lg ${getProfitMarginColorClass(teamProfitability.profitMargin)}`}>
            <span className="text-4xl font-bold">
              {teamProfitability.profitMargin.toFixed(1)}%
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-500 dark:text-gray-400">
            {teamProfitability.profitMargin >= 40 && '✨ 優良な利益率'}
            {teamProfitability.profitMargin >= 20 && teamProfitability.profitMargin < 40 && '👍 良好な利益率'}
            {teamProfitability.profitMargin >= 0 && teamProfitability.profitMargin < 20 && '⚠️ 低めの利益率'}
            {teamProfitability.profitMargin < 0 && '🔴 赤字状態'}
          </div>
        </div>
      </div>

      {/* ステージ別内訳 */}
      {Object.keys(teamProfitability.profitByStage).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            ステージ別内訳
          </h4>
          <div className="space-y-3">
            {STAGE_ORDER
              .filter(stageId => teamProfitability.profitByStage[stageId]) // 存在するステージのみ
              .map(stageId => {
                const data = teamProfitability.profitByStage[stageId];
                const stage = stageMasters.find(s => s.id === stageId);
                if (!stage) return null;

                return (
                  <div
                    key={stageId}
                    className="border dark:border-gray-700 rounded p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 dark:text-gray-100">
                          {stage.name}
                        </span>
                        <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">
                          {stage.type === 'employee' ? '社員' : 'BP'}
                        </span>
                        <span className="text-gray-500 dark:text-gray-400 text-sm">
                          × {data.count}名
                        </span>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-semibold ${getProfitMarginColorClass(data.averageProfitMargin)}`}>
                        {data.averageProfitMargin.toFixed(1)}%
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      総利益: {FinancialService.formatCurrency(data.totalProfit)}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfitabilityDashboard;
