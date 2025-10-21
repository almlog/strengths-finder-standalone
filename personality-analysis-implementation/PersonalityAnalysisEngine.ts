/**
 * 性格分析エンジン
 * 
 * @description
 * ルールベースでMBTIとストレングスファインダーを統合分析
 * 3つのデータパターンに対応
 */

import {
  MBTIType,
  MBTIProfile,
  Member,
  AnalysisResult,
  AnalysisMode,
  STRENGTH_NAMES,
  TEAM_ORIENTED_STRENGTHS,
  LEADERSHIP_STRENGTHS,
  ANALYTICAL_STRENGTHS,
  EXECUTION_STRENGTHS,
  determineAnalysisMode,
} from '../models/PersonalityAnalysis';

class PersonalityAnalysisEngine {
  private profiles: Map<MBTIType, MBTIProfile> = new Map();
  private initialized: boolean = false;

  constructor() {
    this.loadProfiles();
  }

  // ===========================================================================
  // メイン分析メソッド
  // ===========================================================================

  /**
   * メンバーを分析
   */
  public analyze(member: Member): AnalysisResult | null {
    if (!this.initialized) {
      console.warn('プロファイルの読み込みが完了していません');
      return null;
    }

    const mode = determineAnalysisMode(member);
    if (!mode) {
      console.warn('分析に必要なデータがありません:', member);
      return null;
    }

    switch (mode) {
      case 'full':
        return this.analyzeFullMode(member);
      case 'mbti-only':
        return this.analyzeMBTIOnly(member);
      case 'strengths-only':
        return this.analyzeStrengthsOnly(member);
      default:
        return null;
    }
  }

  // ===========================================================================
  // モード別分析
  // ===========================================================================

  /**
   * 完全モード: MBTIと資質の両方がある
   */
  private analyzeFullMode(member: Member): AnalysisResult {
    const profile = this.profiles.get(member.mbtiType!);
    if (!profile) {
      console.error(`プロファイルが見つかりません: ${member.mbtiType}`);
      return this.analyzeMBTIOnly(member);
    }

    const synergyScore = this.calculateSynergyScore(profile, member.strengths!);
    const teamFitScore = this.calculateTeamFit(member.mbtiType!, member.strengths!);
    const leadershipPotential = this.calculateLeadership(member.mbtiType!, member.strengths!);

    const topStrengthNames = member.strengths!
      .slice(0, 5)
      .map(s => STRENGTH_NAMES[s.id]);

    return {
      analysisMode: 'full',
      mbtiType: member.mbtiType,
      primaryRole: profile.teamDynamics.naturalRole,
      synergyScore,
      teamFitScore,
      leadershipPotential,
      profileSummary: this.buildFullProfileSummary(profile, topStrengthNames),
      strengths: profile.characteristics.strengths,
      workStyle: profile.characteristics.workStyle,
      communicationStyle: profile.characteristics.communicationStyle,
      idealEnvironment: profile.teamDynamics.bestEnvironment,
      motivators: profile.motivation.motivators,
      stressors: profile.motivation.stressors,
      compatibleTypes: [
        ...profile.mbtiCompatibility.naturalPartners,
        ...profile.mbtiCompatibility.complementary,
      ],
      topStrengthNames,
      analysisDate: new Date().toISOString(),
      version: 'v1.0.0',
    };
  }

  /**
   * MBTIのみモード
   */
  private analyzeMBTIOnly(member: Member): AnalysisResult {
    const profile = this.profiles.get(member.mbtiType!);
    if (!profile) {
      console.error(`プロファイルが見つかりません: ${member.mbtiType}`);
      return this.createEmptyResult();
    }

    const teamFitScore = this.estimateTeamFitFromMBTI(member.mbtiType!);
    const leadershipPotential = this.estimateLeadershipFromMBTI(member.mbtiType!);

    return {
      analysisMode: 'mbti-only',
      mbtiType: member.mbtiType,
      primaryRole: profile.teamDynamics.naturalRole,
      synergyScore: 0,
      teamFitScore,
      leadershipPotential,
      profileSummary: this.buildMBTIOnlyProfileSummary(profile),
      strengths: profile.characteristics.strengths,
      workStyle: profile.characteristics.workStyle,
      communicationStyle: profile.characteristics.communicationStyle,
      idealEnvironment: profile.teamDynamics.bestEnvironment,
      motivators: profile.motivation.motivators,
      stressors: profile.motivation.stressors,
      compatibleTypes: [
        ...profile.mbtiCompatibility.naturalPartners,
        ...profile.mbtiCompatibility.complementary,
      ],
      analysisDate: new Date().toISOString(),
      version: 'v1.0.0',
    };
  }

  /**
   * 資質のみモード
   */
  private analyzeStrengthsOnly(member: Member): AnalysisResult {
    const teamFitScore = this.calculateTeamFitFromStrengths(member.strengths!);
    const leadershipPotential = this.calculateLeadershipFromStrengths(member.strengths!);

    const topStrengthNames = member.strengths!
      .slice(0, 5)
      .map(s => STRENGTH_NAMES[s.id]);

    const primaryRole = this.inferRoleFromStrengths(member.strengths!);
    const workStyle = this.inferWorkStyleFromStrengths(member.strengths!);

    return {
      analysisMode: 'strengths-only',
      primaryRole,
      synergyScore: 0,
      teamFitScore,
      leadershipPotential,
      profileSummary: this.buildStrengthsOnlyProfileSummary(topStrengthNames),
      strengths: topStrengthNames,
      workStyle,
      communicationStyle: '資質を活かしたコミュニケーション',
      idealEnvironment: '強みを発揮できる環境',
      motivators: ['自分の資質を活かせる仕事', '成長と学習の機会'],
      stressors: ['資質が活かせない環境', '強みを制限される状況'],
      topStrengthNames,
      analysisDate: new Date().toISOString(),
      version: 'v1.0.0',
    };
  }

  // ===========================================================================
  // スコア計算
  // ===========================================================================

  /**
   * MBTIと資質の相性スコア（完全モードのみ）
   */
  private calculateSynergyScore(profile: MBTIProfile, strengths: Member['strengths']): number {
    if (!strengths) return 0;

    let totalScore = 0;
    const weights = [0.5, 0.3, 0.15, 0.03, 0.02]; // TOP5の重み

    strengths.slice(0, 5).forEach((strength, index) => {
      const synergy = this.getStrengthSynergy(profile, strength.id);
      totalScore += synergy * weights[index];
    });

    return Math.round(totalScore);
  }

  /**
   * 個別資質の相性
   */
  private getStrengthSynergy(profile: MBTIProfile, strengthId: number): number {
    if (profile.strengthsSynergy.highSynergy.includes(strengthId)) {
      return 95;
    } else if (profile.strengthsSynergy.moderateSynergy.includes(strengthId)) {
      return 65;
    } else if (profile.strengthsSynergy.lowSynergy.includes(strengthId)) {
      return 35;
    }
    return 50; // デフォルト
  }

  /**
   * チーム適合度（完全モード）
   */
  private calculateTeamFit(mbtiType: MBTIType, strengths: Member['strengths']): number {
    let score = 50;

    // MBTIからの加算
    if (mbtiType.startsWith('E')) score += 12; // 外向型
    if (mbtiType.includes('F')) score += 10;   // 感情型
    if (mbtiType.endsWith('J')) score += 8;    // 判断型

    // 資質からの加算
    if (strengths) {
      strengths.slice(0, 5).forEach((strength, index) => {
        if (TEAM_ORIENTED_STRENGTHS.includes(strength.id)) {
          score += (10 - index * 2);
        }
      });
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * リーダーシップ潜在力（完全モード）
   */
  private calculateLeadership(mbtiType: MBTIType, strengths: Member['strengths']): number {
    let score = 40;

    // MBTIからの加算
    if (mbtiType.startsWith('E')) score += 15; // 外向型
    if (mbtiType.includes('T')) score += 12;   // 思考型
    if (mbtiType.endsWith('J')) score += 18;   // 判断型

    // 資質からの加算
    if (strengths) {
      strengths.slice(0, 5).forEach((strength, index) => {
        if (LEADERSHIP_STRENGTHS.includes(strength.id)) {
          score += (12 - index * 2);
        }
      });
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * MBTIからチーム適合度を推定
   */
  private estimateTeamFitFromMBTI(mbtiType: MBTIType): number {
    let score = 50;
    if (mbtiType.startsWith('E')) score += 20;
    if (mbtiType.includes('F')) score += 18;
    if (mbtiType.endsWith('J')) score += 12;
    return Math.min(100, score);
  }

  /**
   * MBTIからリーダーシップを推定
   */
  private estimateLeadershipFromMBTI(mbtiType: MBTIType): number {
    let score = 45;
    if (mbtiType.startsWith('E')) score += 20;
    if (mbtiType.includes('T')) score += 18;
    if (mbtiType.endsWith('J')) score += 17;
    return Math.min(100, score);
  }

  /**
   * 資質からチーム適合度を計算
   */
  private calculateTeamFitFromStrengths(strengths: Member['strengths']): number {
    if (!strengths) return 50;

    let score = 50;
    strengths.slice(0, 5).forEach((strength, index) => {
      if (TEAM_ORIENTED_STRENGTHS.includes(strength.id)) {
        score += (15 - index * 3);
      }
    });

    return Math.min(100, Math.round(score));
  }

  /**
   * 資質からリーダーシップを計算
   */
  private calculateLeadershipFromStrengths(strengths: Member['strengths']): number {
    if (!strengths) return 40;

    let score = 40;
    strengths.slice(0, 5).forEach((strength, index) => {
      if (LEADERSHIP_STRENGTHS.includes(strength.id)) {
        score += (18 - index * 3);
      }
    });

    return Math.min(100, Math.round(score));
  }

  // ===========================================================================
  // プロファイル統合メッセージ生成
  // ===========================================================================

  /**
   * 完全モードのプロファイル統合メッセージ
   */
  private buildFullProfileSummary(profile: MBTIProfile, topStrengths: string[]): string[] {
    return [
      `${profile.name}（${profile.type}）タイプで、「${topStrengths[0]}」「${topStrengths[1]}」を持つプロフェッショナルです。`,
      `${profile.characteristics.workStyle}`,
      `特に${profile.teamDynamics.naturalRole}として、チームに貢献できます。`,
      `${profile.characteristics.communicationStyle}`,
    ];
  }

  /**
   * MBTIのみモードのプロファイル統合メッセージ
   */
  private buildMBTIOnlyProfileSummary(profile: MBTIProfile): string[] {
    return [
      `${profile.name}（${profile.type}）タイプのプロフェッショナルです。`,
      `${profile.characteristics.workStyle}`,
      `${profile.teamDynamics.naturalRole}として、チームに貢献できます。`,
      `※ストレングスファインダーのデータがあると、より詳細な分析が可能です。`,
    ];
  }

  /**
   * 資質のみモードのプロファイル統合メッセージ
   */
  private buildStrengthsOnlyProfileSummary(topStrengths: string[]): string[] {
    return [
      `「${topStrengths[0]}」「${topStrengths[1]}」「${topStrengths[2]}」を中心とした資質を持つプロフェッショナルです。`,
      `これらの強みを活かして、チームに貢献できます。`,
      `※MBTIタイプが登録されると、より詳細な分析が可能です。`,
    ];
  }

  /**
   * 資質から役割を推定
   */
  private inferRoleFromStrengths(strengths: Member['strengths']): string {
    if (!strengths || strengths.length === 0) return '不明';

    const topIds = strengths.slice(0, 3).map(s => s.id);
    
    const hasAnalytical = topIds.some(id => ANALYTICAL_STRENGTHS.includes(id));
    const hasExecution = topIds.some(id => EXECUTION_STRENGTHS.includes(id));
    const hasLeadership = topIds.some(id => LEADERSHIP_STRENGTHS.includes(id));
    const hasTeam = topIds.some(id => TEAM_ORIENTED_STRENGTHS.includes(id));

    if (hasLeadership && hasExecution) return 'リーダー・推進者';
    if (hasAnalytical && hasExecution) return '戦略家・実行者';
    if (hasTeam && hasExecution) return 'チームプレイヤー';
    if (hasAnalytical) return 'アナリスト・思考家';
    if (hasExecution) return '実行者・達成者';
    
    return '多才なプロフェッショナル';
  }

  /**
   * 資質から仕事のスタイルを推定
   */
  private inferWorkStyleFromStrengths(strengths: Member['strengths']): string {
    if (!strengths || strengths.length === 0) return '柔軟なスタイル';

    const topIds = strengths.slice(0, 3).map(s => s.id);
    
    if (topIds.some(id => ANALYTICAL_STRENGTHS.includes(id))) {
      return '論理的で計画的なアプローチを好む';
    }
    if (topIds.some(id => EXECUTION_STRENGTHS.includes(id))) {
      return '目標達成に向けて着実に実行する';
    }
    if (topIds.some(id => TEAM_ORIENTED_STRENGTHS.includes(id))) {
      return 'チームワークを重視した協働スタイル';
    }
    
    return 'バランスの取れた柔軟なスタイル';
  }

  // ===========================================================================
  // ユーティリティ
  // ===========================================================================

  /**
   * 空の結果を作成（エラー時のフォールバック）
   */
  private createEmptyResult(): AnalysisResult {
    return {
      analysisMode: 'mbti-only',
      primaryRole: '不明',
      synergyScore: 0,
      teamFitScore: 0,
      leadershipPotential: 0,
      profileSummary: ['分析データが不足しています'],
      strengths: [],
      workStyle: '',
      communicationStyle: '',
      idealEnvironment: '',
      motivators: [],
      stressors: [],
      analysisDate: new Date().toISOString(),
      version: 'v1.0.0',
    };
  }

  /**
   * プロファイルを読み込み
   */
  private async loadProfiles(): Promise<void> {
    try {
      // 実際の実装では /public/config/mbti-profiles.json から読み込む
      // const response = await fetch('/config/mbti-profiles.json');
      // const data = await response.json();
      // data.profiles.forEach((profile: MBTIProfile) => {
      //   this.profiles.set(profile.type, profile);
      // });
      
      // 開発用: サンプルプロファイルを設定
      this.loadSampleProfiles();
      this.initialized = true;
    } catch (error) {
      console.error('プロファイルの読み込みに失敗しました:', error);
      this.initialized = false;
    }
  }

  /**
   * サンプルプロファイルを読み込み（開発用）
   */
  private loadSampleProfiles(): void {
    // INTJ: 建築家
    const intj: MBTIProfile = {
      type: 'INTJ',
      name: '建築家',
      description: '想像力が豊かで、戦略的な思考の持ち主',
      characteristics: {
        strengths: ['戦略的思考', '独立性', '決断力', '長期計画'],
        weaknesses: ['感情表現', '柔軟性', '細部への注意'],
        workStyle: '体系的で計画的なアプローチを好み、効率と成果を重視',
        communicationStyle: '直接的で論理的、要点を明確に伝える',
        learningStyle: '理論から実践へ、独学で深く学ぶことを好む',
        decisionMaking: 'データと論理に基づき、長期的視点で判断',
      },
      motivation: {
        motivators: ['複雑な問題解決', '自律性', '能力向上', '長期目標の達成'],
        demotivators: ['非効率的なプロセス', '感情的な議論', '不明確な目標'],
        stressors: ['非効率', '感情的な議論', '細かいルール', '予測不可能な変更'],
        stressRelief: ['一人の時間', '戦略的思考', '学習と研究'],
      },
      teamDynamics: {
        naturalRole: '戦略家・設計者',
        bestEnvironment: '静かで構造化された環境、自律性が高い職場',
        idealTeamSize: '小規模チーム（3-5人）',
        conflictStyle: '論理的に分析し、合理的な解決策を提示',
      },
      strengthsSynergy: {
        highSynergy: [4, 20, 29, 21, 34],      // 分析思考、内省、戦略性、学習欲、目標志向
        moderateSynergy: [1, 16, 31, 22, 13],  // 達成欲、着想、未来志向、最上志向、慎重さ
        lowSynergy: [2, 9, 15, 19, 30],        // 活発性、競争性、調和性、収集心、社交性
      },
      mbtiCompatibility: {
        naturalPartners: ['ENTP', 'ENFP'],
        complementary: ['ENTJ', 'INFJ', 'INTP'],
        challenging: ['ESFP', 'ESFJ', 'ISFP'],
      },
      careerPaths: {
        idealFields: ['戦略立案', 'システム設計', '研究開発', 'コンサルティング'],
        roleExamples: ['アーキテクト', 'ストラテジスト', 'プロジェクトマネージャー'],
        developmentAreas: ['感情表現', '柔軟性', 'チームワーク'],
      },
    };

    this.profiles.set('INTJ', intj);

    // TODO: 他の15タイプも同様に定義
    // 実際の実装では /public/config/mbti-profiles.json で管理
  }
}

// シングルトンインスタンスをエクスポート
export default new PersonalityAnalysisEngine();
