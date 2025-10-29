/**
 * メンバー単価情報管理サービス
 *
 * @module services/MemberRateService
 * @description マネージャーモード専用機能。単価情報をLocalStorageで別管理し、機密性を確保
 */

import { MemberRate, MemberRateRecord, MemberRatesExport } from '../types/financial';
import { STORAGE_KEYS } from '../constants/storage';

/**
 * メンバー単価情報管理サービス
 *
 * マネージャーモード専用機能
 * 単価情報をLocalStorageで別管理し、機密性を確保
 */
export class MemberRateService {
  /**
   * 全ての単価情報を取得
   *
   * @returns {MemberRateRecord[]} 単価情報のレコード配列
   */
  static getMemberRates(): MemberRateRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MEMBER_RATES);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('単価情報の読み込みに失敗:', error);
      return [];
    }
  }

  /**
   * 全ての単価情報を保存
   *
   * @param {MemberRateRecord[]} rates - 保存する単価情報のレコード配列
   * @throws {Error} 保存に失敗した場合
   */
  static saveMemberRates(rates: MemberRateRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMBER_RATES, JSON.stringify(rates));
    } catch (error) {
      console.error('単価情報の保存に失敗:', error);
      throw new Error('単価情報の保存に失敗しました');
    }
  }

  /**
   * 特定メンバーの単価情報を取得
   *
   * @param {string} memberId - メンバーID
   * @returns {MemberRate | undefined} 単価情報（存在しない場合はundefined）
   */
  static getMemberRate(memberId: string): MemberRate | undefined {
    const rates = this.getMemberRates();
    const record = rates.find(r => r.memberId === memberId);
    return record?.memberRate;
  }

  /**
   * 特定メンバーの単価情報を設定/更新
   *
   * @param {string} memberId - メンバーID
   * @param {MemberRate} memberRate - 単価情報
   */
  static setMemberRate(memberId: string, memberRate: MemberRate): void {
    const rates = this.getMemberRates();
    const existingIndex = rates.findIndex(r => r.memberId === memberId);

    const newRecord: MemberRateRecord = {
      memberId,
      memberRate,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // 既存レコードを更新
      rates[existingIndex] = newRecord;
    } else {
      // 新規追加
      rates.push(newRecord);
    }

    this.saveMemberRates(rates);
  }

  /**
   * 特定メンバーの単価情報を削除
   *
   * @param {string} memberId - メンバーID
   */
  static deleteMemberRate(memberId: string): void {
    const rates = this.getMemberRates();
    const filtered = rates.filter(r => r.memberId !== memberId);
    this.saveMemberRates(filtered);
  }

  /**
   * 単価情報をJSONとしてエクスポート
   *
   * @returns {string} JSON文字列
   */
  static exportToJson(): string {
    const rates = this.getMemberRates();

    const exportData: MemberRatesExport = {
      _comment: [
        "============================================",
        "Strengths Finder - メンバー単価情報",
        "============================================",
        "",
        "⚠️ 機密情報 - マネージャー専用",
        "",
        "このファイルには各メンバーの単価情報が含まれています。",
        "取り扱いには十分注意してください。",
        "",
        "【単価タイプ】",
        "- monthly: 月額単価（円/月）",
        "- hourly: 時給（円/時）+ 月間稼働時間",
        "",
        "【インポート方法】",
        "1. マネージャーモードでアクセス (?mode=manager)",
        "2. 「設定」→「単価情報のインポート」を選択",
        "3. このJSONファイルを選択",
        "",
        "============================================"
      ],
      version: "1.0",
      exportedAt: new Date().toISOString(),
      rates: rates
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * JSONから単価情報をインポート
   *
   * @param {string} json - JSON文字列
   * @returns {MemberRateRecord[]} パースされた単価情報のレコード配列
   * @throws {Error} JSONのパースに失敗した場合や不正なデータの場合
   */
  static importFromJson(json: string): MemberRateRecord[] {
    try {
      const data = JSON.parse(json);

      // 新形式（MemberRatesExport）の場合
      if (data.rates && Array.isArray(data.rates)) {
        this.validateRatesArray(data.rates);
        return data.rates;
      }

      // 旧形式（MemberRateRecord[]）の場合（後方互換）
      if (Array.isArray(data)) {
        this.validateRatesArray(data);
        return data;
      }

      throw new Error('不正なJSON形式です');
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('JSONのパースに失敗しました');
      }
      throw error;
    }
  }

  /**
   * 単価情報配列のバリデーション
   *
   * @param {any[]} rates - バリデーション対象の配列
   * @throws {Error} バリデーションエラー
   * @private
   */
  private static validateRatesArray(rates: any[]): void {
    if (rates.length === 0) {
      throw new Error('単価情報が空です');
    }

    for (const record of rates) {
      if (!record.memberId || typeof record.memberId !== 'string') {
        throw new Error('memberIdが不正です');
      }

      if (!record.memberRate || typeof record.memberRate !== 'object') {
        throw new Error('memberRateが不正です');
      }

      const { rateType, rate } = record.memberRate;

      if (rateType !== 'monthly' && rateType !== 'hourly') {
        throw new Error(`不正なrateType: ${rateType}`);
      }

      if (typeof rate !== 'number' || rate < 0) {
        throw new Error(`不正なrate: ${rate}`);
      }

      if (rateType === 'hourly' && record.memberRate.hours !== undefined) {
        if (typeof record.memberRate.hours !== 'number' || record.memberRate.hours <= 0) {
          throw new Error(`不正なhours: ${record.memberRate.hours}`);
        }
      }
    }
  }

  /**
   * インポート時の重複情報を取得
   *
   * @param {string} json - JSON文字列
   * @returns {object} 重複情報
   */
  static getImportConflictInfo(json: string): {
    existingCount: number;
    newCount: number;
    duplicateIds: string[];
  } {
    const newRates = this.importFromJson(json);
    const currentRates = this.getMemberRates();
    const currentIds = new Set(currentRates.map(r => r.memberId));

    const duplicateIds = newRates
      .filter(r => currentIds.has(r.memberId))
      .map(r => r.memberId);

    return {
      existingCount: currentRates.length,
      newCount: newRates.length,
      duplicateIds
    };
  }

  /**
   * 単価情報をインポート（完全置換）
   *
   * @param {string} json - JSON文字列
   * @throws {Error} インポートに失敗した場合
   */
  static importFromJsonReplace(json: string): void {
    const rates = this.importFromJson(json);
    this.saveMemberRates(rates);
  }

  /**
   * 単価情報をインポート（新規のみ追加）
   *
   * @param {string} json - JSON文字列
   * @throws {Error} インポートに失敗した場合
   */
  static importFromJsonAddOnly(json: string): void {
    const newRates = this.importFromJson(json);
    const currentRates = this.getMemberRates();
    const currentIds = new Set(currentRates.map(r => r.memberId));

    const ratesToAdd = newRates.filter(r => !currentIds.has(r.memberId));
    const mergedRates = [...currentRates, ...ratesToAdd];

    this.saveMemberRates(mergedRates);
  }

  /**
   * 単価情報をインポート（マージ・更新）
   *
   * @param {string} json - JSON文字列
   * @throws {Error} インポートに失敗した場合
   */
  static importFromJsonMerge(json: string): void {
    const newRates = this.importFromJson(json);
    const currentRates = this.getMemberRates();

    const rateMap = new Map<string, MemberRateRecord>();

    // 既存データをマップに追加
    currentRates.forEach(rate => {
      rateMap.set(rate.memberId, rate);
    });

    // 新規データで上書き
    newRates.forEach(rate => {
      rateMap.set(rate.memberId, {
        ...rate,
        updatedAt: new Date().toISOString()
      });
    });

    const mergedRates = Array.from(rateMap.values());
    this.saveMemberRates(mergedRates);
  }

  /**
   * 単価情報を全削除
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.MEMBER_RATES);
    } catch (error) {
      console.error('単価情報の削除に失敗:', error);
      throw new Error('単価情報の削除に失敗しました');
    }
  }
}
