// src/types/profitability.ts
/**
 * 利益率計算のための型定義
 * SPEC: MANAGER_FEATURE_SPEC_V3.1_UNIFIED.md
 * @version 3.1 - 雇用形態導入 + 契約単価分離
 */

import { EmploymentType } from './financial';

/**
 * ステージマスタ定義（v3.1）
 * 正社員のステージ(S1-S4)、契約社員(CONTRACT)、ビジネスパートナー(BP)の原価構造を定義
 */
export interface StageMaster {
  /** ステージID: 'S1', 'S2', 'S3', 'S4', 'CONTRACT', 'BP' */
  id: string;
  /** ステージ名: 'ステージ1', '契約社員', 'ビジネスパートナー' など */
  name: string;

  /** v3.1: 雇用形態 */
  employmentType: EmploymentType;

  /** v3.1: 平均給与（月額、正社員のみ） */
  averageSalary?: number;
  /** v3.1: 給与経費率（正社員のみ、0.30 = 30%） */
  salaryExpenseRate?: number;

  /** v3.1: 固定経費（契約社員・BPのみ、月額） */
  fixedExpense?: number;
  /** v3.1: 契約単価に対する社内経費率（契約社員・BPのみ、0.26 = 26%） */
  contractExpenseRate?: number;

  /** 説明文（任意） */
  description?: string;
  /** カスタムステージかどうか */
  isCustom?: boolean;

  // v3.0 互換用（非推奨）
  /** @deprecated v3.1: employmentTypeを使用してください */
  type?: 'employee' | 'bp';
  /** @deprecated v3.1: salaryExpenseRateを使用してください */
  expenseRate?: number;
}

/**
 * デフォルトステージマスタ定義（v3.1）
 * SPEC: MANAGER_FEATURE_SPEC_V3.1_UNIFIED.md
 */
export const DEFAULT_STAGE_MASTERS: StageMaster[] = [
  // 正社員ステージ (S1-S4)
  {
    id: 'S1',
    name: 'ステージ1',
    employmentType: 'regular',
    averageSalary: 250000,
    salaryExpenseRate: 0.30,
    description: '新人・若手社員',
    // v3.0互換
    type: 'employee',
    expenseRate: 0.30,
  },
  {
    id: 'S2',
    name: 'ステージ2',
    employmentType: 'regular',
    averageSalary: 350000,
    salaryExpenseRate: 0.30,
    description: '中堅社員',
    // v3.0互換
    type: 'employee',
    expenseRate: 0.30,
  },
  {
    id: 'S3',
    name: 'ステージ3',
    employmentType: 'regular',
    averageSalary: 450000,
    salaryExpenseRate: 0.30,
    description: 'シニア社員',
    // v3.0互換
    type: 'employee',
    expenseRate: 0.30,
  },
  {
    id: 'S4',
    name: 'ステージ4',
    employmentType: 'regular',
    averageSalary: 600000,
    salaryExpenseRate: 0.30,
    description: 'マネージャー・エキスパート',
    // v3.0互換
    type: 'employee',
    expenseRate: 0.30,
  },
  // 契約社員ステージ (v3.1新規)
  {
    id: 'CONTRACT',
    name: '契約社員',
    employmentType: 'contract',
    fixedExpense: 50000,
    contractExpenseRate: 0.26,
    description: '契約社員（個別契約単価 + 固定経費50,000円 + 社内経費26%）',
    // v3.0互換（契約社員は従来存在しないため、デフォルト値）
    type: 'employee',
    expenseRate: 0.0,
  },
  // ビジネスパートナーステージ
  {
    id: 'BP',
    name: 'ビジネスパートナー',
    employmentType: 'bp',
    fixedExpense: 40000,
    contractExpenseRate: 0.09,
    description: '外部協力者（個別契約単価 + 固定経費40,000円 + 経費率9%）',
    // v3.0互換（従来はexpenseRate: 0.85だったが、v3.1では固定経費方式に変更）
    type: 'bp',
    expenseRate: 0.85,
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
