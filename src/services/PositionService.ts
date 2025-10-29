/**
 * ポジション管理サービス
 *
 * @module services/PositionService
 * @description ポジション別の月額請求単価を管理するサービス
 */

import { PositionRate } from '../types/financial';

/**
 * PositionService クラス
 *
 * ポジション情報の取得、保存、検索を行う
 */
export class PositionService {
  /** LocalStorageのキー */
  private static readonly STORAGE_KEY = 'position_rates';

  /** デフォルトの料金体系 */
  private static readonly DEFAULT_RATES: PositionRate[] = [
    { id: 'MG', name: 'マネージャー', monthlyRate: 900000, color: '#8B5CF6' },
    { id: 'SM', name: 'スクラムマスター', monthlyRate: 800000, color: '#EC4899' },
    { id: 'PO', name: 'プロダクトオーナー', monthlyRate: 800000, color: '#F59E0B' },
    { id: 'SL', name: 'シニアリード', monthlyRate: 750000, color: '#10B981' },
    { id: 'SST', name: 'シニアスタッフ', monthlyRate: 650000, color: '#3B82F6' },
    { id: 'ST', name: 'スタッフ', monthlyRate: 550000, color: '#6B7280' },
  ];

  /**
   * ポジション料金体系を取得
   *
   * @returns {PositionRate[]} ポジション料金体系の配列
   *
   * @example
   * ```typescript
   * const rates = PositionService.getPositionRates();
   * console.log(rates[0]); // { id: 'MG', name: 'マネージャー', ... }
   * ```
   */
  static getPositionRates(): PositionRate[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return this.DEFAULT_RATES;
      }

      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : this.DEFAULT_RATES;
    } catch (error) {
      console.error('Failed to load position rates:', error);
      return this.DEFAULT_RATES;
    }
  }

  /**
   * ポジション料金体系を保存
   *
   * @param {PositionRate[]} rates - 保存する料金体系
   *
   * @example
   * ```typescript
   * const customRates = [
   *   { id: 'MGR', name: 'マネージャー', monthlyRate: 1000000, color: '#FF0000' }
   * ];
   * PositionService.savePositionRates(customRates);
   * ```
   */
  static savePositionRates(rates: PositionRate[]): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(rates));
    } catch (error) {
      console.error('Failed to save position rates:', error);
    }
  }

  /**
   * IDでポジションを検索
   *
   * @param {string} id - ポジションID
   * @returns {PositionRate | undefined} 見つかったポジション、存在しない場合はundefined
   *
   * @example
   * ```typescript
   * const position = PositionService.getPositionById('MG');
   * if (position) {
   *   console.log(position.name); // 'マネージャー'
   * }
   * ```
   */
  static getPositionById(id: string): PositionRate | undefined {
    const rates = this.getPositionRates();
    return rates.find(rate => rate.id === id);
  }
}
