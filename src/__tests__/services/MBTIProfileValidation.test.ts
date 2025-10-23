// MBTIプロファイルデータのバリデーションテスト（TDD: RED Phase）

import PersonalityAnalysisEngine from '../../services/PersonalityAnalysisEngine';
import StrengthsService from '../../services/StrengthsService';
import { MBTIType } from '../../models/PersonalityAnalysis';

describe('MBTIプロファイルデータのバリデーション', () => {
  const engine = PersonalityAnalysisEngine;

  // 全16タイプのリスト
  const allMBTITypes: MBTIType[] = [
    'INTJ', 'INTP', 'ENTJ', 'ENTP',
    'INFJ', 'INFP', 'ENFJ', 'ENFP',
    'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ',
    'ISTP', 'ISFP', 'ESTP', 'ESFP',
  ];

  // 実装済みタイプ（Phase 3目標: 16タイプ全て）
  const implementedTypes: MBTIType[] = allMBTITypes;

  describe('実装済みタイプの検証', () => {
    implementedTypes.forEach((mbtiType) => {
      describe(`${mbtiType}タイプ`, () => {
        let profile: any;

        beforeEach(() => {
          // プライベートメソッドにアクセスするため、anyでキャスト
          const engineAny = engine as any;
          profile = engineAny.profiles.get(mbtiType);
        });

        it('プロファイルが存在する', () => {
          expect(profile).toBeDefined();
          expect(profile).not.toBeNull();
        });

        it('基本フィールドが正しく設定されている', () => {
          expect(profile.type).toBe(mbtiType);
          expect(profile.name).toBeTruthy();
          expect(profile.description).toBeTruthy();
        });

        it('characteristics フィールドがすべて存在する', () => {
          expect(profile.characteristics).toBeDefined();
          expect(profile.characteristics.strengths).toBeInstanceOf(Array);
          expect(profile.characteristics.strengths.length).toBeGreaterThan(0);
          expect(profile.characteristics.weaknesses).toBeInstanceOf(Array);
          expect(profile.characteristics.weaknesses.length).toBeGreaterThan(0);
          expect(profile.characteristics.workStyle).toBeTruthy();
          expect(profile.characteristics.communicationStyle).toBeTruthy();
          expect(profile.characteristics.learningStyle).toBeTruthy();
          expect(profile.characteristics.decisionMaking).toBeTruthy();
        });

        it('motivation フィールドがすべて存在する', () => {
          expect(profile.motivation).toBeDefined();
          expect(profile.motivation.motivators).toBeInstanceOf(Array);
          expect(profile.motivation.motivators.length).toBeGreaterThan(0);
          expect(profile.motivation.demotivators).toBeInstanceOf(Array);
          expect(profile.motivation.stressors).toBeInstanceOf(Array);
          expect(profile.motivation.stressRelief).toBeInstanceOf(Array);
        });

        it('teamDynamics フィールドがすべて存在する', () => {
          expect(profile.teamDynamics).toBeDefined();
          expect(profile.teamDynamics.naturalRole).toBeTruthy();
          expect(profile.teamDynamics.bestEnvironment).toBeTruthy();
          expect(profile.teamDynamics.idealTeamSize).toBeTruthy();
          expect(profile.teamDynamics.conflictStyle).toBeTruthy();
        });

        it('strengthsSynergy フィールドがすべて存在する', () => {
          expect(profile.strengthsSynergy).toBeDefined();
          expect(profile.strengthsSynergy.highSynergy).toBeInstanceOf(Array);
          expect(profile.strengthsSynergy.moderateSynergy).toBeInstanceOf(Array);
          expect(profile.strengthsSynergy.lowSynergy).toBeInstanceOf(Array);
        });

        it('mbtiCompatibility フィールドがすべて存在する', () => {
          expect(profile.mbtiCompatibility).toBeDefined();
          expect(profile.mbtiCompatibility.naturalPartners).toBeInstanceOf(Array);
          expect(profile.mbtiCompatibility.complementary).toBeInstanceOf(Array);
          expect(profile.mbtiCompatibility.challenging).toBeInstanceOf(Array);
        });

        it('careerPaths フィールドがすべて存在する', () => {
          expect(profile.careerPaths).toBeDefined();
          expect(profile.careerPaths.idealFields).toBeInstanceOf(Array);
          expect(profile.careerPaths.idealFields.length).toBeGreaterThan(0);
          expect(profile.careerPaths.roleExamples).toBeInstanceOf(Array);
          expect(profile.careerPaths.roleExamples.length).toBeGreaterThan(0);
          expect(profile.careerPaths.developmentAreas).toBeInstanceOf(Array);
          expect(profile.careerPaths.developmentAreas.length).toBeGreaterThan(0);
        });
      });
    });
  });

  describe('strengthsSynergy IDの検証（StrengthsServiceとの整合性）', () => {
    implementedTypes.forEach((mbtiType) => {
      describe(`${mbtiType}タイプ`, () => {
        let profile: any;

        beforeEach(() => {
          const engineAny = engine as any;
          profile = engineAny.profiles.get(mbtiType);
        });

        it('highSynergy の全IDがStrengthsServiceに存在する', () => {
          const invalidIds: number[] = [];
          profile.strengthsSynergy.highSynergy.forEach((id: number) => {
            const strength = StrengthsService.getStrengthById(id);
            if (!strength) {
              invalidIds.push(id);
            }
          });
          expect(invalidIds).toEqual([]);
        });

        it('moderateSynergy の全IDがStrengthsServiceに存在する', () => {
          const invalidIds: number[] = [];
          profile.strengthsSynergy.moderateSynergy.forEach((id: number) => {
            const strength = StrengthsService.getStrengthById(id);
            if (!strength) {
              invalidIds.push(id);
            }
          });
          expect(invalidIds).toEqual([]);
        });

        it('lowSynergy の全IDがStrengthsServiceに存在する', () => {
          const invalidIds: number[] = [];
          profile.strengthsSynergy.lowSynergy.forEach((id: number) => {
            const strength = StrengthsService.getStrengthById(id);
            if (!strength) {
              invalidIds.push(id);
            }
          });
          expect(invalidIds).toEqual([]);
        });

        it('strengthsSynergy のIDに重複がない', () => {
          const allIds = [
            ...profile.strengthsSynergy.highSynergy,
            ...profile.strengthsSynergy.moderateSynergy,
            ...profile.strengthsSynergy.lowSynergy,
          ];
          const uniqueIds = new Set(allIds);
          expect(allIds.length).toBe(uniqueIds.size);
        });

        it('strengthsSynergy のIDがすべて1-34の範囲内', () => {
          const allIds = [
            ...profile.strengthsSynergy.highSynergy,
            ...profile.strengthsSynergy.moderateSynergy,
            ...profile.strengthsSynergy.lowSynergy,
          ];
          allIds.forEach((id: number) => {
            expect(id).toBeGreaterThanOrEqual(1);
            expect(id).toBeLessThanOrEqual(34);
          });
        });
      });
    });
  });

  describe('mbtiCompatibility の検証', () => {
    implementedTypes.forEach((mbtiType) => {
      describe(`${mbtiType}タイプ`, () => {
        let profile: any;

        beforeEach(() => {
          const engineAny = engine as any;
          profile = engineAny.profiles.get(mbtiType);
        });

        it('naturalPartners が有効なMBTIタイプ', () => {
          profile.mbtiCompatibility.naturalPartners.forEach((type: string) => {
            expect(allMBTITypes).toContain(type as MBTIType);
          });
        });

        it('complementary が有効なMBTIタイプ', () => {
          profile.mbtiCompatibility.complementary.forEach((type: string) => {
            expect(allMBTITypes).toContain(type as MBTIType);
          });
        });

        it('challenging が有効なMBTIタイプ', () => {
          profile.mbtiCompatibility.challenging.forEach((type: string) => {
            expect(allMBTITypes).toContain(type as MBTIType);
          });
        });

        it('自分自身がcompatibilityリストに含まれていない', () => {
          const allCompatTypes = [
            ...profile.mbtiCompatibility.naturalPartners,
            ...profile.mbtiCompatibility.complementary,
            ...profile.mbtiCompatibility.challenging,
          ];
          expect(allCompatTypes).not.toContain(mbtiType);
        });

        it('compatibilityリストに重複がない', () => {
          const allCompatTypes = [
            ...profile.mbtiCompatibility.naturalPartners,
            ...profile.mbtiCompatibility.complementary,
            ...profile.mbtiCompatibility.challenging,
          ];
          const uniqueTypes = new Set(allCompatTypes);
          expect(allCompatTypes.length).toBe(uniqueTypes.size);
        });
      });
    });
  });

  describe('データの網羅性チェック', () => {
    it('実装済みタイプ数を確認', () => {
      // Phase 3目標: 16タイプ全て実装
      expect(implementedTypes.length).toBe(16);
    });

    it('未実装タイプを確認', () => {
      const unimplementedTypes = allMBTITypes.filter(
        (type) => !implementedTypes.includes(type)
      );

      // 未実装タイプが存在する場合は警告
      if (unimplementedTypes.length > 0) {
        console.warn(`未実装のMBTIタイプ: ${unimplementedTypes.join(', ')}`);
      }

      // Phase 3目標: すべて実装されているべき
      expect(unimplementedTypes.length).toBe(0);
    });
  });
});
