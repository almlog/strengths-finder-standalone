/**
 * 金額計算サービス v2.0
 *
 * @module services/FinancialService
 * @description チーム全体の金額計算・フォーマットを行うサービス
 *              v2.0: メンバー個別単価ベースの設計（PositionRateは非推奨）
 */

import { TeamFinancials, MemberRate, MemberRateRecord } from '../types/financial';
import { MemberStrengths } from '../models/StrengthsTypes';

/**
 * FinancialService クラス v2.0
 *
 * メンバー個別の単価情報から売上予測、平均単価などを計算
 */
export class FinancialService {
  /**
   * メンバーの月額換算単価を計算
   * 時給の場合は自動的に月額換算
   *
   * @param {MemberStrengths} member - メンバー情報
   * @param {MemberRate} [memberRate] - メンバー単価（オプション。指定がない場合は0を返す）
   * @returns {number} 月額換算単価（円）
   *
   * @example
   * ```typescript
   * // 単価情報を外部から指定（v2.1以降推奨）
   * const member1 = { id: '1', name: 'Alice', ... };
   * const rate1 = { rateType: 'monthly', rate: 900000 };
   * calculateMonthlyRate(member1, rate1); // 900000
   *
   * // 時給のメンバー
   * const member2 = { id: '2', name: 'Bob', ... };
   * const rate2 = { rateType: 'hourly', rate: 3000, hours: 160 };
   * calculateMonthlyRate(member2, rate2); // 480000 (3000 × 160)
   *
   * // 単価情報がない場合
   * calculateMonthlyRate(member1); // 0
   * ```
   */
  static calculateMonthlyRate(member: MemberStrengths, memberRate?: MemberRate): number {
    // 単価情報が指定されていない場合は0を返す
    if (!memberRate) return 0;

    if (memberRate.rateType === 'hourly') {
      // 時給 × 稼働時間
      const hours = memberRate.hours || 160; // デフォルト160時間
      return memberRate.rate * hours;
    }

    // 月額単価
    return memberRate.rate;
  }

  /**
   * チーム全体の金額情報を計算
   *
   * @param {MemberStrengths[]} members - メンバー一覧
   * @param {MemberRateRecord[]} [memberRates] - メンバー単価一覧（オプション。指定がない場合は全て0として計算）
   * @returns {TeamFinancials} チーム金額情報
   *
   * @example
   * ```typescript
   * // 単価情報を外部から指定（v2.1以降推奨）
   * const members = [
   *   { id: 'member-1', name: 'Alice', positionId: 'MG', ... },
   *   { id: 'member-2', name: 'Bob', positionId: 'SM', ... }
   * ];
   * const memberRates = [
   *   { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: 900000 } },
   *   { memberId: 'member-2', memberRate: { rateType: 'monthly', rate: 800000 } }
   * ];
   * const financials = FinancialService.calculateTeamFinancials(members, memberRates);
   * console.log(financials.monthlyRevenue); // 1700000
   * ```
   */
  static calculateTeamFinancials(members: MemberStrengths[], memberRates?: MemberRateRecord[]): TeamFinancials {
    let monthlyRevenue = 0;

    // memberRateをIDでマッピング
    const rateMap = new Map<string, MemberRate>();
    if (memberRates) {
      memberRates.forEach(record => {
        rateMap.set(record.memberId, record.memberRate);
      });
    }

    members.forEach(member => {
      const memberRate = rateMap.get(member.id);
      const monthlyRate = this.calculateMonthlyRate(member, memberRate);

      if (monthlyRate > 0) {
        // 全体の売上に加算
        monthlyRevenue += monthlyRate;
      }
    });

    // 単価情報を持つメンバーの数
    const memberCount = members.filter(m => {
      const memberRate = rateMap.get(m.id);
      return this.calculateMonthlyRate(m, memberRate) > 0;
    }).length;

    return {
      monthlyRevenue,
      annualRevenue: monthlyRevenue * 12,
      averageRatePerMember: memberCount > 0 ? monthlyRevenue / memberCount : 0,
      revenueByPosition: {}, // v3.1: positionId廃止により空オブジェクトを返す
    };
  }

  /**
   * 金額を日本円形式でフォーマット
   *
   * @param {number} amount - 金額
   * @returns {string} フォーマットされた金額文字列（例: "￥1,000,000"）
   *
   * @example
   * ```typescript
   * const formatted = FinancialService.formatCurrency(1000000);
   * console.log(formatted); // "￥1,000,000"
   * ```
   */
  static formatCurrency(amount: number): string {
    return new Intl.NumberFormat('ja-JP', {
      style: 'currency',
      currency: 'JPY',
      minimumFractionDigits: 0,
    }).format(amount);
  }

  /**
   * 時給表示用フォーマット
   * 時給の場合: "￥3,000/h × 160h = ￥480,000"
   * 月額の場合: null
   *
   * @param {MemberStrengths} member - メンバー情報
   * @param {MemberRate} [memberRate] - メンバー単価（オプション）
   * @returns {string | null} 時給表示文字列、月額の場合はnull
   *
   * @example
   * ```typescript
   * const member = { id: '1', name: 'Bob', ... };
   * const rate = { rateType: 'hourly', rate: 3000, hours: 160 };
   * const formatted = FinancialService.formatHourlyRate(member, rate);
   * console.log(formatted); // "￥3,000/h × 160h = ￥480,000"
   * ```
   */
  static formatHourlyRate(member: MemberStrengths, memberRate?: MemberRate): string | null {
    if (!memberRate || memberRate.rateType !== 'hourly') {
      return null;
    }

    const { rate, hours } = memberRate;
    const hoursValue = hours || 160;
    const monthly = rate * hoursValue;

    return `${this.formatCurrency(rate)}/h × ${hoursValue}h = ${this.formatCurrency(monthly)}`;
  }
}
