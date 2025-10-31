/**
 * シミュレーションContext
 *
 * @module contexts/SimulationContext
 * @description チームシミュレーション機能の状態管理
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { SimulationState, DestinationId, ImportResult, ApplyPreview } from '../types/simulation';
import { SimulationService } from '../services/SimulationService';
import { useStrengths } from './StrengthsContext';

const STORAGE_KEY = 'strengths-simulation-state';

interface SimulationContextType {
  /** 現在のシミュレーション状態 */
  state: SimulationState | null;
  /** 初期化済みフラグ */
  isInitialized: boolean;
  /** 新しいシミュレーションを開始 */
  startNewSimulation: (name?: string) => void;
  /** シミュレーション名を変更 */
  setSimulationName: (name: string) => void;
  /** メンバーを移動 */
  moveMember: (memberId: string, sourceId: DestinationId, destinationId: DestinationId) => void;
  /** グループを追加 */
  addGroup: (name: string) => void;
  /** グループを削除 */
  removeGroup: (groupId: string) => void;
  /** グループ名を変更 */
  renameGroup: (groupId: string, newName: string) => void;
  /** エクスポート */
  exportSimulation: () => string;
  /** インポート */
  importSimulation: (json: string) => ImportResult;
  /** 本番反映プレビュー */
  getApplyPreview: () => ApplyPreview;
  /** 本番データに反映 */
  applyToProduction: () => void;
  /** シミュレーションをリセット */
  resetSimulation: () => void;
}

const SimulationContext = createContext<SimulationContextType | undefined>(undefined);

/**
 * SimulationProvider
 */
export const SimulationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { members, addOrUpdateMember } = useStrengths();
  const [state, setState] = useState<SimulationState | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  // LocalStorageから状態を読み込み
  useEffect(() => {
    if (isInitialized || members.length === 0) return;

    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsedState: SimulationState = JSON.parse(stored);

        // メンバーIDの整合性チェック
        const memberIdSet = new Set(members.map(m => m.id));
        const validGroups = parsedState.groups.map(group => ({
          ...group,
          memberIds: group.memberIds.filter(id => memberIdSet.has(id))
        }));
        const validUnassignedPool = parsedState.unassignedPool.filter(id => memberIdSet.has(id));

        setState({
          ...parsedState,
          groups: validGroups,
          unassignedPool: validUnassignedPool
        });
      } catch (error) {
        console.error('Failed to load simulation state:', error);
        // エラー時は初期状態を作成
        setState(SimulationService.createInitialState(members));
      }
    } else {
      // 保存がない場合は初期状態を作成
      setState(SimulationService.createInitialState(members));
    }

    setIsInitialized(true);
  }, [members, isInitialized]);

  // 状態が変更されたらLocalStorageに保存
  useEffect(() => {
    if (!isInitialized || !state) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save simulation state:', error);
    }
  }, [state, isInitialized]);

  /**
   * 新しいシミュレーションを開始
   */
  const startNewSimulation = useCallback((name?: string) => {
    const newState = SimulationService.createInitialState(members);
    if (name) {
      newState.simulationName = name;
    }
    setState(newState);
  }, [members]);

  /**
   * シミュレーション名を変更
   */
  const setSimulationName = useCallback((name: string) => {
    if (!state) return;
    setState({
      ...state,
      simulationName: name,
      updatedAt: new Date().toISOString()
    });
  }, [state]);

  /**
   * メンバーを移動
   */
  const moveMember = useCallback((
    memberId: string,
    sourceId: DestinationId,
    destinationId: DestinationId
  ) => {
    if (!state) return;

    try {
      const newState = SimulationService.moveMember(state, memberId, sourceId, destinationId);
      setState(newState);
    } catch (error) {
      console.error('Failed to move member:', error);
      throw error;
    }
  }, [state]);

  /**
   * グループを追加
   */
  const addGroup = useCallback((name: string) => {
    if (!state) return;

    try {
      const newState = SimulationService.addGroup(state, name);
      setState(newState);
    } catch (error) {
      console.error('Failed to add group:', error);
      throw error;
    }
  }, [state]);

  /**
   * グループを削除
   */
  const removeGroup = useCallback((groupId: string) => {
    if (!state) return;

    try {
      const newState = SimulationService.removeGroup(state, groupId);
      setState(newState);
    } catch (error) {
      console.error('Failed to remove group:', error);
      throw error;
    }
  }, [state]);

  /**
   * グループ名を変更
   */
  const renameGroup = useCallback((groupId: string, newName: string) => {
    if (!state) return;

    try {
      const newState = SimulationService.renameGroup(state, groupId, newName);
      setState(newState);
    } catch (error) {
      console.error('Failed to rename group:', error);
      throw error;
    }
  }, [state]);

  /**
   * エクスポート
   */
  const exportSimulation = useCallback((): string => {
    if (!state) {
      throw new Error('No simulation state to export');
    }
    return SimulationService.exportSimulation(state, members);
  }, [state, members]);

  /**
   * インポート
   */
  const importSimulation = useCallback((json: string): ImportResult => {
    try {
      const result = SimulationService.importSimulation(json, members);
      setState(result.state);
      return result;
    } catch (error) {
      console.error('Failed to import simulation:', error);
      throw error;
    }
  }, [members]);

  /**
   * 本番反映プレビュー
   */
  const getApplyPreview = useCallback((): ApplyPreview => {
    if (!state) {
      throw new Error('No simulation state');
    }
    return SimulationService.getApplyPreview(state, members);
  }, [state, members]);

  /**
   * 本番データに反映
   */
  const applyToProduction = useCallback(() => {
    if (!state) {
      throw new Error('No simulation state');
    }

    try {
      const updatedMembers = SimulationService.applyToProduction(state, members);

      // 各メンバーの部署を更新
      updatedMembers.forEach(member => {
        addOrUpdateMember(member);
      });

      // シミュレーションをリセット
      setState(SimulationService.createInitialState(updatedMembers));
    } catch (error) {
      console.error('Failed to apply to production:', error);
      throw error;
    }
  }, [state, members, addOrUpdateMember]);

  /**
   * シミュレーションをリセット
   */
  const resetSimulation = useCallback(() => {
    setState(SimulationService.createInitialState(members));
  }, [members]);

  const value: SimulationContextType = {
    state,
    isInitialized,
    startNewSimulation,
    setSimulationName,
    moveMember,
    addGroup,
    removeGroup,
    renameGroup,
    exportSimulation,
    importSimulation,
    getApplyPreview,
    applyToProduction,
    resetSimulation
  };

  return (
    <SimulationContext.Provider value={value}>
      {children}
    </SimulationContext.Provider>
  );
};

/**
 * useSimulation hook
 *
 * @throws {Error} SimulationProvider外で使用された場合
 */
export const useSimulation = (): SimulationContextType => {
  const context = useContext(SimulationContext);
  if (!context) {
    throw new Error('useSimulation must be used within SimulationProvider');
  }
  return context;
};
