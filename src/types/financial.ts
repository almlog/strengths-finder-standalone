/**
 * 金額管理機能の型定義
 *
 * @module types/financial
 * @description マネージャー向け金額管理機能で使用する型定義
 */

/**
 * メンバー個別の単価情報
 * v2.0: 各メンバーに個別の単価を保存（LocalStorageのみ、Githubには含まない）
 * v2.1: BP・契約社員向けに契約金額設定を追加
 */
export interface MemberRate {
  /** 単価タイプ（月額 or 時給 or 契約） */
  rateType: 'monthly' | 'hourly' | 'contract';
  /** 月額単価 or 時給 or 客先単価（契約の場合） */
  rate: number;
  /** 時給の場合の月間稼働時間（hourlyの場合のみ） */
  hours?: number;
  /** BP・契約社員の契約金額（支払額・原価）（contractの場合のみ） */
  contractAmount?: number;
  /** 固定利益率（%）（contractの場合、計算値の代わりに使用可能） */
  fixedProfitRate?: number;
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
  /** 単価情報 */
  memberRate: MemberRate;
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
