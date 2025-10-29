// src/hooks/__tests__/useStageMasters.test.ts
/**
 * useStageMasters hook のテスト
 * TDD RED-GREEN-Refactor サイクルに従う
 * SPEC: MANAGER_FEATURE_SPEC_V3.md Phase 4.2 - Story 6
 */

import { renderHook, act } from '@testing-library/react';
import { useStageMasters } from '../useStageMasters';
import { StageMaster, DEFAULT_STAGE_MASTERS } from '../../types/profitability';
import { StageMasterService } from '../../services/StageMasterService';

// StageMasterServiceをモック
jest.mock('../../services/StageMasterService');

describe('useStageMasters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // デフォルトではDEFAULT_STAGE_MASTERSを返すように設定
    (StageMasterService.getStageMasters as jest.Mock).mockReturnValue(DEFAULT_STAGE_MASTERS);
  });

  describe('初期化', () => {
    test('初期状態でステージマスタ一覧を取得できる', () => {
      // Act
      const { result } = renderHook(() => useStageMasters());

      // Assert
      expect(result.current.stageMasters).toEqual(DEFAULT_STAGE_MASTERS);
      expect(result.current.stageMasters.length).toBe(5); // S1-S4, BP
      expect(StageMasterService.getStageMasters).toHaveBeenCalledTimes(1);
    });

    test('LocalStorageにカスタムデータがある場合はそれを取得する', () => {
      // Arrange
      const customStages: StageMaster[] = [
        {
          id: 'S1',
          name: 'カスタムステージ1',
          type: 'employee',
          averageSalary: 300000,
          expenseRate: 0.35
        },
        ...DEFAULT_STAGE_MASTERS.slice(1)
      ];
      (StageMasterService.getStageMasters as jest.Mock).mockReturnValue(customStages);

      // Act
      const { result } = renderHook(() => useStageMasters());

      // Assert
      expect(result.current.stageMasters[0].name).toBe('カスタムステージ1');
      expect(result.current.stageMasters[0].averageSalary).toBe(300000);
    });
  });

  describe('updateStageMaster - ステージマスタの更新', () => {
    test('ステージマスタを更新できる', () => {
      // Arrange
      const { result } = renderHook(() => useStageMasters());

      const updatedStage: StageMaster = {
        id: 'S1',
        name: 'ステージ1（更新後）',
        type: 'employee',
        averageSalary: 260000,
        expenseRate: 0.28
      };

      const updatedStages = [
        updatedStage,
        ...DEFAULT_STAGE_MASTERS.slice(1)
      ];

      // updateStageMaster が成功した後、getStageMasters は更新されたデータを返す
      (StageMasterService.updateStageMaster as jest.Mock).mockImplementation(() => {
        (StageMasterService.getStageMasters as jest.Mock).mockReturnValue(updatedStages);
      });

      // Act
      act(() => {
        result.current.updateStageMaster('S1', updatedStage);
      });

      // Assert
      expect(StageMasterService.updateStageMaster).toHaveBeenCalledWith('S1', updatedStage);
      expect(result.current.stageMasters[0].name).toBe('ステージ1（更新後）');
      expect(result.current.stageMasters[0].averageSalary).toBe(260000);
    });

    test('エラーが発生した場合でも例外をスローする', () => {
      // Arrange
      const { result } = renderHook(() => useStageMasters());

      const invalidStage: StageMaster = {
        id: 'INVALID',
        name: 'Invalid Stage',
        type: 'employee',
        averageSalary: 300000,
        expenseRate: 0.30
      };

      (StageMasterService.updateStageMaster as jest.Mock).mockImplementation(() => {
        throw new Error('ステージIDが見つかりません: INVALID');
      });

      // Act & Assert
      expect(() => {
        act(() => {
          result.current.updateStageMaster('INVALID', invalidStage);
        });
      }).toThrow('ステージIDが見つかりません: INVALID');
    });
  });

  describe('resetToDefaults - デフォルト値にリセット', () => {
    test('カスタマイズしたステージマスタをデフォルトに戻せる', () => {
      // Arrange
      const customStages: StageMaster[] = [
        {
          id: 'S1',
          name: 'カスタムステージ1',
          type: 'employee',
          averageSalary: 999999,
          expenseRate: 0.99
        },
        ...DEFAULT_STAGE_MASTERS.slice(1)
      ];

      (StageMasterService.getStageMasters as jest.Mock).mockReturnValue(customStages);
      const { result } = renderHook(() => useStageMasters());

      // カスタムデータが表示されることを確認
      expect(result.current.stageMasters[0].averageSalary).toBe(999999);

      // resetToDefaults が成功した後、getStageMasters はデフォルト値を返す
      (StageMasterService.resetToDefaults as jest.Mock).mockImplementation(() => {
        (StageMasterService.getStageMasters as jest.Mock).mockReturnValue(DEFAULT_STAGE_MASTERS);
      });

      // Act
      act(() => {
        result.current.resetToDefaults();
      });

      // Assert
      expect(StageMasterService.resetToDefaults).toHaveBeenCalledTimes(1);
      expect(result.current.stageMasters).toEqual(DEFAULT_STAGE_MASTERS);
    });
  });

  describe('getStageMasterById - IDでステージマスタを取得', () => {
    test('指定したIDのステージマスタを取得できる', () => {
      // Arrange
      const { result } = renderHook(() => useStageMasters());

      // Act
      const s1 = result.current.getStageMasterById('S1');
      const bp = result.current.getStageMasterById('BP');

      // Assert
      expect(s1?.id).toBe('S1');
      expect(s1?.type).toBe('employee');
      expect(bp?.id).toBe('BP');
      expect(bp?.type).toBe('bp');
    });

    test('存在しないIDの場合はundefinedを返す', () => {
      // Arrange
      const { result } = renderHook(() => useStageMasters());

      // Act
      const result2 = result.current.getStageMasterById('INVALID');

      // Assert
      expect(result2).toBeUndefined();
    });
  });

  describe('リアクティブ性', () => {
    test('更新操作が状態変更をトリガーする', () => {
      // Arrange
      const { result } = renderHook(() => useStageMasters());

      const initialLength = result.current.stageMasters.length;
      expect(initialLength).toBe(5);

      const updatedStage: StageMaster = {
        id: 'S1',
        name: 'ステージ1（更新後）',
        type: 'employee',
        averageSalary: 260000,
        expenseRate: 0.28
      };

      const updatedStages = [
        updatedStage,
        ...DEFAULT_STAGE_MASTERS.slice(1)
      ];

      (StageMasterService.updateStageMaster as jest.Mock).mockImplementation(() => {
        (StageMasterService.getStageMasters as jest.Mock).mockReturnValue(updatedStages);
      });

      // Act
      act(() => {
        result.current.updateStageMaster('S1', updatedStage);
      });

      // Assert
      // 状態が更新されたことを確認
      expect(result.current.stageMasters[0].name).toBe('ステージ1（更新後）');
    });
  });
});
