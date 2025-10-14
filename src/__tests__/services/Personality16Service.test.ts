/**
 * Personality16Service Test
 * TDD RED Phase: Test all Personality16Service functions
 * 35 test cases (happy path, edge cases, error cases)
 */

import {
  getPersonalityById,
  getPersonalityByCode,
  getAllPersonalities,
  analyzeTeamPersonalities,
  getRoleGroupColor,
  PERSONALITY_TYPES_DATA,
} from '../../services/Personality16Service';
import { MemberStrengths } from '../../models/StrengthsTypes';

describe('Personality16Service', () => {
  describe('PERSONALITY_TYPES_DATA', () => {
    it('should have 16 types defined', () => {
      expect(PERSONALITY_TYPES_DATA).toHaveLength(16);
    });

    it('should have required properties for each type', () => {
      PERSONALITY_TYPES_DATA.forEach(type => {
        expect(type).toHaveProperty('id');
        expect(type).toHaveProperty('code');
        expect(type).toHaveProperty('name');
        expect(type).toHaveProperty('nameEn');
        expect(type).toHaveProperty('role');
        expect(type).toHaveProperty('roleName');
        expect(type).toHaveProperty('description');
        expect(type).toHaveProperty('colorLight');
        expect(type).toHaveProperty('colorDark');
      });
    });

    it('should have sequential IDs from 1 to 16', () => {
      const ids = PERSONALITY_TYPES_DATA.map(t => t.id).sort((a, b) => a - b);
      expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
    });

    it('should have unique codes', () => {
      const codes = PERSONALITY_TYPES_DATA.map(t => t.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(16);
    });

    it('should have all 16 correct codes', () => {
      const expectedCodes = [
        'INTJ', 'INTP', 'ENTJ', 'ENTP', // Analyst
        'INFJ', 'INFP', 'ENFJ', 'ENFP', // Diplomat
        'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', // Sentinel
        'ISTP', 'ISFP', 'ESTP', 'ESFP', // Explorer
      ];
      const codes = PERSONALITY_TYPES_DATA.map(t => t.code).sort();
      expect(codes).toEqual(expectedCodes.sort());
    });

    it('should have correct role groups', () => {
      const analystTypes = PERSONALITY_TYPES_DATA.filter(t => t.role === 'analyst');
      const diplomatTypes = PERSONALITY_TYPES_DATA.filter(t => t.role === 'diplomat');
      const sentinelTypes = PERSONALITY_TYPES_DATA.filter(t => t.role === 'sentinel');
      const explorerTypes = PERSONALITY_TYPES_DATA.filter(t => t.role === 'explorer');

      expect(analystTypes).toHaveLength(4);
      expect(diplomatTypes).toHaveLength(4);
      expect(sentinelTypes).toHaveLength(4);
      expect(explorerTypes).toHaveLength(4);
    });

    it('should have valid color codes (#RRGGBB)', () => {
      const colorRegex = /^#[0-9A-F]{6}$/i;
      PERSONALITY_TYPES_DATA.forEach(type => {
        expect(type.colorLight).toMatch(colorRegex);
        expect(type.colorDark).toMatch(colorRegex);
      });
    });

    it('should have non-empty descriptions', () => {
      PERSONALITY_TYPES_DATA.forEach(type => {
        expect(type.description.trim()).not.toBe('');
        expect(type.description.length).toBeGreaterThan(10);
      });
    });

    it('should have INTJ type correctly defined', () => {
      const intj = PERSONALITY_TYPES_DATA.find(t => t.code === 'INTJ');
      expect(intj).toBeDefined();
      expect(intj?.id).toBe(1);
      expect(intj?.role).toBe('analyst');
    });

    it('should have ENFP type correctly defined', () => {
      const enfp = PERSONALITY_TYPES_DATA.find(t => t.code === 'ENFP');
      expect(enfp).toBeDefined();
      expect(enfp?.role).toBe('diplomat');
    });
  });

  describe('getPersonalityById()', () => {
    it('should return INTJ for valid ID (1)', () => {
      const personality = getPersonalityById(1);
      expect(personality).toBeDefined();
      expect(personality?.code).toBe('INTJ');
    });

    it('should return last type for valid ID (16)', () => {
      const personality = getPersonalityById(16);
      expect(personality).toBeDefined();
    });

    it('should return undefined for invalid ID (0)', () => {
      const personality = getPersonalityById(0);
      expect(personality).toBeUndefined();
    });

    it('should return undefined for invalid ID (17)', () => {
      const personality = getPersonalityById(17);
      expect(personality).toBeUndefined();
    });

    it('should return undefined for invalid ID (-1)', () => {
      const personality = getPersonalityById(-1);
      expect(personality).toBeUndefined();
    });

    it('should return undefined for invalid ID (999)', () => {
      const personality = getPersonalityById(999);
      expect(personality).toBeUndefined();
    });

    it('should return undefined for null', () => {
      const personality = getPersonalityById(null as any);
      expect(personality).toBeUndefined();
    });

    it('should return undefined for undefined', () => {
      const personality = getPersonalityById(undefined as any);
      expect(personality).toBeUndefined();
    });

    it('should return undefined for string', () => {
      const personality = getPersonalityById('1' as any);
      expect(personality).toBeUndefined();
    });
  });

  describe('getPersonalityByCode()', () => {
    it('should return type for valid code (INTJ)', () => {
      const personality = getPersonalityByCode('INTJ');
      expect(personality).toBeDefined();
      expect(personality?.id).toBe(1);
      expect(personality?.code).toBe('INTJ');
    });

    it('should return type for valid code (ENFP)', () => {
      const personality = getPersonalityByCode('ENFP');
      expect(personality).toBeDefined();
      expect(personality?.role).toBe('diplomat');
    });

    it('should return type for lowercase code (intj)', () => {
      const personality = getPersonalityByCode('intj');
      expect(personality).toBeDefined();
      expect(personality?.code).toBe('INTJ');
    });

    it('should return type for mixed case code (InTj)', () => {
      const personality = getPersonalityByCode('InTj');
      expect(personality).toBeDefined();
      expect(personality?.code).toBe('INTJ');
    });

    it('should return undefined for invalid code (XXXX)', () => {
      const personality = getPersonalityByCode('XXXX');
      expect(personality).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const personality = getPersonalityByCode('');
      expect(personality).toBeUndefined();
    });

    it('should return undefined for null', () => {
      const personality = getPersonalityByCode(null as any);
      expect(personality).toBeUndefined();
    });
  });

  describe('getAllPersonalities()', () => {
    it('should return all 16 types', () => {
      const personalities = getAllPersonalities();
      expect(personalities).toHaveLength(16);
    });

    it('should return sorted array (ID ascending)', () => {
      const personalities = getAllPersonalities();
      const ids = personalities.map(p => p.id);
      const sortedIds = [...ids].sort((a, b) => a - b);
      expect(ids).toEqual(sortedIds);
    });

    it('should not modify original master data (immutable)', () => {
      const personalities = getAllPersonalities();
      const originalCode = personalities[0].code;
      personalities[0].code = 'XXXX';

      const reloaded = getAllPersonalities();
      expect(reloaded[0].code).toBe(originalCode);
    });
  });

  describe('analyzeTeamPersonalities()', () => {
    const mockMembers: MemberStrengths[] = [
      {
        id: '1',
        name: 'Taro',
        department: 'DEV',
        strengths: [],
        personalityId: 1,
        personalityVariant: 'A'
      }, // INTJ-A
      {
        id: '2',
        name: 'Hanako',
        department: 'DEV',
        strengths: [],
        personalityId: 1,
        personalityVariant: 'T'
      }, // INTJ-T
      {
        id: '3',
        name: 'Jiro',
        department: 'DEV',
        strengths: [],
        personalityId: 5,
        personalityVariant: 'A'
      }, // INFJ-A
      {
        id: '4',
        name: 'Saburo',
        department: 'DEV',
        strengths: [],
        personalityId: undefined
      }, // No 16P
    ];

    it('should correctly aggregate type distribution', () => {
      const analysis = analyzeTeamPersonalities(mockMembers);
      expect(analysis.typeDistribution[1]).toBe(2); // INTJ: 2
      expect(analysis.typeDistribution[5]).toBe(1); // INFJ: 1
    });

    it('should correctly aggregate role distribution', () => {
      const analysis = analyzeTeamPersonalities(mockMembers);
      expect(analysis.roleDistribution.analyst).toBe(2); // INTJ×2 = 2
      expect(analysis.roleDistribution.diplomat).toBe(1); // INFJ×1 = 1
    });

    it('should correctly aggregate variant distribution', () => {
      const analysis = analyzeTeamPersonalities(mockMembers);
      expect(analysis.variantDistribution.A).toBe(2); // -A: 2
      expect(analysis.variantDistribution.T).toBe(1); // -T: 1
    });

    it('should exclude members without 16P', () => {
      const analysis = analyzeTeamPersonalities(mockMembers);
      expect(analysis.totalMembers).toBe(3); // With 16P: 3
    });

    it('should return initialized result for empty array', () => {
      const analysis = analyzeTeamPersonalities([]);
      expect(analysis.totalMembers).toBe(0);
      expect(analysis.typeDistribution).toEqual({});
    });

    it('should return empty result when all members have no 16P', () => {
      const members: MemberStrengths[] = [
        { id: '1', name: 'Taro', department: 'DEV', strengths: [], personalityId: undefined },
      ];
      const analysis = analyzeTeamPersonalities(members);
      expect(analysis.totalMembers).toBe(0);
    });

    it('should exclude members with invalid personalityId', () => {
      const members: MemberStrengths[] = [
        { id: '1', name: 'Taro', department: 'DEV', strengths: [], personalityId: 999 },
      ];
      const analysis = analyzeTeamPersonalities(members);
      expect(analysis.totalMembers).toBe(0);
    });
  });

  describe('getRoleGroupColor()', () => {
    it('should return analyst color (Light)', () => {
      const color = getRoleGroupColor('analyst', false);
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should return diplomat color (Dark)', () => {
      const color = getRoleGroupColor('diplomat', true);
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('should return sentinel color', () => {
      const color = getRoleGroupColor('sentinel', false);
      expect(color).toBeDefined();
    });

    it('should return explorer color', () => {
      const color = getRoleGroupColor('explorer', false);
      expect(color).toBeDefined();
    });

    it('should return default color for invalid role', () => {
      const color = getRoleGroupColor('invalid' as any, false);
      expect(color).toBeDefined();
    });
  });
});
