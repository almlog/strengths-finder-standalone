/**
 * シミュレーションサービス
 *
 * @module services/SimulationService
 * @description チームシミュレーション機能のビジネスロジック
 */

import {
  SimulationState,
  SimulationGroup,
  GroupStats,
  ImportResult,
  ImportWarning,
  ApplyPreview,
  DestinationId,
  SimulationExport
} from '../types/simulation';
import { MemberStrengths, StrengthGroup } from '../models/StrengthsTypes';
import StrengthsService from './StrengthsService';
import { StageMaster } from '../types/profitability';
import { MemberRateRecord } from '../types/financial';

const MAX_GROUPS = 10;
const DEFAULT_GROUP_NAMES = ['グループ1', 'グループ2', 'グループ3'];

/**
 * シミュレーション管理サービス
 */
export class SimulationService {
  /**
   * UUID生成
   */
  private static generateId(): string {
    // ブラウザのcrypto.randomUUID()を使用
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // フォールバック: 簡易UUID v4生成
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  /**
   * 新規グループを作成
   *
   * @param name - グループ名
   * @returns 作成されたグループ
   */
  static createGroup(name: string): SimulationGroup {
    return {
      id: this.generateId(),
      name: name.trim() || '新規グループ',
      memberIds: []
    };
  }

  /**
   * 初期状態を作成
   *
   * @param members - 全メンバー配列
   * @returns 初期シミュレーション状態
   */
  static createInitialState(members: MemberStrengths[]): SimulationState {
    const now = new Date().toISOString();

    return {
      simulationName: '新規シミュレーション',
      groups: DEFAULT_GROUP_NAMES.map(name => this.createGroup(name)),
      unassignedPool: members.map(m => m.id),
      createdAt: now,
      updatedAt: now
    };
  }

  /**
   * メンバーを移動
   *
   * @param state - 現在の状態
   * @param memberId - 移動するメンバーID
   * @param sourceId - 移動元（グループIDまたは'unassigned'）
   * @param destinationId - 移動先（グループIDまたは'unassigned'）
   * @returns 更新された状態
   */
  static moveMember(
    state: SimulationState,
    memberId: string,
    sourceId: DestinationId,
    destinationId: DestinationId
  ): SimulationState {
    // 移動元から削除
    let sourceFound = false;
    const newGroups = state.groups.map(group => {
      if (group.id === sourceId) {
        if (!group.memberIds.includes(memberId)) {
          throw new Error(`Member ${memberId} not found in source`);
        }
        sourceFound = true;
        return {
          ...group,
          memberIds: group.memberIds.filter(id => id !== memberId)
        };
      }
      return group;
    });

    let newUnassignedPool = [...state.unassignedPool];
    if (sourceId === 'unassigned') {
      if (!state.unassignedPool.includes(memberId)) {
        throw new Error(`Member ${memberId} not found in source`);
      }
      sourceFound = true;
      newUnassignedPool = state.unassignedPool.filter(id => id !== memberId);
    }

    if (!sourceFound) {
      throw new Error(`Source ${sourceId} not found`);
    }

    // 移動先に追加
    let destinationFound = false;
    if (destinationId === 'unassigned') {
      newUnassignedPool.push(memberId);
      destinationFound = true;
    } else {
      const destGroupIndex = newGroups.findIndex(g => g.id === destinationId);
      if (destGroupIndex === -1) {
        throw new Error(`Destination group ${destinationId} not found`);
      }
      newGroups[destGroupIndex] = {
        ...newGroups[destGroupIndex],
        memberIds: [...newGroups[destGroupIndex].memberIds, memberId]
      };
      destinationFound = true;
    }

    if (!destinationFound) {
      throw new Error(`Destination ${destinationId} not found`);
    }

    return {
      ...state,
      groups: newGroups,
      unassignedPool: newUnassignedPool,
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * グループを追加
   *
   * @param state - 現在の状態
   * @param name - グループ名
   * @returns 更新された状態
   */
  static addGroup(state: SimulationState, name: string): SimulationState {
    if (state.groups.length >= MAX_GROUPS) {
      throw new Error(`Maximum number of groups (${MAX_GROUPS}) reached`);
    }

    return {
      ...state,
      groups: [...state.groups, this.createGroup(name)],
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * グループを削除
   *
   * @param state - 現在の状態
   * @param groupId - 削除するグループID
   * @returns 更新された状態
   */
  static removeGroup(state: SimulationState, groupId: string): SimulationState {
    const targetGroup = state.groups.find(g => g.id === groupId);
    if (!targetGroup) {
      throw new Error(`Group ${groupId} not found`);
    }

    return {
      ...state,
      groups: state.groups.filter(g => g.id !== groupId),
      unassignedPool: [...state.unassignedPool, ...targetGroup.memberIds],
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * グループ名を変更
   *
   * @param state - 現在の状態
   * @param groupId - グループID
   * @param newName - 新しい名前
   * @returns 更新された状態
   */
  static renameGroup(state: SimulationState, groupId: string, newName: string): SimulationState {
    return {
      ...state,
      groups: state.groups.map(g =>
        g.id === groupId ? { ...g, name: newName.trim() || g.name } : g
      ),
      updatedAt: new Date().toISOString()
    };
  }

  /**
   * グループの統計情報を計算
   *
   * @param members - グループに所属するメンバー配列
   * @param stageMasters - ステージマスター（利益率計算用、オプション）
   * @param memberRates - メンバー単価情報（利益率計算用、オプション）
   * @returns グループ統計
   */
  static calculateGroupStats(
    members: MemberStrengths[],
    stageMasters: StageMaster[] = [],
    memberRates: MemberRateRecord[] = []
  ): GroupStats {
    // 強みグループ分布を計算
    const groupDistribution: Record<StrengthGroup, number> = {
      [StrengthGroup.EXECUTING]: 0,
      [StrengthGroup.INFLUENCING]: 0,
      [StrengthGroup.RELATIONSHIP_BUILDING]: 0,
      [StrengthGroup.STRATEGIC_THINKING]: 0
    };

    members.forEach(member => {
      member.strengths.forEach(rs => {
        const strength = StrengthsService.getStrengthById(rs.id);
        if (strength) {
          groupDistribution[strength.group]++;
        }
      });
    });

    const stats: GroupStats = {
      memberCount: members.length,
      groupDistribution
    };

    // 利益率計算（ステージ情報と単価情報がある場合のみ）
    if (stageMasters.length > 0 && memberRates.length > 0) {
      const validMembers = members.filter(m => {
        const memberRate = memberRates.find(r => r.memberId === m.id);
        return m.stageId && memberRate;
      });

      if (validMembers.length > 0) {
        // ProfitabilityServiceを使用（既存の利益率計算ロジックを再利用）
        const { ProfitabilityService } = require('./ProfitabilityService');
        const profitability = ProfitabilityService.calculateTeamProfitability(
          validMembers,
          stageMasters,
          memberRates
        );

        stats.profitability = {
          totalRevenue: profitability.totalRevenue,
          totalCost: profitability.totalCost,
          totalProfit: profitability.totalProfit,
          profitMargin: profitability.profitMargin
        };
      }
    }

    return stats;
  }

  /**
   * シミュレーションをJSON形式でエクスポート
   *
   * @param state - 現在の状態
   * @param allMembers - 全メンバー配列
   * @returns JSON文字列
   */
  static exportSimulation(state: SimulationState, allMembers: MemberStrengths[]): string {
    const exportData: SimulationExport = {
      _comment: 'Strengths Finder - Team Simulation Export',
      version: '1.0',
      simulationName: state.simulationName,
      exportedAt: new Date().toISOString(),
      groups: state.groups.map(group => ({
        id: group.id,
        name: group.name,
        memberIds: group.memberIds,
        members: group.memberIds
          .map(id => {
            const member = allMembers.find(m => m.id === id);
            if (!member) return null;
            return {
              id: member.id,
              name: member.name
            };
          })
          .filter((m): m is { id: string; name: string } => m !== null)
      })),
      unassignedPool: {
        memberIds: state.unassignedPool,
        members: state.unassignedPool
          .map(id => {
            const member = allMembers.find(m => m.id === id);
            if (!member) return null;
            return {
              id: member.id,
              name: member.name
            };
          })
          .filter((m): m is { id: string; name: string } => m !== null)
      }
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * JSONからシミュレーションをインポート
   *
   * @param json - JSON文字列
   * @param allMembers - 全メンバー配列（存在確認用）
   * @returns インポート結果（状態 + 警告）
   */
  static importSimulation(json: string, allMembers: MemberStrengths[]): ImportResult {
    const warnings: ImportWarning[] = [];

    let data: any;
    try {
      data = JSON.parse(json);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }

    // バージョンチェック
    if (data.version !== '1.0') {
      warnings.push({
        type: 'version-mismatch',
        message: `Expected version 1.0, got ${data.version}`
      });
    }

    const memberIdSet = new Set(allMembers.map(m => m.id));

    // グループのインポート
    const groups: SimulationGroup[] = (data.groups || []).map((g: any) => {
      const validMemberIds = g.memberIds.filter((id: string) => {
        if (!memberIdSet.has(id)) {
          warnings.push({
            type: 'member-not-found',
            message: `Member ${id} not found in current data`,
            relatedData: id
          });
          return false;
        }
        return true;
      });

      return {
        id: g.id || this.generateId(),
        name: g.name || '無名グループ',
        memberIds: validMemberIds
      };
    });

    // 未配置プールのインポート
    const unassignedPool = (data.unassignedPool?.memberIds || []).filter((id: string) => {
      if (!memberIdSet.has(id)) {
        warnings.push({
          type: 'member-not-found',
          message: `Member ${id} not found in current data`,
          relatedData: id
        });
        return false;
      }
      return true;
    });

    const state: SimulationState = {
      simulationName: data.simulationName || '読み込んだシミュレーション',
      groups,
      unassignedPool,
      createdAt: data.exportedAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return { state, warnings };
  }

  /**
   * シミュレーション結果を本番データに反映
   *
   * グループ名が部署コードとして設定されます。
   *
   * @param state - シミュレーション状態
   * @param members - 全メンバー配列
   * @returns 更新されたメンバー配列
   */
  static applyToProduction(
    state: SimulationState,
    members: MemberStrengths[]
  ): MemberStrengths[] {
    // メンバーIDから設定されるグループ名（部署コードになる）へのマッピング
    const groupNameMap = new Map<string, string>();
    state.groups.forEach(group => {
      group.memberIds.forEach(memberId => {
        groupNameMap.set(memberId, group.name);
      });
    });

    // 未配置メンバーは「未配置」部署コードに
    state.unassignedPool.forEach(memberId => {
      groupNameMap.set(memberId, '未配置');
    });

    // メンバーの部署コードを更新
    return members.map(member => ({
      ...member,
      department: groupNameMap.get(member.id) || member.department
    }));
  }

  /**
   * 本番反映のプレビューを生成
   *
   * グループ名が部署コードとしてどのように設定されるかのプレビューを返します。
   *
   * @param state - シミュレーション状態
   * @param members - 全メンバー配列
   * @returns 変更プレビュー
   */
  static getApplyPreview(state: SimulationState, members: MemberStrengths[]): ApplyPreview {
    // メンバーIDから設定されるグループ名（部署コードになる）へのマッピング
    const groupNameMap = new Map<string, string>();
    state.groups.forEach(group => {
      group.memberIds.forEach(memberId => {
        groupNameMap.set(memberId, group.name);
      });
    });

    state.unassignedPool.forEach(memberId => {
      groupNameMap.set(memberId, '未配置');
    });

    const changes = members.map(member => {
      const newDepartment = groupNameMap.get(member.id) || member.department;
      return {
        memberId: member.id,
        memberName: member.name,
        oldDepartment: member.department,
        newDepartment
      };
    });

    const changeCount = changes.filter(c => c.oldDepartment !== c.newDepartment).length;

    return {
      changeCount,
      changes
    };
  }
}
