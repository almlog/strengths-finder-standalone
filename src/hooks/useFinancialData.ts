/**
 * 金額データ計算フック v2.0
 *
 * @module hooks/useFinancialData
 * @description メンバー配列からチームの金額情報を計算するカスタムフック
 *              v2.0: PositionServiceを使用せず、メンバー個別単価から直接計算
 */

import { useMemo } from 'react';
import { MemberStrengths } from '../models/StrengthsTypes';
import { TeamFinancials } from '../types/financial';
import { FinancialService } from '../services/FinancialService';
import { useMemberRates } from './useMemberRates';

/**
 * メンバー配列から金額データを計算
 *
 * @param {MemberStrengths[]} members - メンバー一覧
 * @returns {TeamFinancials} チーム金額情報
 *
 * @example
 * ```typescript
 * function TeamDashboard() {
 *   const members = useMembers(); // メンバー一覧を取得
 *   const financials = useFinancialData(members);
 *
 *   return (
 *     <div>
 *       <p>月間売上: {FinancialService.formatCurrency(financials.monthlyRevenue)}</p>
 *       <p>年間予測: {FinancialService.formatCurrency(financials.annualRevenue)}</p>
 *     </div>
 *   );
 * }
 * ```
 */
export function useFinancialData(members: MemberStrengths[]): TeamFinancials {
  const { memberRates } = useMemberRates();

  const financials = useMemo(() => {
    return FinancialService.calculateTeamFinancials(members, memberRates);
  }, [members, memberRates]);

  return financials;
}
