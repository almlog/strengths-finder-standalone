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
  compatibleTypes?: MBTIType[];
  
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
 * 資質名マッピング（34資質すべて）
 */
export const STRENGTH_NAMES: Record<number, string> = {
  1: '達成欲',
  2: '活発性',
  3: '適応性',
  4: '分析思考',
  5: 'アレンジ',
  6: '信念',
  7: '指令性',
  8: 'コミュニケーション',
  9: '競争性',
  10: '運命思考',
  11: '公平性',
  12: '原点思考',
  13: '慎重さ',
  14: '共感性',
  15: '調和性',
  16: '着想',
  17: '包含',
  18: '個別化',
  19: '収集心',
  20: '内省',
  21: '学習欲',
  22: '最上志向',
  23: 'ポジティブ',
  24: '親密性',
  25: '責任感',
  26: '回復志向',
  27: '自己確信',
  28: '自我',
  29: '戦略性',
  30: '社交性',
  31: '未来志向',
  32: '成長促進',
  33: '規律性',
  34: '目標志向',
};

/**
 * チーム指向の資質ID
 */
export const TEAM_ORIENTED_STRENGTHS = [2, 8, 9, 15, 17, 19, 24, 30];

/**
 * リーダーシップ資質ID
 */
export const LEADERSHIP_STRENGTHS = [5, 7, 8, 22, 27, 28, 29, 34];

/**
 * 分析思考系資質ID
 */
export const ANALYTICAL_STRENGTHS = [4, 12, 16, 20, 29, 31];

/**
 * 実行力系資質ID
 */
export const EXECUTION_STRENGTHS = [1, 5, 13, 25, 26, 33, 34];
