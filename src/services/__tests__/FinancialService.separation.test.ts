/**
 * FinancialService 単価情報分離対応のテスト
 *
 * @module services/__tests__/FinancialService.separation.test
 * @description 単価情報を外部から受け取る機能のテスト
 */

import { FinancialService } from '../FinancialService';
import { MemberStrengths } from '../../models/StrengthsTypes';
import { MemberRate, MemberRateRecord } from '../../types/financial';

describe('FinancialService - 単価情報分離対応', () => {
  describe('calculateMonthlyRate - 単価を外部から受け取る', () => {
    test('memberRateパラメータが指定された場合、それを使用する', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        strengths: []
      };

      const memberRate: MemberRate = {
        rateType: 'monthly',
        rate: 800000
      };

      const result = FinancialService.calculateMonthlyRate(member, memberRate);
      expect(result).toBe(800000);
    });

    test('memberRateパラメータが指定されていない場合は0を返す', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        strengths: []
      };

      const result = FinancialService.calculateMonthlyRate(member);
      expect(result).toBe(0);
    });

    test('memberRateパラメータがundefinedの場合は0を返す', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        strengths: []
      };

      const result = FinancialService.calculateMonthlyRate(member, undefined);
      expect(result).toBe(0);
    });

    test('時給タイプの場合、月額換算される', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Bob',
        department: 'DEV',
        strengths: []
      };

      const memberRate: MemberRate = {
        rateType: 'hourly',
        rate: 5000,
        hours: 160
      };

      const result = FinancialService.calculateMonthlyRate(member, memberRate);
      expect(result).toBe(800000); // 5000 * 160
    });

    test('時給タイプで稼働時間が未指定の場合、デフォルト160時間を使用', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Bob',
        department: 'DEV',
        strengths: []
      };

      const memberRate: MemberRate = {
        rateType: 'hourly',
        rate: 5000
      };

      const result = FinancialService.calculateMonthlyRate(member, memberRate);
      expect(result).toBe(800000); // 5000 * 160
    });
  });

  describe('calculateTeamFinancials - 単価情報を外部から受け取る', () => {
    test('memberRatesパラメータが指定された場合、それを使用する', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: []
        },
        {
          id: 'member-2',
          name: 'Bob',
          department: 'DEV',
          positionId: 'SM',
          strengths: []
        }
      ];

      const memberRates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 900000 }
        },
        {
          memberId: 'member-2',
          memberRate: { rateType: 'monthly', rate: 800000 }
        }
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      expect(result.monthlyRevenue).toBe(1700000);
      expect(result.annualRevenue).toBe(20400000); // 1700000 * 12
      expect(result.averageRatePerMember).toBe(850000); // 1700000 / 2
    });

    test('memberRatesが指定されていない場合は0を返す', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: []
        }
      ];

      const result = FinancialService.calculateTeamFinancials(members);

      expect(result.monthlyRevenue).toBe(0);
      expect(result.annualRevenue).toBe(0);
      expect(result.averageRatePerMember).toBe(0);
    });

    test('memberRatesが空配列の場合は0を返す', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: []
        }
      ];

      const result = FinancialService.calculateTeamFinancials(members, []);

      expect(result.monthlyRevenue).toBe(0);
      expect(result.annualRevenue).toBe(0);
      expect(result.averageRatePerMember).toBe(0);
    });

    test('一部のメンバーのみ単価情報がある場合、そのメンバーのみ計算に含まれる', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: []
        },
        {
          id: 'member-2',
          name: 'Bob',
          department: 'DEV',
          positionId: 'SM',
          strengths: []
        },
        {
          id: 'member-3',
          name: 'Charlie',
          department: 'DEV',
          positionId: 'PO',
          strengths: []
        }
      ];

      const memberRates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 900000 }
        },
        {
          memberId: 'member-3',
          memberRate: { rateType: 'monthly', rate: 700000 }
        }
        // member-2の単価情報はなし
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      expect(result.monthlyRevenue).toBe(1600000); // 900000 + 700000
      expect(result.averageRatePerMember).toBe(800000); // 1600000 / 2
    });

    test('時給メンバーも正しく月額換算される', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: []
        },
        {
          id: 'member-2',
          name: 'Bob',
          department: 'DEV',
          positionId: 'DISPATCH',
          strengths: []
        }
      ];

      const memberRates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 900000 }
        },
        {
          memberId: 'member-2',
          memberRate: { rateType: 'hourly', rate: 5000, hours: 160 }
        }
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      expect(result.monthlyRevenue).toBe(1700000); // 900000 + 800000
    });

    test('ポジション別の内訳が正しく計算される', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: []
        },
        {
          id: 'member-2',
          name: 'Bob',
          department: 'DEV',
          positionId: 'MG',
          strengths: []
        },
        {
          id: 'member-3',
          name: 'Charlie',
          department: 'DEV',
          positionId: 'SM',
          strengths: []
        }
      ];

      const memberRates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 900000 }
        },
        {
          memberId: 'member-2',
          memberRate: { rateType: 'monthly', rate: 850000 }
        },
        {
          memberId: 'member-3',
          memberRate: { rateType: 'monthly', rate: 800000 }
        }
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      expect(result.revenueByPosition['MG']).toEqual({
        count: 2,
        totalRevenue: 1750000 // 900000 + 850000
      });

      expect(result.revenueByPosition['SM']).toEqual({
        count: 1,
        totalRevenue: 800000
      });
    });

    test('positionIdがないメンバーは集計から除外される', () => {
      const members: MemberStrengths[] = [
        {
          id: 'member-1',
          name: 'Alice',
          department: 'DEV',
          // positionIdなし
          strengths: []
        }
      ];

      const memberRates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 900000 }
        }
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      // 売上としてはカウントされるが、ポジション別内訳には含まれない
      expect(result.monthlyRevenue).toBe(900000);
      expect(Object.keys(result.revenueByPosition)).toHaveLength(0);
    });
  });
});
