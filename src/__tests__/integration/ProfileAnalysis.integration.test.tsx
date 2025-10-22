// ProfileAnalysis統合テスト（簡略版）
// Phase 1-2のユニットテストで個別コンポーネントの動作は確認済み
// このテストでは、実際の統合動作の確認に焦点を当てる

import PersonalityAnalysisEngine from '../../services/PersonalityAnalysisEngine';
import { Member } from '../../models/PersonalityAnalysis';
import StrengthsService from '../../services/StrengthsService';

describe('ProfileAnalysis統合テスト', () => {
  describe('PersonalityAnalysisEngine と StrengthsService の統合', () => {
    it('PersonalityAnalysisEngineがStrengthsServiceの資質IDを正しく使用する', () => {
      // 完全データ（MBTI + 資質）を持つメンバー
      const member: Member = {
        id: 'test-001',
        name: 'テスト統合',
        department: 'TEST',
        mbtiType: 'INTJ',
        strengths: [
          { id: 4, score: 1 },  // 分析思考
          { id: 20, score: 2 }, // 内省
          { id: 29, score: 3 }, // 戦略性
          { id: 21, score: 4 }, // 学習欲
          { id: 9, score: 5 },  // 目標志向
        ],
      };

      const result = PersonalityAnalysisEngine.analyze(member);

      expect(result).not.toBeNull();
      if (!result) return;

      // TOP資質名が正しく取得されていること（StrengthsServiceから）
      expect(result.topStrengthNames).toBeDefined();
      expect(result.topStrengthNames!.length).toBe(5);

      // 各資質名がStrengthsServiceと一致すること
      result.topStrengthNames!.forEach((strengthName, index) => {
        const strengthId = member.strengths![index].id;
        const strength = StrengthsService.getStrengthById(strengthId);
        expect(strength).toBeDefined();
        expect(strengthName).toBe(strength!.name);
      });
    });

    it('すべての実装済みMBTIタイプで分析が正常動作する', () => {
      const implementedTypes = ['INTJ', 'ENFP', 'ENTJ', 'INFJ', 'ENFJ', 'INTP'];

      implementedTypes.forEach((mbtiType) => {
        const member: Member = {
          id: `test-${mbtiType}`,
          name: `Test ${mbtiType}`,
          department: 'TEST',
          mbtiType: mbtiType as any,
          strengths: [
            { id: 1, score: 1 },
            { id: 2, score: 2 },
            { id: 3, score: 3 },
            { id: 4, score: 4 },
            { id: 5, score: 5 },
          ],
        };

        const result = PersonalityAnalysisEngine.analyze(member);

        expect(result).not.toBeNull();
        expect(result!.analysisMode).toBe('full');
        expect(result!.mbtiType).toBe(mbtiType);
        expect(result!.primaryRole).toBeTruthy();
        expect(result!.synergyScore).toBeGreaterThan(0);
        expect(result!.teamFitScore).toBeGreaterThan(0);
        expect(result!.leadershipPotential).toBeGreaterThan(0);
      });
    });

    it('MBTIのみモードでも正常動作する', () => {
      const member: Member = {
        id: 'test-mbti-only',
        name: 'Test MBTI Only',
        department: 'TEST',
        mbtiType: 'ENFJ',
        strengths: [],
      };

      const result = PersonalityAnalysisEngine.analyze(member);

      expect(result).not.toBeNull();
      expect(result!.analysisMode).toBe('mbti-only');
      expect(result!.mbtiType).toBe('ENFJ');
      expect(result!.teamFitScore).toBeGreaterThan(0);
      expect(result!.leadershipPotential).toBeGreaterThan(0);
    });

    it('資質のみモードでも正常動作する', () => {
      const member: Member = {
        id: 'test-strengths-only',
        name: 'Test Strengths Only',
        department: 'TEST',
        strengths: [
          { id: 2, score: 1 },  // 活発性
          { id: 8, score: 2 },  // コミュニケーション
          { id: 14, score: 3 }, // 共感性
          { id: 17, score: 4 }, // ポジティブ
          { id: 30, score: 5 }, // 社交性
        ],
      };

      const result = PersonalityAnalysisEngine.analyze(member);

      expect(result).not.toBeNull();
      expect(result!.analysisMode).toBe('strengths-only');
      expect(result!.teamFitScore).toBeGreaterThan(0);
      expect(result!.leadershipPotential).toBeGreaterThan(0);
      expect(result!.topStrengthNames).toBeDefined();
      expect(result!.topStrengthNames!.length).toBe(5);
    });

    it('データがない場合はnullを返す', () => {
      const member: Member = {
        id: 'test-no-data',
        name: 'Test No Data',
        department: 'TEST',
        strengths: [],
      };

      const result = PersonalityAnalysisEngine.analyze(member);

      expect(result).toBeNull();
    });
  });

  describe('MBTIプロファイルとStrengthsSynergyの整合性', () => {
    it('すべてのstrengthsSynergyのIDがStrengthsServiceに存在する', () => {
      const implementedTypes = ['INTJ', 'ENFP', 'ENTJ', 'INFJ', 'ENFJ', 'INTP'];
      const engine = PersonalityAnalysisEngine as any;

      implementedTypes.forEach((mbtiType) => {
        const profile = engine.profiles.get(mbtiType);
        expect(profile).toBeDefined();

        const allStrengthIds = [
          ...profile.strengthsSynergy.highSynergy,
          ...profile.strengthsSynergy.moderateSynergy,
          ...profile.strengthsSynergy.lowSynergy,
        ];

        allStrengthIds.forEach((id: number) => {
          const strength = StrengthsService.getStrengthById(id);
          expect(strength).toBeDefined();
          expect(strength!.id).toBe(id);
        });
      });
    });
  });

  describe('スコア計算の妥当性', () => {
    it('相性スコアが0-100の範囲内である', () => {
      const member: Member = {
        id: 'test-scores',
        name: 'Test Scores',
        department: 'TEST',
        mbtiType: 'INTJ',
        strengths: [
          { id: 4, score: 1 },
          { id: 20, score: 2 },
          { id: 29, score: 3 },
          { id: 21, score: 4 },
          { id: 9, score: 5 },
        ],
      };

      const result = PersonalityAnalysisEngine.analyze(member);

      expect(result).not.toBeNull();
      expect(result!.synergyScore).toBeGreaterThanOrEqual(0);
      expect(result!.synergyScore).toBeLessThanOrEqual(100);
      expect(result!.teamFitScore).toBeGreaterThanOrEqual(0);
      expect(result!.teamFitScore).toBeLessThanOrEqual(100);
      expect(result!.leadershipPotential).toBeGreaterThanOrEqual(0);
      expect(result!.leadershipPotential).toBeLessThanOrEqual(100);
    });

    it('高相性資質を持つ場合、相性スコアが高い', () => {
      const engine = PersonalityAnalysisEngine as any;
      const intjProfile = engine.profiles.get('INTJ');

      // INTJの高相性資質をすべて持つメンバー
      const highSynergyMember: Member = {
        id: 'test-high-synergy',
        name: 'High Synergy Test',
        department: 'TEST',
        mbtiType: 'INTJ',
        strengths: intjProfile.strengthsSynergy.highSynergy
          .slice(0, 5)
          .map((id: number, index: number) => ({ id, score: index + 1 })),
      };

      const highResult = PersonalityAnalysisEngine.analyze(highSynergyMember);

      // 低相性資質を持つメンバー
      const lowSynergyMember: Member = {
        id: 'test-low-synergy',
        name: 'Low Synergy Test',
        department: 'TEST',
        mbtiType: 'INTJ',
        strengths: intjProfile.strengthsSynergy.lowSynergy
          .slice(0, 5)
          .map((id: number, index: number) => ({ id, score: index + 1 })),
      };

      const lowResult = PersonalityAnalysisEngine.analyze(lowSynergyMember);

      expect(highResult).not.toBeNull();
      expect(lowResult).not.toBeNull();
      expect(highResult!.synergyScore).toBeGreaterThan(lowResult!.synergyScore);
    });
  });

  describe('バージョン情報', () => {
    it('分析結果にバージョン情報が含まれる', () => {
      const member: Member = {
        id: 'test-version',
        name: 'Version Test',
        department: 'TEST',
        mbtiType: 'ENFP',
        strengths: [{ id: 1, score: 1 }],
      };

      const result = PersonalityAnalysisEngine.analyze(member);

      expect(result).not.toBeNull();
      expect(result!.version).toBe('v1.0.0');
      expect(result!.analysisDate).toBeDefined();
    });
  });
});
