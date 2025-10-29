/**
 * ProfitabilityService 単価情報分離対応のテスト
 *
 * @module services/__tests__/ProfitabilityService.separation.test
 * @description 単価情報を外部から受け取る機能のテスト
 */

import { ProfitabilityService } from '../ProfitabilityService';
import { MemberStrengths } from '../../models/StrengthsTypes';
import { MemberRate, MemberRateRecord } from '../../types/financial';
import { StageMaster } from '../../types/profitability';

describe('ProfitabilityService - 単価情報分離対応', () => {
  // テスト用ステージマスタ
  const testStageMasters: StageMaster[] = [
    {
      id: 'S1',
      name: 'S1: 新人社員',
      type: 'employee',
      averageSalary: 250000,
      expenseRate: 0.3
    },
    {
      id: 'S2',
      name: 'S2: 中堅社員',
      type: 'employee',
      averageSalary: 350000,
      expenseRate: 0.3
    },
    {
      id: 'BP1',
      name: 'BP1: 協力会社',
      type: 'bp',
      averageSalary: undefined,
      expenseRate: 0.15
    }
  ];

  describe('calculateMemberProfitability - 単価を外部から受け取る', () => {
    test('memberRateパラメータが指定された場合、それを使用して利益計算する（社員）', () => {
      const member: MemberStrengths = {
        id: 'member-1',
        name: 'Alice',
        department: 'DEV',
        stageId: 'S1',
        strengths: []
      };

      const memberRate: MemberRate = {
        rateType: 'monthly',
        rate: 600000
      };

      const result = ProfitabilityService.calculateMemberProfitability(
        member,
        testStageMasters,
        memberRate
      );

      // 社員の原価: 給与250000 + (給与250000 × 経費率0.3) = 325000
      // 利益: 600000 - 325000 = 275000
      // 利益率: (275000 / 600000) * 100 = 45.83%
      expect(result.revenue).toBe(600000);
      expect(result.cost).toBe(325000);
      expect(result.profit).toBe(275000);
      expect(result.profitMargin).toBeCloseTo(45.83, 1);
    });

    test('memberRateパラメータが指定された場合、それを使用して利益計算する（BP）', () => {
      const member: MemberStrengths = {
        id: 'member-1',
        name: 'Bob',
        department: 'DEV',
        stageId: 'BP1',
        strengths: []
      };

      const memberRate: MemberRate = {
        rateType: 'monthly',
        rate: 800000
      };

      const result = ProfitabilityService.calculateMemberProfitability(
        member,
        testStageMasters,
        memberRate
      );

      // BPの原価: 売上800000 × 経費率0.15 = 120000
      // 利益: 800000 - 120000 = 680000
      // 利益率: (680000 / 800000) * 100 = 85%
      expect(result.revenue).toBe(800000);
      expect(result.cost).toBe(120000);
      expect(result.profit).toBe(680000);
      expect(result.profitMargin).toBe(85);
    });

    test('memberRateパラメータが指定されていない場合は売上0として計算される', () => {
      const member: MemberStrengths = {
        id: 'member-1',
        name: 'Alice',
        department: 'DEV',
        stageId: 'S1',
        strengths: []
      };

      const result = ProfitabilityService.calculateMemberProfitability(
        member,
        testStageMasters
      );

      // 売上0の場合
      // 社員の原価: 給与250000 + (給与250000 × 経費率0.3) = 325000
      // 利益: 0 - 325000 = -325000
      // 利益率: -100%
      expect(result.revenue).toBe(0);
      expect(result.cost).toBe(325000);
      expect(result.profit).toBe(-325000);
      expect(result.profitMargin).toBe(-100);
    });

    test('時給タイプの場合、月額換算して利益計算する', () => {
      const member: MemberStrengths = {
        id: 'member-1',
        name: 'Charlie',
        department: 'DEV',
        stageId: 'BP1',
        strengths: []
      };

      const memberRate: MemberRate = {
        rateType: 'hourly',
        rate: 5000,
        hours: 160
      };

      const result = ProfitabilityService.calculateMemberProfitability(
        member,
        testStageMasters,
        memberRate
      );

      // 売上: 5000 * 160 = 800000
      // BPの原価: 800000 × 0.15 = 120000
      expect(result.revenue).toBe(800000);
      expect(result.cost).toBe(120000);
      expect(result.profit).toBe(680000);
    });

    test('stageIdが設定されていない場合はエラー', () => {
      const member: MemberStrengths = {
        id: 'member-1',
        name: 'Alice',
        department: 'DEV',
        strengths: []
      };

      const memberRate: MemberRate = {
        rateType: 'monthly',
        rate: 600000
      };

      expect(() => {
        ProfitabilityService.calculateMemberProfitability(
          member,
          testStageMasters,
          memberRate
        );
      }).toThrow('ステージIDが設定されていません');
    });
  });

  describe('calculateTeamProfitability - 単価情報を外部から受け取る', () => {
    test('memberRatesパラメータが指定された場合、それを使用してチーム利益計算する', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          stageId: 'S1',
          strengths: []
        },
        {
          id: 'member-2',
          name: 'Bob',
          department: 'DEV',
          stageId: 'S2',
          strengths: []
        },
        {
          id: 'member-3',
          name: 'Charlie',
          department: 'DEV',
          stageId: 'BP1',
          strengths: []
        }
      ];

      const memberRates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 600000 }
        },
        {
          memberId: 'member-2',
          memberRate: { rateType: 'monthly', rate: 800000 }
        },
        {
          memberId: 'member-3',
          memberRate: { rateType: 'monthly', rate: 700000 }
        }
      ];

      const result = ProfitabilityService.calculateTeamProfitability(
        members,
        testStageMasters,
        memberRates
      );

      // member-1: 売上600000, 原価325000, 利益275000
      // member-2: 売上800000, 原価455000, 利益345000
      // member-3: 売上700000, 原価105000, 利益595000
      // 合計: 売上2100000, 原価885000, 利益1215000
      expect(result.totalRevenue).toBe(2100000);
      expect(result.totalCost).toBe(885000);
      expect(result.totalProfit).toBe(1215000);
      expect(result.memberCount).toBe(3);
      expect(result.averageRevenue).toBe(700000);
      expect(result.averageProfit).toBe(405000);
    });

    test('memberRatesが指定されていない場合は売上0として計算される', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          stageId: 'S1',
          strengths: []
        }
      ];

      const result = ProfitabilityService.calculateTeamProfitability(
        members,
        testStageMasters
      );

      // 売上0、原価325000、利益-325000
      expect(result.totalRevenue).toBe(0);
      expect(result.totalCost).toBe(325000);
      expect(result.totalProfit).toBe(-325000);
      expect(result.memberCount).toBe(1);
    });

    test('memberRatesが空配列の場合は売上0として計算される', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          stageId: 'S1',
          strengths: []
        }
      ];

      const result = ProfitabilityService.calculateTeamProfitability(
        members,
        testStageMasters,
        []
      );

      expect(result.totalRevenue).toBe(0);
      expect(result.totalCost).toBe(325000);
      expect(result.totalProfit).toBe(-325000);
    });

    test('一部のメンバーのみ単価情報がある場合、そのメンバーのみ売上として計算される', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          stageId: 'S1',
          strengths: []
        },
        {
          id: 'member-2',
          name: 'Bob',
          department: 'DEV',
          stageId: 'S2',
          strengths: []
        }
      ];

      const memberRates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 600000 }
        }
        // member-2の単価情報はなし
      ];

      const result = ProfitabilityService.calculateTeamProfitability(
        members,
        testStageMasters,
        memberRates
      );

      // member-1: 売上600000, 原価325000, 利益275000
      // member-2: 売上0, 原価455000, 利益-455000
      // 合計: 売上600000, 原価780000, 利益-180000
      expect(result.totalRevenue).toBe(600000);
      expect(result.totalCost).toBe(780000);
      expect(result.totalProfit).toBe(-180000);
      expect(result.memberCount).toBe(2);
    });

    test('時給メンバーも正しく月額換算される', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          stageId: 'S1',
          strengths: []
        },
        {
          id: 'member-2',
          name: 'Bob',
          department: 'DEV',
          stageId: 'BP1',
          strengths: []
        }
      ];

      const memberRates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 600000 }
        },
        {
          memberId: 'member-2',
          memberRate: { rateType: 'hourly', rate: 5000, hours: 160 }
        }
      ];

      const result = ProfitabilityService.calculateTeamProfitability(
        members,
        testStageMasters,
        memberRates
      );

      // member-1: 売上600000
      // member-2: 売上800000 (5000 * 160)
      // 合計売上: 1400000
      expect(result.totalRevenue).toBe(1400000);
    });

    test('stageIdがないメンバーは集計から除外される', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          stageId: 'S1',
          strengths: []
        },
        {
          id: 'member-2',
          name: 'Bob',
          department: 'DEV',
          // stageIdなし
          strengths: []
        }
      ];

      const memberRates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 600000 }
        },
        {
          memberId: 'member-2',
          memberRate: { rateType: 'monthly', rate: 800000 }
        }
      ];

      const result = ProfitabilityService.calculateTeamProfitability(
        members,
        testStageMasters,
        memberRates
      );

      // member-2はstageIdがないため除外
      expect(result.memberCount).toBe(1);
      expect(result.totalRevenue).toBe(600000);
    });

    test('ステージ別の内訳が正しく計算される', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          stageId: 'S1',
          strengths: []
        },
        {
          id: 'member-2',
          name: 'Bob',
          department: 'DEV',
          stageId: 'S1',
          strengths: []
        },
        {
          id: 'member-3',
          name: 'Charlie',
          department: 'DEV',
          stageId: 'BP1',
          strengths: []
        }
      ];

      const memberRates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 600000 }
        },
        {
          memberId: 'member-2',
          memberRate: { rateType: 'monthly', rate: 650000 }
        },
        {
          memberId: 'member-3',
          memberRate: { rateType: 'monthly', rate: 700000 }
        }
      ];

      const result = ProfitabilityService.calculateTeamProfitability(
        members,
        testStageMasters,
        memberRates
      );

      expect(result.profitByStage['S1']).toBeDefined();
      expect(result.profitByStage['S1'].count).toBe(2);
      // member-1: 利益275000, member-2: 利益325000
      expect(result.profitByStage['S1'].totalProfit).toBe(600000);

      expect(result.profitByStage['BP1']).toBeDefined();
      expect(result.profitByStage['BP1'].count).toBe(1);
      // member-3: 利益595000
      expect(result.profitByStage['BP1'].totalProfit).toBe(595000);
    });
  });
});
