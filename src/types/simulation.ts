/**
 * チームシミュレーション機能の型定義
 *
 * @module types/simulation
 * @description 動的なチーム編成シミュレーション用の型定義
 */

import { MemberStrengths, StrengthGroup } from '../models/StrengthsTypes';

/**
 * シミュレーショングループ
 *
 * 組織変更やチーム編成をシミュレーションするためのグループ単位
 */
export interface SimulationGroup {
  /** 一意識別子（UUID） */
  id: string;
  /** グループ名（例: "営業チーム", "開発部", "グループ1"） */
  name: string;
  /** 所属メンバーのID配列 */
  memberIds: string[];
  /** グループカラー（オプション、将来の拡張用） */
  color?: string;
}

/**
 * シミュレーション状態
 *
 * 現在のシミュレーションの全体状態を保持
 */
export interface SimulationState {
  /** シミュレーション名（例: "2025年度案A"） */
  simulationName: string;
  /** グループ配列 */
  groups: SimulationGroup[];
  /** 未配置メンバーのID配列 */
  unassignedPool: string[];
  /** 作成日時（ISO 8601形式） */
  createdAt?: string;
  /** 更新日時（ISO 8601形式） */
  updatedAt?: string;
}

/**
 * シミュレーションエクスポート形式
 *
 * JSONファイルとしてエクスポート/インポートする際の形式
 */
export interface SimulationExport {
  /** ファイルの説明コメント */
  _comment: string;
  /** フォーマットバージョン */
  version: string;
  /** シミュレーション名 */
  simulationName: string;
  /** エクスポート日時（ISO 8601形式） */
  exportedAt: string;
  /** グループ情報（メンバー詳細含む） */
  groups: Array<{
    id: string;
    name: string;
    memberIds: string[];
    members: Array<{
      id: string;
      name: string;
    }>;
  }>;
  /** 未配置プール情報 */
  unassignedPool: {
    memberIds: string[];
    members: Array<{
      id: string;
      name: string;
    }>;
  };
}

/**
 * グループ分析結果
 *
 * @description
 * PersonalityAnalysisEngineによる個人分析を集計した
 * グループ全体の分析データ
 */
export interface GroupAnalysis {
  /** メンバー数（分析対象） */
  memberCount: number;

  /** 平均相性スコア（0-100、MBTIデータがある場合のみ） */
  avgSynergyScore: number | null;

  /** 平均チーム適合度（0-100、Belbin理論ベース） */
  avgTeamFit: number | null;

  /** 平均リーダーシップ潜在力（0-100） */
  avgLeadership: number | null;

  /** チーム特性 */
  teamCharacteristics: {
    /** バランスの取れたチーム（4カテゴリがすべて閾値以上） */
    isBalanced: boolean;

    /** 強化されているカテゴリ（平均以上） */
    strongCategories: StrengthGroup[];

    /** 弱いカテゴリ（平均未満） */
    weakCategories: StrengthGroup[];

    /** リーダーシップ分布 */
    leadershipDistribution: {
      /** 高リーダーシップ（70以上）の人数 */
      high: number;
      /** 中リーダーシップ（40-69）の人数 */
      medium: number;
      /** 低リーダーシップ（40未満）の人数 */
      low: number;
    };
  };
}

/**
 * チーム特性ナラティブ
 *
 * @description
 * 資質の頻度分布を分析し、チームの特性を文章で説明する
 */
export interface TeamCharacteristicNarrative {
  /** タイトル（例：「実行力×戦略思考チーム」） */
  title: string;

  /** 要約文（2-3文、100-200文字） */
  summary: string;

  /** カテゴリ別の傾向分析 */
  categoryTendencies: Array<{
    category: StrengthGroup;
    percentage: number;          // 0-100
    topStrengths: Array<{
      strengthId: number;
      name: string;
      frequency: number;          // 何人が持っているか
      description: string;        // 資質の説明（短縮版）
    }>;
  }>;

  /** 頻出資質TOP10 */
  topStrengths: Array<{
    strengthId: number;
    name: string;
    frequency: number;
    percentage: number;           // チーム全体での保有率
  }>;

  /** チームの可能性（箇条書き、3-5項目） */
  possibilities: string[];
}

/**
 * グループ統計情報
 *
 * 各グループの強み分布や利益率などの統計データ
 */
export interface GroupStats {
  /** メンバー数 */
  memberCount: number;
  /** 強みグループごとの資質数 */
  groupDistribution: Record<StrengthGroup, number>;
  /** 利益率情報（マネージャーモード時のみ） */
  profitability?: {
    /** 総売上（月額、円） */
    totalRevenue: number;
    /** 総原価（月額、円） */
    totalCost: number;
    /** 総利益（月額、円） */
    totalProfit: number;
    /** 利益率（%） */
    profitMargin: number;
  };
  /** グループ分析結果（メンバーが1人以上いる場合） */
  analysis?: GroupAnalysis | null;
  /** チーム特性ナラティブ（メンバーが1人以上いる場合） */
  narrative?: TeamCharacteristicNarrative | null;
}

/**
 * メンバー移動先のID型
 *
 * グループIDまたは未配置プールを表す
 */
export type DestinationId = string | 'unassigned';

/**
 * メンバー移動操作
 */
export interface MemberMoveOperation {
  /** 移動するメンバーID */
  memberId: string;
  /** 移動元（グループIDまたは'unassigned'） */
  sourceId: DestinationId;
  /** 移動先（グループIDまたは'unassigned'） */
  destinationId: DestinationId;
}

/**
 * インポート警告
 *
 * インポート時に発生した問題を通知
 */
export interface ImportWarning {
  /** 警告の種類 */
  type: 'member-not-found' | 'invalid-group' | 'version-mismatch';
  /** 警告メッセージ */
  message: string;
  /** 関連データ（メンバーID、グループIDなど） */
  relatedData?: string;
}

/**
 * インポート結果
 */
export interface ImportResult {
  /** インポートされた状態 */
  state: SimulationState;
  /** 警告配列 */
  warnings: ImportWarning[];
}

/**
 * 本番反映プレビュー
 *
 * シミュレーション結果を本番データに反映する前のプレビュー
 */
export interface ApplyPreview {
  /** 変更されるメンバー数 */
  changeCount: number;
  /** 変更内容の配列 */
  changes: Array<{
    memberId: string;
    memberName: string;
    /** 変更前の部署コード */
    oldDepartment: string;
    /** 変更後の部署コード */
    newDepartment: string;
  }>;
}

/**
 * スコアの内訳コンポーネント
 */
export interface ScoreComponent {
  /** ラベル（例：「ベーススコア」「E型メンバー」） */
  label: string;
  /** スコア値 */
  value: number;
  /** 説明（オプション） */
  description?: string;
}

/**
 * スコアの評価基準閾値
 */
export interface ScoreThreshold {
  /** 高スコア基準 */
  high: {
    /** 最小値 */
    min: number;
    /** ラベル（例：「リーダー型」） */
    label: string;
    /** 説明 */
    description: string;
  };
  /** バランス型基準 */
  balanced: {
    /** 最小値 */
    min: number;
    /** ラベル（例：「バランス型」） */
    label: string;
    /** 説明 */
    description: string;
  };
  /** 低スコア基準 */
  low: {
    /** ラベル（例：「専門家型」） */
    label: string;
    /** 説明（ユニークさを強調） */
    description: string;
  };
}

/**
 * スコアブレークダウン
 *
 * スコアの計算式内訳と改善提案を含む
 */
export interface ScoreBreakdown {
  /** スコアの種類 */
  type: 'synergy' | 'teamFit' | 'leadership';
  /** 合計スコア */
  totalScore: number;
  /** スコアの構成要素 */
  components: ScoreComponent[];
  /** 評価基準 */
  threshold: ScoreThreshold;
  /** 改善提案リスト */
  improvements: string[];
}
