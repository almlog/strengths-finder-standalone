/**
 * SimulationService - ユニットテスト
 *
 * @description TDD: テストファースト実装
 */

import { SimulationService } from './SimulationService';
import { SimulationState, SimulationGroup } from '../types/simulation';
import { MemberStrengths, StrengthGroup, Position } from '../models/StrengthsTypes';

// モックデータ
const mockMember1: MemberStrengths = {
  id: 'm001',
  name: '山田太郎',
  department: '営業部',
  position: Position.GENERAL,
  strengths: [
    { id: 1, score: 1 },
    { id: 2, score: 2 },
    { id: 3, score: 3 },
    { id: 4, score: 4 },
    { id: 5, score: 5 }
  ]
};

const mockMember2: MemberStrengths = {
  id: 'm002',
  name: '佐藤花子',
  department: '開発部',
  position: Position.GENERAL,
  strengths: [
    { id: 6, score: 1 },
    { id: 7, score: 2 },
    { id: 8, score: 3 },
    { id: 9, score: 4 },
    { id: 10, score: 5 }
  ]
};

const mockMember3: MemberStrengths = {
  id: 'm003',
  name: '鈴木一郎',
  department: '営業部',
  position: Position.GENERAL,
  strengths: [
    { id: 11, score: 1 },
    { id: 12, score: 2 },
    { id: 13, score: 3 },
    { id: 14, score: 4 },
    { id: 15, score: 5 }
  ]
};

const mockMembers = [mockMember1, mockMember2, mockMember3];

describe('SimulationService', () => {
  describe('createGroup', () => {
    test('TC-SIM-001: 新規グループを作成できる', () => {
      const group = SimulationService.createGroup('営業チーム');

      expect(group.id).toBeDefined();
      expect(group.id).toMatch(/^[0-9a-f-]{36}$/); // UUID format
      expect(group.name).toBe('営業チーム');
      expect(group.memberIds).toEqual([]);
    });

    test('TC-SIM-001-b: グループ名が空文字の場合はデフォルト名', () => {
      const group = SimulationService.createGroup('');

      expect(group.name).toBe('新規グループ');
    });
  });

  describe('createInitialState', () => {
    test('TC-SIM-002: 初期状態を作成できる', () => {
      const state = SimulationService.createInitialState(mockMembers);

      expect(state.simulationName).toBe('新規シミュレーション');
      expect(state.groups).toHaveLength(3); // デフォルト3グループ
      expect(state.groups[0].name).toBe('グループ1');
      expect(state.groups[1].name).toBe('グループ2');
      expect(state.groups[2].name).toBe('グループ3');
      expect(state.unassignedPool).toEqual(['m001', 'm002', 'm003']);
      expect(state.createdAt).toBeDefined();
    });
  });

  describe('moveMember', () => {
    let initialState: SimulationState;

    beforeEach(() => {
      initialState = SimulationService.createInitialState(mockMembers);
    });

    test('TC-SIM-003: 未配置プールからグループへメンバーを移動できる', () => {
      const newState = SimulationService.moveMember(
        initialState,
        'm001',
        'unassigned',
        initialState.groups[0].id
      );

      expect(newState.unassignedPool).not.toContain('m001');
      expect(newState.unassignedPool).toHaveLength(2);
      expect(newState.groups[0].memberIds).toContain('m001');
      expect(newState.groups[0].memberIds).toHaveLength(1);
      expect(newState.updatedAt).toBeDefined();
    });

    test('TC-SIM-004: グループ間でメンバーを移動できる', () => {
      // まずグループ1に追加
      let state = SimulationService.moveMember(
        initialState,
        'm001',
        'unassigned',
        initialState.groups[0].id
      );

      // グループ2に移動
      state = SimulationService.moveMember(
        state,
        'm001',
        state.groups[0].id,
        state.groups[1].id
      );

      expect(state.groups[0].memberIds).not.toContain('m001');
      expect(state.groups[1].memberIds).toContain('m001');
    });

    test('TC-SIM-005: グループから未配置プールへメンバーを戻せる', () => {
      // グループ1に追加
      let state = SimulationService.moveMember(
        initialState,
        'm001',
        'unassigned',
        initialState.groups[0].id
      );

      // 未配置に戻す
      state = SimulationService.moveMember(
        state,
        'm001',
        state.groups[0].id,
        'unassigned'
      );

      expect(state.groups[0].memberIds).not.toContain('m001');
      expect(state.unassignedPool).toContain('m001');
    });

    test('TC-SIM-006: 存在しないメンバーの移動はエラー', () => {
      expect(() => {
        SimulationService.moveMember(
          initialState,
          'invalid-id',
          'unassigned',
          initialState.groups[0].id
        );
      }).toThrow('Member invalid-id not found in source');
    });

    test('TC-SIM-007: 存在しない移動先グループはエラー', () => {
      expect(() => {
        SimulationService.moveMember(
          initialState,
          'm001',
          'unassigned',
          'invalid-group-id'
        );
      }).toThrow('Destination group invalid-group-id not found');
    });
  });

  describe('addGroup', () => {
    test('TC-SIM-008: グループを追加できる', () => {
      const state = SimulationService.createInitialState(mockMembers);
      const newState = SimulationService.addGroup(state, '新規チーム');

      expect(newState.groups).toHaveLength(4);
      expect(newState.groups[3].name).toBe('新規チーム');
      expect(newState.groups[3].memberIds).toEqual([]);
    });

    test('TC-SIM-009: 最大10グループまで追加可能', () => {
      let state = SimulationService.createInitialState(mockMembers);

      // 7グループ追加（既存3 + 新規7 = 10）
      for (let i = 0; i < 7; i++) {
        state = SimulationService.addGroup(state, `グループ${i + 4}`);
      }

      expect(state.groups).toHaveLength(10);

      // 11個目はエラー
      expect(() => {
        SimulationService.addGroup(state, 'グループ11');
      }).toThrow('Maximum number of groups (10) reached');
    });
  });

  describe('removeGroup', () => {
    test('TC-SIM-010: グループを削除でき、メンバーは未配置に戻る', () => {
      let state = SimulationService.createInitialState(mockMembers);

      // グループ1にメンバーを追加
      state = SimulationService.moveMember(
        state,
        'm001',
        'unassigned',
        state.groups[0].id
      );
      state = SimulationService.moveMember(
        state,
        'm002',
        'unassigned',
        state.groups[0].id
      );

      const group1Id = state.groups[0].id;
      const newState = SimulationService.removeGroup(state, group1Id);

      expect(newState.groups).toHaveLength(2);
      expect(newState.groups.find(g => g.id === group1Id)).toBeUndefined();
      expect(newState.unassignedPool).toContain('m001');
      expect(newState.unassignedPool).toContain('m002');
      expect(newState.unassignedPool).toContain('m003');
    });

    test('TC-SIM-011: 存在しないグループの削除はエラー', () => {
      const state = SimulationService.createInitialState(mockMembers);

      expect(() => {
        SimulationService.removeGroup(state, 'invalid-id');
      }).toThrow('Group invalid-id not found');
    });
  });

  describe('renameGroup', () => {
    test('TC-SIM-012: グループ名を変更できる', () => {
      const state = SimulationService.createInitialState(mockMembers);
      const newState = SimulationService.renameGroup(
        state,
        state.groups[0].id,
        '営業チーム'
      );

      expect(newState.groups[0].name).toBe('営業チーム');
      expect(newState.updatedAt).toBeDefined();
    });
  });

  describe('calculateGroupStats', () => {
    test('TC-SIM-013: グループの統計情報を計算できる', () => {
      const members = [mockMember1, mockMember2];
      const stats = SimulationService.calculateGroupStats(members, []);

      expect(stats.memberCount).toBe(2);
      expect(stats.groupDistribution).toBeDefined();
      expect(stats.groupDistribution[StrengthGroup.EXECUTING]).toBeGreaterThanOrEqual(0);
      expect(stats.profitability).toBeUndefined(); // ステージ情報なし
    });

    test('TC-SIM-014: メンバー0人のグループは統計0', () => {
      const stats = SimulationService.calculateGroupStats([], []);

      expect(stats.memberCount).toBe(0);
      expect(Object.values(stats.groupDistribution).every(v => v === 0)).toBe(true);
      expect(stats.profitability).toBeUndefined();
    });
  });

  describe('exportSimulation', () => {
    test('TC-SIM-015: シミュレーションをJSON形式でエクスポート', () => {
      let state = SimulationService.createInitialState(mockMembers);
      state = SimulationService.moveMember(
        state,
        'm001',
        'unassigned',
        state.groups[0].id
      );

      const json = SimulationService.exportSimulation(state, mockMembers);
      const parsed = JSON.parse(json);

      expect(parsed._comment).toBeDefined();
      expect(parsed.version).toBe('1.0');
      expect(parsed.simulationName).toBe(state.simulationName);
      expect(parsed.exportedAt).toBeDefined();
      expect(parsed.groups).toBeInstanceOf(Array);
      expect(parsed.groups[0].members).toBeInstanceOf(Array);
      expect(parsed.groups[0].members[0].name).toBe('山田太郎');
      expect(parsed.unassignedPool.memberIds).toHaveLength(2);
    });
  });

  describe('importSimulation', () => {
    test('TC-SIM-016: JSONからシミュレーションをインポート', () => {
      const originalState = SimulationService.createInitialState(mockMembers);
      const json = SimulationService.exportSimulation(originalState, mockMembers);

      const result = SimulationService.importSimulation(json, mockMembers);

      expect(result.state.groups).toHaveLength(originalState.groups.length);
      expect(result.state.unassignedPool).toHaveLength(originalState.unassignedPool.length);
      expect(result.warnings).toHaveLength(0);
    });

    test('TC-SIM-017: 不正なJSONはエラー', () => {
      expect(() => {
        SimulationService.importSimulation('invalid json', mockMembers);
      }).toThrow();
    });

    test('TC-SIM-018: 存在しないメンバーIDは警告', () => {
      const invalidJSON = JSON.stringify({
        version: '1.0',
        simulationName: 'テスト',
        exportedAt: new Date().toISOString(),
        groups: [
          {
            id: 'g1',
            name: 'グループ1',
            memberIds: ['m999'], // 存在しないID
            members: [{ id: 'm999', name: '存在しない', employeeNumber: 'X' }]
          }
        ],
        unassignedPool: {
          memberIds: [],
          members: []
        }
      });

      const result = SimulationService.importSimulation(invalidJSON, mockMembers);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0].type).toBe('member-not-found');
      expect(result.warnings[0].message).toContain('m999');
    });
  });

  describe('applyToProduction', () => {
    test('TC-SIM-019: シミュレーション結果を本番データに反映', () => {
      let state = SimulationService.createInitialState(mockMembers);

      // メンバーを各グループに配置
      state = SimulationService.moveMember(state, 'm001', 'unassigned', state.groups[0].id);
      state = SimulationService.moveMember(state, 'm002', 'unassigned', state.groups[1].id);
      // m003は未配置のまま

      const updated = SimulationService.applyToProduction(state, mockMembers);

      expect(updated[0].department).toBe('グループ1');
      expect(updated[1].department).toBe('グループ2');
      expect(updated[2].department).toBe('未配置');
    });

    test('TC-SIM-020: 未配置メンバーは「未配置」部署コードに', () => {
      const state = SimulationService.createInitialState(mockMembers);
      const updated = SimulationService.applyToProduction(state, mockMembers);

      expect(updated.every(m => m.department === '未配置')).toBe(true);
    });
  });

  describe('getApplyPreview', () => {
    test('TC-SIM-021: 本番反映のプレビューを生成できる', () => {
      let state = SimulationService.createInitialState(mockMembers);
      state = SimulationService.moveMember(state, 'm001', 'unassigned', state.groups[0].id);
      state = SimulationService.moveMember(state, 'm002', 'unassigned', state.groups[1].id);

      const preview = SimulationService.getApplyPreview(state, mockMembers);

      expect(preview.changeCount).toBe(3); // 全員変更される
      expect(preview.changes).toHaveLength(3);
      expect(preview.changes[0].oldDepartment).toBe('営業部');
      expect(preview.changes[0].newDepartment).toBe('グループ1');
    });
  });
});
