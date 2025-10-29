// src/hooks/useStageMasters.ts
/**
 * ステージマスタ管理フック
 *
 * @module hooks/useStageMasters
 * @description ステージマスタの取得・更新・リセットを管理するカスタムフック
 *              SPEC: MANAGER_FEATURE_SPEC_V3.md Phase 4.2 - Story 6
 */

import { useState, useCallback } from 'react';
import { StageMaster } from '../types/profitability';
import { StageMasterService } from '../services/StageMasterService';

/**
 * ステージマスタ管理フックの戻り値
 */
export interface UseStageMastersReturn {
  stageMasters: StageMaster[];
  updateStageMaster: (stageId: string, updatedStage: StageMaster) => void;
  resetToDefaults: () => void;
  getStageMasterById: (stageId: string) => StageMaster | undefined;
  addStageMaster: (newStage: StageMaster) => void; // Phase 4.7.3
  deleteStageMaster: (stageId: string) => void; // Phase 4.7.3
  exportToJson: () => string; // Import/Export
  importFromJson: (json: string) => void; // Import/Export (Replace)
  importFromJsonAddOnly: (json: string) => void; // Import/Export (Add Only)
  importFromJsonMerge: (json: string) => void; // Import/Export (Merge)
  getImportConflictInfo: (json: string) => { existingCount: number; newCount: number; duplicateIds: string[] };
}

/**
 * ステージマスタ管理フック
 *
 * LocalStorage に保存されたステージマスタを管理し、
 * 更新・リセット機能を提供する
 *
 * @returns {UseStageMastersReturn} ステージマスタと操作関数
 *
 * @example
 * ```typescript
 * function StageMasterSettings() {
 *   const { stageMasters, updateStageMaster, resetToDefaults } = useStageMasters();
 *
 *   const handleUpdate = (stageId: string, updatedStage: StageMaster) => {
 *     updateStageMaster(stageId, updatedStage);
 *   };
 *
 *   return (
 *     <div>
 *       {stageMasters.map(stage => (
 *         <StageEditor key={stage.id} stage={stage} onUpdate={handleUpdate} />
 *       ))}
 *       <button onClick={resetToDefaults}>デフォルトに戻す</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useStageMasters(): UseStageMastersReturn {
  // 初期状態: StageMasterService から取得
  const [stageMasters, setStageMasters] = useState<StageMaster[]>(() => {
    return StageMasterService.getStageMasters();
  });

  /**
   * ステージマスタを更新
   *
   * @param {string} stageId - 更新するステージID
   * @param {StageMaster} updatedStage - 更新後のステージマスタ
   * @throws {Error} ステージIDが見つからない場合やIDの変更を試みた場合
   */
  const updateStageMaster = useCallback((stageId: string, updatedStage: StageMaster) => {
    // Service層で更新処理を実行
    StageMasterService.updateStageMaster(stageId, updatedStage);

    // 状態を更新（LocalStorageから再取得）
    setStageMasters(StageMasterService.getStageMasters());
  }, []);

  /**
   * ステージマスタをデフォルト値にリセット
   */
  const resetToDefaults = useCallback(() => {
    // Service層でリセット処理を実行
    StageMasterService.resetToDefaults();

    // 状態を更新（LocalStorageから再取得）
    setStageMasters(StageMasterService.getStageMasters());
  }, []);

  /**
   * ID でステージマスタを取得
   *
   * @param {string} stageId - ステージID
   * @returns {StageMaster | undefined} ステージマスタ（見つからない場合は undefined）
   */
  const getStageMasterById = useCallback((stageId: string): StageMaster | undefined => {
    return stageMasters.find(s => s.id === stageId);
  }, [stageMasters]);

  /**
   * カスタムステージマスタを追加 (Phase 4.7.3)
   *
   * @param {StageMaster} newStage - 追加する新しいステージマスタ
   * @throws {Error} 重複するIDが存在する場合
   */
  const addStageMaster = useCallback((newStage: StageMaster) => {
    // Service層で追加処理を実行
    StageMasterService.addStageMaster(newStage);

    // 状態を更新（LocalStorageから再取得）
    setStageMasters(StageMasterService.getStageMasters());
  }, []);

  /**
   * カスタムステージマスタを削除 (Phase 4.7.3)
   *
   * @param {string} stageId - 削除するステージID
   * @throws {Error} デフォルトステージの削除を試みた場合や存在しないIDの場合
   */
  const deleteStageMaster = useCallback((stageId: string) => {
    // Service層で削除処理を実行
    StageMasterService.deleteStageMaster(stageId);

    // 状態を更新（LocalStorageから再取得）
    setStageMasters(StageMasterService.getStageMasters());
  }, []);

  /**
   * ステージマスタをJSONとしてエクスポート
   *
   * @returns {string} JSON文字列
   */
  const exportToJson = useCallback((): string => {
    return StageMasterService.exportToJson();
  }, []);

  /**
   * JSONからステージマスタをインポート（完全置換）
   *
   * @param {string} json - インポートするJSON文字列
   * @throws {Error} JSONのパースに失敗した場合や不正なデータの場合
   */
  const importFromJson = useCallback((json: string) => {
    // Service層でインポート処理を実行
    StageMasterService.importFromJson(json);

    // 状態を更新（LocalStorageから再取得）
    setStageMasters(StageMasterService.getStageMasters());
  }, []);

  /**
   * JSONからステージマスタをインポート（新規のみ追加）
   *
   * @param {string} json - インポートするJSON文字列
   * @throws {Error} JSONのパースに失敗した場合や不正なデータの場合
   */
  const importFromJsonAddOnly = useCallback((json: string) => {
    // Service層でインポート処理を実行
    StageMasterService.importFromJsonAddOnly(json);

    // 状態を更新（LocalStorageから再取得）
    setStageMasters(StageMasterService.getStageMasters());
  }, []);

  /**
   * JSONからステージマスタをインポート（マージ・更新）
   *
   * @param {string} json - インポートするJSON文字列
   * @throws {Error} JSONのパースに失敗した場合や不正なデータの場合
   */
  const importFromJsonMerge = useCallback((json: string) => {
    // Service層でインポート処理を実行
    StageMasterService.importFromJsonMerge(json);

    // 状態を更新（LocalStorageから再取得）
    setStageMasters(StageMasterService.getStageMasters());
  }, []);

  /**
   * インポート時の重複情報を取得
   *
   * @param {string} json - インポートするJSON文字列
   * @returns {object} 重複情報（既存件数、新規件数、重複ID一覧）
   */
  const getImportConflictInfo = useCallback((json: string) => {
    return StageMasterService.getImportConflictInfo(json);
  }, []);

  return {
    stageMasters,
    updateStageMaster,
    resetToDefaults,
    getStageMasterById,
    addStageMaster,
    deleteStageMaster,
    exportToJson,
    importFromJson,
    importFromJsonAddOnly,
    importFromJsonMerge,
    getImportConflictInfo
  };
}
