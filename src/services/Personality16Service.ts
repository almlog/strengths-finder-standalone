/**
 * 16Personalities Service
 * Master data and business logic for 16 personality types
 *
 * @module Personality16Service
 */

import { MemberStrengths } from '../models/StrengthsTypes';

// Constants
export const MIN_PERSONALITY_ID = 1;
export const MAX_PERSONALITY_ID = 16;

export type RoleGroup = 'analyst' | 'diplomat' | 'sentinel' | 'explorer';

export interface Personality16Type {
  id: number;
  code: string;
  name: string;
  nameEn: string;
  role: RoleGroup;
  roleName: string;
  description: string;
  colorLight: string;
  colorDark: string;
}

export interface TeamPersonalityAnalysis {
  totalMembers: number;
  typeDistribution: { [typeId: number]: number };
  roleDistribution: { [role in RoleGroup]: number };
  variantDistribution: { A: number; T: number; unset: number };
  typeMembers: { [typeId: number]: string[] };
  roleMembers: { [role in RoleGroup]: string[] };
  variantMembers: { A: string[]; T: string[]; unset: string[] };
}

export const PERSONALITY_TYPES_DATA: Personality16Type[] = [
  // 分析家（Analyst）
  {
    id: 1,
    code: 'INTJ',
    name: '建築家',
    nameEn: 'Architect',
    role: 'analyst',
    roleName: '分析家',
    description: '想像力豊かで戦略的な思考の持ち主。あらゆることに対して計画を立てる。',
    colorLight: '#8B4789',
    colorDark: '#B565B3',
  },
  {
    id: 2,
    code: 'INTP',
    name: '論理学者',
    nameEn: 'Logician',
    role: 'analyst',
    roleName: '分析家',
    description: '革新的な発明家。知識に対する飽くなき探求心を持つ。',
    colorLight: '#8B4789',
    colorDark: '#B565B3',
  },
  {
    id: 3,
    code: 'ENTJ',
    name: '指揮官',
    nameEn: 'Commander',
    role: 'analyst',
    roleName: '分析家',
    description: '大胆で想像力豊か、そして強い意志を持つリーダー。',
    colorLight: '#8B4789',
    colorDark: '#B565B3',
  },
  {
    id: 4,
    code: 'ENTP',
    name: '討論者',
    nameEn: 'Debater',
    role: 'analyst',
    roleName: '分析家',
    description: '賢く好奇心旺盛な思考の持ち主。知的な挑戦には抗えない。',
    colorLight: '#8B4789',
    colorDark: '#B565B3',
  },

  // 外交官（Diplomat）
  {
    id: 5,
    code: 'INFJ',
    name: '提唱者',
    nameEn: 'Advocate',
    role: 'diplomat',
    roleName: '外交官',
    description: '物静かで神秘的、それでいて人を鼓舞する飽くなき理想主義者。',
    colorLight: '#4C9F70',
    colorDark: '#62C78E',
  },
  {
    id: 6,
    code: 'INFP',
    name: '仲介者',
    nameEn: 'Mediator',
    role: 'diplomat',
    roleName: '外交官',
    description: '詩的で親切、利他的な人。常に大義のために尽くそうとする。',
    colorLight: '#4C9F70',
    colorDark: '#62C78E',
  },
  {
    id: 7,
    code: 'ENFJ',
    name: '主人公',
    nameEn: 'Protagonist',
    role: 'diplomat',
    roleName: '外交官',
    description: 'カリスマ性があり人を鼓舞するリーダー。聞く者を魅了する。',
    colorLight: '#4C9F70',
    colorDark: '#62C78E',
  },
  {
    id: 8,
    code: 'ENFP',
    name: '運動家',
    nameEn: 'Campaigner',
    role: 'diplomat',
    roleName: '外交官',
    description: '情熱的で創造的、社交的な自由人。',
    colorLight: '#4C9F70',
    colorDark: '#62C78E',
  },

  // 番人（Sentinel）
  {
    id: 9,
    code: 'ISTJ',
    name: '管理者',
    nameEn: 'Logistician',
    role: 'sentinel',
    roleName: '番人',
    description: '実用的で事実に基づいた思考の持ち主。',
    colorLight: '#4A6FDC',
    colorDark: '#6B8FE8',
  },
  {
    id: 10,
    code: 'ISFJ',
    name: '擁護者',
    nameEn: 'Defender',
    role: 'sentinel',
    roleName: '番人',
    description: '献身的で温かい保護者。愛する人を守るためなら常に準備万端。',
    colorLight: '#4A6FDC',
    colorDark: '#6B8FE8',
  },
  {
    id: 11,
    code: 'ESTJ',
    name: '幹部',
    nameEn: 'Executive',
    role: 'sentinel',
    roleName: '番人',
    description: '優れた管理者。物事や人の管理において比類なき能力を持つ。',
    colorLight: '#4A6FDC',
    colorDark: '#6B8FE8',
  },
  {
    id: 12,
    code: 'ESFJ',
    name: '領事',
    nameEn: 'Consul',
    role: 'sentinel',
    roleName: '番人',
    description: '非常に思いやりがあり、社交的で人気者。',
    colorLight: '#4A6FDC',
    colorDark: '#6B8FE8',
  },

  // 探検家（Explorer）
  {
    id: 13,
    code: 'ISTP',
    name: '巨匠',
    nameEn: 'Virtuoso',
    role: 'explorer',
    roleName: '探検家',
    description: '大胆で実践的な実験者。あらゆる道具を使いこなす達人。',
    colorLight: '#D6813E',
    colorDark: '#E69B5F',
  },
  {
    id: 14,
    code: 'ISFP',
    name: '冒険家',
    nameEn: 'Adventurer',
    role: 'explorer',
    roleName: '探検家',
    description: '柔軟で魅力的な芸術家。新しいことを探求し経験する準備は常に万端。',
    colorLight: '#D6813E',
    colorDark: '#E69B5F',
  },
  {
    id: 15,
    code: 'ESTP',
    name: '起業家',
    nameEn: 'Entrepreneur',
    role: 'explorer',
    roleName: '探検家',
    description: '賢く、精力的で非常に鋭い洞察力を持つ人。',
    colorLight: '#D6813E',
    colorDark: '#E69B5F',
  },
  {
    id: 16,
    code: 'ESFP',
    name: 'エンターテイナー',
    nameEn: 'Entertainer',
    role: 'explorer',
    roleName: '探検家',
    description: '自発的で、精力的、そして情熱的な人。',
    colorLight: '#D6813E',
    colorDark: '#E69B5F',
  },
];

/**
 * Validate if personality ID is within valid range
 * @param id - Personality ID to validate
 * @returns True if ID is valid (1-16), false otherwise
 */
function isValidPersonalityId(id: unknown): id is number {
  return typeof id === 'number' && id >= MIN_PERSONALITY_ID && id <= MAX_PERSONALITY_ID;
}

/**
 * Get personality type by ID
 * @param id - Personality type ID (1-16)
 * @returns Personality type or undefined if not found
 * @example
 * const intj = getPersonalityById(1); // Returns INTJ type
 */
export function getPersonalityById(id: number): Personality16Type | undefined {
  if (!isValidPersonalityId(id)) {
    return undefined;
  }
  return PERSONALITY_TYPES_DATA.find(type => type.id === id);
}

/**
 * Get personality type by code (case-insensitive)
 * @param code - Personality type code (e.g., "INTJ", "intj")
 * @returns Personality type or undefined if not found
 * @example
 * const intj = getPersonalityByCode("INTJ"); // Returns INTJ type
 * const same = getPersonalityByCode("intj"); // Also returns INTJ type
 */
export function getPersonalityByCode(code: string): Personality16Type | undefined {
  if (typeof code !== 'string' || code.trim() === '') {
    return undefined;
  }
  const normalizedCode = code.toUpperCase();
  return PERSONALITY_TYPES_DATA.find(type => type.code === normalizedCode);
}

/**
 * Get all personality types (immutable copy)
 * @returns Array of all 16 personality types
 * @example
 * const all = getAllPersonalities(); // Returns all 16 types
 */
export function getAllPersonalities(): Personality16Type[] {
  return PERSONALITY_TYPES_DATA.map(type => ({ ...type }));
}

/**
 * Analyze team's 16Personalities distribution
 * @param members - Array of team members with personality data
 * @returns Team personality analysis with type, role, and variant distributions
 * @example
 * const analysis = analyzeTeamPersonalities(teamMembers);
 * console.log(analysis.roleDistribution.analyst); // Number of analysts
 */
export function analyzeTeamPersonalities(members: MemberStrengths[]): TeamPersonalityAnalysis {
  const analysis: TeamPersonalityAnalysis = {
    totalMembers: 0,
    typeDistribution: {},
    roleDistribution: {
      analyst: 0,
      diplomat: 0,
      sentinel: 0,
      explorer: 0,
    },
    variantDistribution: { A: 0, T: 0, unset: 0 },
    typeMembers: {},
    roleMembers: {
      analyst: [],
      diplomat: [],
      sentinel: [],
      explorer: [],
    },
    variantMembers: { A: [], T: [], unset: [] },
  };

  members.forEach(member => {
    if (isValidPersonalityId(member.personalityId)) {
      const personality = getPersonalityById(member.personalityId);
      if (personality) {
        analysis.totalMembers++;

        // Type distribution
        analysis.typeDistribution[personality.id] =
          (analysis.typeDistribution[personality.id] || 0) + 1;

        // Type members
        if (!analysis.typeMembers[personality.id]) {
          analysis.typeMembers[personality.id] = [];
        }
        analysis.typeMembers[personality.id].push(member.name);

        // Role distribution
        analysis.roleDistribution[personality.role]++;

        // Role members
        analysis.roleMembers[personality.role].push(member.name);

        // Variant distribution
        if (member.personalityVariant === 'A') {
          analysis.variantDistribution.A++;
          analysis.variantMembers.A.push(member.name);
        } else if (member.personalityVariant === 'T') {
          analysis.variantDistribution.T++;
          analysis.variantMembers.T.push(member.name);
        } else {
          // A/T未設定の場合
          analysis.variantDistribution.unset++;
          analysis.variantMembers.unset.push(member.name);
        }
      }
    }
  });

  return analysis;
}

/**
 * Get color for role group
 * @param role - Role group (analyst, diplomat, sentinel, explorer)
 * @param isDark - Dark mode flag
 * @returns Hex color code for the role group
 * @example
 * const color = getRoleGroupColor('analyst', false); // Returns light mode color
 */
export function getRoleGroupColor(role: RoleGroup, isDark: boolean): string {
  const colorMap = {
    analyst: { light: '#8B4789', dark: '#B565B3' },
    diplomat: { light: '#4C9F70', dark: '#62C78E' },
    sentinel: { light: '#4A6FDC', dark: '#6B8FE8' },
    explorer: { light: '#D6813E', dark: '#E69B5F' },
  };

  const colors = colorMap[role] || colorMap.analyst;
  return isDark ? colors.dark : colors.light;
}
