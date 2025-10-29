/**
 * データ移行サービス
 *
 * @module services/MigrationService
 * @description 既存データの構造変更に対応するマイグレーション処理
 */

import { MemberRateService } from './MemberRateService';
import { STORAGE_KEYS } from '../constants/storage';

/**
 * データ移行サービス
 */
export class MigrationService {
  /**
   * マイグレーションが必要かチェック
   *
   * @returns {boolean} マイグレーションが必要な場合true
   */
  static needsMigration(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (!stored) return false;

      const members = JSON.parse(stored) as any[];
      return members.some(m => m.memberRate !== undefined);
    } catch {
      return false;
    }
  }

  /**
   * メンバーデータから単価情報を分離
   *
   * 既存のLocalStorageに保存されているメンバーデータから
   * memberRateフィールドを抽出し、別管理に移行する
   */
  static migrateMemberRatesToSeparateStorage(): void {
    try {
      // 既存のメンバーデータを取得
      const stored = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (!stored) return;

      const members = JSON.parse(stored) as any[];

      // memberRateを抽出
      const newRates = members
        .filter(m => m.memberRate)
        .map(m => ({
          memberId: m.id,
          memberRate: m.memberRate,
          updatedAt: new Date().toISOString()
        }));

      // 単価情報を別管理に保存（既存データと統合）
      if (newRates.length > 0) {
        const currentRates = MemberRateService.getMemberRates();

        // IDをキーとしたマップを作成
        const rateMap = new Map();

        // 既存データをマップに追加
        currentRates.forEach(rate => {
          rateMap.set(rate.memberId, rate);
        });

        // 新規データで上書き（重複は更新、新規は追加）
        newRates.forEach(rate => {
          rateMap.set(rate.memberId, rate);
        });

        const mergedRates = Array.from(rateMap.values());
        MemberRateService.saveMemberRates(mergedRates);

        console.log(`${newRates.length}件の単価情報を移行しました`);
      }

      // メンバーデータからmemberRateを削除
      const membersWithoutRates = members.map(m => {
        const { memberRate, ...rest } = m;
        return rest;
      });

      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(membersWithoutRates));
      console.log('メンバーデータから単価情報を削除しました');

    } catch (error) {
      console.error('マイグレーション失敗:', error);
    }
  }
}
