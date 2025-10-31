// src/services/__tests__/ProfitabilityService.v3.1.test.ts
/**
 * ProfitabilityService v3.1 のテスト
 * TDD RED-GREEN-Refactor サイクルに従う
 * SPEC: MANAGER_FEATURE_SPEC_V3.1_UNIFIED.md
 *
 * v3.1の主な変更点:
 * - 雇用形態による計算ロジック分岐
 * - 契約社員・BPは固定経費モデルに変更
 * - contractRateの導入
 */

import { ProfitabilityService } from '../ProfitabilityService';
import { MemberStrengths } from '../../models/StrengthsTypes';
import { DEFAULT_STAGE_MASTERS, StageMaster } from '../../types/profitability';
import { MemberRate, ContractRate, MemberRateRecord } from '../../types/financial';

describe('ProfitabilityService v3.1', () => {
  const stageMasters: StageMaster[] = DEFAULT_STAGE_MASTERS;

  describe('正社員（S1-S4）の利益計算 - 給与 + 給与経費率モデル', () => {
    test('S1社員：売上60万、給与25万、経費率30%', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'emp001',
        name: '山田太郎',
        department: '営業部',
        strengths: [],
        stageId: 'S1'
      } as any;
      const memberRate: MemberRate = {
        rateType: 'monthly',
        rate: 600000
      };

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters, memberRate);

      // Assert
      // 売上: 600,000円
      // 給与: 250,000円
      // 経費: 250,000 × 0.30 = 75,000円
      // 原価: 325,000円
      // 利益: 275,000円
      // 利益率: 45.83%
      expect(result.revenue).toBe(600000);
      expect(result.cost).toBe(325000);
      expect(result.profit).toBe(275000);
      expect(result.profitMargin).toBeCloseTo(45.83, 2);
    });

    test('S2社員（時給制）：時給5000円 × 160h', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'emp002',
        name: '佐藤花子',
        department: '開発部',
        strengths: [],
        stageId: 'S2'
      } as any;
      const memberRate: MemberRate = {
        rateType: 'hourly',
        rate: 5000,
        hours: 160
      };

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters, memberRate);

      // Assert
      // 売上: 5,000 × 160 = 800,000円
      // 給与: 350,000円
      // 経費: 350,000 × 0.30 = 105,000円
      // 原価: 455,000円
      // 利益: 345,000円
      expect(result.revenue).toBe(800000);
      expect(result.cost).toBe(455000);
      expect(result.profit).toBe(345000);
      expect(result.profitMargin).toBeCloseTo(43.125, 2);
    });
  });

  describe('契約社員（CONTRACT）の利益計算 - 契約単価 + 固定経費モデル', () => {
    test('CONTRACT社員：売上80万、契約単価60万、固定経費5万', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'contract001',
        name: '鈴木一郎',
        department: '営業部',
        strengths: [],
        stageId: 'CONTRACT'
      } as any;
      const memberRate: MemberRate = {
        rateType: 'monthly',
        rate: 800000 // 売上
      };
      const contractRate: ContractRate = {
        rateType: 'monthly',
        rate: 600000 // 契約単価（支払額）
      };

      // Expected: v3.1では契約社員の原価は contractAmount + fixedExpense + (contractAmount × contractExpenseRate)
      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters, memberRate, contractRate);

      // Assert
      // 売上: 800,000円
      // 契約単価: 600,000円
      // 固定経費: 50,000円
      // 社内経費: 600,000 × 26% = 156,000円
      // 原価: 806,000円
      // 利益: -6,000円
      // 利益率: -0.75%
      expect(result.revenue).toBe(800000);
      expect(result.cost).toBe(806000);
      expect(result.profit).toBe(-6000);
      expect(result.profitMargin).toBeCloseTo(-0.75, 2);
    });

    test('CONTRACT社員（時給制）：売上80万、時給4000円×160h、固定経費5万', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'contract002',
        name: '田中美咲',
        department: 'デザイン部',
        strengths: [],
        stageId: 'CONTRACT'
      } as any;
      const memberRate: MemberRate = {
        rateType: 'hourly',
        rate: 5000, // 売上時給
        hours: 160
      };
      const contractRate: ContractRate = {
        rateType: 'hourly',
        rate: 4000, // 契約時給
        hours: 160
      };

      // Expected: v3.1では契約時給の月額換算 + 固定経費 + (契約単価 × 社内経費率)
      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters, memberRate, contractRate);

      // Assert
      // 売上: 5,000 × 160 = 800,000円
      // 契約単価: 4,000 × 160 = 640,000円
      // 固定経費: 50,000円
      // 社内経費: 640,000 × 26% = 166,400円
      // 原価: 856,400円
      // 利益: -56,400円
      // 利益率: -7.05%
      expect(result.revenue).toBe(800000);
      expect(result.cost).toBe(856400);
      expect(result.profit).toBe(-56400);
      expect(result.profitMargin).toBeCloseTo(-7.05, 2);
    });
  });

  describe('ビジネスパートナー（BP）の利益計算 - 契約単価 + 固定経費モデル', () => {
    test('BP：売上100万、契約単価85万、固定経費4万', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'bp001',
        name: '外部太郎',
        department: '開発部',
        strengths: [],
        stageId: 'BP'
      } as any;
      const memberRate: MemberRate = {
        rateType: 'monthly',
        rate: 1000000 // 売上
      };
      const contractRate: ContractRate = {
        rateType: 'monthly',
        rate: 850000 // 契約単価
      };

      // Expected: v3.1ではBPの原価は contractAmount + fixedExpense + (contractAmount × contractExpenseRate)
      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters, memberRate, contractRate);

      // Assert
      // 売上: 1,000,000円
      // 契約単価: 850,000円
      // 固定経費: 40,000円
      // 社内経費: 850,000 × 9% = 76,500円
      // 原価: 966,500円
      // 利益: 33,500円
      // 利益率: 3.35%
      expect(result.revenue).toBe(1000000);
      expect(result.cost).toBe(966500);
      expect(result.profit).toBe(33500);
      expect(result.profitMargin).toBeCloseTo(3.35, 2);
    });
  });

  describe('研修期間メンバー（売上=0）の計算', () => {
    test('研修中の正社員S1：売上0、給与25万、経費率30%', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'trainee001',
        name: '新人太郎',
        department: '営業部',
        strengths: [],
        stageId: 'S1'
      } as any;
      // memberRate指定なし（売上0として扱われる）

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters);

      // Assert
      // 売上: 0円
      // 給与: 250,000円
      // 経費: 75,000円
      // 原価: 325,000円
      // 利益: -325,000円
      // 利益率: -100%
      expect(result.revenue).toBe(0);
      expect(result.cost).toBe(325000);
      expect(result.profit).toBe(-325000);
      expect(result.profitMargin).toBe(-100);
    });

    test('研修中の契約社員：売上0、契約単価60万、固定経費5万', () => {
      // Arrange
      const member: MemberStrengths = {
        id: 'trainee002',
        name: '新人花子',
        department: '開発部',
        strengths: [],
        stageId: 'CONTRACT'
      } as any;
      const contractRate: ContractRate = {
        rateType: 'monthly',
        rate: 600000
      };

      // Expected: v3.1では研修期間でも契約単価 + 固定経費 + 社内経費は発生
      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters, undefined, contractRate);

      // Assert
      // 売上: 0円
      // 契約単価: 600,000円
      // 固定経費: 50,000円
      // 社内経費: 600,000 × 26% = 156,000円
      // 原価: 806,000円
      // 利益: -806,000円
      // 利益率: -100%
      expect(result.revenue).toBe(0);
      expect(result.cost).toBe(806000);
      expect(result.profit).toBe(-806000);
      expect(result.profitMargin).toBe(-100);
    });
  });

  describe('v3.0互換性テスト - 既存ロジックが動作する', () => {
    test('v3.0のBP計算（expenseRate方式）が正しく動作', () => {
      // Arrange: v3.0形式のBP
      const member: MemberStrengths = {
        id: 'bp_old',
        name: '外部旧',
        department: '営業部',
        strengths: [],
        stageId: 'BP'
      } as any;
      const memberRate: MemberRate = {
        rateType: 'monthly',
        rate: 800000
      };

      // Act
      const result = ProfitabilityService.calculateMemberProfitability(member, stageMasters, memberRate);

      // Assert: v3.0の計算ロジック（売上 × 0.85）
      // 売上: 800,000円
      // 原価: 800,000 × 0.85 = 680,000円
      // 利益: 120,000円
      // 利益率: 15%
      expect(result.revenue).toBe(800000);
      expect(result.cost).toBe(680000);
      expect(result.profit).toBe(120000);
      expect(result.profitMargin).toBeCloseTo(15.0, 2);
    });
  });

  describe('チーム全体の利益集計（v3.1混在）', () => {
    test('正社員・契約社員・BPが混在するチーム', () => {
      // Arrange
      const members: MemberStrengths[] = [
        {
          id: 'emp001',
          name: '正社員A',
          strengths: [],
          stageId: 'S1'
        } as any,
        {
          id: 'contract001',
          name: '契約社員B',
          strengths: [],
          stageId: 'CONTRACT'
        } as any,
        {
          id: 'bp001',
          name: 'BP C',
          strengths: [],
          stageId: 'BP'
        } as any
      ];

      const memberRates: MemberRateRecord[] = [
        { memberId: 'emp001', memberRate: { rateType: 'monthly', rate: 600000 } },
        { memberId: 'contract001', memberRate: { rateType: 'monthly', rate: 800000 } },
        { memberId: 'bp001', memberRate: { rateType: 'monthly', rate: 1000000 } }
      ];

      // Expected v3.1: contractRateも考慮した計算
      // Act (v3.1実装後に有効化)
      // const result = ProfitabilityService.calculateTeamProfitability(members, stageMasters, memberRates, contractRates);

      // Assert (v3.1実装後)
      // 正社員: 売上600k, 原価325k, 利益275k
      // 契約社員: 売上800k, 原価650k, 利益150k
      // BP: 売上1000k, 原価880k, 利益120k
      // 合計: 売上2400k, 原価1855k, 利益545k
      // 利益率: 22.71%
      // expect(result.totalRevenue).toBe(2400000);
      // expect(result.totalCost).toBe(1855000);
      // expect(result.totalProfit).toBe(545000);
      // expect(result.profitMargin).toBeCloseTo(22.71, 2);
      // expect(result.memberCount).toBe(3);
    });
  });
});
