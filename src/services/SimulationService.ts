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
  GroupAnalysis,
  TeamCharacteristicNarrative,
  ImportResult,
  ImportWarning,
  ApplyPreview,
  DestinationId,
  SimulationExport
} from '../types/simulation';
import { MemberStrengths, StrengthGroup } from '../models/StrengthsTypes';
import StrengthsService, { GROUP_LABELS } from './StrengthsService';
import { StageMaster } from '../types/profitability';
import { MemberRateRecord } from '../types/financial';
import { PersonalityAnalysisEngine } from './PersonalityAnalysisEngine';
import { Member, MBTIType } from '../models/PersonalityAnalysis';
import { getPersonalityById } from './Personality16Service';

const MAX_GROUPS = 10;
const DEFAULT_GROUP_NAMES = ['グループ1', 'グループ2', 'グループ3'];

// グループ分析用の定数
const LEADERSHIP_HIGH_THRESHOLD = 70;   // 高リーダーシップの閾値
const LEADERSHIP_MEDIUM_THRESHOLD = 40; // 中リーダーシップの閾値
const STRENGTH_CATEGORY_COUNT = 4;      // 資質カテゴリ数（実行力・影響力・人間関係構築・戦略的思考）

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
      groupDistribution,
      analysis: this.calculateGroupAnalysis(members),
      narrative: this.calculateTeamNarrative(members)
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

  /**
   * 数値配列の平均を計算（nullを除外、0は有効値として扱う）
   *
   * @param scores - スコア配列
   * @param excludeZero - trueの場合0も除外（相性スコア用）
   * @returns 平均値、またはスコアが0件の場合はnull
   */
  private static calculateAverage(scores: (number | null)[], excludeZero: boolean = false): number | null {
    const validScores = scores.filter((score): score is number => {
      if (score === null || score === undefined) return false;
      if (excludeZero && score === 0) return false;
      return true;
    });

    if (validScores.length === 0) {
      return null;
    }

    return validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  }

  /**
   * MemberStrengthsをMember型に変換
   *
   * @param memberStrengths - 変換元のメンバー
   * @returns Member型のメンバー
   */
  private static convertToMember(memberStrengths: MemberStrengths): Member {
    let mbtiType: MBTIType | undefined = undefined;

    // personalityIdからmbtiTypeを導出
    if (memberStrengths.personalityId) {
      const personality = getPersonalityById(memberStrengths.personalityId);
      if (personality) {
        mbtiType = personality.code as MBTIType;
      }
    }

    return {
      id: memberStrengths.id,
      name: memberStrengths.name,
      department: memberStrengths.department,
      position: typeof memberStrengths.position === 'string' ? memberStrengths.position : undefined,
      mbtiType,
      strengths: memberStrengths.strengths.map(s => ({
        id: s.id,
        score: s.score
      }))
    };
  }

  /**
   * グループ分析を計算
   *
   * @param members - グループに所属するメンバー配列
   * @returns グループ分析結果（メンバー0人の場合はnull）
   */
  static calculateGroupAnalysis(members: MemberStrengths[]): GroupAnalysis | null {
    // メンバー0人の場合はnull
    if (members.length === 0) {
      return null;
    }

    // PersonalityAnalysisEngineで個人分析を実行
    const analysisEngine = new PersonalityAnalysisEngine();
    const individualAnalyses = members
      .map(member => {
        try {
          // MemberStrengthsをMember型に変換
          const convertedMember = this.convertToMember(member);
          return analysisEngine.analyze(convertedMember);
        } catch (error) {
          return null;
        }
      })
      .filter(a => a !== null);

    // 平均スコアを計算
    // 相性スコアは0を除外（MBTIデータなしの場合0になる）
    const avgSynergyScore = this.calculateAverage(
      individualAnalyses.map(a => a!.synergyScore),
      true  // excludeZero
    );
    // チーム適合度とリーダーシップは0も有効値
    const avgTeamFit = this.calculateAverage(
      individualAnalyses.map(a => a!.teamFitScore)
    );
    const avgLeadership = this.calculateAverage(
      individualAnalyses.map(a => a!.leadershipPotential)
    );

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

    // チーム特性: バランス判定
    // 閾値 = メンバー数 × 1.25 (各メンバー5資質を4カテゴリで均等配分)
    const balanceThreshold = members.length * 1.25;
    const isBalanced = Object.values(groupDistribution)
      .every(count => count >= balanceThreshold);

    // チーム特性: 強化カテゴリ
    const totalStrengths = Object.values(groupDistribution).reduce((a, b) => a + b, 0);
    const average = totalStrengths / STRENGTH_CATEGORY_COUNT;
    const strongCategories = Object.entries(groupDistribution)
      .filter(([_, count]) => count > average)
      .map(([group, _]) => group as StrengthGroup);

    // チーム特性: 弱点カテゴリ
    const weakCategories = Object.entries(groupDistribution)
      .filter(([_, count]) => count < average)
      .map(([group, _]) => group as StrengthGroup);

    // チーム特性: リーダーシップ分布
    const leadershipDistribution = { high: 0, medium: 0, low: 0 };
    individualAnalyses.forEach(a => {
      const leadership = a!.leadershipPotential;
      if (leadership === null || leadership === undefined) return;

      if (leadership >= LEADERSHIP_HIGH_THRESHOLD) {
        leadershipDistribution.high++;
      } else if (leadership >= LEADERSHIP_MEDIUM_THRESHOLD) {
        leadershipDistribution.medium++;
      } else {
        leadershipDistribution.low++;
      }
    });

    return {
      memberCount: members.length,
      avgSynergyScore,
      avgTeamFit,
      avgLeadership,
      teamCharacteristics: {
        isBalanced,
        strongCategories,
        weakCategories,
        leadershipDistribution
      }
    };
  }

  /**
   * チーム特性ナラティブを計算（TDD GREEN Phase）
   *
   * @param members メンバー配列
   * @returns チーム特性ナラティブ、またはnull（メンバー0人の場合）
   */
  static calculateTeamNarrative(members: MemberStrengths[]): TeamCharacteristicNarrative | null {
    if (members.length === 0) return null;

    // STEP 1: 資質頻度を集計
    const strengthFrequency = this.calculateStrengthFrequency(members);

    // STEP 2: カテゴリ分布を分析
    const categoryDistribution = this.analyzeCategoryDistribution(strengthFrequency);

    // STEP 3: 頻出資質TOP10を抽出
    const topStrengths = this.extractTopStrengths(strengthFrequency, members.length);

    // STEP 4: カテゴリ別傾向を生成
    const categoryTendencies = this.generateCategoryTendencies(categoryDistribution, strengthFrequency);

    // STEP 5: タイトルを生成
    const title = this.generateTeamTitle(categoryDistribution);

    // STEP 6: サマリー文を生成
    const summary = this.generateTeamSummary(categoryDistribution, topStrengths);

    // STEP 7: 可能性リストを生成
    const possibilities = this.generateTeamPossibilities(categoryDistribution, topStrengths);

    return {
      title,
      summary,
      categoryTendencies,
      topStrengths,
      possibilities
    };
  }

  /**
   * STEP 1: 資質頻度を集計
   */
  private static calculateStrengthFrequency(members: MemberStrengths[]): Map<number, number> {
    const frequency = new Map<number, number>();

    members.forEach(member => {
      member.strengths.slice(0, 5).forEach(s => {
        frequency.set(s.id, (frequency.get(s.id) || 0) + 1);
      });
    });

    return frequency;
  }

  /**
   * STEP 2: カテゴリ分布を分析
   */
  private static analyzeCategoryDistribution(
    frequency: Map<number, number>
  ): Record<StrengthGroup, { count: number; percentage: number }> {
    const totalStrengths = Array.from(frequency.values()).reduce((a, b) => a + b, 0);

    const distribution: Record<StrengthGroup, { count: number; percentage: number }> = {
      [StrengthGroup.EXECUTING]: { count: 0, percentage: 0 },
      [StrengthGroup.INFLUENCING]: { count: 0, percentage: 0 },
      [StrengthGroup.RELATIONSHIP_BUILDING]: { count: 0, percentage: 0 },
      [StrengthGroup.STRATEGIC_THINKING]: { count: 0, percentage: 0 }
    };

    frequency.forEach((count, strengthId) => {
      const strength = StrengthsService.getStrengthById(strengthId);
      if (strength) {
        distribution[strength.group].count += count;
      }
    });

    Object.keys(distribution).forEach(key => {
      const group = key as StrengthGroup;
      distribution[group].percentage = totalStrengths > 0
        ? (distribution[group].count / totalStrengths) * 100
        : 0;
    });

    return distribution;
  }

  /**
   * STEP 3: 頻出資質TOP10を抽出
   */
  private static extractTopStrengths(
    frequency: Map<number, number>,
    memberCount: number
  ): Array<{ strengthId: number; name: string; frequency: number; percentage: number }> {
    // 総資質数を計算（全メンバーのTOP5の合計）
    const totalStrengths = Array.from(frequency.values()).reduce((a, b) => a + b, 0);

    return Array.from(frequency.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([strengthId, freq]) => {
        const strength = StrengthsService.getStrengthById(strengthId);
        return {
          strengthId,
          name: strength?.name || `資質${strengthId}`,
          frequency: freq,
          percentage: (freq / totalStrengths) * 100
        };
      });
  }

  /**
   * STEP 4: カテゴリ別傾向を生成
   */
  private static generateCategoryTendencies(
    distribution: Record<StrengthGroup, { count: number; percentage: number }>,
    frequency: Map<number, number>
  ): Array<{
    category: StrengthGroup;
    percentage: number;
    topStrengths: Array<{ strengthId: number; name: string; frequency: number; description: string }>;
  }> {
    return Object.entries(distribution)
      .sort(([, a], [, b]) => b.percentage - a.percentage)
      .map(([category, { percentage }]) => {
        const group = category as StrengthGroup;

        // このカテゴリのTOP3資質を抽出
        const categoryStrengths = Array.from(frequency.entries())
          .filter(([strengthId]) => {
            const strength = StrengthsService.getStrengthById(strengthId);
            return strength?.group === group;
          })
          .sort((a, b) => b[1] - a[1])
          .slice(0, 3)
          .map(([strengthId, freq]) => {
            const strength = StrengthsService.getStrengthById(strengthId);
            return {
              strengthId,
              name: strength?.name || `資質${strengthId}`,
              frequency: freq,
              description: strength?.description.substring(0, 30) + '...' || ''
            };
          });

        return {
          category: group,
          percentage,
          topStrengths: categoryStrengths
        };
      });
  }

  /**
   * STEP 5: タイトルを生成
   */
  private static generateTeamTitle(
    distribution: Record<StrengthGroup, { count: number; percentage: number }>
  ): string {
    const sorted = Object.entries(distribution)
      .sort(([, a], [, b]) => b.percentage - a.percentage);

    const top1 = sorted[0];
    const top2 = sorted[1];

    // バランス判定（すべて20-30%の範囲）
    const isBalanced = sorted.every(([, { percentage }]) =>
      percentage >= 20 && percentage <= 30
    );

    if (isBalanced) {
      return 'バランス型チーム';
    }

    // 1カテゴリ特化（TOP1が40%以上）
    if (top1[1].percentage >= 40) {
      return `${GROUP_LABELS[top1[0] as StrengthGroup]}特化チーム`;
    }

    // 2カテゴリ複合（TOP2が両方30%以上）
    if (top1[1].percentage >= 30 && top2[1].percentage >= 30) {
      return `${GROUP_LABELS[top1[0] as StrengthGroup]}×${GROUP_LABELS[top2[0] as StrengthGroup]}チーム`;
    }

    // デフォルト
    return `${GROUP_LABELS[top1[0] as StrengthGroup]}中心チーム`;
  }

  /**
   * STEP 6: サマリー文を生成
   */
  private static generateTeamSummary(
    distribution: Record<StrengthGroup, { count: number; percentage: number }>,
    topStrengths: Array<{ name: string }>
  ): string {
    const sorted = Object.entries(distribution)
      .sort(([, a], [, b]) => b.percentage - a.percentage)
      .slice(0, 2);

    const top1 = sorted[0];
    const top2 = sorted[1];

    const top3Names = topStrengths.slice(0, 3).map(s => s.name).join('・');

    return `このチームは、${GROUP_LABELS[top1[0] as StrengthGroup]}(${top1[1].percentage.toFixed(0)}%)と` +
           `${GROUP_LABELS[top2[0] as StrengthGroup]}(${top2[1].percentage.toFixed(0)}%)を主軸とし、` +
           `${top3Names}を中心とした強みを併せ持ちます。`;
  }

  /**
   * STEP 7: 可能性リストを生成（MVP: 固定3項目）
   */
  private static generateTeamPossibilities(
    distribution: Record<StrengthGroup, { count: number; percentage: number }>,
    topStrengths: Array<{ name: string }>
  ): string[] {
    const sorted = Object.entries(distribution)
      .sort(([, a], [, b]) => b.percentage - a.percentage);

    const top1Group = sorted[0][0] as StrengthGroup;
    const top1Name = topStrengths[0]?.name || '主要資質';

    // MVP: カテゴリベースの固定メッセージ
    const categoryMessages: Record<StrengthGroup, string[]> = {
      [StrengthGroup.EXECUTING]: [
        `${top1Name}による確実な目標達成力`,
        '計画的な実行と着実な成果創出',
        '責任感のある安定したチーム運営'
      ],
      [StrengthGroup.INFLUENCING]: [
        `${top1Name}によるチーム牽引力`,
        '周囲を動かす影響力の発揮',
        '意欲的な挑戦と成果の追求'
      ],
      [StrengthGroup.RELATIONSHIP_BUILDING]: [
        `${top1Name}による協力的なチーム構築`,
        'メンバーの調和と相互理解',
        '信頼関係を基盤とした協働'
      ],
      [StrengthGroup.STRATEGIC_THINKING]: [
        `${top1Name}による戦略的な問題解決`,
        '分析と洞察に基づく意思決定',
        '革新的なアイデアの創出'
      ]
    };

    return categoryMessages[top1Group] || [
      'チームの多様な強みを活かした活動',
      '柔軟な対応力と適応性',
      'メンバーの個性を尊重した運営'
    ];
  }
}
