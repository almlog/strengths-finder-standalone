// src/services/ProfitabilityService.ts
/**
 * 利益率計算サービス v3.1
 *
 * @module services/ProfitabilityService
 * @description メンバーおよびチーム全体の利益率計算を行うサービス
 *              SPEC: MANAGER_FEATURE_SPEC_V3.1_UNIFIED.md
 * @version 3.1 - 契約単価分離 + 雇用形態別計算
 */

import { MemberStrengths } from '../models/StrengthsTypes';
import { MemberProfitability, TeamProfitability, StageMaster } from '../types/profitability';
import { MemberRate, MemberRateRecord, ContractRate } from '../types/financial';
import { FinancialService } from './FinancialService';

/**
 * ProfitabilityService クラス v3.1
 *
 * 正社員・契約社員・BPの利益計算、チーム全体の利益集計を行う
 *
 * v3.1の主な変更点:
 * - 雇用形態別の原価計算ロジック
 * - 正社員: 給与 + (給与 × 給与経費率)
 * - 契約社員・BP: 契約単価 + 固定経費
 * - contractRate パラメータの追加
 */
export class ProfitabilityService {
  /**
   * 空のチーム利益結果を返す
   * @private
   */
  private static getEmptyTeamProfitability(): TeamProfitability {
    return {
      totalRevenue: 0,
      totalCost: 0,
      totalProfit: 0,
      profitMargin: 0,
      memberCount: 0,
      averageRevenue: 0,
      averageProfit: 0,
      profitByStage: {}
    };
  }

  /**
   * メンバー個人の利益を計算（v3.1）
   *
   * 計算ロジック:
   * - 正社員（S1-S4）: 原価 = 給与 + (給与 × 給与経費率)
   * - 契約社員・BP: 原価 = 契約単価 + 固定経費
   * - v3.0互換: BPで contractRate がない場合は 売上 × 経費率
   *
   * @param {MemberStrengths} member - メンバー情報
   * @param {StageMaster[]} stageMasters - ステージマスタ一覧
   * @param {MemberRate} [memberRate] - メンバー売上単価（オプション。指定がない場合は売上0として計算）
   * @param {ContractRate} [contractRate] - 契約単価（契約社員・BPのみ、v3.1）
   * @returns {MemberProfitability} 利益計算結果
   * @throws {Error} ステージIDが未設定または無効な場合
   *
   * @example
   * ```typescript
   * // v3.1: 契約社員の例
   * const member = {
   *   id: 'contract001',
   *   name: '鈴木一郎',
   *   stageId: 'CONTRACT'
   * };
   * const memberRate = { rateType: 'monthly', rate: 800000 }; // 売上
   * const contractRate = { rateType: 'monthly', rate: 600000 }; // 契約単価
   * const result = ProfitabilityService.calculateMemberProfitability(
   *   member, DEFAULT_STAGE_MASTERS, memberRate, contractRate
   * );
   * // {
   * //   revenue: 800000,
   * //   cost: 650000, // 600000 + 50000(固定経費)
   * //   profit: 150000,
   * //   profitMargin: 18.75,
   * //   ...
   * // }
   * ```
   */
  static calculateMemberProfitability(
    member: MemberStrengths,
    stageMasters: StageMaster[],
    memberRate?: MemberRate,
    contractRate?: ContractRate
  ): MemberProfitability {
    // ステージIDのバリデーション
    if (!member.stageId) {
      throw new Error('ステージIDが設定されていません');
    }

    const stage = stageMasters.find(s => s.id === member.stageId);
    if (!stage) {
      throw new Error(`ステージマスタが見つかりません: ${member.stageId}`);
    }

    // 売上計算（月額換算）
    const revenue = FinancialService.calculateMonthlyRate(member, memberRate);

    let cost = 0;
    let salary: number | undefined = undefined;
    let expense = 0;

    // v3.1: 雇用形態による計算分岐
    const employmentType = stage.employmentType || stage.type; // v3.0互換

    if (employmentType === 'regular' || stage.type === 'employee') {
      // 正社員の場合: 原価 = 給与 + (給与 × 給与経費率)
      salary = stage.averageSalary || 0;
      const salaryExpenseRate = stage.salaryExpenseRate ?? stage.expenseRate ?? 0; // v3.0互換
      expense = salary * salaryExpenseRate;
      cost = salary + expense;
    } else if (employmentType === 'contract' || employmentType === 'bp') {
      // v3.1: 契約社員・BPの場合: 原価 = 契約単価 + 固定経費
      if (contractRate) {
        // v3.1方式: 契約単価 + 固定経費
        const contractAmount = contractRate.rateType === 'hourly'
          ? contractRate.rate * (contractRate.hours || 160)
          : contractRate.rate;
        const fixedExpense = stage.fixedExpense || 0;
        cost = contractAmount + fixedExpense;
        expense = fixedExpense;
        salary = undefined;
      } else {
        // v3.0互換: 契約単価がない場合は売上 × 経費率
        const expenseRate = stage.expenseRate || 0;
        cost = revenue * expenseRate;
        expense = cost;
        salary = undefined;
      }
    }

    // 利益計算
    const profit = revenue - cost;

    // 利益率計算（%）
    let profitMargin = 0;
    if (revenue > 0) {
      profitMargin = (profit / revenue) * 100;
    } else {
      // 売上がゼロの場合は -100%
      profitMargin = -100;
    }

    return {
      memberId: member.id,
      revenue,
      cost,
      profit,
      profitMargin,
      details: {
        salary,
        expense,
        stageId: member.stageId
      }
    };
  }

  /**
   * チーム全体の利益を集計
   *
   * @param {MemberStrengths[]} members - メンバー一覧
   * @param {StageMaster[]} stageMasters - ステージマスタ一覧
   * @param {MemberRateRecord[]} [memberRates] - メンバー単価一覧（オプション。指定がない場合は売上0として計算）
   * @returns {TeamProfitability} チーム全体の利益集計結果
   *
   * @example
   * ```typescript
   * // 単価情報を外部から指定（v3.1以降推奨）
   * const members = [
   *   { id: 'member-1', stageId: 'S1' },
   *   { id: 'member-2', stageId: 'S2' }
   * ];
   * const memberRates = [
   *   { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: 600000 } },
   *   { memberId: 'member-2', memberRate: { rateType: 'monthly', rate: 800000 } }
   * ];
   * const result = ProfitabilityService.calculateTeamProfitability(members, DEFAULT_STAGE_MASTERS, memberRates);
   * // {
   * //   totalRevenue: 1400000,
   * //   totalCost: 780000,
   * //   totalProfit: 620000,
   * //   profitMargin: 44.29,
   * //   memberCount: 2,
   * //   ...
   * // }
   * ```
   */
  static calculateTeamProfitability(
    members: MemberStrengths[],
    stageMasters: StageMaster[],
    memberRates?: MemberRateRecord[]
  ): TeamProfitability {
    // ステージIDを持つメンバーのみを対象
    const validMembers = members.filter(m => m.stageId);

    if (validMembers.length === 0) {
      return this.getEmptyTeamProfitability();
    }

    // memberRateをIDでマッピング
    const rateMap = new Map<string, MemberRate>();
    if (memberRates) {
      memberRates.forEach(record => {
        rateMap.set(record.memberId, record.memberRate);
      });
    }

    // 各メンバーの利益を計算
    const memberProfitabilities = validMembers.map(m => {
      const memberRate = rateMap.get(m.id);
      return this.calculateMemberProfitability(m, stageMasters, memberRate);
    });

    // 総計
    const totalRevenue = memberProfitabilities.reduce((sum, p) => sum + p.revenue, 0);
    const totalCost = memberProfitabilities.reduce((sum, p) => sum + p.cost, 0);
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    // 平均
    const memberCount = validMembers.length;
    const averageRevenue = totalRevenue / memberCount;
    const averageProfit = totalProfit / memberCount;

    // ステージ別集計
    const profitByStage: Record<string, {
      count: number;
      totalProfit: number;
      averageProfitMargin: number;
    }> = {};

    for (const profitability of memberProfitabilities) {
      const stageId = profitability.details.stageId || 'unknown';

      if (!profitByStage[stageId]) {
        profitByStage[stageId] = {
          count: 0,
          totalProfit: 0,
          averageProfitMargin: 0
        };
      }

      profitByStage[stageId].count += 1;
      profitByStage[stageId].totalProfit += profitability.profit;
    }

    // ステージ別平均利益率を計算
    for (const stageId of Object.keys(profitByStage)) {
      const stageMembers = memberProfitabilities.filter(
        p => p.details.stageId === stageId
      );
      const totalMargin = stageMembers.reduce((sum, p) => sum + p.profitMargin, 0);
      profitByStage[stageId].averageProfitMargin = totalMargin / stageMembers.length;
    }

    return {
      totalRevenue,
      totalCost,
      totalProfit,
      profitMargin,
      memberCount,
      averageRevenue,
      averageProfit,
      profitByStage
    };
  }
}
