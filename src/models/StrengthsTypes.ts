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

export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position; // 役職情報（オプショナル）
  strengths: RankedStrength[]; // Top 5 ranked strengths
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
