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
  TEAM_ORIENTED_STRENGTHS,
  LEADERSHIP_STRENGTHS,
  ANALYTICAL_STRENGTHS,
  EXECUTION_STRENGTHS,
  determineAnalysisMode,
} from '../models/PersonalityAnalysis';
import StrengthsService from './StrengthsService';

// =============================================================================
// スコア計算定数
// =============================================================================

/**
 * TOP5資質の重み付け（合計1.0）
 */
const STRENGTH_WEIGHTS = [0.5, 0.3, 0.15, 0.03, 0.02];

/**
 * 資質相性スコア
 */
const SYNERGY_SCORES = {
  HIGH: 95,       // 高相性
  MODERATE: 65,   // 中相性
  LOW: 35,        // 低相性
  DEFAULT: 50,    // デフォルト
};

/**
 * Belbinチームロール定義（理論的根拠：Belbin, 1981）
 * 各MBTIタイプが得意とするチームロールとスコア
 */
const BELBIN_ROLES: Record<MBTIType, { role: string; score: number }> = {
  // プラント（創造者） - 内向型が得意
  INTP: { role: 'プラント（創造者）', score: 15 },
  INFP: { role: 'プラント（創造者）', score: 15 },

  // 資源探査者 - 外向型が得意
  ENFP: { role: '資源探査者', score: 18 },
  ENTP: { role: '資源探査者', score: 18 },

  // コーディネーター
  ENFJ: { role: 'コーディネーター', score: 16 },
  ENTJ: { role: 'コーディネーター', score: 16 },

  // シェイパー
  ESTJ: { role: 'シェイパー', score: 14 },
  ESTP: { role: 'シェイパー', score: 14 },

  // 監視評価者 - 内向型が得意
  INTJ: { role: '監視評価者', score: 13 },
  ISTJ: { role: '監視評価者', score: 13 },

  // チームワーカー
  ISFJ: { role: 'チームワーカー', score: 17 },
  ESFJ: { role: 'チームワーカー', score: 17 },

  // 実行者
  ISTP: { role: '実行者', score: 15 },

  // 完成者 - 内向型が得意
  ISFP: { role: '完成者', score: 14 },

  // 専門家 - 内向型が得意
  INFJ: { role: '専門家', score: 12 },

  // その他（複数ロール適性）
  ESFP: { role: 'チームワーカー', score: 16 },
};

/**
 * チーム適合度スコア設定（Belbinベース）
 */
const TEAM_FIT_SCORES = {
  BASE: 50,               // ベーススコア
  BELBIN_DEFAULT: 8,      // Belbinロール未定義の場合のデフォルト
  FEELING_BONUS: 10,      // 感情型（F）のチーム調和ボーナス
  STRENGTH_MAX: 10,       // TOP1資質の最大加算
  STRENGTH_DECAY: 2,      // 順位による減衰
};

/**
 * リーダーシップ潜在力スコア設定
 */
const LEADERSHIP_SCORES = {
  BASE: 40,               // ベーススコア
  MBTI: {
    EXTROVERT: 15,        // 外向型（E）
    THINKING: 12,         // 思考型（T）
    JUDGING: 18,          // 判断型（J）
  },
  MBTI_ESTIMATE: {
    EXTROVERT: 25,        // MBTIのみ推定時
    THINKING: 20,
    JUDGING: 25,
  },
  STRENGTH_MAX: 12,       // TOP1資質の最大加算
  STRENGTH_DECAY: 2,      // 順位による減衰
};

/**
 * 資質のみ分析時の推定スコア
 */
const STRENGTHS_ONLY_SCORES = {
  TEAM_FIT: {
    BASE: 50,
    TEAM_STRENGTH_MAX: 15,
    TEAM_STRENGTH_DECAY: 3,
  },
  LEADERSHIP: {
    BASE: 40,
    LEADERSHIP_STRENGTH_MAX: 18,
    LEADERSHIP_STRENGTH_DECAY: 3,
  },
};

/**
 * プロファイルサマリーのスコア境界値
 */
const PROFILE_SUMMARY_THRESHOLDS = {
  SYNERGY: {
    HIGH: 85,      // 統合型
    BALANCED: 55,  // バランス型
    // < 55: 多面型
  },
  TEAM_FIT: {
    COLLABORATIVE: 70,  // チーム協調型
    BALANCED: 50,       // バランス型
    // < 50: 個人作業型
  },
  LEADERSHIP: {
    LEADER: 70,      // リーダー型
    BALANCED: 50,    // バランス型
    // < 50: 専門家型
  },
};

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

    const topStrengthNames = [...member.strengths!]
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(s => {
        const strength = StrengthsService.getStrengthById(s.id);
        return strength ? strength.name : `資質${s.id}`;
      });

    // MBTI × 資質の統合的な役割を生成
    const primaryRole = this.inferRoleFromMBTIAndStrengths(member.mbtiType!, member.strengths!);

    // スコアベースの強化されたプロファイルサマリーを生成
    const profileSummary = this.buildEnhancedProfileSummary(
      profile,
      topStrengthNames,
      synergyScore,
      teamFitScore,
      leadershipPotential,
      primaryRole
    );

    return {
      analysisMode: 'full',
      mbtiType: member.mbtiType,
      primaryRole,
      synergyScore,
      teamFitScore,
      leadershipPotential,
      profileSummary,
      strengths: profile.characteristics.strengths,
      workStyle: profile.characteristics.workStyle,
      communicationStyle: profile.characteristics.communicationStyle,
      idealEnvironment: profile.teamDynamics.bestEnvironment,
      motivators: profile.motivation.motivators,
      stressors: profile.motivation.stressors,
      naturalPartners: profile.mbtiCompatibility.naturalPartners,
      complementaryPartners: profile.mbtiCompatibility.complementary,
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
      naturalPartners: profile.mbtiCompatibility.naturalPartners,
      complementaryPartners: profile.mbtiCompatibility.complementary,
      analysisDate: new Date().toISOString(),
      version: 'v1.0.0',
    };
  }

  /**
   * 資質のみモード
   * MBTIデータがないため、根拠のある分析のみ提供
   */
  private analyzeStrengthsOnly(member: Member): AnalysisResult {
    const teamFitScore = this.calculateTeamFitFromStrengths(member.strengths!);
    const leadershipPotential = this.calculateLeadershipFromStrengths(member.strengths!);

    const topStrengthNames = [...member.strengths!]
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(s => {
        const strength = StrengthsService.getStrengthById(s.id);
        return strength ? strength.name : `資質${s.id}`;
      });

    const primaryRole = this.inferRoleFromStrengths(member.strengths!);

    return {
      analysisMode: 'strengths-only',
      primaryRole,
      synergyScore: 0, // MBTIがないため計算不可
      teamFitScore,
      leadershipPotential,
      profileSummary: this.buildStrengthsOnlyProfileSummary(topStrengthNames, teamFitScore, leadershipPotential),
      topStrengthNames,
      analysisDate: new Date().toISOString(),
      version: 'v1.1.0',
      // 以下のプロパティはMBTI情報がないため省略（undefinedで返す）
      // strengths, workStyle, communicationStyle, idealEnvironment,
      // motivators, stressors, naturalPartners, complementaryPartners
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

    strengths.slice(0, 5).forEach((strength, index) => {
      const synergy = this.getStrengthSynergy(profile, strength.id);
      totalScore += synergy * STRENGTH_WEIGHTS[index];
    });

    return Math.round(totalScore);
  }

  /**
   * 個別資質の相性
   */
  private getStrengthSynergy(profile: MBTIProfile, strengthId: number): number {
    if (profile.strengthsSynergy.highSynergy.includes(strengthId)) {
      return SYNERGY_SCORES.HIGH;
    } else if (profile.strengthsSynergy.moderateSynergy.includes(strengthId)) {
      return SYNERGY_SCORES.MODERATE;
    } else if (profile.strengthsSynergy.lowSynergy.includes(strengthId)) {
      return SYNERGY_SCORES.LOW;
    }
    return SYNERGY_SCORES.DEFAULT;
  }

  /**
   * BelbinロールベースのMBTIスコア取得
   */
  private getBelbinRoleScore(mbtiType: MBTIType): number {
    const belbinRole = BELBIN_ROLES[mbtiType];
    return belbinRole ? belbinRole.score : TEAM_FIT_SCORES.BELBIN_DEFAULT;
  }

  /**
   * チーム適合度（完全モード）
   * Belbin理論に基づくチームロール適性評価
   */
  private calculateTeamFit(mbtiType: MBTIType, strengths: Member['strengths']): number {
    let score = TEAM_FIT_SCORES.BASE;

    // Belbinロールベースのスコアリング（内向型も正当に評価）
    const belbinBonus = this.getBelbinRoleScore(mbtiType);
    score += belbinBonus;

    // F（感情型）ボーナス（チーム調和に寄与）
    if (mbtiType.includes('F')) {
      score += TEAM_FIT_SCORES.FEELING_BONUS;
    }

    // 資質からの加算
    if (strengths) {
      strengths.slice(0, 5).forEach((strength, index) => {
        if (TEAM_ORIENTED_STRENGTHS.includes(strength.id)) {
          score += (TEAM_FIT_SCORES.STRENGTH_MAX - index * TEAM_FIT_SCORES.STRENGTH_DECAY);
        }
      });
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * リーダーシップ潜在力（完全モード）
   */
  private calculateLeadership(mbtiType: MBTIType, strengths: Member['strengths']): number {
    let score = LEADERSHIP_SCORES.BASE;

    // MBTIからの加算
    if (mbtiType.startsWith('E')) score += LEADERSHIP_SCORES.MBTI.EXTROVERT;
    if (mbtiType.includes('T')) score += LEADERSHIP_SCORES.MBTI.THINKING;
    if (mbtiType.endsWith('J')) score += LEADERSHIP_SCORES.MBTI.JUDGING;

    // 資質からの加算
    if (strengths) {
      strengths.slice(0, 5).forEach((strength, index) => {
        if (LEADERSHIP_STRENGTHS.includes(strength.id)) {
          score += (LEADERSHIP_SCORES.STRENGTH_MAX - index * LEADERSHIP_SCORES.STRENGTH_DECAY);
        }
      });
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * MBTIからチーム適合度を推定（MBTIのみモード）
   * Belbin理論に基づく評価
   */
  private estimateTeamFitFromMBTI(mbtiType: MBTIType): number {
    let score = TEAM_FIT_SCORES.BASE;

    // Belbinロールベースのスコアリング
    const belbinBonus = this.getBelbinRoleScore(mbtiType);
    score += belbinBonus;

    // F（感情型）ボーナス
    if (mbtiType.includes('F')) {
      score += TEAM_FIT_SCORES.FEELING_BONUS;
    }

    return Math.min(100, Math.round(score));
  }

  /**
   * MBTIからリーダーシップを推定
   */
  private estimateLeadershipFromMBTI(mbtiType: MBTIType): number {
    let score = LEADERSHIP_SCORES.BASE;
    if (mbtiType.startsWith('E')) score += LEADERSHIP_SCORES.MBTI_ESTIMATE.EXTROVERT;
    if (mbtiType.includes('T')) score += LEADERSHIP_SCORES.MBTI_ESTIMATE.THINKING;
    if (mbtiType.endsWith('J')) score += LEADERSHIP_SCORES.MBTI_ESTIMATE.JUDGING;
    return Math.min(100, score);
  }

  /**
   * 資質からチーム適合度を計算
   */
  private calculateTeamFitFromStrengths(strengths: Member['strengths']): number {
    if (!strengths) return STRENGTHS_ONLY_SCORES.TEAM_FIT.BASE;

    let score = STRENGTHS_ONLY_SCORES.TEAM_FIT.BASE;
    strengths.slice(0, 5).forEach((strength, index) => {
      if (TEAM_ORIENTED_STRENGTHS.includes(strength.id)) {
        score += (STRENGTHS_ONLY_SCORES.TEAM_FIT.TEAM_STRENGTH_MAX - index * STRENGTHS_ONLY_SCORES.TEAM_FIT.TEAM_STRENGTH_DECAY);
      }
    });

    return Math.min(100, Math.round(score));
  }

  /**
   * 資質からリーダーシップを計算
   */
  private calculateLeadershipFromStrengths(strengths: Member['strengths']): number {
    if (!strengths) return STRENGTHS_ONLY_SCORES.LEADERSHIP.BASE;

    let score = STRENGTHS_ONLY_SCORES.LEADERSHIP.BASE;
    strengths.slice(0, 5).forEach((strength, index) => {
      if (LEADERSHIP_STRENGTHS.includes(strength.id)) {
        score += (STRENGTHS_ONLY_SCORES.LEADERSHIP.LEADERSHIP_STRENGTH_MAX - index * STRENGTHS_ONLY_SCORES.LEADERSHIP.LEADERSHIP_STRENGTH_DECAY);
      }
    });

    return Math.min(100, Math.round(score));
  }

  // ===========================================================================
  // プロファイル統合メッセージ生成
  // ===========================================================================

  /**
   * 完全モードのプロファイル統合メッセージ（レガシー）
   * @deprecated buildEnhancedProfileSummary を使用してください
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
   * スコアベースの強化されたプロファイル統合メッセージ
   *
   * @param profile MBTIプロファイル
   * @param topStrengths TOP資質名
   * @param synergyScore MBTI×資質の相性スコア
   * @param teamFitScore チーム適合度スコア
   * @param leadershipPotential リーダーシップ潜在力スコア
   * @param primaryRole 統合的な役割
   * @returns 4文構成のプロファイルサマリー
   */
  private buildEnhancedProfileSummary(
    profile: MBTIProfile,
    topStrengths: string[],
    synergyScore: number,
    teamFitScore: number,
    leadershipPotential: number,
    primaryRole: string
  ): string[] {
    return [
      this.buildSynergyMessage(profile, topStrengths, synergyScore),
      this.buildWorkStyleMessage(teamFitScore),
      this.buildRoleContributionMessage(primaryRole, topStrengths),
      this.buildLeadershipMessage(leadershipPotential, topStrengths),
    ];
  }

  /**
   * 第1文: 相乗効果メッセージ
   */
  private buildSynergyMessage(
    profile: MBTIProfile,
    topStrengths: string[],
    synergyScore: number
  ): string {
    const mbtiName = profile.name;
    const mbtiType = profile.type;
    const strength1 = topStrengths[0];
    const strength2 = topStrengths[1];

    if (synergyScore >= PROFILE_SUMMARY_THRESHOLDS.SYNERGY.HIGH) {
      // 統合型
      return `${mbtiName}（${mbtiType}）の特性と「${strength1}」「${strength2}」が高い相乗効果を発揮します。一貫した強みのパターンが明確です。`;
    } else if (synergyScore >= PROFILE_SUMMARY_THRESHOLDS.SYNERGY.BALANCED) {
      // バランス型
      return `${mbtiName}（${mbtiType}）の特性に「${strength1}」「${strength2}」が柔軟性を加えます。バランスの取れたアプローチが可能です。`;
    } else {
      // 多面型
      return `${mbtiName}（${mbtiType}）の特性と「${strength1}」「${strength2}」の組み合わせが、独自の強みを生み出します。多様な視点を持ち合わせています。`;
    }
  }

  /**
   * 第2文: 働き方メッセージ
   */
  private buildWorkStyleMessage(teamFitScore: number): string {
    if (teamFitScore >= PROFILE_SUMMARY_THRESHOLDS.TEAM_FIT.COLLABORATIVE) {
      // チーム協調型
      return 'チームと協力し、コミュニケーションを通じて相乗効果を生み出すことが得意です。協働で最大の成果を発揮します。';
    } else if (teamFitScore >= PROFILE_SUMMARY_THRESHOLDS.TEAM_FIT.BALANCED) {
      // バランス型
      return '独立作業と協働の両方に対応でき、状況に応じて柔軟にスタイルを切り替えます。適応力が高いです。';
    } else {
      // 個人作業型
      return '独立して深く考え、集中できる環境で最大の成果を発揮します。自律的に業務を進めることが得意です。';
    }
  }

  /**
   * 第3文: 役割貢献メッセージ
   */
  private buildRoleContributionMessage(primaryRole: string, topStrengths: string[]): string {
    // 役割キーワードに基づいた貢献内容マッピング
    const roleContributions: Record<string, string> = {
      '戦略的思考のエキスパート': '複雑な問題の本質を見抜き、長期的な解決策を提示します',
      '計画実行のスペシャリスト': '綿密な計画を立て、着実に目標を達成します',
      '戦略的リーダー': 'チームを牽引し、戦略的な方向性を示します',
      '分析型ファシリテーター': 'データに基づき、チームの意思決定をサポートします',
      'ビジョン構築者': '理想的な未来像を描き、チームに方向性を示します',
      '理想実現の推進者': '価値を重視し、目標に向けて着実に推進します',
      '人を導くリーダー': '人々を理解し、共感を通じてチームを導きます',
      '共感型サポーター': 'メンバーの感情を理解し、チームの一体感を高めます',
      '組織設計者': '効率的な仕組みを作り、組織を最適化します',
      '確実な実行者': '責任を持って確実に業務を遂行します',
      '規律あるリーダー': '秩序を保ち、規律正しくチームを率います',
      'チームの要': 'メンバーをつなぎ、チームの調和を保ちます',
      '柔軟な戦略家': '状況に応じて柔軟に戦略を調整します',
      '即応の実行者': '迅速に行動し、その場で最適な判断を下します',
      'アクションリーダー': '率先して行動し、チームを活性化します',
      '現場調整役': '現場の状況を把握し、柔軟に対応します',
    };

    const contribution = roleContributions[primaryRole] || 'チームに価値を提供します';
    return `${primaryRole}として、${contribution}。`;
  }

  /**
   * 第4文: リーダーシップメッセージ
   */
  private buildLeadershipMessage(leadershipPotential: number, topStrengths: string[]): string {
    if (leadershipPotential >= PROFILE_SUMMARY_THRESHOLDS.LEADERSHIP.LEADER) {
      // リーダー型
      return 'チームを牽引し、明確な方向性を示すリーダーシップを発揮します。意思決定と推進力が強みです。';
    } else if (leadershipPotential >= PROFILE_SUMMARY_THRESHOLDS.LEADERSHIP.BALANCED) {
      // バランス型
      return '必要に応じてリーダーシップを発揮し、専門性でチームを導くことができます。状況に応じて柔軟に役割を調整します。';
    } else {
      // 専門家型
      return '専門性を深め、特定分野のエキスパートとして価値を提供します。深い知識と洞察でチームに貢献します。';
    }
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
   * スコアに基づく動的なメッセージ生成
   */
  private buildStrengthsOnlyProfileSummary(
    topStrengths: string[],
    teamFitScore: number,
    leadershipPotential: number
  ): string[] {
    const messages: string[] = [];

    // 第1文: TOP3資質の紹介
    messages.push(
      `「${topStrengths[0]}」「${topStrengths[1]}」「${topStrengths[2]}」を中心とした資質を持つプロフェッショナルです。`
    );

    // 第2文: チームスタイル（teamFitScoreベース）
    if (teamFitScore >= 70) {
      messages.push('チームワークを重視し、他者と協力して成果を上げることが得意です。');
    } else if (teamFitScore >= 50) {
      messages.push('チームワークと個人作業の両方に対応できる柔軟性を持っています。');
    } else {
      messages.push('独立して業務を進めることが得意で、集中力を発揮します。');
    }

    // 第3文: 役割期待（leadershipPotentialベース）
    if (leadershipPotential >= 70) {
      messages.push('リーダーシップを発揮し、チームを牽引する役割が期待できます。');
    } else if (leadershipPotential >= 50) {
      messages.push('状況に応じてリーダーシップとサポートを使い分けることができます。');
    } else {
      messages.push('専門性を活かし、深い知識やスキルで貢献することが得意です。');
    }

    return messages;
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

    // リーダーシップ資質の優先判定
    if (hasLeadership && hasExecution) return 'リーダー・推進者';
    if (hasLeadership) return 'リーダー・推進者';

    if (hasAnalytical && hasExecution) return '戦略家・実行者';
    if (hasTeam && hasExecution) return 'チームプレイヤー';
    if (hasAnalytical) return 'アナリスト・思考家';
    if (hasExecution) return '実行者・達成者';

    return '多才なプロフェッショナル';
  }

  /**
   * MBTI × 資質から統合的な役割を推定
   *
   * @param mbtiType MBTIタイプ
   * @param strengths TOP5資質
   * @returns 統合的な役割
   */
  private inferRoleFromMBTIAndStrengths(
    mbtiType: MBTIType,
    strengths: Member['strengths']
  ): string {
    if (!strengths || strengths.length === 0) {
      // 資質がない場合はMBTIプロファイルの役割を返す
      const profile = this.profiles.get(mbtiType);
      return profile ? profile.teamDynamics.naturalRole : '不明';
    }

    // MBTIグループを判定
    const mbtiGroup = this.classifyMBTIGroup(mbtiType);

    // 資質プロファイルを分析
    const strengthProfile = this.analyzeStrengthProfile(strengths);

    // マトリクスから役割を選択
    return this.selectRoleFromMatrix(mbtiGroup, strengthProfile);
  }

  /**
   * MBTIタイプを4つのグループに分類
   *
   * @param mbtiType MBTIタイプ
   * @returns MBTIグループ名
   */
  private classifyMBTIGroup(mbtiType: MBTIType): string {
    const hasN = mbtiType.charAt(1) === 'N';
    const hasS = mbtiType.charAt(1) === 'S';
    const hasT = mbtiType.charAt(2) === 'T';
    const hasF = mbtiType.charAt(2) === 'F';
    const hasJ = mbtiType.charAt(3) === 'J';
    const hasP = mbtiType.charAt(3) === 'P';

    // 分析家グループ (NT): INTJ, INTP, ENTJ, ENTP
    if (hasN && hasT) return 'NT';

    // 外交官グループ (NF): INFJ, INFP, ENFJ, ENFP
    if (hasN && hasF) return 'NF';

    // 番人グループ (SJ): ISTJ, ISFJ, ESTJ, ESFJ
    if (hasS && hasJ) return 'SJ';

    // 探検家グループ (SP): ISTP, ISFP, ESTP, ESFP
    if (hasS && hasP) return 'SP';

    return 'UNKNOWN';
  }

  /**
   * TOP5資質の傾向を分析
   *
   * @param strengths TOP5資質
   * @returns 最も強い資質グループ
   */
  private analyzeStrengthProfile(strengths: Member['strengths']): string {
    if (!strengths || strengths.length === 0) return 'NONE';

    const topIds = strengths.slice(0, 5).map(s => s.id);

    // 各グループの資質数をカウント
    const analyticalCount = topIds.filter(id => ANALYTICAL_STRENGTHS.includes(id)).length;
    const executionCount = topIds.filter(id => EXECUTION_STRENGTHS.includes(id)).length;
    const leadershipCount = topIds.filter(id => LEADERSHIP_STRENGTHS.includes(id)).length;
    const teamCount = topIds.filter(id => TEAM_ORIENTED_STRENGTHS.includes(id)).length;

    // 最も多いグループを特定
    const maxCount = Math.max(analyticalCount, executionCount, leadershipCount, teamCount);

    if (maxCount === 0) return 'MIXED';

    // 同率の場合は優先順位: リーダーシップ > 戦略的思考 > 実行力 > 人間関係
    if (leadershipCount === maxCount) return 'LEADERSHIP';
    if (analyticalCount === maxCount) return 'ANALYTICAL';
    if (executionCount === maxCount) return 'EXECUTION';
    if (teamCount === maxCount) return 'RELATIONSHIP';

    return 'MIXED';
  }

  /**
   * MBTIグループ × 資質プロファイルのマトリクスから役割を選択
   *
   * @param mbtiGroup MBTIグループ (NT/NF/SJ/SP)
   * @param strengthProfile 資質プロファイル
   * @returns 統合的な役割
   */
  private selectRoleFromMatrix(mbtiGroup: string, strengthProfile: string): string {
    // 役割マトリクス
    const roleMatrix: Record<string, Record<string, string>> = {
      NT: {
        ANALYTICAL: '戦略的思考のエキスパート',
        EXECUTION: '計画実行のスペシャリスト',
        LEADERSHIP: '戦略的リーダー',
        RELATIONSHIP: '分析型ファシリテーター',
        MIXED: '戦略家・設計者',
      },
      NF: {
        ANALYTICAL: 'ビジョン構築者',
        EXECUTION: '理想実現の推進者',
        LEADERSHIP: '人を導くリーダー',
        RELATIONSHIP: '共感型サポーター',
        MIXED: 'アイデアマン・モチベーター',
      },
      SJ: {
        ANALYTICAL: '組織設計者',
        EXECUTION: '確実な実行者',
        LEADERSHIP: '規律あるリーダー',
        RELATIONSHIP: 'チームの要',
        MIXED: '管理者・実行者',
      },
      SP: {
        ANALYTICAL: '柔軟な戦略家',
        EXECUTION: '即応の実行者',
        LEADERSHIP: 'アクションリーダー',
        RELATIONSHIP: '現場調整役',
        MIXED: '実践者・問題解決者',
      },
    };

    return roleMatrix[mbtiGroup]?.[strengthProfile] || '多才なプロフェッショナル';
  }

  /**
   * 役割の詳細説明を取得（公開メソッド）
   *
   * @param role 役割名
   * @returns 役割の詳細説明（見つからない場合は空文字列）
   */
  static getRoleDescription(role: string): string {
    const roleDescriptions: Record<string, string> = {
      // NT系
      '戦略的思考のエキスパート': 'MBTI(NT型)×分析資質の組み合わせ。論理的思考と戦略設計で、複雑な問題の本質を見抜きます。',
      '計画実行のスペシャリスト': 'MBTI(NT型)×実行資質の組み合わせ。緻密な計画を設計し、論理的に目標達成を推進します。',
      '戦略的リーダー': 'MBTI(NT型)×リーダーシップ資質の組み合わせ。理性と戦略でチームを牽引します。',
      '分析型ファシリテーター': 'MBTI(NT型)×人間関係資質の組み合わせ。データと対話でチームの意思決定を支援します。',
      '戦略家・設計者': 'MBTI(NT型)の特性。論理的思考で複雑な問題を解決し、革新的なアイデアを生み出します。',

      // NF系
      'ビジョン構築者': 'MBTI(NF型)×分析資質の組み合わせ。理想と洞察力で未来像を描き、人々に方向性を示します。',
      '理想実現の推進者': 'MBTI(NF型)×実行資質の組み合わせ。価値観を軸に目標達成を推進し、理想を現実にします。',
      '人を導くリーダー': 'MBTI(NF型)×リーダーシップ資質の組み合わせ。共感力でメンバーを理解し、チームを導きます。',
      '共感型サポーター': 'MBTI(NF型)×人間関係資質の組み合わせ。人の感情に寄り添い、チームの一体感を高めます。',
      'アイデアマン・モチベーター': 'MBTI(NF型)の特性。創造性と情熱で新しい可能性を見出し、人々を鼓舞します。',

      // SJ系
      '組織設計者': 'MBTI(SJ型)×分析資質の組み合わせ。秩序と効率を重視し、組織を最適化します。',
      '確実な実行者': 'MBTI(SJ型)×実行資質の組み合わせ。責任感を持って計画を確実に遂行します。',
      '規律あるリーダー': 'MBTI(SJ型)×リーダーシップ資質の組み合わせ。秩序を保ち、規律正しくチームを率います。',
      'チームの要': 'MBTI(SJ型)×人間関係資質の組み合わせ。調和を大切にし、チームの結束を支えます。',
      '管理者・実行者': 'MBTI(SJ型)の特性。秩序と伝統を重視し、着実に組織を支えます。',

      // SP系
      '柔軟な戦略家': 'MBTI(SP型)×分析資質の組み合わせ。状況を素早く分析し、柔軟に戦略を調整します。',
      '即応の実行者': 'MBTI(SP型)×実行資質の組み合わせ。機敏に行動し、現場で最適な判断を下します。',
      'アクションリーダー': 'MBTI(SP型)×リーダーシップ資質の組み合わせ。率先して行動し、チームを活性化します。',
      '現場調整役': 'MBTI(SP型)×人間関係資質の組み合わせ。現場の空気を読み、柔軟に対応します。',
      '実践者・問題解決者': 'MBTI(SP型)の特性。実践的なアプローチで、現実的な問題を即座に解決します。',

      // その他
      '多才なプロフェッショナル': '多様な強みを持ち、状況に応じて柔軟に対応できます。',
    };

    return roleDescriptions[role] || '';
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
  private loadProfiles(): void {
    // 開発用: サンプルプロファイルを設定
    this.loadSampleProfiles();
    this.initialized = true;
  }

  /**
   * MBTIプロファイルを読み込み
   *
   * @description
   * 現在6タイプ実装済み（INTJ, ENFP, ENTJ, INFJ, ENFJ, INTP）
   * 残り10タイプは Phase 3 で実装予定
   */
  private loadSampleProfiles(): void {
    // ========================================
    // INTJ: 建築家
    // ========================================
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

    // 登録
    this.profiles.set('INTJ', intj);

    // ========================================
    // ENFP: 運動家
    // ========================================
    const enfp: MBTIProfile = {
      type: 'ENFP',
      name: '運動家',
      description: '情熱的で創造的な自由人。常に明るい面を見出す力を持つ',
      characteristics: {
        strengths: ['創造性', '熱意', '好奇心', '柔軟性', '共感力'],
        weaknesses: ['集中力の欠如', '過度の楽観主義', '計画性の欠如', 'ストレス耐性'],
        workStyle: '創造的で柔軟なアプローチを好み、新しい可能性を追求',
        communicationStyle: '熱心で表現豊か、アイデアを共有することを楽しむ',
        learningStyle: '体験を通じて学び、複数のテーマを同時に探求',
        decisionMaking: '直感と価値観に基づき、可能性を重視して判断',
      },
      motivation: {
        motivators: ['新しい経験', '創造的な自由', '人とのつながり', '可能性の追求'],
        demotivators: ['単調な作業', '厳格なルール', '孤立', '創造性の制限'],
        stressors: ['反復作業', '厳しい締め切り', '批判', '自由の制限'],
        stressRelief: ['人との交流', '新しい活動', '創造的な表現'],
      },
      teamDynamics: {
        naturalRole: 'アイデアマン・モチベーター',
        bestEnvironment: '自由で創造的な環境、多様性のある職場',
        idealTeamSize: '中〜大規模チーム（5-10人）',
        conflictStyle: '対話を通じて理解を深め、ポジティブな解決を目指す',
      },
      strengthsSynergy: {
        highSynergy: [2, 8, 16, 23, 30, 31],      // 活発性、コミュニケーション、着想、ポジティブ、社交性、未来志向
        moderateSynergy: [3, 10, 14, 21, 32],     // 適応性、運命思考、共感性、学習欲、成長促進
        lowSynergy: [4, 13, 20, 33, 34],          // 分析思考、慎重さ、内省、規律性、目標志向
      },
      mbtiCompatibility: {
        naturalPartners: ['INTJ', 'INFJ'],
        complementary: ['ENTP', 'ENFJ', 'INFP'],
        challenging: ['ISTJ', 'ESTJ', 'ISTP'],
      },
      careerPaths: {
        idealFields: ['マーケティング', 'クリエイティブ', '人事', 'コンサルティング'],
        roleExamples: ['クリエイティブディレクター', 'イベントプランナー', 'カウンセラー'],
        developmentAreas: ['計画性', '集中力', '現実的な判断'],
      },
    };

    // ========================================
    // ENTJ: 指揮官
    // ========================================
    const entj: MBTIProfile = {
      type: 'ENTJ',
      name: '指揮官',
      description: '大胆で想像力豊か、強い意志を持つリーダー。常に道を見つけるか、作り出す',
      characteristics: {
        strengths: ['リーダーシップ', '戦略的思考', '決断力', '効率性', '自信'],
        weaknesses: ['支配的', '感情面の軽視', 'せっかち', '頑固'],
        workStyle: '目標志向で効率的、チームを率いて成果を出すことを重視',
        communicationStyle: '直接的で明確、ビジョンを示してチームを動かす',
        learningStyle: '実践を通じて学び、リーダーシップを発揮しながら成長',
        decisionMaking: '論理と戦略に基づき、迅速かつ大胆に判断',
      },
      motivation: {
        motivators: ['目標達成', '権限と責任', '挑戦', 'チームの成功'],
        demotivators: ['非効率', '優柔不断', '停滞', '権限の制限'],
        stressors: ['コントロール喪失', '非効率的なプロセス', '感情的な議論'],
        stressRelief: ['目標設定', '戦略立案', '運動やアクティビティ'],
      },
      teamDynamics: {
        naturalRole: 'リーダー・指揮官',
        bestEnvironment: '挑戦的で成果重視の環境、権限のある職場',
        idealTeamSize: '中〜大規模チーム（5-15人）',
        conflictStyle: '直接的に対処し、論理的な解決策を推進',
      },
      strengthsSynergy: {
        highSynergy: [1, 5, 7, 22, 27, 28, 29, 34], // 達成欲、アレンジ、指令性、最上志向、自己確信、自我、戦略性、目標志向
        moderateSynergy: [2, 8, 9, 21, 31],          // 活発性、コミュニケーション、競争性、学習欲、未来志向
        lowSynergy: [3, 13, 14, 15, 24],             // 適応性、慎重さ、共感性、調和性、親密性
      },
      mbtiCompatibility: {
        naturalPartners: ['INTP', 'INFP'],
        complementary: ['INTJ', 'ENTP', 'ENFP'],
        challenging: ['ISFP', 'ISFJ', 'ESFP'],
      },
      careerPaths: {
        idealFields: ['経営', '戦略立案', 'コンサルティング', 'プロジェクト管理'],
        roleExamples: ['CEO', 'プロジェクトマネージャー', 'ストラテジスト'],
        developmentAreas: ['共感力', '忍耐力', '感情面の理解'],
      },
    };

    // ========================================
    // INFJ: 提唱者
    // ========================================
    const infj: MBTIProfile = {
      type: 'INFJ',
      name: '提唱者',
      description: '静かで神秘的だが、非常に理想主義的で人を励ます',
      characteristics: {
        strengths: ['洞察力', '理想主義', '共感力', '誠実さ', '創造性'],
        weaknesses: ['完璧主義', '燃え尽き', '過度の理想主義', '批判への敏感さ'],
        workStyle: '意味と目的を重視し、人々の成長を支援することに情熱を注ぐ',
        communicationStyle: '深く思慮深く、一対一での対話を好む',
        learningStyle: '独自の視点で深く理解し、理論と実践を統合',
        decisionMaking: '価値観と直感に基づき、長期的な影響を考慮して判断',
      },
      motivation: {
        motivators: ['意味のある仕事', '人の成長支援', '理想の実現', '深いつながり'],
        demotivators: ['表面的な関係', '価値観の対立', '不誠実さ', '無意味な作業'],
        stressors: ['対立', '批判', '価値観の侵害', '過度の刺激'],
        stressRelief: ['一人の時間', '創造的な活動', '自然との触れ合い'],
      },
      teamDynamics: {
        naturalRole: 'カウンセラー・インスピレーター',
        bestEnvironment: '静かで協力的な環境、価値観を共有できる職場',
        idealTeamSize: '小〜中規模チーム（3-7人）',
        conflictStyle: '調和を重視し、深い理解を通じて解決を目指す',
      },
      strengthsSynergy: {
        highSynergy: [6, 10, 14, 18, 20, 24, 32],  // 信念、運命思考、共感性、個別化、内省、親密性、成長促進
        moderateSynergy: [4, 12, 16, 21, 31],      // 分析思考、原点思考、着想、学習欲、未来志向
        lowSynergy: [2, 7, 9, 27, 30],             // 活発性、指令性、競争性、自己確信、社交性
      },
      mbtiCompatibility: {
        naturalPartners: ['ENTP', 'ENFP'],
        complementary: ['INTJ', 'INFP', 'ENFJ'],
        challenging: ['ESTP', 'ESFP', 'ISTP'],
      },
      careerPaths: {
        idealFields: ['カウンセリング', '教育', '人事', '非営利組織'],
        roleExamples: ['カウンセラー', 'コーチ', 'ライター', 'HRスペシャリスト'],
        developmentAreas: ['現実的な判断', '自己主張', 'ストレス管理'],
      },
    };

    // ========================================
    // ENFJ: 主人公
    // ========================================
    const enfj: MBTIProfile = {
      type: 'ENFJ',
      name: '主人公',
      description: 'カリスマ性があり、人を励ますリーダー。聴衆を魅了する',
      characteristics: {
        strengths: ['カリスマ性', 'リーダーシップ', '共感力', '説得力', '組織力'],
        weaknesses: ['過度の理想主義', '批判への敏感さ', '自己犠牲', '決断の難しさ'],
        workStyle: '人々を導き励まし、チームの調和と成長を重視',
        communicationStyle: '表現豊かで説得力があり、人を動かす力を持つ',
        learningStyle: '協働を通じて学び、他者との対話で理解を深める',
        decisionMaking: '人々への影響を考慮し、価値観に基づいて判断',
      },
      motivation: {
        motivators: ['人の成長', 'チームの成功', '社会貢献', '調和と協力'],
        demotivators: ['対立', '孤立', '価値観の対立', '人の不幸'],
        stressors: ['批判', '調和の乱れ', '期待に応えられない状況'],
        stressRelief: ['人との対話', '社会活動', '創造的な表現'],
      },
      teamDynamics: {
        naturalRole: 'チームリーダー・メンター',
        bestEnvironment: '協力的で人間関係重視の環境、価値観を共有できる職場',
        idealTeamSize: '中〜大規模チーム（5-12人）',
        conflictStyle: '積極的に対話し、調和を回復することを優先',
      },
      strengthsSynergy: {
        highSynergy: [2, 8, 11, 14, 15, 17, 25, 32], // 活発性、コミュニケーション、公平性、共感性、調和性、包含、責任感、成長促進
        moderateSynergy: [5, 6, 18, 22, 23, 30],     // アレンジ、信念、個別化、最上志向、ポジティブ、社交性
        lowSynergy: [4, 7, 9, 13, 20],               // 分析思考、指令性、競争性、慎重さ、内省
      },
      mbtiCompatibility: {
        naturalPartners: ['INFP', 'ISFP'],
        complementary: ['ENFP', 'INFJ', 'ENTP'],
        challenging: ['ISTP', 'INTP', 'ESTP'],
      },
      careerPaths: {
        idealFields: ['教育', '人事', 'コーチング', '非営利組織'],
        roleExamples: ['教師', 'HRマネージャー', 'イベントオーガナイザー'],
        developmentAreas: ['自己ケア', '批判への対処', '現実的な判断'],
      },
    };

    // ========================================
    // INTP: 論理学者
    // ========================================
    const intp: MBTIProfile = {
      type: 'INTP',
      name: '論理学者',
      description: '革新的な発明家。知識への飽くなき探求心を持つ',
      characteristics: {
        strengths: ['論理的思考', '創造性', '客観性', '独立性', '知的好奇心'],
        weaknesses: ['実用性の欠如', '社交の苦手', '完璧主義', '感情面の軽視'],
        workStyle: '理論的で分析的、独自のアプローチで問題を解決',
        communicationStyle: '論理的で簡潔、アイデアの議論を楽しむ',
        learningStyle: '独学で深く探求し、理論と概念を追求',
        decisionMaking: '論理と分析に基づき、多角的に検討して判断',
      },
      motivation: {
        motivators: ['知的挑戦', '自律性', '理論の探求', '独創性'],
        demotivators: ['単調な作業', '感情的な議論', '厳格なルール', '実用主義の強制'],
        stressors: ['感情的な対立', '非論理的な状況', '過度の社交', '細かい実務'],
        stressRelief: ['一人の時間', '理論的探求', '趣味の追求'],
      },
      teamDynamics: {
        naturalRole: '理論家・問題解決者',
        bestEnvironment: '静かで自由な環境、知的刺激のある職場',
        idealTeamSize: '小規模チーム（2-4人）',
        conflictStyle: '論理的に分析し、客観的な解決策を提示',
      },
      strengthsSynergy: {
        highSynergy: [4, 16, 19, 20, 21, 29],      // 分析思考、着想、収集心、内省、学習欲、戦略性
        moderateSynergy: [3, 12, 22, 26, 31],      // 適応性、原点思考、最上志向、回復志向、未来志向
        lowSynergy: [2, 7, 9, 15, 30],             // 活発性、指令性、競争性、調和性、社交性
      },
      mbtiCompatibility: {
        naturalPartners: ['ENTJ', 'ESTJ'],
        complementary: ['INTJ', 'ENTP', 'INFJ'],
        challenging: ['ESFJ', 'ESFP', 'ISFJ'],
      },
      careerPaths: {
        idealFields: ['研究開発', 'システム設計', '理論研究', '技術開発'],
        roleExamples: ['研究者', 'アーキテクト', 'データサイエンティスト'],
        developmentAreas: ['実用性', 'コミュニケーション', '感情表現'],
      },
    };

    // プロファイル登録（実装済み: 6タイプ / 全16タイプ）
    this.profiles.set('INTJ', intj);
    this.profiles.set('ENFP', enfp);
    this.profiles.set('ENTJ', entj);
    this.profiles.set('INFJ', infj);
    this.profiles.set('ENFJ', enfj);
    this.profiles.set('INTP', intp);

    // ========================================
    // ENTP: 討論者
    // ========================================
    const entp: MBTIProfile = {
      type: 'ENTP',
      name: '討論者',
      description: '知的好奇心旺盛で議論好き、頭の回転が速い',
      characteristics: {
        strengths: ['創造性', '論理的思考', '柔軟性', '討論能力', '問題解決力', '革新性'],
        weaknesses: ['一貫性', '細部への注意', '感情への配慮', '計画の実行'],
        workStyle: 'アイデアを生み出し、議論を通じて革新的な解決策を探求',
        communicationStyle: '挑戦的で刺激的、議論を楽しむ',
        learningStyle: '様々な可能性を探求し、理論を実験的に検証',
        decisionMaking: '論理と革新性を重視し、従来の枠を超える',
      },
      motivation: {
        motivators: ['知的挑戦', '革新', '議論と討論', '自由な発想', '多様な経験'],
        demotivators: ['単調さ', '厳格なルール', '細部への拘束', '感情的な圧力'],
        stressors: ['退屈', '制約', '感情的な対立', '非論理性'],
        stressRelief: ['刺激的な議論', '新しいプロジェクト', '社交活動'],
      },
      teamDynamics: {
        naturalRole: 'イノベーター・戦略家',
        bestEnvironment: '革新的で柔軟な環境、知的刺激がある職場',
        idealTeamSize: '中規模チーム（5-8人）',
        conflictStyle: '論理的に議論し、新しい視点を提示',
      },
      strengthsSynergy: {
        highSynergy: [2, 27, 31, 21, 29, 16, 32, 15],      // 活発性、分析思考、着想、適応性、学習欲、コミュニケーション、戦略性、自己確信
        moderateSynergy: [3, 4, 10, 11, 12, 13, 14, 23, 26, 28, 30, 33, 34, 1, 6, 17, 18, 22, 24],  // 回復志向、アレンジ、公平性、指令性、競争性、最上志向、自我、個別化、社交性、原点思考、収集心、未来志向、内省、達成欲、責任感、ポジティブ、包含、共感性、成長促進
        lowSynergy: [5, 7, 8, 9, 19, 20, 25],              // 慎重さ、信念、規律性、目標志向、親密性、調和性、運命思考
      },
      mbtiCompatibility: {
        naturalPartners: ['INFJ', 'INTJ'],
        complementary: ['INTP', 'ENFP', 'ENTJ'],
        challenging: ['ISFJ', 'ISTJ', 'ESFJ'],
      },
      careerPaths: {
        idealFields: ['起業', 'コンサルティング', 'マーケティング', '研究開発', 'ベンチャーキャピタル'],
        roleExamples: ['起業家', 'イノベーションコンサルタント', 'プロダクトマネージャー', '戦略アドバイザー'],
        developmentAreas: ['一貫性', '細部への注意', '感情への配慮'],
      },
    };

    this.profiles.set('ENTP', entp);

    // ========================================
    // INFP: 仲介者
    // ========================================
    const infp: MBTIProfile = {
      type: 'INFP',
      name: '仲介者',
      description: '理想主義的で、強い価値観と創造性を持つ',
      characteristics: {
        strengths: ['創造性', '共感力', '理想主義', '柔軟性', '価値観の明確さ', '深い洞察'],
        weaknesses: ['実行力', '批判への敏感さ', '現実的判断', '自己主張'],
        workStyle: '意義を重視し、価値観に沿った創造的な仕事を好む',
        communicationStyle: '思慮深く、個人的で真摯な表現',
        learningStyle: '意味とつながりを探求し、個人的な関連性を見出す',
        decisionMaking: '価値観と直感を最優先し、理想に基づく',
      },
      motivation: {
        motivators: ['意義のある仕事', '創造的表現', '価値観の実現', '他者への貢献', '真実性'],
        demotivators: ['価値観の対立', '批判', '表面的な作業', '厳格なルール'],
        stressors: ['対立', '批判', '価値観の侵害', '非人道的な環境'],
        stressRelief: ['創造的活動', '一人の時間', '自然との触れ合い'],
      },
      teamDynamics: {
        naturalRole: '仲介者・創造者',
        bestEnvironment: '協力的で価値観を重視する環境、柔軟な職場',
        idealTeamSize: '小規模チーム（3-5人）',
        conflictStyle: '共感と対話で理解を深め、価値観の一致を目指す',
      },
      strengthsSynergy: {
        highSynergy: [22, 31, 21, 7, 23, 24, 25, 34],      // 共感性、着想、適応性、信念、個別化、成長促進、運命思考、内省
        moderateSynergy: [16, 17, 18, 19, 20, 26, 28, 29, 30, 32, 33, 1, 3, 4, 5, 6, 10, 13, 14],  // コミュニケーション、ポジティブ、包含、親密性、調和性、社交性、原点思考、学習欲、収集心、戦略性、未来志向、達成欲、回復志向、アレンジ、慎重さ、責任感、公平性、最上志向、自我
        lowSynergy: [2, 8, 9, 11, 12, 15, 27],             // 活発性、規律性、目標志向、指令性、競争性、自己確信、分析思考
      },
      mbtiCompatibility: {
        naturalPartners: ['ENFJ', 'ENTJ'],
        complementary: ['INFJ', 'ENFP', 'INTP'],
        challenging: ['ESTJ', 'ESTP', 'ISTJ'],
      },
      careerPaths: {
        idealFields: ['クリエイティブライティング', 'カウンセリング', 'アート・デザイン', '非営利団体', '教育'],
        roleExamples: ['ライター', 'カウンセラー', 'デザイナー', 'ソーシャルワーカー', '芸術家'],
        developmentAreas: ['実行力', '現実的判断', '自己主張'],
      },
    };

    this.profiles.set('INFP', infp);

    // ========================================
    // ISTJ: 管理者
    // ========================================
    const istj: MBTIProfile = {
      type: 'ISTJ',
      name: '管理者',
      description: '実用的で事実重視、信頼できる責任感の持ち主',
      characteristics: {
        strengths: ['責任感', '正確性', '計画性', '忠実性', '実用性', '規律性'],
        weaknesses: ['柔軟性', '創造性', '感情表現', '変化への適応'],
        workStyle: '体系的で詳細志向、確立された方法を好む',
        communicationStyle: '明確で事実的、直接的',
        learningStyle: '実践的な経験と詳細な情報を通じて学ぶ',
        decisionMaking: '事実とデータに基づき、実績のある方法を選ぶ',
      },
      motivation: {
        motivators: ['責任の遂行', '秩序と構造', '具体的な成果', '伝統と安定', '正確性'],
        demotivators: ['混乱', '非効率', '変化への強制', '曖昧さ'],
        stressors: ['予期せぬ変更', '無秩序', '非効率', '責任の不履行'],
        stressRelief: ['ルーティン', '一人の時間', '実用的な活動'],
      },
      teamDynamics: {
        naturalRole: '管理者・実行者',
        bestEnvironment: '構造化され明確なルールがある環境、安定した職場',
        idealTeamSize: '小〜中規模チーム（3-7人）',
        conflictStyle: '事実に基づき、確立された手順で解決',
      },
      strengthsSynergy: {
        highSynergy: [6, 8, 9, 5, 10, 28, 1, 3],           // 責任感、規律性、目標志向、慎重さ、公平性、原点思考、達成欲、回復志向
        moderateSynergy: [4, 7, 13, 27, 29, 30, 32, 34, 11, 12, 14, 15, 16, 19, 20, 22, 23, 24, 26],  // アレンジ、信念、最上志向、分析思考、学習欲、収集心、戦略性、内省、指令性、競争性、自我、自己確信、コミュニケーション、親密性、調和性、共感性、個別化、成長促進、社交性
        lowSynergy: [2, 17, 18, 21, 25, 31, 33],           // 活発性、ポジティブ、包含、適応性、運命思考、着想、未来志向
      },
      mbtiCompatibility: {
        naturalPartners: ['ESTP', 'ESFP'],
        complementary: ['ESTJ', 'ISFJ', 'INTJ'],
        challenging: ['ENFP', 'ENTP', 'INFP'],
      },
      careerPaths: {
        idealFields: ['会計・監査', 'プロジェクト管理', '品質管理', '法務', '行政'],
        roleExamples: ['会計士', 'プロジェクトマネージャー', '監査役', '法務担当', '管理職'],
        developmentAreas: ['柔軟性', '創造性', '感情表現'],
      },
    };

    this.profiles.set('ISTJ', istj);

    // ========================================
    // ISFJ: 擁護者
    // ========================================
    const isfj: MBTIProfile = {
      type: 'ISFJ',
      name: '擁護者',
      description: '献身的で温かく、他者を守る保護者',
      characteristics: {
        strengths: ['献身性', '共感力', '責任感', '忠実性', '細やかな配慮', '実用性'],
        weaknesses: ['自己主張', '変化への抵抗', '批判への敏感さ', '過度の責任感'],
        workStyle: '協力的で支援的、詳細に注意を払う',
        communicationStyle: '温かく配慮深い、調和を重視',
        learningStyle: '実践的な経験と段階的な指導を通じて学ぶ',
        decisionMaking: '他者への影響を考慮し、実績のある方法を選ぶ',
      },
      motivation: {
        motivators: ['他者への貢献', '調和の維持', '責任の遂行', '感謝されること', '安定性'],
        demotivators: ['対立', '批判', '変化への強制', '不公平'],
        stressors: ['対立', '批判', '過度の責任', '価値観の侵害'],
        stressRelief: ['日常のルーティン', '奉仕活動', '親しい人との時間'],
      },
      teamDynamics: {
        naturalRole: 'サポーター・調整者',
        bestEnvironment: '協力的で安定した環境、感謝される職場',
        idealTeamSize: '小〜中規模チーム（3-7人）',
        conflictStyle: '調和を保ちながら、丁寧に問題を解決',
      },
      strengthsSynergy: {
        highSynergy: [6, 22, 20, 24, 10, 28, 19, 23],      // 責任感、共感性、調和性、成長促進、公平性、原点思考、親密性、個別化
        moderateSynergy: [3, 4, 5, 7, 8, 18, 25, 26, 1, 13, 16, 17, 27, 29, 30, 32, 34, 9, 14],  // 回復志向、アレンジ、慎重さ、信念、規律性、包含、運命思考、社交性、達成欲、最上志向、コミュニケーション、ポジティブ、分析思考、学習欲、収集心、戦略性、内省、目標志向、自我
        lowSynergy: [2, 11, 12, 15, 21, 31, 33],           // 活発性、指令性、競争性、自己確信、適応性、着想、未来志向
      },
      mbtiCompatibility: {
        naturalPartners: ['ESTP', 'ESFP'],
        complementary: ['ISTJ', 'ESFJ', 'INFJ'],
        challenging: ['ENTP', 'ENFP', 'INTP'],
      },
      careerPaths: {
        idealFields: ['医療・看護', '教育', '人事・総務', 'カスタマーサポート', '社会福祉'],
        roleExamples: ['看護師', '教師', '人事担当', 'カスタマーサービス', 'ソーシャルワーカー'],
        developmentAreas: ['自己主張', '変化への適応', '境界線設定'],
      },
    };

    this.profiles.set('ISFJ', isfj);

    // ========================================
    // ESTJ: 幹部
    // ========================================
    const estj: MBTIProfile = {
      type: 'ESTJ',
      name: '幹部',
      description: '優れた管理能力を持つ、秩序と伝統を重んじる指導者',
      characteristics: {
        strengths: ['組織力', '決断力', '責任感', '実用性', 'リーダーシップ', '効率性'],
        weaknesses: ['柔軟性', '共感力', '創造性', '批判への対応'],
        workStyle: '体系的で効率的、明確なルールと構造を重視',
        communicationStyle: '直接的で明確、指示的',
        learningStyle: '実践的な経験と確立された方法を通じて学ぶ',
        decisionMaking: '事実とデータに基づき、効率を重視して決断',
      },
      motivation: {
        motivators: ['秩序の維持', '目標達成', 'リーダーシップ発揮', '効率化', '実績の構築'],
        demotivators: ['混乱', '非効率', '曖昧さ', '変化への抵抗'],
        stressors: ['無秩序', '非効率', '責任の不履行', 'ルール違反'],
        stressRelief: ['運動', '組織化', '実用的な活動'],
      },
      teamDynamics: {
        naturalRole: '管理者・組織者',
        bestEnvironment: '構造化され効率的な環境、明確な職場',
        idealTeamSize: '中〜大規模チーム（5-15人）',
        conflictStyle: '直接対処し、ルールと事実に基づいて解決',
      },
      strengthsSynergy: {
        highSynergy: [1, 6, 8, 9, 10, 11, 27, 28],         // 達成欲、責任感、規律性、目標志向、公平性、指令性、分析思考、原点思考
        moderateSynergy: [3, 4, 5, 7, 12, 13, 14, 15, 16, 26, 29, 30, 32, 2, 17, 19, 20, 23, 34],  // 回復志向、アレンジ、慎重さ、信念、競争性、最上志向、自我、自己確信、コミュニケーション、社交性、学習欲、収集心、戦略性、活発性、ポジティブ、親密性、調和性、個別化、内省
        lowSynergy: [18, 21, 22, 24, 25, 31, 33],          // 包含、適応性、共感性、成長促進、運命思考、着想、未来志向
      },
      mbtiCompatibility: {
        naturalPartners: ['INTP', 'ISTP'],
        complementary: ['ISTJ', 'ENTJ', 'ESFJ'],
        challenging: ['INFP', 'ENFP', 'ISFP'],
      },
      careerPaths: {
        idealFields: ['経営管理', 'プロジェクトマネジメント', '製造・運用管理', '軍事・警察', '行政'],
        roleExamples: ['管理職', 'プロジェクトマネージャー', 'オペレーションマネージャー', '経営者'],
        developmentAreas: ['柔軟性', '共感力', '創造性'],
      },
    };

    this.profiles.set('ESTJ', estj);

    // ========================================
    // ESFJ: 領事官
    // ========================================
    const esfj: MBTIProfile = {
      type: 'ESFJ',
      name: '領事官',
      description: '思いやりがあり社交的、調和を大切にする世話好き',
      characteristics: {
        strengths: ['共感力', '協調性', '責任感', '組織力', 'コミュニケーション能力', '献身性'],
        weaknesses: ['批判への敏感さ', '変化への抵抗', '過度の心配', '自己主張'],
        workStyle: '協力的で支援的、調和を重視する',
        communicationStyle: '温かく励ましに満ち、人間関係を大切にする',
        learningStyle: '実践的な経験と協力を通じて学ぶ',
        decisionMaking: '他者への影響と調和を考慮し、実績ある方法を選ぶ',
      },
      motivation: {
        motivators: ['他者への貢献', '調和の維持', '感謝されること', '社会的つながり', '伝統の尊重'],
        demotivators: ['対立', '批判', '孤立', '不公平'],
        stressors: ['批判', '対立', '調和の崩壊', '感謝されないこと'],
        stressRelief: ['人との交流', '奉仕活動', '伝統的な活動'],
      },
      teamDynamics: {
        naturalRole: '調整者・サポーター',
        bestEnvironment: '協力的で調和的な環境、人を重視する職場',
        idealTeamSize: '中〜大規模チーム（5-15人）',
        conflictStyle: '調和を保ちながら、全員の意見を尊重して解決',
      },
      strengthsSynergy: {
        highSynergy: [22, 20, 6, 16, 17, 18, 24, 26],      // 共感性、調和性、責任感、コミュニケーション、ポジティブ、包含、成長促進、社交性
        moderateSynergy: [3, 4, 5, 7, 8, 10, 19, 23, 25, 28, 1, 2, 14, 15, 27, 29, 30, 32, 9],  // 回復志向、アレンジ、慎重さ、信念、規律性、公平性、親密性、個別化、運命思考、原点思考、達成欲、活発性、自我、自己確信、分析思考、学習欲、収集心、戦略性、目標志向
        lowSynergy: [11, 12, 13, 21, 31, 33, 34],          // 指令性、競争性、最上志向、適応性、着想、未来志向、内省
      },
      mbtiCompatibility: {
        naturalPartners: ['ISFP', 'ISTP'],
        complementary: ['ISFJ', 'ESTJ', 'ENFJ'],
        challenging: ['INTP', 'ENTP', 'INTJ'],
      },
      careerPaths: {
        idealFields: ['人事・総務', '教育', '医療・看護', 'カスタマーサービス', 'イベント企画'],
        roleExamples: ['人事担当', '教師', '看護師', 'イベントプランナー', 'カスタマーサポート'],
        developmentAreas: ['自己主張', '変化への適応', '批判への対処'],
      },
    };

    this.profiles.set('ESFJ', esfj);

    // ========================================
    // ISTP: 巨匠
    // ========================================
    const istp: MBTIProfile = {
      type: 'ISTP',
      name: '巨匠',
      description: '大胆で実践的、手を動かして探求する職人',
      characteristics: {
        strengths: ['問題解決力', '実用性', '柔軟性', '冷静さ', '技術力', '独立性'],
        weaknesses: ['長期計画', '感情表現', 'ルールへの従順', 'コミットメント'],
        workStyle: '実践的で柔軟、問題が起きたときに即座に対応',
        communicationStyle: '簡潔で事実的、必要最小限',
        learningStyle: '実際に手を動かし、試行錯誤しながら学ぶ',
        decisionMaking: '論理と実用性に基づき、即座に判断',
      },
      motivation: {
        motivators: ['実践的な問題解決', '自由と自律性', '新しい技術', '即座の成果', '挑戦'],
        demotivators: ['厳格なルール', '感情的な議論', '長期計画の強制', '退屈な作業'],
        stressors: ['制約', '感情的な圧力', '長期コミットメント', '非効率'],
        stressRelief: ['実践的な活動', 'スポーツ', '一人の時間'],
      },
      teamDynamics: {
        naturalRole: '問題解決者・技術専門家',
        bestEnvironment: '柔軟で実践的な環境、自律性がある職場',
        idealTeamSize: '小規模チーム（2-5人）',
        conflictStyle: '冷静に分析し、実用的な解決策を提示',
      },
      strengthsSynergy: {
        highSynergy: [27, 3, 21, 5, 4, 34, 15],            // 分析思考、回復志向、適応性、慎重さ、アレンジ、内省、自己確信
        moderateSynergy: [1, 6, 9, 11, 12, 13, 14, 16, 29, 30, 31, 32, 28, 10, 19, 20, 23, 26, 2, 33],  // 達成欲、責任感、目標志向、指令性、競争性、最上志向、自我、コミュニケーション、学習欲、収集心、着想、戦略性、原点思考、公平性、親密性、調和性、個別化、社交性、活発性、未来志向
        lowSynergy: [7, 8, 17, 18, 22, 24, 25],            // 信念、規律性、ポジティブ、包含、共感性、成長促進、運命思考
      },
      mbtiCompatibility: {
        naturalPartners: ['ESFJ', 'ESTJ'],
        complementary: ['ESTP', 'ISTJ', 'INTJ'],
        challenging: ['ENFJ', 'INFJ', 'ENFP'],
      },
      careerPaths: {
        idealFields: ['エンジニアリング', '技術開発', 'メカニック', '救急・危機管理', 'スポーツ'],
        roleExamples: ['エンジニア', 'パイロット', 'メカニック', '救急隊員', 'アスリート'],
        developmentAreas: ['長期計画', '感情表現', 'コミットメント'],
      },
    };

    this.profiles.set('ISTP', istp);

    // ========================================
    // ISFP: 冒険家
    // ========================================
    const isfp: MBTIProfile = {
      type: 'ISFP',
      name: '冒険家',
      description: '柔軟で魅力的、芸術的センスを持つ自由な魂',
      characteristics: {
        strengths: ['創造性', '柔軟性', '共感力', '美的センス', '調和性', '実践性'],
        weaknesses: ['長期計画', '自己主張', '批判への敏感さ', '構造への抵抗'],
        workStyle: '柔軟で実践的、美的センスと調和を重視',
        communicationStyle: '控えめで温かい、行動で示す',
        learningStyle: '実践的な経験と感覚を通じて学ぶ',
        decisionMaking: '価値観と現在の状況を重視し、柔軟に判断',
      },
      motivation: {
        motivators: ['創造的表現', '美的経験', '自由と柔軟性', '調和', '個人的なつながり'],
        demotivators: ['対立', '批判', '厳格なルール', '長期計画の強制'],
        stressors: ['批判', '対立', '制約', '価値観の侵害'],
        stressRelief: ['芸術的活動', '自然との触れ合い', '静かな時間'],
      },
      teamDynamics: {
        naturalRole: '創造者・調和促進者',
        bestEnvironment: '柔軟で美的な環境、調和を重視する職場',
        idealTeamSize: '小規模チーム（2-5人）',
        conflictStyle: '調和を保ちながら、柔軟に対応',
      },
      strengthsSynergy: {
        highSynergy: [22, 21, 20, 23, 31, 7, 19, 25],      // 共感性、適応性、調和性、個別化、着想、信念、親密性、運命思考
        moderateSynergy: [3, 4, 16, 17, 18, 24, 26, 28, 29, 30, 32, 34, 1, 5, 6, 10, 13, 14, 33],  // 回復志向、アレンジ、コミュニケーション、ポジティブ、包含、成長促進、社交性、原点思考、学習欲、収集心、戦略性、内省、達成欲、慎重さ、責任感、公平性、最上志向、自我、未来志向
        lowSynergy: [2, 8, 9, 11, 12, 15, 27],             // 活発性、規律性、目標志向、指令性、競争性、自己確信、分析思考
      },
      mbtiCompatibility: {
        naturalPartners: ['ESFJ', 'ENFJ'],
        complementary: ['ESFP', 'INFP', 'ISFJ'],
        challenging: ['ENTJ', 'ESTJ', 'INTJ'],
      },
      careerPaths: {
        idealFields: ['アート・デザイン', '音楽', '写真・映像', 'セラピー', '美容・ファッション'],
        roleExamples: ['アーティスト', 'デザイナー', 'ミュージシャン', 'セラピスト', 'スタイリスト'],
        developmentAreas: ['長期計画', '自己主張', '批判への対処'],
      },
    };

    this.profiles.set('ISFP', isfp);

    // ========================================
    // ESTP: 起業家
    // ========================================
    const estp: MBTIProfile = {
      type: 'ESTP',
      name: '起業家',
      description: 'エネルギッシュで行動的、リスクを恐れない挑戦者',
      characteristics: {
        strengths: ['行動力', '適応力', '問題解決力', '現実的思考', 'リスクテイク', '社交性'],
        weaknesses: ['長期計画', '忍耐力', '感情への配慮', 'ルールへの従順'],
        workStyle: '行動志向で柔軟、即座に対応する',
        communicationStyle: '率直で説得力があり、エネルギッシュ',
        learningStyle: '実践と経験を通じて、即座に学ぶ',
        decisionMaking: '現在の事実と論理に基づき、迅速に判断',
      },
      motivation: {
        motivators: ['行動と結果', '刺激と挑戦', '自由と柔軟性', '即座の成果', '競争'],
        demotivators: ['退屈', '厳格なルール', '理論的な議論', '長期計画'],
        stressors: ['退屈', '制約', '長期コミットメント', '感情的な複雑さ'],
        stressRelief: ['身体活動', '社交', '新しい経験'],
      },
      teamDynamics: {
        naturalRole: 'アクションリーダー・実行者',
        bestEnvironment: '活動的で柔軟な環境、即座の成果がある職場',
        idealTeamSize: '中規模チーム（5-10人）',
        conflictStyle: '直接対決し、実用的に解決',
      },
      strengthsSynergy: {
        highSynergy: [2, 21, 3, 12, 15, 27, 11, 26],       // 活発性、適応性、回復志向、競争性、自己確信、分析思考、指令性、社交性
        moderateSynergy: [1, 4, 5, 9, 10, 13, 14, 16, 17, 23, 28, 29, 30, 32, 6, 18, 19, 20, 31],  // 達成欲、アレンジ、慎重さ、目標志向、公平性、最上志向、自我、コミュニケーション、ポジティブ、個別化、原点思考、学習欲、収集心、戦略性、責任感、包含、親密性、調和性、着想
        lowSynergy: [7, 8, 22, 24, 25, 33, 34],            // 信念、規律性、共感性、成長促進、運命思考、未来志向、内省
      },
      mbtiCompatibility: {
        naturalPartners: ['ISFJ', 'ISTJ'],
        complementary: ['ISTP', 'ESFP', 'ESTJ'],
        challenging: ['INFJ', 'INFP', 'INTJ'],
      },
      careerPaths: {
        idealFields: ['営業', '起業', 'スポーツ', '救急・危機管理', 'エンターテイメント'],
        roleExamples: ['営業マネージャー', '起業家', 'スポーツ選手', '救急隊員', 'イベントプロデューサー'],
        developmentAreas: ['長期計画', '忍耐力', '感情への配慮'],
      },
    };

    this.profiles.set('ESTP', estp);

    // ========================================
    // ESFP: エンターテイナー
    // ========================================
    const esfp: MBTIProfile = {
      type: 'ESFP',
      name: 'エンターテイナー',
      description: '自発的でエネルギッシュ、人生を楽しむ娯楽者',
      characteristics: {
        strengths: ['社交性', '柔軟性', '共感力', '実践性', 'エンターテイメント性', '熱意'],
        weaknesses: ['長期計画', '批判への敏感さ', '構造への抵抗', '集中力'],
        workStyle: '社交的で柔軟、人との関わりを楽しむ',
        communicationStyle: '表現豊かで温かく、エネルギッシュ',
        learningStyle: '実践と対話を通じて、楽しみながら学ぶ',
        decisionMaking: '現在の感情と価値観を重視し、柔軟に判断',
      },
      motivation: {
        motivators: ['楽しさと刺激', '人とのつながり', '即座の報酬', '自由な表現', '新しい経験'],
        demotivators: ['退屈', '批判', '厳格なルール', '孤立した作業'],
        stressors: ['批判', '対立', '退屈', '制約'],
        stressRelief: ['社交活動', 'エンターテイメント', '身体活動'],
      },
      teamDynamics: {
        naturalRole: 'モチベーター・エンターテイナー',
        bestEnvironment: '活気があり協力的な環境、柔軟な職場',
        idealTeamSize: '中〜大規模チーム（5-15人）',
        conflictStyle: '調和を保ちながら、楽観的に対応',
      },
      strengthsSynergy: {
        highSynergy: [2, 17, 22, 26, 21, 18, 16, 23],      // 活発性、ポジティブ、共感性、社交性、適応性、包含、コミュニケーション、個別化
        moderateSynergy: [3, 4, 10, 14, 19, 20, 24, 25, 28, 29, 31, 1, 6, 11, 12, 13, 15, 30, 32],  // 回復志向、アレンジ、公平性、自我、親密性、調和性、成長促進、運命思考、原点思考、学習欲、着想、達成欲、責任感、指令性、競争性、最上志向、自己確信、収集心、戦略性
        lowSynergy: [5, 7, 8, 9, 27, 33, 34],              // 慎重さ、信念、規律性、目標志向、分析思考、未来志向、内省
      },
      mbtiCompatibility: {
        naturalPartners: ['ISFJ', 'ISTJ'],
        complementary: ['ISFP', 'ESTP', 'ESFJ'],
        challenging: ['INTJ', 'INTP', 'INFJ'],
      },
      careerPaths: {
        idealFields: ['エンターテイメント', '営業', 'イベント企画', 'ホスピタリティ', '教育'],
        roleExamples: ['パフォーマー', '営業担当', 'イベントプランナー', 'ツアーガイド', 'トレーナー'],
        developmentAreas: ['長期計画', '批判への対処', '構造化'],
      },
    };

    this.profiles.set('ESFP', esfp);
  }
}

// シングルトンインスタンスをエクスポート
const personalityAnalysisEngine = new PersonalityAnalysisEngine();
export default personalityAnalysisEngine;

// クラス自体もexport（staticメソッド用）
export { PersonalityAnalysisEngine };
