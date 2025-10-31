// src/services/StageMasterService.ts
/**
 * ステージマスタ管理サービス
 *
 * @module services/StageMasterService
 * @description ステージマスタの LocalStorage 管理を行うサービス
 *              SPEC: MANAGER_FEATURE_SPEC_V3.md Phase 4.2 - Story 6
 */

import { StageMaster, DEFAULT_STAGE_MASTERS } from '../types/profitability';

const STORAGE_KEY = 'stage-masters';

/**
 * StageMasterService クラス
 *
 * ステージマスタの取得・保存・更新・削除を管理
 * LocalStorage にデータを保存（Github には含まれない）
 */
export class StageMasterService {
  /**
   * ステージマスタ一覧を取得
   *
   * LocalStorage にカスタムデータがあればそれを返し、
   * なければデフォルト値を返す
   *
   * @returns {StageMaster[]} ステージマスタ一覧
   *
   * @example
   * ```typescript
   * const stages = StageMasterService.getStageMasters();
   * // [
   * //   { id: 'S1', name: 'ステージ1', type: 'employee', ... },
   * //   ...
   * // ]
   * ```
   */
  static getStageMasters(): StageMaster[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return DEFAULT_STAGE_MASTERS;
      }

      const parsed = JSON.parse(stored);

      // 基本的なバリデーション
      if (!Array.isArray(parsed) || parsed.length === 0) {
        return DEFAULT_STAGE_MASTERS;
      }

      return parsed;
    } catch (error) {
      // JSON パースエラーの場合はデフォルト値を返す
      console.error('Failed to parse stage masters from localStorage:', error);
      return DEFAULT_STAGE_MASTERS;
    }
  }

  /**
   * ステージマスタ一覧を保存
   *
   * @param {StageMaster[]} stageMasters - 保存するステージマスタ一覧
   * @throws {Error} 空の配列や不正なデータの場合
   *
   * @example
   * ```typescript
   * const customStages = [
   *   { id: 'S1', name: 'ステージ1', type: 'employee', averageSalary: 280000, expenseRate: 0.32 },
   *   ...
   * ];
   * StageMasterService.saveStageMasters(customStages);
   * ```
   */
  static saveStageMasters(stageMasters: StageMaster[]): void {
    if (!stageMasters || stageMasters.length === 0) {
      throw new Error('ステージマスタは最低1件必要です');
    }

    // 基本的なバリデーション（v3.1対応）
    for (const stage of stageMasters) {
      if (!stage.id || !stage.name) {
        throw new Error('ステージマスタの必須フィールドが不足しています');
      }

      // v3.1: employmentType を使った判定（v3.0互換: type も参照）
      // 型アサーション: v3.0の 'employee' と v3.1の 'regular' を両方許容
      const employmentType = (stage.employmentType || stage.type) as 'regular' | 'contract' | 'bp' | 'employee' | undefined;

      if (!employmentType) {
        throw new Error('雇用形態（employmentType）が設定されていません');
      }

      // 正社員の場合: averageSalary と salaryExpenseRate が必要（v3.0互換: expenseRate も許容）
      if (employmentType === 'regular' || employmentType === 'employee') {
        if (stage.averageSalary === undefined) {
          throw new Error('社員ステージには人件費合計が必要です');
        }
        // v3.1: salaryExpenseRate、v3.0互換: expenseRate
        if (stage.salaryExpenseRate === undefined && stage.expenseRate === undefined) {
          throw new Error('給与経費率（salaryExpenseRate）は必須です');
        }
      }

      // 契約社員・BPの場合: fixedExpense と contractExpenseRate が必要（v3.0互換: expenseRate も許容）
      if (employmentType === 'contract' || employmentType === 'bp') {
        // v3.1では fixedExpense と contractExpenseRate が推奨
        // v3.0互換として expenseRate も許容
        if (stage.fixedExpense === undefined && stage.expenseRate === undefined) {
          // どちらも未設定の場合のみエラー
          throw new Error('固定経費（fixedExpense）または経費率（expenseRate）が必要です');
        }
      }
    }

    try {
      const json = JSON.stringify(stageMasters);
      localStorage.setItem(STORAGE_KEY, json);
    } catch (error) {
      console.error('Failed to save stage masters to localStorage:', error);
      throw new Error('ステージマスタの保存に失敗しました');
    }
  }

  /**
   * 個別ステージマスタを更新
   *
   * @param {string} stageId - 更新するステージID
   * @param {StageMaster} updatedStage - 更新後のステージマスタ
   * @throws {Error} ステージIDが見つからない場合やIDの変更を試みた場合
   *
   * @example
   * ```typescript
   * StageMasterService.updateStageMaster('S1', {
   *   id: 'S1',
   *   name: 'ステージ1（更新後）',
   *   type: 'employee',
   *   averageSalary: 260000,
   *   expenseRate: 0.28
   * });
   * ```
   */
  static updateStageMaster(stageId: string, updatedStage: StageMaster): void {
    // IDの変更を禁止
    if (updatedStage.id !== stageId) {
      throw new Error('ステージIDは変更できません');
    }

    const currentStages = this.getStageMasters();
    const index = currentStages.findIndex(s => s.id === stageId);

    if (index === -1) {
      throw new Error(`ステージIDが見つかりません: ${stageId}`);
    }

    // 更新
    currentStages[index] = updatedStage;

    // 保存
    this.saveStageMasters(currentStages);
  }

  /**
   * デフォルト値にリセット
   *
   * LocalStorage のカスタムデータを削除し、
   * デフォルト値に戻す
   *
   * @example
   * ```typescript
   * StageMasterService.resetToDefaults();
   * const stages = StageMasterService.getStageMasters();
   * // デフォルト値が返る
   * ```
   */
  static resetToDefaults(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to reset stage masters:', error);
    }
  }

  /**
   * ID でステージマスタを取得
   *
   * @param {string} stageId - ステージID
   * @returns {StageMaster | undefined} ステージマスタ（見つからない場合は undefined）
   *
   * @example
   * ```typescript
   * const s1 = StageMasterService.getStageMasterById('S1');
   * console.log(s1?.averageSalary); // 250000
   * ```
   */
  static getStageMasterById(stageId: string): StageMaster | undefined {
    const stages = this.getStageMasters();
    return stages.find(s => s.id === stageId);
  }

  /**
   * カスタムステージマスタを追加 (Phase 4.7.2)
   *
   * @param {StageMaster} newStage - 追加する新しいステージマスタ
   * @throws {Error} 重複するIDが存在する場合
   *
   * @example
   * ```typescript
   * StageMasterService.addStageMaster({
   *   id: 'CUSTOM1',
   *   name: 'カスタムステージ1',
   *   type: 'employee',
   *   averageSalary: 400000,
   *   expenseRate: 0.35,
   *   description: 'カスタム追加ステージ'
   * });
   * ```
   */
  static addStageMaster(newStage: StageMaster): void {
    const currentStages = this.getStageMasters();

    // 重複チェック
    const exists = currentStages.find(s => s.id === newStage.id);
    if (exists) {
      throw new Error(`ステージID "${newStage.id}" は既に存在します`);
    }

    // isCustom フラグを自動的に true に設定
    const stageToAdd: StageMaster = {
      ...newStage,
      isCustom: true
    };

    // 追加
    currentStages.push(stageToAdd);

    // 保存
    this.saveStageMasters(currentStages);
  }

  /**
   * カスタムステージマスタを削除 (Phase 4.7.2)
   *
   * @param {string} stageId - 削除するステージID
   * @throws {Error} デフォルトステージの削除を試みた場合や存在しないIDの場合
   *
   * @example
   * ```typescript
   * StageMasterService.deleteStageMaster('CUSTOM1');
   * ```
   */
  static deleteStageMaster(stageId: string): void {
    const currentStages = this.getStageMasters();

    // 存在チェック
    const index = currentStages.findIndex(s => s.id === stageId);
    if (index === -1) {
      throw new Error(`ステージIDが見つかりません: ${stageId}`);
    }

    // デフォルトステージは削除できない（isCustom=falseまたは未定義）
    const stage = currentStages[index];
    if (!stage.isCustom) {
      throw new Error(`デフォルトステージは削除できません: ${stageId}`);
    }

    // 削除
    currentStages.splice(index, 1);

    // 保存
    this.saveStageMasters(currentStages);
  }

  /**
   * ステージマスタをJSONファイルとしてエクスポート
   *
   * @returns {string} JSON文字列
   *
   * @example
   * ```typescript
   * const json = StageMasterService.exportToJson();
   * // ファイルとしてダウンロード
   * const blob = new Blob([json], { type: 'application/json' });
   * const url = URL.createObjectURL(blob);
   * const a = document.createElement('a');
   * a.href = url;
   * a.download = 'stage-masters.json';
   * a.click();
   * ```
   */
  static exportToJson(): string {
    const stages = this.getStageMasters();
    return JSON.stringify(stages, null, 2);
  }

  /**
   * JSONファイルからステージマスタをインポート（完全置換）
   *
   * @param {string} json - インポートするJSON文字列
   * @throws {Error} JSONのパースに失敗した場合や不正なデータの場合
   */
  static importFromJson(json: string): void {
    const parsed = this.parseAndValidateJson(json);
    this.saveStageMasters(parsed);
  }

  /**
   * JSONファイルからステージマスタをインポート（新規のみ追加）
   *
   * @param {string} json - インポートするJSON文字列
   * @throws {Error} JSONのパースに失敗した場合や不正なデータの場合
   */
  static importFromJsonAddOnly(json: string): void {
    const newStages = this.parseAndValidateJson(json);
    const currentStages = this.getStageMasters();
    const currentIds = new Set(currentStages.map(s => s.id));

    // 重複していない新規ステージのみを追加
    const stagesToAdd = newStages.filter(s => !currentIds.has(s.id));
    const mergedStages = [...currentStages, ...stagesToAdd];

    this.saveStageMasters(mergedStages);
  }

  /**
   * JSONファイルからステージマスタをインポート（マージ・更新）
   *
   * @param {string} json - インポートするJSON文字列
   * @throws {Error} JSONのパースに失敗した場合や不正なデータの場合
   */
  static importFromJsonMerge(json: string): void {
    const newStages = this.parseAndValidateJson(json);
    const currentStages = this.getStageMasters();

    // IDをキーとしたマップを作成
    const stageMap = new Map<string, StageMaster>();

    // 既存ステージをマップに追加
    currentStages.forEach(stage => {
      stageMap.set(stage.id, stage);
    });

    // 新規ステージで上書き（重複は更新、新規は追加）
    newStages.forEach(stage => {
      stageMap.set(stage.id, stage);
    });

    // マップから配列に変換
    const mergedStages = Array.from(stageMap.values());

    this.saveStageMasters(mergedStages);
  }

  /**
   * JSONをパースしてバリデーション
   *
   * @param {string} json - パースするJSON文字列
   * @returns {StageMaster[]} パース済みのステージマスタ配列
   * @throws {Error} JSONのパースに失敗した場合や不正なデータの場合
   * @private
   */
  private static parseAndValidateJson(json: string): StageMaster[] {
    try {
      const parsed = JSON.parse(json);

      // バリデーション
      if (!Array.isArray(parsed)) {
        throw new Error('JSONデータは配列である必要があります');
      }

      if (parsed.length === 0) {
        throw new Error('ステージマスタは最低1件必要です');
      }

      // 各ステージのバリデーション（v3.1対応）
      for (const stage of parsed) {
        if (!stage.id || !stage.name) {
          throw new Error('ステージマスタの必須フィールドが不足しています');
        }

        // v3.1: employmentType を使った判定（v3.0互換: type も参照）
        // 型アサーション: v3.0の 'employee' と v3.1の 'regular' を両方許容
        const employmentType = (stage.employmentType || stage.type) as 'regular' | 'contract' | 'bp' | 'employee' | undefined;

        if (!employmentType) {
          throw new Error('雇用形態（employmentType）が設定されていません');
        }

        // 正社員の場合: averageSalary と salaryExpenseRate が必要（v3.0互換: expenseRate も許容）
        if (employmentType === 'regular' || employmentType === 'employee') {
          if (stage.averageSalary === undefined) {
            throw new Error('社員ステージには人件費合計が必要です');
          }
          // v3.1: salaryExpenseRate、v3.0互換: expenseRate
          if (stage.salaryExpenseRate === undefined && stage.expenseRate === undefined) {
            throw new Error('給与経費率（salaryExpenseRate）は必須です');
          }
        }

        // 契約社員・BPの場合: fixedExpense と contractExpenseRate が必要（v3.0互換: expenseRate も許容）
        if (employmentType === 'contract' || employmentType === 'bp') {
          // v3.1では fixedExpense と contractExpenseRate が推奨
          // v3.0互換として expenseRate も許容
          if (stage.fixedExpense === undefined && stage.expenseRate === undefined) {
            // どちらも未設定の場合のみエラー
            throw new Error('固定経費（fixedExpense）または経費率（expenseRate）が必要です');
          }
        }
      }

      return parsed;
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('JSONのパースに失敗しました: 正しいJSON形式ではありません');
      }
      throw error;
    }
  }

  /**
   * インポート時の重複情報を取得
   *
   * @param {string} json - インポートするJSON文字列
   * @returns {object} 重複情報
   */
  static getImportConflictInfo(json: string): {
    existingCount: number;
    newCount: number;
    duplicateIds: string[];
  } {
    const newStages = this.parseAndValidateJson(json);
    const currentStages = this.getStageMasters();
    const currentIds = new Set(currentStages.map(s => s.id));

    const duplicateIds = newStages
      .filter(s => currentIds.has(s.id))
      .map(s => s.id);

    return {
      existingCount: currentStages.length,
      newCount: newStages.length,
      duplicateIds
    };
  }
}
