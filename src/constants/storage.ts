/**
 * LocalStorageキーの定義
 *
 * @module constants/storage
 * @description アプリケーション全体で使用するLocalStorageキーを一元管理
 */

/**
 * LocalStorageキーの定数
 */
export const STORAGE_KEYS = {
  /** メンバー基本情報（一般ユーザー） */
  MEMBERS: 'strengths-members',

  /** カスタム役職（一般ユーザー） */
  CUSTOM_POSITIONS: 'strengths-custom-positions',

  /** 単価情報（マネージャー専用） */
  MEMBER_RATES: 'strengths-member-rates',

  /** ステージマスタ（マネージャー専用） */
  STAGE_MASTERS: 'strengths-stage-masters',

  /** データバージョン（移行管理用） */
  DATA_VERSION: 'strengths-data-version',
} as const;

/**
 * STORAGE_KEYSの型
 */
export type StorageKey = typeof STORAGE_KEYS[keyof typeof STORAGE_KEYS];
