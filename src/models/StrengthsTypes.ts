// src/models/StrengthsTypes.ts

export enum StrengthGroup {
    EXECUTING = "executing",
    INFLUENCING = "influencing",
    RELATIONSHIP_BUILDING = "relationship_building",
    STRATEGIC_THINKING = "strategic_thinking"
  }
  
  export interface Strength {
    id: number;
    name: string;
    description: string;
    group: StrengthGroup;
  }
  
export interface RankedStrength {
  id: number;  // 強みのID
  score: number; // 順位スコア（5が最高、1が最低）
}

export enum Position {
  GENERAL = "general", // 一般社員
  GL = "gl", // グループリーダー
  DEPUTY_MANAGER = "deputy_manager", // 副課長
  MANAGER = "manager", // 課長
  DIRECTOR = "director", // 部長
  CONTRACT = "contract", // 契約社員
  BP = "bp" // BP
}

// カスタム役職の型定義
export interface CustomPosition {
  id: string;           // 一意のID（例: "SV", "DEPT_MANAGER"）
  name: string;         // 表示名（例: "SV", "事業部長"）
  displayName: string;  // 詳細表示名（例: "スーパーバイザー", "事業部長"）
  color: string;        // 表示色（例: "#FF5722"）
  icon: 'crown' | 'circle' | 'star'; // アイコンタイプ
}

// インポート/エクスポート用のデータ構造
export interface StrengthsData {
  customPositions?: CustomPosition[]; // カスタム役職一覧
  members: MemberStrengths[];          // メンバーデータ
}

export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string; // デフォルト役職またはカスタム役職ID
  stageId?: string; // v3.1: ステージID（S1, S2, S3, S4, BP） - 原価テンプレート参照用

  strengths: RankedStrength[]; // Top 5 ranked strengths

  // 16Personalities情報（任意）
  personalityId?: number;        // 1-16（マスターデータのID）
  personalityVariant?: 'A' | 'T'; // A: 自己主張型, T: 慎重型
}
  
  export interface StrengthsAnalysisResult {
    groupDistribution: {
      [key in StrengthGroup]: number;
    };
    strengthsFrequency: {
      [key: number]: number;
    };
    strengthsMembers: {
      [key: number]: string[];
    };
    topStrengths: Strength[];
  }
