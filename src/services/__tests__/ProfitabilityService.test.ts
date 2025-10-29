// src/services/__tests__/ProfitabilityService.test.ts
/**
 * ProfitabilityService のテスト
 * TDD RED-GREEN-Refactor サイクルに従う
 * SPEC: MANAGER_FEATURE_SPEC_V3.md Phase 4.1
 */

import { ProfitabilityService } from '../ProfitabilityService';
import { MemberStrengths } from '../../models/StrengthsTypes';
import { DEFAULT_STAGE_MASTERS, StageMaster } from '../../types/profitability';

describe('ProfitabilityService', () => {
  describe('calculateMemberProfitability - 社員の利益計算', () => {
    const stageMasters: StageMaster[] = DEFAULT_STAGE_MASTERS;

    test('ステージ1社員（給与25万円、経費率30%）の利益計算', () => {
      // Arrange: 売上60万円のS1社員
      const member: MemberStrengths = {
        id: 'emp001',
        name: '山田太郎',
        department: '営業部',
        strengths: [],
        positionId: 'PG', // プログラマー
        memberRate: {
          rateType: 'monthly',
          rate: 600000
        },
        stageId: 'S1'
      } as any;

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 600,000円
      // 給与: 250,000円
      // 経費: 250,000 × 0.30 = 75,000円
      // 原価: 250,000 + 75,000 = 325,000円
      // 利益: 600,000 - 325,000 = 275,000円
      // 利益率: (275,000 / 600,000) × 100 = 45.83%
      expect(result.revenue).toBe(600000);
      expect(result.cost).toBe(325000);
      expect(result.profit).toBe(275000);
      expect(result.profitMargin).toBeCloseTo(45.83, 2);
      expect(result.details.salary).toBe(250000);
      expect(result.details.expense).toBe(75000);
      expect(result.details.stageId).toBe('S1');
    });

    test('ステージ2社員（給与35万円、経費率30%）の利益計算', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'emp002',
        name: '佐藤花子',
        department: '営業部',
        strengths: [],
        positionId: 'SM',
        memberRate: {
          rateType: 'monthly',
          rate: 800000
        },
        stageId: 'S2'
      } as any;

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 800,000円
      // 給与: 350,000円
      // 経費: 350,000 × 0.30 = 105,000円
      // 原価: 350,000 + 105,000 = 455,000円
      // 利益: 800,000 - 455,000 = 345,000円
      // 利益率: (345,000 / 800,000) × 100 = 43.125%
      expect(result.revenue).toBe(800000);
      expect(result.cost).toBe(455000);
      expect(result.profit).toBe(345000);
      expect(result.profitMargin).toBeCloseTo(43.125, 2);
      expect(result.details.salary).toBe(350000);
      expect(result.details.expense).toBe(105000);
    });

    test('ステージ3社員（給与45万円、経費率30%）の利益計算', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'emp003',
        name: '鈴木一郎',
        department: '開発部',
        strengths: [],
        positionId: 'PL',
        memberRate: {
          rateType: 'monthly',
          rate: 1000000
        },
        stageId: 'S3'
      } as any;

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 1,000,000円
      // 給与: 450,000円
      // 経費: 450,000 × 0.30 = 135,000円
      // 原価: 450,000 + 135,000 = 585,000円
      // 利益: 1,000,000 - 585,000 = 415,000円
      // 利益率: (415,000 / 1,000,000) × 100 = 41.5%
      expect(result.revenue).toBe(1000000);
      expect(result.cost).toBe(585000);
      expect(result.profit).toBe(415000);
      expect(result.profitMargin).toBeCloseTo(41.5, 2);
    });

    test('ステージ4社員（給与60万円、経費率30%）の利益計算', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'emp004',
        name: '田中次郎',
        department: '開発部',
        strengths: [],
        positionId: 'MG',
        memberRate: {
          rateType: 'monthly',
          rate: 1200000
        },
        stageId: 'S4'
      } as any;

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 1,200,000円
      // 給与: 600,000円
      // 経費: 600,000 × 0.30 = 180,000円
      // 原価: 600,000 + 180,000 = 780,000円
      // 利益: 1,200,000 - 780,000 = 420,000円
      // 利益率: (420,000 / 1,200,000) × 100 = 35%
      expect(result.revenue).toBe(1200000);
      expect(result.cost).toBe(780000);
      expect(result.profit).toBe(420000);
      expect(result.profitMargin).toBeCloseTo(35.0, 2);
    });

    test('時給制社員の利益計算（時給5000円、160時間稼働）', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'emp005',
        name: '高橋美咲',
        department: 'デザイン部',
        strengths: [],
        positionId: 'PG',
        memberRate: {
          rateType: 'hourly',
          rate: 5000,
          hours: 160
        },
        stageId: 'S2'
      } as any;

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 5,000 × 160 = 800,000円
      // 給与: 350,000円
      // 経費: 350,000 × 0.30 = 105,000円
      // 原価: 455,000円
      // 利益: 800,000 - 455,000 = 345,000円
      // 利益率: 43.125%
      expect(result.revenue).toBe(800000);
      expect(result.cost).toBe(455000);
      expect(result.profit).toBe(345000);
    });

    test('売上がない社員（赤字）', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'emp006',
        name: '伊藤健太',
        department: '営業部',
        strengths: [],
        stageId: 'S1'
      } as any;

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 0円
      // 給与: 250,000円
      // 経費: 75,000円
      // 原価: 325,000円
      // 利益: -325,000円
      // 利益率: -100%（売上ゼロの場合）
      expect(result.revenue).toBe(0);
      expect(result.cost).toBe(325000);
      expect(result.profit).toBe(-325000);
      expect(result.profitMargin).toBe(-100);
    });

    test('ステージIDがない社員（エラー）', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'emp007',
        name: '渡辺さくら',
        department: '営業部',
        strengths: [],
        positionId: 'PG',
        memberRate: {
          rateType: 'monthly',
          rate: 600000
        }
      } as any;

      // Act & Assert
      expect(() => {
        ProfitabilityService.calculateMemberProfitability(member, stageMasters);
      }).toThrow('ステージIDが設定されていません');
    });

    test('無効なステージID（エラー）', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'emp008',
        name: '中村大輔',
        department: '営業部',
        strengths: [],
        stageId: 'INVALID'
      } as any;

      // Act & Assert
      expect(() => {
        ProfitabilityService.calculateMemberProfitability(member, stageMasters);
      }).toThrow('ステージマスタが見つかりません: INVALID');
    });
  });

  describe('calculateMemberProfitability - BPの利益計算', () => {
    const stageMasters: StageMaster[] = DEFAULT_STAGE_MASTERS;

    test('BP（売上80万円、経費率85%）の利益計算', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'bp001',
        name: '外部太郎',
        department: '営業部',
        strengths: [],
        positionId: 'PG',
        memberRate: {
          rateType: 'monthly',
          rate: 800000
        },
        stageId: 'BP'
      } as any;

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 800,000円
      // 原価: 800,000 × 0.85 = 680,000円
      // 利益: 800,000 - 680,000 = 120,000円
      // 利益率: (120,000 / 800,000) × 100 = 15%
      expect(result.revenue).toBe(800000);
      expect(result.cost).toBe(680000);
      expect(result.profit).toBe(120000);
      expect(result.profitMargin).toBeCloseTo(15.0, 2);
      expect(result.details.salary).toBeUndefined();
      expect(result.details.expense).toBe(680000);
      expect(result.details.stageId).toBe('BP');
    });

    test('BP（時給5000円、160時間稼働）の利益計算', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'bp002',
        name: '外部花子',
        department: '開発部',
        strengths: [],
        positionId: 'PG',
        memberRate: {
          rateType: 'hourly',
          rate: 5000,
          hours: 160
        },
        stageId: 'BP'
      } as any;

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 5,000 × 160 = 800,000円
      // 原価: 800,000 × 0.85 = 680,000円
      // 利益: 120,000円
      // 利益率: 15%
      expect(result.revenue).toBe(800000);
      expect(result.cost).toBe(680000);
      expect(result.profit).toBe(120000);
      expect(result.profitMargin).toBeCloseTo(15.0, 2);
    });

    test('BP（売上100万円、経費率85%）の利益計算', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'bp003',
        name: '外部一郎',
        department: 'デザイン部',
        strengths: [],
        positionId: 'DE',
        memberRate: {
          rateType: 'monthly',
          rate: 1000000
        },
        stageId: 'BP'
      } as any;

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 1,000,000円
      // 原価: 1,000,000 × 0.85 = 850,000円
      // 利益: 1,000,000 - 850,000 = 150,000円
      // 利益率: (150,000 / 1,000,000) × 100 = 15%
      expect(result.revenue).toBe(1000000);
      expect(result.cost).toBe(850000);
      expect(result.profit).toBe(150000);
      expect(result.profitMargin).toBeCloseTo(15.0, 2);
    });

    test('BP（売上なし）の利益計算', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'bp004',
        name: '外部次郎',
        department: '営業部',
        strengths: [],
        stageId: 'BP'
      } as any;

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 0円
      // 原価: 0円
      // 利益: 0円
      // 利益率: -100%（売上ゼロの場合）
      expect(result.revenue).toBe(0);
      expect(result.cost).toBe(0);
      expect(result.profit).toBe(0);
      expect(result.profitMargin).toBe(-100);
    });
  });

  describe('calculateTeamProfitability - チーム全体の利益集計', () => {
    const stageMasters: StageMaster[] = DEFAULT_STAGE_MASTERS;

    test('混合チーム（社員2名、BP1名）の利益集計', () => {
      // Arrange
      const members: MemberStrengths[] = [
        {
          id: 'emp001',
          name: '山田太郎',
          department: '営業部',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 600000 },
          stageId: 'S1'
        } as any,
        {
          id: 'emp002',
          name: '佐藤花子',
          department: '営業部',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 800000 },
          stageId: 'S2'
        } as any,
        {
          id: 'bp001',
          name: '外部太郎',
          department: '営業部',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 800000 },
          stageId: 'BP'
        } as any
      ];

      // Act
      const result = ProfitabilityService.calculateTeamProfitability(members, stageMasters);

      // Assert
      // 社員1 (S1): 売上600k, 原価325k, 利益275k
      // 社員2 (S2): 売上800k, 原価455k, 利益345k
      // BP1: 売上800k, 原価680k, 利益120k
      // 合計: 売上2200k, 原価1460k, 利益740k
      // 利益率: (740k / 2200k) × 100 = 33.636%
      expect(result.totalRevenue).toBe(2200000);
      expect(result.totalCost).toBe(1460000);
      expect(result.totalProfit).toBe(740000);
      expect(result.profitMargin).toBeCloseTo(33.64, 2);
      expect(result.memberCount).toBe(3);
      expect(result.averageRevenue).toBeCloseTo(733333.33, 2);
      expect(result.averageProfit).toBeCloseTo(246666.67, 2);

      // ステージ別集計
      expect(result.profitByStage['S1'].count).toBe(1);
      expect(result.profitByStage['S1'].totalProfit).toBe(275000);
      expect(result.profitByStage['S1'].averageProfitMargin).toBeCloseTo(45.83, 2);

      expect(result.profitByStage['S2'].count).toBe(1);
      expect(result.profitByStage['S2'].totalProfit).toBe(345000);
      expect(result.profitByStage['S2'].averageProfitMargin).toBeCloseTo(43.125, 2);

      expect(result.profitByStage['BP'].count).toBe(1);
      expect(result.profitByStage['BP'].totalProfit).toBe(120000);
      expect(result.profitByStage['BP'].averageProfitMargin).toBeCloseTo(15.0, 2);
    });

    test('社員のみのチーム（S1～S4）の利益集計', () => {
      // Arrange
      const members: MemberStrengths[] = [
        {
          id: 'emp001',
          name: '山田太郎',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 600000 },
          stageId: 'S1'
        } as any,
        {
          id: 'emp002',
          name: '佐藤花子',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 800000 },
          stageId: 'S2'
        } as any,
        {
          id: 'emp003',
          name: '鈴木一郎',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 1000000 },
          stageId: 'S3'
        } as any,
        {
          id: 'emp004',
          name: '田中次郎',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 1200000 },
          stageId: 'S4'
        } as any
      ];

      // Act
      const result = ProfitabilityService.calculateTeamProfitability(members, stageMasters);

      // Assert
      // S1: 利益275k
      // S2: 利益345k
      // S3: 利益415k
      // S4: 利益420k
      // 合計: 売上3600k, 原価2145k, 利益1455k
      expect(result.totalRevenue).toBe(3600000);
      expect(result.totalCost).toBe(2145000);
      expect(result.totalProfit).toBe(1455000);
      expect(result.memberCount).toBe(4);
      expect(result.profitMargin).toBeCloseTo(40.42, 2);
    });

    test('BPのみのチームの利益集計', () => {
      // Arrange
      const members: MemberStrengths[] = [
        {
          id: 'bp001',
          name: '外部太郎',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 800000 },
          stageId: 'BP'
        } as any,
        {
          id: 'bp002',
          name: '外部花子',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 1000000 },
          stageId: 'BP'
        } as any
      ];

      // Act
      const result = ProfitabilityService.calculateTeamProfitability(members, stageMasters);

      // Assert
      // BP1: 売上800k, 利益120k
      // BP2: 売上1000k, 利益150k
      // 合計: 売上1800k, 利益270k
      expect(result.totalRevenue).toBe(1800000);
      expect(result.totalProfit).toBe(270000);
      expect(result.profitMargin).toBeCloseTo(15.0, 2);
      expect(result.memberCount).toBe(2);

      expect(result.profitByStage['BP'].count).toBe(2);
      expect(result.profitByStage['BP'].totalProfit).toBe(270000);
    });

    test('ステージIDがないメンバーを含むチーム（無視される）', () => {
      // Arrange
      const members: MemberStrengths[] = [
        {
          id: 'emp001',
          name: '山田太郎',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 600000 },
          stageId: 'S1'
        } as any,
        {
          id: 'emp002',
          name: '佐藤花子',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 800000 }
          // stageId なし
        } as any
      ];

      // Act
      const result = ProfitabilityService.calculateTeamProfitability(members, stageMasters);

      // Assert
      // S1のみがカウントされる
      expect(result.memberCount).toBe(1);
      expect(result.totalRevenue).toBe(600000);
      expect(result.totalProfit).toBe(275000);
    });

    test('メンバーが0名の場合', () => {
      // Arrange
      const members: MemberStrengths[] = [];

      // Act
      const result = ProfitabilityService.calculateTeamProfitability(members, stageMasters);

      // Assert
      expect(result.totalRevenue).toBe(0);
      expect(result.totalCost).toBe(0);
      expect(result.totalProfit).toBe(0);
      expect(result.profitMargin).toBe(0);
      expect(result.memberCount).toBe(0);
      expect(result.averageRevenue).toBe(0);
      expect(result.averageProfit).toBe(0);
      expect(Object.keys(result.profitByStage).length).toBe(0);
    });

    test('全員ステージIDなしの場合', () => {
      // Arrange
      const members: MemberStrengths[] = [
        {
          id: 'emp001',
          name: '山田太郎',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 600000 }
        } as any,
        {
          id: 'emp002',
          name: '佐藤花子',
          strengths: [],
          memberRate: { rateType: 'monthly', rate: 800000 }
        } as any
      ];

      // Act
      const result = ProfitabilityService.calculateTeamProfitability(members, stageMasters);

      // Assert
      expect(result.totalRevenue).toBe(0);
      expect(result.memberCount).toBe(0);
    });
  });
});
