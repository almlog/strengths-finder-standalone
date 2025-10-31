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
      employeeNumber: string;
    }>;
  }>;
  /** 未配置プール情報 */
  unassignedPool: {
    memberIds: string[];
    members: Array<{
      id: string;
      name: string;
      employeeNumber: string;
    }>;
  };
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
    oldDepartment: string;
    newDepartment: string;
  }>;
}
