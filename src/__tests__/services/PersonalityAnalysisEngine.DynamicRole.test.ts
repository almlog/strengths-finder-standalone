/**
 * PersonalityAnalysisEngine - Dynamic Role Generation Tests
 *
 * @description
 * SPEC-001: 統合分析結果（primaryRole）の動的生成のテスト
 * MBTI × 資質の組み合わせで役割が動的に変わることを検証
 */

import PersonalityAnalysisEngine from '../../services/PersonalityAnalysisEngine';
import { Member } from '../../models/PersonalityAnalysis';

describe('PersonalityAnalysisEngine - Dynamic Role Generation', () => {
  const engine = PersonalityAnalysisEngine;

  // ==========================================================================
  // TC-001: INTJ + 戦略的思考力
  // ==========================================================================
  describe('TC-001: INTJ + 戦略的思考力', () => {
    const member: Member = {
      id: 'tc001',
      name: 'Test User 001',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 34, score: 1 },  // 戦略性
        { id: 32, score: 2 },  // 最上志向
        { id: 29, score: 3 },  // 学習欲
        { id: 27, score: 4 },  // 収集心
        { id: 30, score: 5 },  // 内省
      ],
    };

    it('primaryRoleが「戦略的思考のエキスパート」になる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.primaryRole).toBe('戦略的思考のエキスパート');
    });

    it('analysisMode が full である', () => {
      const result = engine.analyze(member);
      expect(result!.analysisMode).toBe('full');
    });

    it('mbtiType が INTJ である', () => {
      const result = engine.analyze(member);
      expect(result!.mbtiType).toBe('INTJ');
    });
  });

  // ==========================================================================
  // TC-002: INTJ + 実行力
  // ==========================================================================
  describe('TC-002: INTJ + 実行力', () => {
    const member: Member = {
      id: 'tc002',
      name: 'Test User 002',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 9, score: 1 },   // 達成欲
        { id: 5, score: 2 },   // 責任感
        { id: 4, score: 3 },   // 規律性
        { id: 7, score: 4 },   // 目標志向
        { id: 2, score: 5 },   // 信念
      ],
    };

    it('primaryRoleが「計画実行のスペシャリスト」になる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.primaryRole).toBe('計画実行のスペシャリスト');
    });

    it('TC-001とは異なる役割になる', () => {
      const member1: Member = {
        id: 'tc001',
        name: 'Test User 001',
        department: 'TEST',
        mbtiType: 'INTJ',
        strengths: [
          { id: 34, score: 1 },
          { id: 32, score: 2 },
          { id: 29, score: 3 },
          { id: 27, score: 4 },
          { id: 30, score: 5 },
        ],
      };

      const result1 = engine.analyze(member1);
      const result2 = engine.analyze(member);

      expect(result1!.primaryRole).not.toBe(result2!.primaryRole);
    });
  });

  // ==========================================================================
  // TC-003: INTJ + 影響力
  // ==========================================================================
  describe('TC-003: INTJ + 影響力', () => {
    const member: Member = {
      id: 'tc003',
      name: 'Test User 003',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 11, score: 1 },  // 指令性
        { id: 12, score: 2 },  // 自我
        { id: 13, score: 3 },  // コミュニケーション
        { id: 17, score: 4 },  // 活発性
        { id: 14, score: 5 },  // ポジティブ
      ],
    };

    it('primaryRoleが「戦略的リーダー」になる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.primaryRole).toBe('戦略的リーダー');
    });
  });

  // ==========================================================================
  // TC-004: INTJ + 人間関係構築力
  // ==========================================================================
  describe('TC-004: INTJ + 人間関係構築力', () => {
    const member: Member = {
      id: 'tc004',
      name: 'Test User 004',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 19, score: 1 },  // 共感性
        { id: 22, score: 2 },  // 調和性
        { id: 21, score: 3 },  // 個別化
        { id: 24, score: 4 },  // 包含
        { id: 26, score: 5 },  // 適応性
      ],
    };

    it('primaryRoleが「分析型ファシリテーター」になる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.primaryRole).toBe('分析型ファシリテーター');
    });
  });

  // ==========================================================================
  // TC-005: ENFP + 影響力
  // ==========================================================================
  describe('TC-005: ENFP + 影響力', () => {
    const member: Member = {
      id: 'tc005',
      name: 'Test User 005',
      department: 'TEST',
      mbtiType: 'ENFP',
      strengths: [
        { id: 13, score: 1 },  // コミュニケーション
        { id: 17, score: 2 },  // 活発性
        { id: 15, score: 3 },  // 社交性
        { id: 11, score: 4 },  // 指令性
        { id: 14, score: 5 },  // ポジティブ
      ],
    };

    it('primaryRoleが「人を導くリーダー」になる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.primaryRole).toBe('人を導くリーダー');
    });

    it('同じ影響力資質でもMBTIが違えば役割が変わる（INTJ vs ENFP）', () => {
      const intjMember: Member = {
        id: 'tc003',
        name: 'Test INTJ',
        department: 'TEST',
        mbtiType: 'INTJ',
        strengths: [
          { id: 11, score: 1 },
          { id: 12, score: 2 },
          { id: 13, score: 3 },
          { id: 17, score: 4 },
          { id: 14, score: 5 },
        ],
      };

      const intjResult = engine.analyze(intjMember);
      const enfpResult = engine.analyze(member);

      expect(intjResult!.primaryRole).toBe('戦略的リーダー');
      expect(enfpResult!.primaryRole).toBe('人を導くリーダー');
      expect(intjResult!.primaryRole).not.toBe(enfpResult!.primaryRole);
    });
  });

  // ==========================================================================
  // TC-006: ISTJ + 人間関係構築力
  // ==========================================================================
  describe('TC-006: ISTJ + 人間関係構築力', () => {
    const member: Member = {
      id: 'tc006',
      name: 'Test User 006',
      department: 'TEST',
      mbtiType: 'ISTJ',
      strengths: [
        { id: 19, score: 1 },  // 共感性
        { id: 22, score: 2 },  // 調和性
        { id: 21, score: 3 },  // 個別化
        { id: 24, score: 4 },  // 包含
        { id: 26, score: 5 },  // 適応性
      ],
    };

    it('primaryRoleが「チームの要」になる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.primaryRole).toBe('チームの要');
    });
  });

  // ==========================================================================
  // TC-007: ESTP + 実行力
  // ==========================================================================
  describe('TC-007: ESTP + 実行力', () => {
    const member: Member = {
      id: 'tc007',
      name: 'Test User 007',
      department: 'TEST',
      mbtiType: 'ESTP',
      strengths: [
        { id: 9, score: 1 },   // 達成欲
        { id: 5, score: 2 },   // 責任感
        { id: 4, score: 3 },   // 規律性
        { id: 7, score: 4 },   // 目標志向
        { id: 2, score: 5 },   // 信念
      ],
    };

    it('primaryRoleが「即応の実行者」になる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.primaryRole).toBe('即応の実行者');
    });
  });

  // ==========================================================================
  // TC-008: MBTIのみモードでは既存ロジックを維持
  // ==========================================================================
  describe('TC-008: MBTIのみモードの後方互換性', () => {
    const member: Member = {
      id: 'tc008',
      name: 'Test User 008',
      department: 'TEST',
      mbtiType: 'INTJ',
      // strengths なし
    };

    it('MBTIのみの場合は profile.teamDynamics.naturalRole を使用', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.analysisMode).toBe('mbti-only');
      // MBTIプロファイルに定義されている役割が返される
      expect(result!.primaryRole).toBeTruthy();
    });
  });

  // ==========================================================================
  // TC-009: 資質のみモードでは既存ロジックを維持
  // ==========================================================================
  describe('TC-009: 資質のみモードの後方互換性', () => {
    const member: Member = {
      id: 'tc009',
      name: 'Test User 009',
      department: 'TEST',
      // mbtiType なし
      strengths: [
        { id: 34, score: 1 },
        { id: 32, score: 2 },
        { id: 29, score: 3 },
        { id: 27, score: 4 },
        { id: 30, score: 5 },
      ],
    };

    it('資質のみの場合は inferRoleFromStrengths を使用', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.analysisMode).toBe('strengths-only');
      // 既存の資質ベース推定が返される
      expect(result!.primaryRole).toBeTruthy();
    });
  });
});
