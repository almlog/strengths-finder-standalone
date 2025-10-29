// src/services/__tests__/StageMasterService.test.ts
/**
 * StageMasterService のテスト
 * TDD RED-GREEN-Refactor サイクルに従う
 * SPEC: MANAGER_FEATURE_SPEC_V3.md Phase 4.2 - Story 6
 */

import { StageMasterService } from '../StageMasterService';
import { DEFAULT_STAGE_MASTERS, StageMaster } from '../../types/profitability';

// LocalStorageのモック
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('StageMasterService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getStageMasters - ステージマスタの取得', () => {
    test('LocalStorageにデータがない場合はデフォルト値を返す', () => {
      // Act
      const result = StageMasterService.getStageMasters();

      // Assert
      expect(result).toEqual(DEFAULT_STAGE_MASTERS);
      expect(result.length).toBe(5); // S1-S4, BP
      expect(result[0].id).toBe('S1');
      expect(result[4].id).toBe('BP');
    });

    test('LocalStorageにカスタムデータがある場合はそれを返す', () => {
      // Arrange
      const customStages: StageMaster[] = [
        {
          id: 'S1',
          name: 'カスタムステージ1',
          type: 'employee',
          averageSalary: 300000,
          expenseRate: 0.35,
          description: 'カスタム説明'
        },
        ...DEFAULT_STAGE_MASTERS.slice(1)
      ];
      localStorage.setItem('stage-masters', JSON.stringify(customStages));

      // Act
      const result = StageMasterService.getStageMasters();

      // Assert
      expect(result[0].name).toBe('カスタムステージ1');
      expect(result[0].averageSalary).toBe(300000);
      expect(result[0].expenseRate).toBe(0.35);
    });

    test('LocalStorageのデータが不正な場合はデフォルト値を返す', () => {
      // Arrange
      localStorage.setItem('stage-masters', 'invalid json');

      // Act
      const result = StageMasterService.getStageMasters();

      // Assert
      expect(result).toEqual(DEFAULT_STAGE_MASTERS);
    });
  });

  describe('saveStageMasters - ステージマスタの保存', () => {
    test('ステージマスタをLocalStorageに保存できる', () => {
      // Arrange
      const customStages: StageMaster[] = [
        {
          id: 'S1',
          name: 'ステージ1',
          type: 'employee',
          averageSalary: 280000,
          expenseRate: 0.32
        },
        ...DEFAULT_STAGE_MASTERS.slice(1)
      ];

      // Act
      StageMasterService.saveStageMasters(customStages);

      // Assert
      const saved = localStorage.getItem('stage-masters');
      expect(saved).not.toBeNull();

      const parsed = JSON.parse(saved!);
      expect(parsed[0].averageSalary).toBe(280000);
      expect(parsed[0].expenseRate).toBe(0.32);
    });

    test('空の配列は保存できない（エラー）', () => {
      // Act & Assert
      expect(() => {
        StageMasterService.saveStageMasters([]);
      }).toThrow('ステージマスタは最低1件必要です');
    });

    test('必須フィールドが欠けている場合はエラー', () => {
      // Arrange
      const invalidStage = {
        id: 'S1',
        // nameがない
        type: 'employee'
      } as any;

      // Act & Assert
      expect(() => {
        StageMasterService.saveStageMasters([invalidStage]);
      }).toThrow();
    });
  });

  describe('updateStageMaster - 個別ステージマスタの更新', () => {
    beforeEach(() => {
      localStorage.clear(); // 各テスト前にクリア
    });

    test('指定したステージIDのマスタを更新できる', () => {
      // Arrange
      const updated: StageMaster = {
        id: 'S1',
        name: 'ステージ1（更新後）',
        type: 'employee',
        averageSalary: 260000,
        expenseRate: 0.28
      };

      // Act
      StageMasterService.updateStageMaster('S1', updated);

      // Assert
      const result = StageMasterService.getStageMasters();
      const s1 = result.find(s => s.id === 'S1');
      expect(s1?.name).toBe('ステージ1（更新後）');
      expect(s1?.averageSalary).toBe(260000);
      expect(s1?.expenseRate).toBe(0.28);

      // Clean up
      localStorage.clear();
    });

    test('存在しないステージIDを指定した場合はエラー', () => {
      // Arrange
      const updated: StageMaster = {
        id: 'INVALID',
        name: 'Invalid Stage',
        type: 'employee',
        averageSalary: 300000,
        expenseRate: 0.30
      };

      // Act & Assert
      expect(() => {
        StageMasterService.updateStageMaster('INVALID', updated);
      }).toThrow('ステージIDが見つかりません: INVALID');
    });

    test('IDの変更は許可しない', () => {
      // Arrange
      const updated: StageMaster = {
        id: 'S999', // 異なるID
        name: 'ステージ1',
        type: 'employee',
        averageSalary: 300000,
        expenseRate: 0.30
      };

      // Act & Assert
      expect(() => {
        StageMasterService.updateStageMaster('S1', updated);
      }).toThrow('ステージIDは変更できません');
    });
  });

  describe('resetToDefaults - デフォルト値にリセット', () => {
    beforeEach(() => {
      localStorage.clear(); // 各テスト前にクリア
    });

    test('カスタマイズしたステージマスタをデフォルトに戻せる', () => {
      // Arrange
      const customStages: StageMaster[] = DEFAULT_STAGE_MASTERS.map((s, i) =>
        i === 0 ? { ...s, averageSalary: 999999, expenseRate: 0.99 } : s
      );
      StageMasterService.saveStageMasters(customStages);

      // Verify custom data is saved
      const beforeReset = StageMasterService.getStageMasters();
      expect(beforeReset[0].averageSalary).toBe(999999);

      // Act
      StageMasterService.resetToDefaults();

      // Assert
      const result = StageMasterService.getStageMasters();
      expect(result.length).toBe(DEFAULT_STAGE_MASTERS.length);
      expect(result[0].id).toBe('S1');
      expect(result[0].type).toBe('employee');
      // LocalStorageがクリアされたのでデフォルト値が返る
      expect(localStorage.getItem('stage-masters')).toBeNull();
    });

    test('LocalStorageからデータが削除される', () => {
      // Arrange
      StageMasterService.saveStageMasters(DEFAULT_STAGE_MASTERS);
      expect(localStorage.getItem('stage-masters')).not.toBeNull();

      // Act
      StageMasterService.resetToDefaults();

      // Assert
      expect(localStorage.getItem('stage-masters')).toBeNull();
    });
  });

  describe('getStageMasterById - IDでステージマスタを取得', () => {
    test('指定したIDのステージマスタを取得できる', () => {
      // Act
      const s1 = StageMasterService.getStageMasterById('S1');
      const bp = StageMasterService.getStageMasterById('BP');

      // Assert
      expect(s1?.id).toBe('S1');
      expect(s1?.type).toBe('employee');
      expect(bp?.id).toBe('BP');
      expect(bp?.type).toBe('bp');
    });

    test('存在しないIDの場合はundefinedを返す', () => {
      // Act
      const result = StageMasterService.getStageMasterById('INVALID');

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('addStageMaster - カスタムステージマスタの追加 (Phase 4.7.2)', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    test('新しいカスタムステージを追加できる', () => {
      // Arrange
      const newStage: StageMaster = {
        id: 'CUSTOM1',
        name: 'カスタムステージ1',
        type: 'employee',
        averageSalary: 400000,
        expenseRate: 0.35,
        description: 'カスタム追加ステージ'
      };

      // Act
      StageMasterService.addStageMaster(newStage);

      // Assert
      const result = StageMasterService.getStageMasters();
      expect(result.length).toBe(6); // DEFAULT 5 + カスタム 1
      const added = result.find(s => s.id === 'CUSTOM1');
      expect(added).toBeDefined();
      expect(added?.name).toBe('カスタムステージ1');
      expect(added?.isCustom).toBe(true); // 自動的にisCustom=trueが設定される
    });

    test('重複するIDのステージは追加できない', () => {
      // Arrange
      const duplicateStage: StageMaster = {
        id: 'S1', // 既存のIDと重複
        name: '重複ステージ',
        type: 'employee',
        averageSalary: 300000,
        expenseRate: 0.30
      };

      // Act & Assert
      expect(() => {
        StageMasterService.addStageMaster(duplicateStage);
      }).toThrow('ステージID "S1" は既に存在します');
    });

    test('isCustomフラグが自動的にtrueに設定される', () => {
      // Arrange
      const newStage: StageMaster = {
        id: 'CUSTOM2',
        name: 'カスタムステージ2',
        type: 'bp',
        expenseRate: 0.80
      };

      // Act
      StageMasterService.addStageMaster(newStage);

      // Assert
      const result = StageMasterService.getStageMasterById('CUSTOM2');
      expect(result?.isCustom).toBe(true);
    });
  });

  describe('deleteStageMaster - カスタムステージマスタの削除 (Phase 4.7.2)', () => {
    beforeEach(() => {
      localStorage.clear();
    });

    test('カスタムステージを削除できる', () => {
      // Arrange
      const beforeCount = StageMasterService.getStageMasters().length;

      const customStage: StageMaster = {
        id: 'CUSTOM_DEL',
        name: '削除対象ステージ',
        type: 'employee',
        averageSalary: 350000,
        expenseRate: 0.30
      };
      StageMasterService.addStageMaster(customStage);

      // Verify it was added
      let stages = StageMasterService.getStageMasters();
      expect(stages.length).toBe(beforeCount + 1);
      expect(stages.find(s => s.id === 'CUSTOM_DEL')).toBeDefined();

      // Act
      StageMasterService.deleteStageMaster('CUSTOM_DEL');

      // Assert
      stages = StageMasterService.getStageMasters();
      expect(stages.length).toBe(beforeCount);
      expect(stages.find(s => s.id === 'CUSTOM_DEL')).toBeUndefined();
    });

    test('デフォルトステージは削除できない', () => {
      // Act & Assert
      expect(() => {
        StageMasterService.deleteStageMaster('S1');
      }).toThrow('デフォルトステージは削除できません: S1');

      expect(() => {
        StageMasterService.deleteStageMaster('BP');
      }).toThrow('デフォルトステージは削除できません: BP');
    });

    test('存在しないIDのステージを削除しようとするとエラー', () => {
      // Act & Assert
      expect(() => {
        StageMasterService.deleteStageMaster('NONEXISTENT');
      }).toThrow('ステージIDが見つかりません: NONEXISTENT');
    });
  });
});
