/**
 * PersonalityAnalysisEngine サービステスト
 */

import PersonalityAnalysisEngine from '../../services/PersonalityAnalysisEngine';
import { Member } from '../../models/PersonalityAnalysis';

describe('PersonalityAnalysisEngine - 完全モード分析', () => {
  it('INTJタイプ + 相性良い資質 → 高いsynergyScore', () => {
    const member: Member = {
      id: '001',
      name: 'テストユーザー',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 4, score: 1 },  // 分析思考 (highSynergy)
        { id: 20, score: 2 }, // 内省 (highSynergy)
        { id: 29, score: 3 }, // 戦略性 (highSynergy)
        { id: 21, score: 4 }, // 学習欲 (highSynergy)
        { id: 34, score: 5 }, // 目標志向 (highSynergy)
      ],
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.analysisMode).toBe('full');
    expect(result!.synergyScore).toBeGreaterThan(80); // 高相性なので80点以上
  });

  it('INTJタイプ + 相性悪い資質 → 低いsynergyScore', () => {
    const member: Member = {
      id: '002',
      name: 'テストユーザー2',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 2, score: 1 },  // 活発性 (lowSynergy)
        { id: 9, score: 2 },  // 競争性 (lowSynergy)
        { id: 15, score: 3 }, // 調和性 (lowSynergy)
        { id: 19, score: 4 }, // 収集心 (lowSynergy)
        { id: 30, score: 5 }, // 社交性 (lowSynergy)
      ],
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.analysisMode).toBe('full');
    expect(result!.synergyScore).toBeLessThan(50); // 低相性なので50点未満
  });

  it('スコア計算の重み付けが正しい（TOP1が最も影響大）', () => {
    // TOP2-5を同じにして、TOP1の影響だけを測定
    const memberHighTop1: Member = {
      id: '003',
      name: 'TOP1高相性',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 4, score: 1 },  // 分析思考 (highSynergy) - TOP1 重み50%
        { id: 16, score: 2 }, // 着想 (moderateSynergy) - TOP2 重み30%
        { id: 31, score: 3 }, // 未来志向 (moderateSynergy)
        { id: 22, score: 4 }, // 最上志向 (moderateSynergy)
        { id: 13, score: 5 }, // 慎重さ (moderateSynergy)
      ],
    };

    const memberLowTop1: Member = {
      id: '004',
      name: 'TOP1低相性',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 2, score: 1 },  // 活発性 (lowSynergy) - TOP1 重み50%
        { id: 16, score: 2 }, // 着想 (moderateSynergy) - TOP2 重み30%
        { id: 31, score: 3 }, // 未来志向 (moderateSynergy)
        { id: 22, score: 4 }, // 最上志向 (moderateSynergy)
        { id: 13, score: 5 }, // 慎重さ (moderateSynergy)
      ],
    };

    const resultHigh = PersonalityAnalysisEngine.analyze(memberHighTop1);
    const resultLow = PersonalityAnalysisEngine.analyze(memberLowTop1);

    // TOP1が高相性(95)と低相性(35)の差: (95-35) * 0.5 = 30点の差
    expect(resultHigh!.synergyScore).toBeGreaterThan(resultLow!.synergyScore);
  });

  it('プロファイルサマリーが正しく生成される', () => {
    const member: Member = {
      id: '005',
      name: 'サマリーテスト',
      department: 'TEST',
      mbtiType: 'INTJ',
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
    expect(result!.profileSummary).toBeDefined();
    expect(Array.isArray(result!.profileSummary)).toBe(true);
    expect(result!.profileSummary.length).toBeGreaterThan(0);
    // MBTIタイプ名が含まれる
    expect(result!.profileSummary.join(' ')).toContain('INTJ');
  });

  it('TOP5資質名が正しく取得される', () => {
    const member: Member = {
      id: '006',
      name: '資質名テスト',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 1, score: 1 },  // 達成欲
        { id: 27, score: 2 }, // 分析思考
        { id: 16, score: 3 }, // コミュニケーション
        { id: 34, score: 4 }, // 内省
        { id: 32, score: 5 }, // 戦略性
      ],
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.topStrengthNames).toBeDefined();
    expect(result!.topStrengthNames).toHaveLength(5);
    expect(result!.topStrengthNames).toContain('達成欲');
    expect(result!.topStrengthNames).toContain('分析思考');
    expect(result!.topStrengthNames).toContain('戦略性');
  });
});

describe('PersonalityAnalysisEngine - MBTIのみモード', () => {
  it('INTJタイプ → 戦略家・設計者', () => {
    const member: Member = {
      id: '101',
      name: 'MBTIのみユーザー',
      department: 'TEST',
      mbtiType: 'INTJ',
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.analysisMode).toBe('mbti-only');
    expect(result!.primaryRole).toContain('戦略家');
  });

  it('synergyScore = 0', () => {
    const member: Member = {
      id: '102',
      name: 'MBTIのみユーザー2',
      department: 'TEST',
      mbtiType: 'ENFP',
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.synergyScore).toBe(0);
  });

  it('teamFitScoreが推定値', () => {
    const member: Member = {
      id: '103',
      name: 'MBTIのみユーザー3',
      department: 'TEST',
      mbtiType: 'ENFP',
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.teamFitScore).toBeGreaterThan(0);
    expect(result!.teamFitScore).toBeLessThanOrEqual(100);
  });

  it('leadershipPotentialが推定値', () => {
    const member: Member = {
      id: '104',
      name: 'MBTIのみユーザー4',
      department: 'TEST',
      mbtiType: 'ENTJ',
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.leadershipPotential).toBeGreaterThan(0);
    expect(result!.leadershipPotential).toBeLessThanOrEqual(100);
  });

  it('プロファイルサマリーに警告メッセージが含まれる', () => {
    const member: Member = {
      id: '105',
      name: 'MBTIのみユーザー5',
      department: 'TEST',
      mbtiType: 'INFJ',
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    const summaryText = result!.profileSummary.join(' ');
    expect(summaryText).toContain('ストレングスファインダー');
  });
});

describe('PersonalityAnalysisEngine - 資質のみモード', () => {
  it('リーダーシップ資質多数 → リーダー・推進者', () => {
    const member: Member = {
      id: '201',
      name: '資質のみユーザー',
      department: 'TEST',
      strengths: [
        { id: 11, score: 1 }, // 指令性 (リーダーシップ)
        { id: 12, score: 2 }, // 競争性 (リーダーシップ)
        { id: 13, score: 3 }, // 最上志向 (リーダーシップ)
        { id: 14, score: 4 }, // 自我 (リーダーシップ)
        { id: 17, score: 5 }, // ポジティブ (リーダーシップ)
      ],
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.analysisMode).toBe('strengths-only');
    expect(result!.primaryRole).toContain('リーダー');
  });

  it('分析資質多数 → アナリスト・思考家', () => {
    const member: Member = {
      id: '202',
      name: '資質のみユーザー2',
      department: 'TEST',
      strengths: [
        { id: 27, score: 1 }, // 分析思考
        { id: 34, score: 2 }, // 内省
        { id: 31, score: 3 }, // 着想
        { id: 29, score: 4 }, // 学習欲
        { id: 32, score: 5 }, // 戦略性
      ],
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.primaryRole).toMatch(/アナリスト|思考家/);
  });

  it('実行資質多数 → 実行者・達成者', () => {
    const member: Member = {
      id: '203',
      name: '資質のみユーザー3',
      department: 'TEST',
      strengths: [
        { id: 1, score: 1 },  // 達成欲
        { id: 25, score: 2 }, // 責任感
        { id: 33, score: 3 }, // 規律性
        { id: 13, score: 4 }, // 慎重さ
        { id: 26, score: 5 }, // 回復志向
      ],
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.primaryRole).toMatch(/実行|達成/);
  });

  it('synergyScore = 0', () => {
    const member: Member = {
      id: '204',
      name: '資質のみユーザー4',
      department: 'TEST',
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
    expect(result!.synergyScore).toBe(0);
  });

  it('teamFitScoreが資質から計算', () => {
    const member: Member = {
      id: '205',
      name: '資質のみユーザー5',
      department: 'TEST',
      strengths: [
        { id: 8, score: 1 },  // コミュニケーション (チーム指向)
        { id: 15, score: 2 }, // 調和性 (チーム指向)
        { id: 1, score: 3 },
        { id: 2, score: 4 },
        { id: 3, score: 5 },
      ],
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.teamFitScore).toBeGreaterThan(50); // チーム指向資質があるので高い
  });

  it('leadershipPotentialが資質から計算', () => {
    const member: Member = {
      id: '206',
      name: '資質のみユーザー6',
      department: 'TEST',
      strengths: [
        { id: 11, score: 1 }, // 指令性 (リーダーシップ)
        { id: 12, score: 2 }, // 競争性 (リーダーシップ)
        { id: 1, score: 3 },
        { id: 2, score: 4 },
        { id: 3, score: 5 },
      ],
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.leadershipPotential).toBeGreaterThan(50); // リーダーシップ資質があるので高い
  });
});

describe('PersonalityAnalysisEngine - エッジケース', () => {
  it('資質が0個の場合（MBTIのみ）', () => {
    const member: Member = {
      id: '301',
      name: 'エッジケース1',
      department: 'TEST',
      mbtiType: 'INTP',
      strengths: [],
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.analysisMode).toBe('mbti-only');
  });

  it('資質が3個の場合（5個未満）', () => {
    const member: Member = {
      id: '302',
      name: 'エッジケース2',
      department: 'TEST',
      mbtiType: 'ENFJ',
      strengths: [
        { id: 1, score: 1 },
        { id: 2, score: 2 },
        { id: 3, score: 3 },
      ],
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).not.toBeNull();
    expect(result!.analysisMode).toBe('full');
    expect(result!.topStrengthNames).toHaveLength(3);
  });

  it('データがない場合: null', () => {
    const member: Member = {
      id: '303',
      name: 'エッジケース3',
      department: 'TEST',
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    expect(result).toBeNull();
  });

  it('不正なMBTIタイプ（プロファイルなし）の場合', () => {
    const member: Member = {
      id: '304',
      name: 'エッジケース4',
      department: 'TEST',
      // @ts-ignore - 意図的に不正な値をテスト
      mbtiType: 'XXXX',
    };

    const result = PersonalityAnalysisEngine.analyze(member);

    // エラーハンドリングされてnullまたは代替結果を返す
    // 実装次第で期待値を調整
    expect(result).toBeDefined();
  });
});

describe('PersonalityAnalysisEngine - スコア範囲', () => {
  it('すべてのスコアが0-100の範囲内', () => {
    const testMembers: Member[] = [
      {
        id: '401',
        name: 'スコア範囲テスト1',
        department: 'TEST',
        mbtiType: 'INTJ',
        strengths: [
          { id: 1, score: 1 },
          { id: 2, score: 2 },
          { id: 3, score: 3 },
          { id: 4, score: 4 },
          { id: 5, score: 5 },
        ],
      },
      {
        id: '402',
        name: 'スコア範囲テスト2',
        department: 'TEST',
        mbtiType: 'ENFP',
      },
      {
        id: '403',
        name: 'スコア範囲テスト3',
        department: 'TEST',
        strengths: [
          { id: 10, score: 1 },
          { id: 11, score: 2 },
          { id: 12, score: 3 },
        ],
      },
    ];

    testMembers.forEach((member) => {
      const result = PersonalityAnalysisEngine.analyze(member);
      expect(result).not.toBeNull();
      expect(result!.synergyScore).toBeGreaterThanOrEqual(0);
      expect(result!.synergyScore).toBeLessThanOrEqual(100);
      expect(result!.teamFitScore).toBeGreaterThanOrEqual(0);
      expect(result!.teamFitScore).toBeLessThanOrEqual(100);
      expect(result!.leadershipPotential).toBeGreaterThanOrEqual(0);
      expect(result!.leadershipPotential).toBeLessThanOrEqual(100);
    });
  });
});
