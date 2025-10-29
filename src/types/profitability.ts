// src/types/profitability.ts
/**
 * 利益率計算のための型定義
 * SPEC: MANAGER_FEATURE_SPEC_V3.md Phase 4.1
 */

/**
 * ステージマスタ定義
 * 社員のステージ(S1-S4)とビジネスパートナー(BP)の原価構造を定義
 */
export interface StageMaster {
  /** ステージID: 'S1', 'S2', 'S3', 'S4', 'BP' */
  id: string;
  /** ステージ名: 'ステージ1', 'ビジネスパートナー' など */
  name: string;
  /** タイプ: 社員またはBP */
  type: 'employee' | 'bp';
  /** 平均給与（月額、BP以外のみ） */
  averageSalary?: number;
  /** 経費率（0.30 = 30%） */
  expenseRate: number;
  /** 説明文（任意） */
  description?: string;
  /** カスタムステージかどうか (Phase 4.7.1) */
  isCustom?: boolean;
}

/**
 * デフォルトステージマスタ定義
 * SPEC v3.0 に基づく初期値
 */
export const DEFAULT_STAGE_MASTERS: StageMaster[] = [
  {
    id: 'S1',
    name: 'ステージ1',
    type: 'employee',
    averageSalary: 250000,
    expenseRate: 0.30,
    description: '新人・若手社員'
  },
  {
    id: 'S2',
    name: 'ステージ2',
    type: 'employee',
    averageSalary: 350000,
    expenseRate: 0.30,
    description: '中堅社員'
  },
  {
    id: 'S3',
    name: 'ステージ3',
    type: 'employee',
    averageSalary: 450000,
    expenseRate: 0.30,
    description: 'シニア社員'
  },
  {
    id: 'S4',
    name: 'ステージ4',
    type: 'employee',
    averageSalary: 600000,
    expenseRate: 0.30,
    description: 'マネージャー・エキスパート'
  },
  {
    id: 'BP',
    name: 'ビジネスパートナー',
    type: 'bp',
    expenseRate: 0.85,
    description: '外部協力者（売上の85%が原価）'
  }
];

/**
 * メンバー個人の利益計算結果
 */
export interface MemberProfitability {
  /** メンバーID */
  memberId: string;
  /** 売上（月額） */
  revenue: number;
  /** 原価（月額） */
  cost: number;
  /** 利益（月額） */
  profit: number;
  /** 利益率（%） */
  profitMargin: number;
  /** 詳細内訳 */
  details: {
    /** 給与（社員の場合のみ） */
    salary?: number;
    /** 経費 */
    expense: number;
    /** ステージID */
    stageId?: string;
  };
}

/**
 * チーム全体の利益集計結果
 */
export interface TeamProfitability {
  /** 総売上（月額） */
  totalRevenue: number;
  /** 総原価（月額） */
  totalCost: number;
  /** 総利益（月額） */
  totalProfit: number;
  /** 全体利益率（%） */
  profitMargin: number;
  /** メンバー数 */
  memberCount: number;
  /** 平均売上 */
  averageRevenue: number;
  /** 平均利益 */
  averageProfit: number;
  /** ステージ別利益集計 */
  profitByStage: Record<string, {
    /** 該当人数 */
    count: number;
    /** ステージ別総利益 */
    totalProfit: number;
    /** ステージ別平均利益率 */
    averageProfitMargin: number;
  }>;
}
