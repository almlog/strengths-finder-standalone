/**
 * ポジションテンプレート定義
 *
 * @module constants/positionTemplates
 * @description ポジション別の表示情報（名前・色・タイプ）を管理
 *              単価情報は含まず、Github管理可能な設計
 */

/**
 * PositionTemplate型
 * ポジションの表示属性のみを定義（単価情報は含まない）
 */
export interface PositionTemplate {
  /** ポジションID (例: 'MG', 'SM', 'DISPATCH') */
  id: string;
  /** ポジション名 (例: 'マネージャー', '派遣社員') */
  name: string;
  /** カラーコード (HEX形式: '#8B5CF6') */
  color: string;
  /** 絵文字アイコン */
  icon: string;
  /** 単価タイプ（月額 or 時給） */
  rateType: 'monthly' | 'hourly';
  /** 時給用のデフォルト稼働時間（時給タイプの場合のみ） */
  defaultHours?: number;
}

/**
 * ポジションテンプレート一覧
 * Github管理可能（単価情報を含まない）
 */
export const POSITION_TEMPLATES: PositionTemplate[] = [
  {
    id: 'MG',
    name: 'マネージャー',
    color: '#8B5CF6',
    icon: '👑',
    rateType: 'monthly',
  },
  {
    id: 'SM',
    name: 'スクラムマスター',
    color: '#EC4899',
    icon: '🎯',
    rateType: 'monthly',
  },
  {
    id: 'PO',
    name: 'プロダクトオーナー',
    color: '#F59E0B',
    icon: '📋',
    rateType: 'monthly',
  },
  {
    id: 'SL',
    name: 'シニアリード',
    color: '#10B981',
    icon: '⭐',
    rateType: 'monthly',
  },
  {
    id: 'SST',
    name: 'シニアスタッフ',
    color: '#3B82F6',
    icon: '💼',
    rateType: 'monthly',
  },
  {
    id: 'ST',
    name: 'スタッフ',
    color: '#6B7280',
    icon: '👤',
    rateType: 'monthly',
  },
  {
    id: 'DISPATCH',
    name: '派遣社員',
    color: '#06B6D4',
    icon: '🕐',
    rateType: 'hourly',
    defaultHours: 160, // デフォルト160時間/月
  },
];

/**
 * IDでポジションテンプレートを検索
 *
 * @param {string} id - ポジションID
 * @returns {PositionTemplate | undefined} 見つかったテンプレート、存在しない場合はundefined
 *
 * @example
 * ```typescript
 * const template = getPositionTemplateById('MG');
 * if (template) {
 *   console.log(template.name); // 'マネージャー'
 *   console.log(template.icon); // '👑'
 * }
 * ```
 */
export function getPositionTemplateById(id: string): PositionTemplate | undefined {
  return POSITION_TEMPLATES.find(template => template.id === id);
}

/**
 * 標準ポジションIDの型定義
 */
export type StandardPositionId = 'MG' | 'SM' | 'PO' | 'SL' | 'SST' | 'ST' | 'DISPATCH';
