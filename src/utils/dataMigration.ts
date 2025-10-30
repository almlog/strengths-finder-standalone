/**
 * データ移行ユーティリティ
 *
 * @module utils/dataMigration
 * @description v2.0 → v3.1 のデータ移行処理
 *              MemberStrengthsからmemberRate, contractRate, positionIdを分離
 */

import { MemberStrengths } from '../models/StrengthsTypes';
import { MemberRate, MemberRateRecord } from '../types/financial';
import { MemberRateService } from '../services/MemberRateService';
import { STORAGE_KEYS } from '../constants/storage';

/**
 * v2.0形式のMemberStrengths（廃止予定フィールド付き）
 */
interface LegacyMemberStrengths extends MemberStrengths {
  memberRate?: MemberRate;
  contractRate?: any; // v3.0互換用
  positionId?: string; // v2.0請求単価ポジション
}

/**
 * 移行結果の型定義
 */
export interface MigrationResult {
  /** 移行が実行されたか */
  migrated: boolean;
  /** 移行されたメンバー数 */
  memberCount: number;
  /** 単価情報を抽出できたメンバー数 */
  ratesMigrated: number;
  /** エラーメッセージ（エラー時のみ） */
  error?: string;
}

/**
 * LocalStorageに保存されているメンバーデータのバージョンを確認
 *
 * @returns {string | null} データバージョン（存在しない場合はnull）
 */
export function getDataVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEYS.DATA_VERSION);
  } catch (error) {
    console.error('データバージョンの取得に失敗:', error);
    return null;
  }
}

/**
 * データバージョンを保存
 *
 * @param {string} version - 保存するバージョン番号
 */
export function setDataVersion(version: string): void {
  try {
    localStorage.setItem(STORAGE_KEYS.DATA_VERSION, version);
  } catch (error) {
    console.error('データバージョンの保存に失敗:', error);
  }
}

/**
 * v2.0 → v3.1 のデータ移行を実行
 *
 * @description
 * 1. LocalStorageから既存のメンバーデータを読み込み
 * 2. 各メンバーから memberRate を抽出して MemberRateRecord に変換
 * 3. MemberRateService 経由で LocalStorage に保存
 * 4. メンバーデータから memberRate, contractRate, positionId を削除
 * 5. クリーンなメンバーデータを保存
 * 6. データバージョンを "3.1" に更新
 *
 * @returns {MigrationResult} 移行結果
 */
export function migrateV2ToV3(): MigrationResult {
  try {
    // 現在のバージョンを確認
    const currentVersion = getDataVersion();

    // v3.1以降の場合は移行不要
    if (currentVersion === '3.1') {
      return {
        migrated: false,
        memberCount: 0,
        ratesMigrated: 0,
      };
    }

    // メンバーデータを読み込み
    const membersJson = localStorage.getItem(STORAGE_KEYS.MEMBERS);
    if (!membersJson) {
      // データが存在しない場合は移行不要
      setDataVersion('3.1');
      return {
        migrated: false,
        memberCount: 0,
        ratesMigrated: 0,
      };
    }

    const legacyMembers: LegacyMemberStrengths[] = JSON.parse(membersJson);

    // 単価情報を抽出
    const memberRates: MemberRateRecord[] = [];
    legacyMembers.forEach(member => {
      if (member.memberRate) {
        memberRates.push({
          memberId: member.id,
          memberRate: member.memberRate,
          updatedAt: new Date().toISOString(),
        });
      }
    });

    // 単価情報を保存（既存の単価情報がある場合はマージ）
    if (memberRates.length > 0) {
      const existingRates = MemberRateService.getMemberRates();
      const existingIds = new Set(existingRates.map(r => r.memberId));

      // 既存IDは上書きせず、新規IDのみ追加
      const newRates = memberRates.filter(r => !existingIds.has(r.memberId));
      const mergedRates = [...existingRates, ...newRates];

      MemberRateService.saveMemberRates(mergedRates);
    }

    // メンバーデータから廃止フィールドを削除
    const cleanMembers: MemberStrengths[] = legacyMembers.map(member => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { memberRate, contractRate, positionId, ...cleanMember } = member;
      return cleanMember as MemberStrengths;
    });

    // クリーンなメンバーデータを保存
    localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(cleanMembers));

    // データバージョンを更新
    setDataVersion('3.1');

    return {
      migrated: true,
      memberCount: cleanMembers.length,
      ratesMigrated: memberRates.length,
    };
  } catch (error) {
    console.error('データ移行エラー:', error);
    return {
      migrated: false,
      memberCount: 0,
      ratesMigrated: 0,
      error: error instanceof Error ? error.message : '不明なエラー',
    };
  }
}

/**
 * 移行が必要かどうかを判定
 *
 * @returns {boolean} 移行が必要な場合true
 */
export function needsMigration(): boolean {
  const currentVersion = getDataVersion();
  return currentVersion !== '3.1';
}
