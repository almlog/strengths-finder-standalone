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
 * チーム適合度スコア設定
 */
const TEAM_FIT_SCORES = {
  BASE: 50,               // ベーススコア
  MBTI: {
    EXTROVERT: 12,        // 外向型（E）
    FEELING: 10,          // 感情型（F）
    JUDGING: 8,           // 判断型（J）
  },
  MBTI_ESTIMATE: {
    EXTROVERT: 20,        // MBTIのみ推定時
    FEELING: 18,
    JUDGING: 12,
  },
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
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(s => {
        const strength = StrengthsService.getStrengthById(s.id);
        return strength ? strength.name : `資質${s.id}`;
      });

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
      .sort((a, b) => a.score - b.score)
      .slice(0, 5)
      .map(s => {
        const strength = StrengthsService.getStrengthById(s.id);
        return strength ? strength.name : `資質${s.id}`;
      });

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
   * チーム適合度（完全モード）
   */
  private calculateTeamFit(mbtiType: MBTIType, strengths: Member['strengths']): number {
    let score = TEAM_FIT_SCORES.BASE;

    // MBTIからの加算
    if (mbtiType.startsWith('E')) score += TEAM_FIT_SCORES.MBTI.EXTROVERT;
    if (mbtiType.includes('F')) score += TEAM_FIT_SCORES.MBTI.FEELING;
    if (mbtiType.endsWith('J')) score += TEAM_FIT_SCORES.MBTI.JUDGING;

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
   * MBTIからチーム適合度を推定
   */
  private estimateTeamFitFromMBTI(mbtiType: MBTIType): number {
    let score = TEAM_FIT_SCORES.BASE;
    if (mbtiType.startsWith('E')) score += TEAM_FIT_SCORES.MBTI_ESTIMATE.EXTROVERT;
    if (mbtiType.includes('F')) score += TEAM_FIT_SCORES.MBTI_ESTIMATE.FEELING;
    if (mbtiType.endsWith('J')) score += TEAM_FIT_SCORES.MBTI_ESTIMATE.JUDGING;
    return Math.min(100, score);
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

    // TODO: Phase 3 - 残り10タイプの実装
    // 未実装: ENTP, INFP, ISTJ, ISFJ, ESTJ, ESFJ, ISTP, ISFP, ESTP, ESFP
  }
}

// シングルトンインスタンスをエクスポート
const personalityAnalysisEngine = new PersonalityAnalysisEngine();
export default personalityAnalysisEngine;
