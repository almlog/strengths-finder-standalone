// src/components/strengths/FinancialDashboard.tsx
import React from 'react';
import { MemberStrengths } from '../../models/StrengthsTypes';
import { useFinancialData } from '../../hooks/useFinancialData';
import { FinancialService } from '../../services/FinancialService';
import { POSITION_TEMPLATES } from '../../constants/positionTemplates';

interface FinancialDashboardProps {
  members: MemberStrengths[];
}

/**
 * マネージャー専用: 売上予測ダッシュボード
 * 選択されたメンバーの金額情報を集計・表示
 */
const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ members }) => {
  const financials = useFinancialData(members);

  return (
    <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/20 dark:to-emerald-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-6 mb-6">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-green-900 dark:text-green-100 flex items-center gap-2">
          <span>💰</span>
          <span>売上予測</span>
        </h3>
      </div>

      {/* メイン指標 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* 月間売上 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
            <span>📊</span>
            <span>月間売上</span>
          </div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {FinancialService.formatCurrency(financials.monthlyRevenue)}
          </div>
        </div>

        {/* 年間予測 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm mb-1">
            <span>📈</span>
            <span>年間予測</span>
          </div>
          <div className="text-2xl font-bold text-green-700 dark:text-green-400">
            {FinancialService.formatCurrency(financials.annualRevenue)}
          </div>
        </div>
      </div>

      {/* ポジション別内訳 */}
      {Object.keys(financials.revenueByPosition).length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            ポジション別内訳
          </h4>
          <div className="space-y-2">
            {Object.entries(financials.revenueByPosition).map(([positionId, data]) => {
              const template = POSITION_TEMPLATES.find(t => t.id === positionId);
              if (!template) return null;

              return (
                <div
                  key={positionId}
                  className="flex items-center justify-between py-2 border-b dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{template.icon}</span>
                    <span
                      className="font-medium"
                      style={{ color: template.color }}
                    >
                      {template.name}
                    </span>
                    <span className="text-gray-500 dark:text-gray-400 text-sm">
                      × {data.count}名
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-gray-900 dark:text-gray-100">
                      {FinancialService.formatCurrency(data.totalRevenue)}
                    </div>
                    {template.rateType === 'hourly' && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        (時給換算)
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* データなし表示 */}
      {Object.keys(financials.revenueByPosition).length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>単価情報を持つメンバーがいません</p>
          <p className="text-sm mt-1">メンバー追加時にポジションと単価を設定してください</p>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;
