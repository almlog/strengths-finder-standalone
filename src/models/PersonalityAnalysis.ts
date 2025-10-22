/**
 * 性格分析機能の型定義
 *
 * @description
 * ストレングスファインダーとMBTIを統合した性格分析システム
 * 3つのデータパターンに対応（完全/MBTIのみ/資質のみ）
 */

// =============================================================================
// MBTI関連型
// =============================================================================

/**
 * MBTIの16タイプ
 */
export type MBTIType =
  | 'INTJ' | 'INTP' | 'ENTJ' | 'ENTP'
  | 'INFJ' | 'INFP' | 'ENFJ' | 'ENFP'
  | 'ISTJ' | 'ISFJ' | 'ESTJ' | 'ESFJ'
  | 'ISTP' | 'ISFP' | 'ESTP' | 'ESFP';

/**
 * 分析モード
 */
export type AnalysisMode =
  | 'full'              // 完全データ（MBTI + 資質）
  | 'mbti-only'         // MBTIのみ
  | 'strengths-only';   // 資質のみ

// =============================================================================
// メンバーデータ型
// =============================================================================

/**
 * ストレングスファインダーの資質データ
 */
export interface StrengthData {
  id: number;      // 資質ID（1-34）
  score: number;   // 順位（1-34、小さいほど強い）
}

/**
 * メンバーデータ（拡張版）
 */
export interface Member {
  id: string;
  name: string;
  department: string;
  position?: string;
  mbtiType?: MBTIType;              // オプショナル
  strengths?: StrengthData[];       // オプショナル
}

// =============================================================================
// 分析結果型
// =============================================================================

/**
 * 分析結果
 */
export interface AnalysisResult {
  // メタ情報
  analysisMode: AnalysisMode;
  mbtiType?: MBTIType;

  // 役割
  primaryRole: string;

  // スコア（0-100）
  synergyScore: number;           // MBTIと資質の相性（fullのみ）
  teamFitScore: number;           // チーム適合度
  leadershipPotential: number;    // リーダーシップ潜在力

  // 統合メッセージ
  profileSummary: string[];       // プロファイルの統合説明

  // 詳細情報
  strengths: string[];            // 強み
  workStyle: string;              // 仕事のスタイル
  communicationStyle: string;     // コミュニケーションスタイル
  idealEnvironment: string;       // 理想的な環境
  motivators: string[];           // モチベーション要因
  stressors: string[];            // ストレス要因

  // MBTI相性（MBTIありの場合のみ）
  naturalPartners?: MBTIType[];      // 自然な相性
  complementaryPartners?: MBTIType[];  // 補完的な相性

  // TOP資質（資質ありの場合のみ）
  topStrengthNames?: string[];

  // タイムスタンプ
  analysisDate: string;
  version: string;
}

// =============================================================================
// MBTIプロファイル型
// =============================================================================

/**
 * MBTIプロファイル
 */
export interface MBTIProfile {
  type: MBTIType;
  name: string;                    // 日本語名（例: 建築家）
  description: string;             // 概要

  // 特性
  characteristics: {
    strengths: string[];           // 強み
    weaknesses: string[];          // 弱み
    workStyle: string;             // 仕事のスタイル
    communicationStyle: string;    // コミュニケーションスタイル
    learningStyle: string;         // 学習スタイル
    decisionMaking: string;        // 意思決定スタイル
  };

  // モチベーション
  motivation: {
    motivators: string[];          // やる気が出ること
    demotivators: string[];        // やる気を失うこと
    stressors: string[];           // ストレス要因
    stressRelief: string[];        // ストレス解消法
  };

  // チーム・環境
  teamDynamics: {
    naturalRole: string;           // 自然な役割
    bestEnvironment: string;       // 最適な環境
    idealTeamSize: string;         // 理想的なチームサイズ
    conflictStyle: string;         // 対立時のスタイル
  };

  // 資質との相性
  strengthsSynergy: {
    highSynergy: number[];         // 相性の良い資質ID
    moderateSynergy: number[];     // 中程度の資質ID
    lowSynergy: number[];          // 相性の悪い資質ID
  };

  // MBTI間の相性
  mbtiCompatibility: {
    naturalPartners: MBTIType[];   // 自然な相性
    complementary: MBTIType[];     // 補完的な相性
    challenging: MBTIType[];       // 難しい相性
  };

  // キャリア
  careerPaths: {
    idealFields: string[];         // 適した分野
    roleExamples: string[];        // 役割例
    developmentAreas: string[];    // 成長領域
  };
}

// =============================================================================
// ユーティリティ関数の型
// =============================================================================

/**
 * 分析が可能かどうかを判定
 */
export function canAnalyze(member: Member): boolean {
  return !!(member.mbtiType || (member.strengths && member.strengths.length > 0));
}

/**
 * 分析モードを判定
 */
export function determineAnalysisMode(member: Member): AnalysisMode | null {
  const hasMBTI = !!member.mbtiType;
  const hasStrengths = !!(member.strengths && member.strengths.length > 0);

  if (hasMBTI && hasStrengths) return 'full';
  if (hasMBTI && !hasStrengths) return 'mbti-only';
  if (!hasMBTI && hasStrengths) return 'strengths-only';

  return null;
}

// =============================================================================
// 定数
// =============================================================================

/**
 * チーム指向の資質ID
 * 影響力・人間関係構築力に関連する資質
 */
export const TEAM_ORIENTED_STRENGTHS = [10, 11, 15, 16, 19, 21, 22, 24, 26];

/**
 * リーダーシップ資質ID
 * 指令性、自我、自己確信など
 */
export const LEADERSHIP_STRENGTHS = [11, 12, 13, 14, 17];

/**
 * 分析思考系資質ID
 * 戦略的思考力グループ
 */
export const ANALYTICAL_STRENGTHS = [27, 28, 29, 30, 31, 32, 33, 34];

/**
 * 実行力系資質ID
 * 実行力グループ
 */
export const EXECUTION_STRENGTHS = [1, 2, 3, 4, 5, 6, 7, 8, 9];
