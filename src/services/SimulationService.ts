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
  SimulationExport,
  ScoreBreakdown,
  ScoreComponent
} from '../types/simulation';
import { MemberStrengths, StrengthGroup } from '../models/StrengthsTypes';
import StrengthsService, { GROUP_LABELS } from './StrengthsService';
import { StageMaster } from '../types/profitability';
import { MemberRateRecord } from '../types/financial';
import { PersonalityAnalysisEngine } from './PersonalityAnalysisEngine';
import { Member, MBTIType, TEAM_ORIENTED_STRENGTHS, LEADERSHIP_STRENGTHS } from '../models/PersonalityAnalysis';
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

    const frequentStrengths = topStrengths.slice(0, 3).map(s => s.name).join('・');

    return `このチームは、${GROUP_LABELS[top1[0] as StrengthGroup]}(${top1[1].percentage.toFixed(0)}%)と` +
           `${GROUP_LABELS[top2[0] as StrengthGroup]}(${top2[1].percentage.toFixed(0)}%)を主軸とし、` +
           `「${frequentStrengths}」が頻出する強みを併せ持ちます。`;
  }

  /**
   * STEP 7: 可能性リストを生成（頻出資質ベース）
   */
  private static generateTeamPossibilities(
    distribution: Record<StrengthGroup, { count: number; percentage: number }>,
    topStrengths: Array<{ name: string; strengthId: number }>
  ): string[] {
    const possibilities: string[] = [];

    // 頻出資質TOP5から特性を抽出
    const top5 = topStrengths.slice(0, 5);

    top5.forEach((strength, index) => {
      const keyword = this.getStrengthKeyword(strength.name);
      if (keyword && index < 3) {
        possibilities.push(keyword);
      }
    });

    // カテゴリ分布に基づく補足（30%以上のカテゴリ）
    const sortedCategories = Object.entries(distribution)
      .sort(([, a], [, b]) => b.percentage - a.percentage)
      .filter(([, { percentage }]) => percentage >= 30);

    if (sortedCategories.length >= 2) {
      const cat1 = GROUP_LABELS[sortedCategories[0][0] as StrengthGroup];
      const cat2 = GROUP_LABELS[sortedCategories[1][0] as StrengthGroup];
      possibilities.push(`${cat1}と${cat2}のバランスを活かした多角的アプローチ`);
    }

    // 最低3項目を保証
    if (possibilities.length < 3) {
      possibilities.push('チームの多様な強みを活かした活動');
    }

    return possibilities.slice(0, 5); // 最大5項目
  }

  /**
   * リーダーシップスコアのブレークダウン計算
   */
  public static calculateLeadershipBreakdown(members: MemberStrengths[]): ScoreBreakdown {
    const components: ScoreComponent[] = [];
    let totalScore = 40; // BASE

    components.push({ label: 'ベーススコア', value: 40 });

    // MBTI型ごとのボーナス集計
    let eCount = 0, tCount = 0, jCount = 0;
    members.forEach(m => {
      if (m.mbti) {
        if (m.mbti.startsWith('E')) eCount++;
        if (m.mbti.includes('T')) tCount++;
        if (m.mbti.endsWith('J')) jCount++;
      }
    });

    const eBonus = eCount * 15;
    const tBonus = tCount * 12;
    const jBonus = jCount * 18;

    if (eCount > 0) components.push({ label: `E型メンバー: ${eCount}名`, value: eBonus });
    if (tCount > 0) components.push({ label: `T型メンバー: ${tCount}名`, value: tBonus });
    if (jCount > 0) components.push({ label: `J型メンバー: ${jCount}名`, value: jBonus });

    totalScore += eBonus + tBonus + jBonus;

    // リーダーシップ資質からの加算
    let strengthBonus = 0;
    members.forEach(m => {
      m.strengths.slice(0, 5).forEach((s, index) => {
        if (LEADERSHIP_STRENGTHS.includes(s.id)) {
          strengthBonus += (12 - index * 2);
        }
      });
    });

    if (strengthBonus > 0) {
      components.push({ label: 'リーダーシップ資質保有者', value: strengthBonus });
      totalScore += strengthBonus;
    }

    // 上限100、人数で平均
    const avgScore = Math.min(100, Math.round(totalScore / members.length));

    // 閾値と改善提案
    const threshold = {
      high: { min: 70, label: 'リーダー型', description: '明確な指示系統と迅速な意思決定' },
      balanced: { min: 50, label: 'バランス型', description: 'リーダーシップの分散と柔軟な役割分担' },
      low: { label: '専門家型', description: '✨ ユニーク: フラットで民主的なチーム。全員が専門家としての意見を持つボトムアップの意思決定' }
    };

    const improvements: string[] = [];
    if (avgScore < 70) {
      improvements.push('E型メンバーを追加: +15点/人');
      improvements.push('T型メンバーを追加: +12点/人');
      improvements.push('J型メンバーを追加: +18点/人');
      improvements.push('リーダーシップ資質保有者を追加（指令性、最上志向、活発性など）');
    }

    return {
      type: 'leadership',
      totalScore: avgScore,
      components,
      threshold,
      improvements
    };
  }

  /**
   * チーム適合度スコアのブレークダウン計算
   */
  public static calculateTeamFitBreakdown(members: MemberStrengths[]): ScoreBreakdown {
    const components: ScoreComponent[] = [];
    let totalScore = 50; // BASE

    components.push({ label: 'ベーススコア', value: 50 });

    // F型ボーナス集計
    let fCount = 0;
    members.forEach(m => {
      if (m.mbti?.includes('F')) fCount++;
    });

    const fBonus = fCount * 10;
    if (fCount > 0) {
      components.push({ label: `F型メンバー: ${fCount}名`, value: fBonus });
      totalScore += fBonus;
    }

    // チーム志向資質からの加算
    let strengthBonus = 0;
    members.forEach(m => {
      m.strengths.slice(0, 5).forEach((s, index) => {
        if (TEAM_ORIENTED_STRENGTHS.includes(s.id)) {
          strengthBonus += (10 - index * 2);
        }
      });
    });

    if (strengthBonus > 0) {
      components.push({ label: 'チーム志向資質保有者', value: strengthBonus });
      totalScore += strengthBonus;
    }

    // 上限100、人数で平均
    const avgScore = Math.min(100, Math.round(totalScore / members.length));

    // 閾値と改善提案
    const threshold = {
      high: { min: 70, label: 'チーム協調型', description: '密な連携と協力が必要なプロジェクト向き' },
      balanced: { min: 50, label: 'バランス型', description: '協働と個人作業の柔軟な切り替えが可能' },
      low: { label: '個人作業型', description: '✨ ユニーク: 独立性の高い専門家集団。深い専門性を活かした高度なタスクに集中' }
    };

    const improvements: string[] = [];
    if (avgScore < 70) {
      improvements.push('F型メンバーを追加: +10点/人');
      improvements.push('チーム志向資質保有者を追加（調和性、共感性、包含など）');
    }

    return {
      type: 'teamFit',
      totalScore: avgScore,
      components,
      threshold,
      improvements
    };
  }

  /**
   * 相性スコアのブレークダウン計算
   */
  public static calculateSynergyBreakdown(members: MemberStrengths[]): ScoreBreakdown {
    const components: ScoreComponent[] = [];

    // グループ分析から平均相性スコアを取得
    const groupAnalysis = this.calculateGroupAnalysis(members);
    const avgScore = Math.round(groupAnalysis?.avgSynergyScore ?? 50);

    components.push({
      label: '重み付けTOP5資質',
      value: avgScore,
      description: '重み: [0.5, 0.3, 0.15, 0.03, 0.02]'
    });

    // MBTI分布の分析
    const mbtiCounts: Record<string, number> = {};
    members.forEach(m => {
      if (m.mbti) {
        mbtiCounts[m.mbti] = (mbtiCounts[m.mbti] || 0) + 1;
      }
    });

    const diversityScore = Object.keys(mbtiCounts).length;
    components.push({
      label: `MBTI多様性: ${diversityScore}タイプ`,
      value: diversityScore,
      description: `${members.length}人中${diversityScore}種類のMBTI`
    });

    // 閾値と改善提案
    const threshold = {
      high: { min: 85, label: '統合型', description: '類似の資質・性格で統一された効率的なチーム' },
      balanced: { min: 55, label: 'バランス型', description: '相性と多様性のバランスが取れたチーム' },
      low: { label: '多面型', description: '✨ ユニーク: 異なる視点が交差するイノベーティブなチーム。新しいアイデアが生まれやすく、多角的な問題解決が可能' }
    };

    const improvements: string[] = [];
    if (avgScore < 85) {
      improvements.push('類似のMBTIタイプを追加してスコアアップ');
      improvements.push('低スコア=多様性のメリットを活かす（創造的課題に最適）');
    }

    return {
      type: 'synergy',
      totalScore: avgScore,
      components,
      threshold,
      improvements
    };
  }

  /**
   * 資質名から特性キーワードを取得
   * 各資質の特性をチームの可能性として表現
   */
  private static getStrengthKeyword(strengthName: string): string | null {
    const keywords: Record<string, string> = {
      // 実行力（EXECUTING）
      '達成欲': '高い目標設定と確実な達成への推進力',
      '公平性': 'ルールの公正な適用と平等な扱い',
      '回復志向': '問題発見と迅速な解決能力',
      'アレンジ': '柔軟な状況対応と効率的な資源配分',
      '慎重さ': 'リスク管理と慎重な意思決定',
      '責任感': 'コミットメントの遂行と信頼構築',
      '信念': '一貫した価値観に基づく誠実な行動',
      '規律性': '計画的な実行と秩序ある運営',
      '目標志向': '明確な方向性の設定と優先順位づけ',

      // 影響力（INFLUENCING）
      '活発性': 'エネルギッシュな行動開始と周囲の巻き込み',
      '指令性': '明確な方向性の提示と決断力',
      'コミュニケーション': 'アイデアの効果的な伝達と共有',
      '競争性': '高い目標設定と卓越性の追求',
      '最上志向': '強みの最大化と質の高い成果創出',
      '自己確信': '確信を持った意思決定と実行',
      '自我': '影響力の発揮と認知の獲得',
      '社交性': '広範なネットワーク構築と関係性の活用',

      // 人間関係構築力（RELATIONSHIP_BUILDING）
      '適応性': '柔軟な対応と変化への順応',
      '運命思考': 'つながりの重視と協働の促進',
      '成長促進': 'メンバーの成長支援と可能性の開花',
      '共感性': 'メンバーの感情理解と配慮ある対応',
      '調和性': '対立回避と合意形成による円滑な運営',
      '包含': '多様性の尊重と全員参加の促進',
      '個別化': '個性の理解と最適な役割配置',
      'ポジティブ': '楽観的な雰囲気づくりと前向きな姿勢',
      '親密性': '深い信頼関係の構築とチームの結束',

      // 戦略的思考力（STRATEGIC_THINKING）
      '分析思考': 'データに基づく論理的な判断と検証',
      '原点思考': '過去の経験からの学びと文脈理解',
      '未来志向': '長期的ビジョンの描画と革新的な発想',
      '着想': '創造的なアイデア創出と新しい視点の提供',
      '収集心': '情報収集と知識の蓄積・活用',
      '内省': '深い思考と本質的な理解の追求',
      '学習欲': '継続的な学びと専門性の向上',
      '戦略性': '最適な道筋の発見と戦略的な計画立案'
    };

    return keywords[strengthName] || null;
  }
}
