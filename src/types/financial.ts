/**
 * 金額管理機能の型定義
 *
 * @module types/financial
 * @description マネージャー向け金額管理機能で使用する型定義
 * @version 3.1 - 契約単価分離 + 雇用形態導入
 */

/**
 * 雇用形態の型定義（v3.1）
 */
export type EmploymentType = 'regular' | 'contract' | 'bp';

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  regular: '正社員',
  contract: '契約社員',
  bp: 'ビジネスパートナー',
};

/**
 * メンバー個別の単価情報（売上単価）
 * v2.0: 各メンバーに個別の単価を保存（LocalStorageのみ、Githubには含まない）
 * v3.1: 売上単価のみを管理（契約単価はcontractRateで別管理）
 */
export interface MemberRate {
  /** 単価タイプ（月額 or 時給） */
  rateType: 'monthly' | 'hourly';
  /** 月額単価 or 時給（顧客請求額・売上） */
  rate: number;
  /** 時給の場合の月間稼働時間（hourlyの場合のみ） */
  hours?: number;

  // 以下は v3.0 互換用（非推奨、将来削除予定）
  /** @deprecated v3.1: contractRateを使用してください */
  contractAmount?: number;
  /** @deprecated v3.1: 固定利益率は廃止されました */
  fixedProfitRate?: number;
}

/**
 * 契約単価情報（契約社員・BPのみ）（v3.1新規）
 */
export interface ContractRate {
  /** 契約タイプ（月額 or 時給） */
  rateType: 'monthly' | 'hourly';
  /** 月額契約単価 or 時給（支払額・原価） */
  rate: number;
  /** 時給の場合の月間稼働時間 */
  hours?: number;
}

/**
 * ポジション別の月額請求単価
 * @deprecated v2.0で非推奨。positionTemplates + MemberRateを使用してください
 */
export interface PositionRate {
  /** ポジションID (例: 'MG', 'SM', 'PO') */
  id: string;
  /** ポジション名 (例: 'マネージャー', 'スクラムマスター') */
  name: string;
  /** 月額請求単価 (円) */
  monthlyRate: number;
  /** カラーコード (HEX形式: '#8B5CF6') */
  color: string;
}

/**
 * チーム全体の金額情報
 */
export interface TeamFinancials {
  /** 月間売上合計 */
  monthlyRevenue: number;
  /** 年間売上予測 (月間 × 12) */
  annualRevenue: number;
  /** メンバー平均単価 */
  averageRatePerMember: number;
  /** ポジション別の内訳 */
  revenueByPosition: Record<string, {
    /** 人数 */
    count: number;
    /** 合計売上 */
    totalRevenue: number;
  }>;
}

/**
 * 標準ポジションIDの型定義
 * v2.0: DISPATCH（派遣社員）を追加
 */
export type StandardPositionId = 'MG' | 'SM' | 'PO' | 'SL' | 'SST' | 'ST' | 'DISPATCH';

/**
 * メンバーIDと単価の対応関係
 * マネージャーモード専用データ
 */
export interface MemberRateRecord {
  /** メンバーID */
  memberId: string;
  /** 単価情報（売上単価・顧客請求額） */
  memberRate: MemberRate;
  /** 契約単価情報（契約社員・BPのみ、支払額・原価） */
  contractRate?: ContractRate;
  /** 最終更新日時（ISO 8601形式） */
  updatedAt?: string;
}

/**
 * 単価情報のエクスポート形式
 */
export interface MemberRatesExport {
  /** コメント（説明文） */
  _comment: string[];
  /** バージョン */
  version: string;
  /** エクスポート日時（ISO 8601形式） */
  exportedAt: string;
  /** 単価情報のレコード配列 */
  rates: MemberRateRecord[];
}
