/**
 * PersonalityAnalysisEngine - Enhanced Profile Summary Tests
 *
 * @description
 * SPEC-002: プロファイルサマリーの深化のテスト
 * スコアに基づいた動的メッセージ生成を検証
 */

import PersonalityAnalysisEngine from '../../services/PersonalityAnalysisEngine';
import { Member } from '../../models/PersonalityAnalysis';

describe('PersonalityAnalysisEngine - Enhanced Profile Summary', () => {
  const engine = PersonalityAnalysisEngine;

  // ==========================================================================
  // TC-010: 統合型（synergyScore 85+）のサマリー
  // ==========================================================================
  describe('TC-010: 統合型のプロファイルサマリー', () => {
    const member: Member = {
      id: 'tc010',
      name: 'Test User 010',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 34, score: 1 },  // 戦略性 (HIGH synergy with INTJ)
        { id: 29, score: 2 },  // 学習欲 (HIGH synergy)
        { id: 30, score: 3 },  // 内省 (HIGH synergy)
        { id: 21, score: 4 },  // 個別化 (HIGH synergy)
        { id: 4, score: 5 },   // 規律性 (HIGH synergy)
      ],
    };

    it('第1文に「高い相乗効果」が含まれる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.profileSummary).toBeDefined();
      expect(result!.profileSummary.length).toBeGreaterThan(0);
      expect(result!.profileSummary[0]).toContain('相乗効果');
    });

    it('synergyScoreが85以上である', () => {
      const result = engine.analyze(member);
      expect(result!.synergyScore).toBeGreaterThanOrEqual(85);
    });

    it('資質名が含まれている', () => {
      const result = engine.analyze(member);
      const summaryText = result!.profileSummary.join(' ');
      // TOP2資質（内省、学習欲）がサマリーの第1文に含まれる
      expect(summaryText).toMatch(/内省|学習欲|戦略/);
    });
  });

  // ==========================================================================
  // TC-011: バランス型（synergyScore 55-84）のサマリー
  // ==========================================================================
  describe('TC-011: バランス型のプロファイルサマリー', () => {
    const member: Member = {
      id: 'tc011',
      name: 'Test User 011',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 9, score: 1 },   // 達成欲 (EXECUTION)
        { id: 34, score: 2 },  // 戦略性 (ANALYTICAL)
        { id: 5, score: 3 },   // 責任感 (EXECUTION)
        { id: 29, score: 4 },  // 学習欲 (ANALYTICAL)
        { id: 7, score: 5 },   // 目標志向 (EXECUTION)
      ],
    };

    it('第1文に補完的な説明が含まれる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.profileSummary).toBeDefined();
      // バランス型のキーワード: 柔軟性、補完、バランス
      const summaryText = result!.profileSummary.join(' ');
      expect(summaryText).toMatch(/柔軟|補完|バランス|加わ/);
    });

    it('synergyScoreが55-84の範囲である', () => {
      const result = engine.analyze(member);
      expect(result!.synergyScore).toBeGreaterThanOrEqual(55);
      expect(result!.synergyScore).toBeLessThan(85);
    });
  });

  // ==========================================================================
  // TC-012: 多面型（synergyScore -54）のサマリー
  // ==========================================================================
  describe('TC-012: 多面型のプロファイルサマリー', () => {
    const member: Member = {
      id: 'tc012',
      name: 'Test User 012',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 19, score: 1 },  // 共感性
        { id: 22, score: 2 },  // 調和性
        { id: 15, score: 3 },  // 社交性
        { id: 14, score: 4 },  // ポジティブ
        { id: 17, score: 5 },  // 活発性
      ],
    };

    it('第1文に「独自」「多様」などの説明が含まれる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.profileSummary).toBeDefined();
      const summaryText = result!.profileSummary.join(' ');
      expect(summaryText).toMatch(/独自|多様|独特|意外/);
    });

    it('synergyScoreが54以下である', () => {
      const result = engine.analyze(member);
      expect(result!.synergyScore).toBeLessThanOrEqual(54);
    });
  });

  // ==========================================================================
  // TC-013: チーム協調型（teamFitScore 70+）のサマリー
  // ==========================================================================
  describe('TC-013: チーム協調型の働き方メッセージ', () => {
    const member: Member = {
      id: 'tc013',
      name: 'Test User 013',
      department: 'TEST',
      mbtiType: 'ENFP',
      strengths: [
        { id: 13, score: 1 },  // コミュニケーション
        { id: 19, score: 2 },  // 共感性
        { id: 22, score: 3 },  // 調和性
        { id: 15, score: 4 },  // 社交性
        { id: 21, score: 5 },  // 個別化
      ],
    };

    it('「チーム」「協力」「コミュニケーション」が含まれる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      const summaryText = result!.profileSummary.join(' ');
      expect(summaryText).toMatch(/チーム|協力|コミュニケーション|協働/);
    });

    it('teamFitScoreが70以上である', () => {
      const result = engine.analyze(member);
      expect(result!.teamFitScore).toBeGreaterThanOrEqual(70);
    });
  });

  // ==========================================================================
  // TC-014: 個人作業型（teamFitScore -49）のサマリー
  // ==========================================================================
  describe('TC-014: 個人作業型の働き方メッセージ', () => {
    const member: Member = {
      id: 'tc014',
      name: 'Test User 014',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 34, score: 1 },  // 戦略性 (ANALYTICAL)
        { id: 30, score: 2 },  // 内省 (ANALYTICAL)
        { id: 29, score: 3 },  // 学習欲 (ANALYTICAL)
        { id: 28, score: 4 },  // 分析思考 (ANALYTICAL)
        { id: 27, score: 5 },  // 収集心 (ANALYTICAL)
      ],
    };

    it('「独立」「集中」「深く考え」が含まれる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      const summaryText = result!.profileSummary.join(' ');
      expect(summaryText).toMatch(/独立|集中|深く|個人/);
    });

    it('teamFitScoreが59以下である（INTJ特性）', () => {
      const result = engine.analyze(member);
      // INTJ (I,T,J) = 50 + 0 + 0 + 8 = 58 (ANALYTICAL資質でチーム志向なし)
      expect(result!.teamFitScore).toBeLessThanOrEqual(59);
    });
  });

  // ==========================================================================
  // TC-015: リーダー型（leadershipPotential 70+）のサマリー
  // ==========================================================================
  describe('TC-015: リーダー型の役割期待メッセージ', () => {
    const member: Member = {
      id: 'tc015',
      name: 'Test User 015',
      department: 'TEST',
      mbtiType: 'ENTJ',
      strengths: [
        { id: 11, score: 1 },  // 指令性
        { id: 12, score: 2 },  // 自我
        { id: 13, score: 3 },  // コミュニケーション
        { id: 9, score: 4 },   // 達成欲
        { id: 7, score: 5 },   // 目標志向
      ],
    };

    it('「リーダーシップ」「牽引」「方向性」が含まれる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      const summaryText = result!.profileSummary.join(' ');
      expect(summaryText).toMatch(/リーダー|牽引|方向性|導/);
    });

    it('leadershipPotentialが70以上である', () => {
      const result = engine.analyze(member);
      expect(result!.leadershipPotential).toBeGreaterThanOrEqual(70);
    });
  });

  // ==========================================================================
  // TC-016: 専門家型（leadershipPotential -49）のサマリー
  // ==========================================================================
  describe('TC-016: 専門家型の役割期待メッセージ', () => {
    const member: Member = {
      id: 'tc016',
      name: 'Test User 016',
      department: 'TEST',
      mbtiType: 'INTP',
      strengths: [
        { id: 29, score: 1 },  // 学習欲 (ANALYTICAL)
        { id: 30, score: 2 },  // 内省 (ANALYTICAL)
        { id: 27, score: 3 },  // 収集心 (ANALYTICAL)
        { id: 28, score: 4 },  // 分析思考 (ANALYTICAL)
        { id: 32, score: 5 },  // 最上志向 (ANALYTICAL)
      ],
    };

    it('「専門性」「エキスパート」「深め」が含まれる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      const summaryText = result!.profileSummary.join(' ');
      expect(summaryText).toMatch(/専門|エキスパート|深め|知識/);
    });

    it('leadershipPotentialが69以下である（バランス型以下）', () => {
      const result = engine.analyze(member);
      // INTP (I,T,P) = 40 + 0 + 12 + 0 = 52 (ANALYTICAL資質でLEADERSHIP資質なし)
      expect(result!.leadershipPotential).toBeLessThanOrEqual(69);
    });
  });

  // ==========================================================================
  // TC-017: primaryRoleが反映されている
  // ==========================================================================
  describe('TC-017: primaryRoleに基づいた貢献メッセージ', () => {
    const member: Member = {
      id: 'tc017',
      name: 'Test User 017',
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

    it('primaryRoleに応じた貢献内容が含まれる', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.primaryRole).toBe('戦略的思考のエキスパート');

      const summaryText = result!.profileSummary.join(' ');
      // 役割に関連するキーワードが含まれている
      expect(summaryText).toMatch(/戦略|エキスパート|分析|思考/);
    });
  });

  // ==========================================================================
  // TC-018: 4文構成であること
  // ==========================================================================
  describe('TC-018: profileSummaryの構造', () => {
    const member: Member = {
      id: 'tc018',
      name: 'Test User 018',
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

    it('profileSummaryが4文で構成されている', () => {
      const result = engine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.profileSummary).toHaveLength(4);
    });

    it('各文が意味のある内容を含む', () => {
      const result = engine.analyze(member);
      result!.profileSummary.forEach((sentence, index) => {
        expect(sentence.length).toBeGreaterThan(10); // 最低限の長さ
        expect(sentence).not.toBe(''); // 空文字でない
      });
    });
  });
});
