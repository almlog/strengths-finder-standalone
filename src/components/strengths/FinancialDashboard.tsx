// src/components/strengths/FinancialDashboard.tsx
import React from 'react';
import { MemberStrengths } from '../../models/StrengthsTypes';
import { useFinancialData } from '../../hooks/useFinancialData';
import { FinancialService } from '../../services/FinancialService';

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

      {/* データなし表示 */}
      {financials.monthlyRevenue === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <p>単価情報を持つメンバーがいません</p>
          <p className="text-sm mt-1">メンバー編集画面で単価を設定してください</p>
        </div>
      )}
    </div>
  );
};

export default FinancialDashboard;
