/**
 * PersonalityAnalysisEngine - SF-only モード改善テスト
 *
 * @description
 * SF-onlyモードの個別性表現を検証するテスト
 * 同じカテゴリでも異なる資質の組み合わせで異なる説明が生成されることを確認
 */

import { PersonalityAnalysisEngine } from '../../services/PersonalityAnalysisEngine';
import { Member } from '../../models/PersonalityAnalysis';

describe('PersonalityAnalysisEngine - Strengths-Only Mode Improvements', () => {
  let engine: PersonalityAnalysisEngine;

  beforeEach(() => {
    engine = new PersonalityAnalysisEngine();
  });

  describe('TC-SF-UNIQUE-001: 同じカテゴリの異なる資質で異なる説明が生成される', () => {
    test('実行力グループ: 達成欲 vs 規律性 で異なる説明', () => {
      const memberA: Member = {
        id: 'test-a',
        name: 'テストA',
        department: 'テスト部',
        strengths: [
          { id: 1, score: 1 },   // 達成欲
          { id: 9, score: 2 },   // 目標志向
          { id: 6, score: 3 },   // 責任感
          { id: 3, score: 4 },   // 回復志向
          { id: 2, score: 5 }    // 公平性
        ]
      };

      const memberB: Member = {
        id: 'test-b',
        name: 'テストB',
        department: 'テスト部',
        strengths: [
          { id: 8, score: 1 },   // 規律性
          { id: 5, score: 2 },   // 慎重さ
          { id: 2, score: 3 },   // 公平性
          { id: 7, score: 4 },   // 信念
          { id: 4, score: 5 }    // アレンジ
        ]
      };

      const resultA = engine.analyze(memberA);
      const resultB = engine.analyze(memberB);

      // 両者とも実行力グループだが、プロファイルサマリーが異なること
      expect(resultA.profileSummary).not.toEqual(resultB.profileSummary);

      // 少なくとも第1文（資質名を含む文）が異なること
      expect(resultA.profileSummary[0]).toContain('達成欲');
      expect(resultB.profileSummary[0]).toContain('規律性');

      // 役割も異なる可能性がある（または同じでも説明が異なる）
      console.log('メンバーA:', resultA.primaryRole, resultA.profileSummary);
      console.log('メンバーB:', resultB.primaryRole, resultB.profileSummary);
    });

    test('人間関係構築力グループ: 共感性 vs 個別化 で異なる説明', () => {
      const memberC: Member = {
        id: 'test-c',
        name: 'テストC',
        department: 'テスト部',
        strengths: [
          { id: 20, score: 1 },  // 共感性
          { id: 21, score: 2 },  // 調和性
          { id: 27, score: 3 },  // ポジティブ
          { id: 24, score: 4 },  // 成長促進
          { id: 18, score: 5 }   // 適応性
        ]
      };

      const memberD: Member = {
        id: 'test-d',
        name: 'テストD',
        department: 'テスト部',
        strengths: [
          { id: 25, score: 1 },  // 個別化
          { id: 23, score: 2 },  // 包含
          { id: 28, score: 3 },  // 親密性
          { id: 19, score: 4 },  // 運命思考
          { id: 26, score: 5 }   // 調和性
        ]
      };

      const resultC = engine.analyze(memberC);
      const resultD = engine.analyze(memberD);

      expect(resultC.profileSummary).not.toEqual(resultD.profileSummary);
      expect(resultC.profileSummary[0]).toContain('共感性');
      expect(resultD.profileSummary[0]).toContain('個別化');

      console.log('メンバーC:', resultC.primaryRole, resultC.profileSummary);
      console.log('メンバーD:', resultD.primaryRole, resultD.profileSummary);
    });
  });

  describe('TC-SF-UNIQUE-002: TOP5全体の構成が反映される', () => {
    test('バランス型: 各カテゴリから1-2つずつ', () => {
      const balancedMember: Member = {
        id: 'balanced',
        name: 'バランス太郎',
        department: 'テスト部',
        strengths: [
          { id: 1, score: 1 },   // 達成欲（実行力）
          { id: 32, score: 2 },  // 戦略性（戦略的思考）
          { id: 20, score: 3 },  // 共感性（人間関係）
          { id: 13, score: 4 },  // 指令性（影響力）
          { id: 9, score: 5 }    // 目標志向（実行力）
        ]
      };

      const result = engine.analyze(balancedMember);

      // バランス型であることがプロファイルに表現されているべき
      const summary = result.profileSummary.join(' ');
      console.log('バランス型メンバー:', result.primaryRole, result.profileSummary);

      // 少なくともTOP5のバランスが何らかの形で説明に反映されていること
      expect(summary.length).toBeGreaterThan(50); // 単なる固定文字列ではない
    });

    test('専門型: 同じカテゴリに集中', () => {
      const specializedMember: Member = {
        id: 'specialized',
        name: '専門花子',
        department: 'テスト部',
        strengths: [
          { id: 32, score: 1 },  // 戦略性
          { id: 30, score: 2 },  // 着想
          { id: 33, score: 3 },  // 学習欲
          { id: 29, score: 4 },  // 未来志向
          { id: 31, score: 5 }   // 内省
        ]
      };

      const result = engine.analyze(specializedMember);

      console.log('専門型メンバー:', result.primaryRole, result.profileSummary);

      // 戦略的思考力に特化していることが表現されているべき
      expect(result.primaryRole).toContain('アナリスト');
    });
  });

  describe('TC-SF-UNIQUE-003: スコアの細かい差が反映される', () => {
    test('teamFitScore: 50 vs 69 で異なる説明', () => {
      // チーム志向資質をTOP5に1つだけ含む（低めのスコア）
      const lowTeamFit: Member = {
        id: 'low-team',
        name: '個人作業派',
        department: 'テスト部',
        strengths: [
          { id: 1, score: 1 },   // 達成欲
          { id: 8, score: 2 },   // 規律性
          { id: 32, score: 3 },  // 戦略性
          { id: 20, score: 4 },  // 共感性（チーム志向）
          { id: 5, score: 5 }    // 慎重さ
        ]
      };

      // チーム志向資質をTOP5に3つ含む（高めのスコア）
      const highTeamFit: Member = {
        id: 'high-team',
        name: 'チーム重視派',
        department: 'テスト部',
        strengths: [
          { id: 20, score: 1 },  // 共感性
          { id: 21, score: 2 },  // 調和性
          { id: 24, score: 3 },  // 成長促進
          { id: 1, score: 4 },   // 達成欲
          { id: 27, score: 5 }   // ポジティブ
        ]
      };

      const resultLow = engine.analyze(lowTeamFit);
      const resultHigh = engine.analyze(highTeamFit);

      console.log('低TeamFit:', resultLow.teamFitScore, resultLow.profileSummary);
      console.log('高TeamFit:', resultHigh.teamFitScore, resultHigh.profileSummary);

      // スコアが異なること
      expect(resultLow.teamFitScore).toBeLessThan(resultHigh.teamFitScore);

      // プロファイルサマリーも異なること（特に第2文のチームスタイル部分）
      expect(resultLow.profileSummary).not.toEqual(resultHigh.profileSummary);
    });

    test('leadershipPotential: 微妙な差が7段階で表現される', () => {
      const scores = [30, 40, 50, 60, 70, 80, 90];
      const descriptions = scores.map(targetScore => {
        // targetScoreに近いleadershipPotentialを持つメンバーを生成
        // （簡易実装: リーダーシップ資質の数で調整）
        const leadershipCount = Math.floor(targetScore / 25);
        const strengths = [];

        // リーダーシップ資質を追加
        const leadershipIds = [13, 12, 17, 11, 14]; // 指令性、自我、自己確信、競争性、最上志向
        for (let i = 0; i < Math.min(leadershipCount, 3); i++) {
          strengths.push({ id: leadershipIds[i], score: i + 1 });
        }

        // 残りは実行力で埋める
        const executionIds = [1, 9, 6];
        for (let i = strengths.length; i < 5; i++) {
          strengths.push({ id: executionIds[i - strengths.length], score: i + 1 });
        }

        const member: Member = {
          id: `leadership-${targetScore}`,
          name: `リーダーシップ${targetScore}`,
          department: 'テスト部',
          strengths
        };

        const result = engine.analyze(member);
        return {
          score: result.leadershipPotential,
          description: result.profileSummary[2] // 第3文がリーダーシップ説明
        };
      });

      console.log('リーダーシップスコアと説明:');
      descriptions.forEach(d => console.log(`  ${d.score}: ${d.description}`));

      // 少なくとも5種類以上の異なる説明があること
      const uniqueDescriptions = new Set(descriptions.map(d => d.description));
      expect(uniqueDescriptions.size).toBeGreaterThanOrEqual(5);
    });
  });

  describe('TC-SF-UNIQUE-004: 資質の詳細説明が活用されている', () => {
    test('プロファイルサマリーに資質の特性が含まれる', () => {
      const member: Member = {
        id: 'test-detail',
        name: 'テスト詳細',
        department: 'テスト部',
        strengths: [
          { id: 1, score: 1 },   // 達成欲: 「目標を達成するために懸命に働き」
          { id: 16, score: 2 },  // コミュニケーション: 「言葉で表現し」
          { id: 32, score: 3 },  // 戦略性: 「目的に向かうための選択肢を想定する」
          { id: 20, score: 4 },  // 共感性: 「他者の感情を察知」
          { id: 9, score: 5 }    // 目標志向: 「決められた目標に向けて」
        ]
      };

      const result = engine.analyze(member);
      const summary = result.profileSummary.join(' ');

      console.log('詳細説明テスト:', result.profileSummary);

      // 資質名が含まれていること
      expect(summary).toContain('達成欲');
      expect(summary).toContain('コミュニケーション');
      expect(summary).toContain('戦略性');

      // 単なる資質名の羅列ではなく、文として成立していること
      expect(summary.split('。').length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('TC-SF-UNIQUE-005: 実際のユーザーデータでの多様性検証', () => {
    test('10人のSF-onlyユーザーで10通りの異なる説明が生成される', () => {
      const members: Member[] = [
        {
          id: '1', name: 'ユーザー1', department: 'A',
          strengths: [
            { id: 1, score: 1 }, { id: 9, score: 2 }, { id: 6, score: 3 },
            { id: 32, score: 4 }, { id: 20, score: 5 }
          ]
        },
        {
          id: '2', name: 'ユーザー2', department: 'A',
          strengths: [
            { id: 8, score: 1 }, { id: 5, score: 2 }, { id: 2, score: 3 },
            { id: 7, score: 4 }, { id: 4, score: 5 }
          ]
        },
        {
          id: '3', name: 'ユーザー3', department: 'A',
          strengths: [
            { id: 20, score: 1 }, { id: 21, score: 2 }, { id: 27, score: 3 },
            { id: 24, score: 4 }, { id: 18, score: 5 }
          ]
        },
        {
          id: '4', name: 'ユーザー4', department: 'A',
          strengths: [
            { id: 32, score: 1 }, { id: 30, score: 2 }, { id: 33, score: 3 },
            { id: 29, score: 4 }, { id: 31, score: 5 }
          ]
        },
        {
          id: '5', name: 'ユーザー5', department: 'A',
          strengths: [
            { id: 13, score: 1 }, { id: 12, score: 2 }, { id: 11, score: 3 },
            { id: 1, score: 4 }, { id: 9, score: 5 }
          ]
        },
        {
          id: '6', name: 'ユーザー6', department: 'A',
          strengths: [
            { id: 16, score: 1 }, { id: 15, score: 2 }, { id: 20, score: 3 },
            { id: 1, score: 4 }, { id: 32, score: 5 }
          ]
        },
        {
          id: '7', name: 'ユーザー7', department: 'A',
          strengths: [
            { id: 3, score: 1 }, { id: 4, score: 2 }, { id: 33, score: 3 },
            { id: 32, score: 4 }, { id: 30, score: 5 }
          ]
        },
        {
          id: '8', name: 'ユーザー8', department: 'A',
          strengths: [
            { id: 25, score: 1 }, { id: 23, score: 2 }, { id: 28, score: 3 },
            { id: 19, score: 4 }, { id: 26, score: 5 }
          ]
        },
        {
          id: '9', name: 'ユーザー9', department: 'A',
          strengths: [
            { id: 14, score: 1 }, { id: 17, score: 2 }, { id: 10, score: 3 },
            { id: 16, score: 4 }, { id: 15, score: 5 }
          ]
        },
        {
          id: '10', name: 'ユーザー10', department: 'A',
          strengths: [
            { id: 6, score: 1 }, { id: 2, score: 2 }, { id: 21, score: 3 },
            { id: 24, score: 4 }, { id: 18, score: 5 }
          ]
        }
      ];

      const results = members.map(m => engine.analyze(m));
      const summaries = results.map(r => r.profileSummary.join(' '));

      // 全員異なるプロファイルサマリーであること
      const uniqueSummaries = new Set(summaries);
      expect(uniqueSummaries.size).toBe(10);

      // 各ユーザーのプロファイルを出力
      results.forEach((result, i) => {
        console.log(`\nユーザー${i + 1}:`);
        console.log(`  役割: ${result.primaryRole}`);
        console.log(`  チーム適合度: ${result.teamFitScore}`);
        console.log(`  リーダーシップ: ${result.leadershipPotential}`);
        console.log(`  プロファイル:`);
        result.profileSummary.forEach(line => console.log(`    ${line}`));
      });
    });
  });
});
