/**
 * FinancialService v2.0 のユニットテスト
 */

import { FinancialService } from '../FinancialService';
import { MemberStrengths } from '../../models/StrengthsTypes';

describe('FinancialService v2.0', () => {
  describe('calculateMonthlyRate', () => {
    it('月額単価を正しく返す', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        positionId: 'MG',
        strengths: [],
      };
      const memberRate = { rateType: 'monthly' as const, rate: 900000 };

      expect(FinancialService.calculateMonthlyRate(member, memberRate)).toBe(900000);
    });

    it('時給を月額換算する（稼働時間指定あり）', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Bob',
        department: 'DEV',
        positionId: 'DISPATCH',
        strengths: [],
      };
      const memberRate = { rateType: 'hourly' as const, rate: 3000, hours: 160 };

      expect(FinancialService.calculateMonthlyRate(member, memberRate)).toBe(480000); // 3000 * 160
    });

    it('時給を月額換算する（稼働時間デフォルト160h）', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Charlie',
        department: 'DEV',
        positionId: 'DISPATCH',
        strengths: [],
      };
      const memberRate = { rateType: 'hourly' as const, rate: 2500 };

      expect(FinancialService.calculateMonthlyRate(member, memberRate)).toBe(400000); // 2500 * 160
    });

    it('memberRateがない場合は0を返す', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'David',
        department: 'DEV',
        positionId: 'ST',
        strengths: [],
      };

      expect(FinancialService.calculateMonthlyRate(member)).toBe(0);
    });

    it('契約タイプの場合は客先単価（rate）を返す', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Eve',
        department: 'DEV',
        positionId: 'ST',
        strengths: [],
      };
      const memberRate = {
        rateType: 'contract' as const,
        rate: 800000,  // 客先単価
        contractAmount: 600000  // 支払額
      };

      expect(FinancialService.calculateMonthlyRate(member, memberRate)).toBe(800000);
    });
  });

  describe('calculateTeamFinancials', () => {
    it('チーム全体の金額を正しく計算する', () => {
      const members: MemberStrengths[] = [
        {
          id: '1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: [],
        },
        {
          id: '2',
          name: 'Bob',
          department: 'DEV',
          positionId: 'SM',
          strengths: [],
        },
        {
          id: '3',
          name: 'Charlie',
          department: 'DEV',
          positionId: 'ST',
          strengths: [],
        },
      ];
      const memberRates = [
        { memberId: '1', memberRate: { rateType: 'monthly' as const, rate: 900000 } },
        { memberId: '2', memberRate: { rateType: 'monthly' as const, rate: 800000 } },
        { memberId: '3', memberRate: { rateType: 'monthly' as const, rate: 550000 } },
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      expect(result.monthlyRevenue).toBe(2250000); // 900k + 800k + 550k
      expect(result.annualRevenue).toBe(27000000); // 2250k * 12
      expect(result.averageRatePerMember).toBe(750000); // 2250k / 3
    });

    it('時給メンバーを月額換算して計算する', () => {
      const members: MemberStrengths[] = [
        {
          id: '1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: [],
        },
        {
          id: '2',
          name: 'Bob',
          department: 'DEV',
          positionId: 'DISPATCH',
          strengths: [],
        },
      ];
      const memberRates = [
        { memberId: '1', memberRate: { rateType: 'monthly' as const, rate: 900000 } },
        { memberId: '2', memberRate: { rateType: 'hourly' as const, rate: 3000, hours: 160 } },
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      expect(result.monthlyRevenue).toBe(1380000); // 900k + 480k
      expect(result.averageRatePerMember).toBe(690000); // 1380k / 2
    });

    it('memberRateがないメンバーは計算から除外される', () => {
      const members: MemberStrengths[] = [
        {
          id: '1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: [],
        },
        {
          id: '2',
          name: 'Bob',
          department: 'DEV',
          positionId: 'SM',
          strengths: [], // memberRateなし
        },
      ];
      const memberRates = [
        { memberId: '1', memberRate: { rateType: 'monthly' as const, rate: 900000 } },
        // member '2' has no rate
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      expect(result.monthlyRevenue).toBe(900000);
      expect(result.averageRatePerMember).toBe(900000); // 900k / 1人（単価あり）
    });

    it('positionIdがないメンバーは計算から除外される', () => {
      const members: MemberStrengths[] = [
        {
          id: '1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: [],
        },
        {
          id: '2',
          name: 'Bob',
          department: 'DEV',
          // positionIdなし
          strengths: [],
        },
      ];
      const memberRates = [
        { memberId: '1', memberRate: { rateType: 'monthly' as const, rate: 900000 } },
        { memberId: '2', memberRate: { rateType: 'monthly' as const, rate: 800000 } },
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      // v2.0: positionIdがなくても、単価情報があれば売上には含まれる
      expect(result.monthlyRevenue).toBe(1700000); // 900k + 800k
      // averageRatePerMemberは単価情報を持つメンバー全体で計算（positionIdなしでも含む）
      expect(result.averageRatePerMember).toBe(850000); // 1700k / 2人
      // ポジション別内訳にはpositionIdがあるメンバーのみ含まれる
      expect(result.revenueByPosition['MG']).toEqual({
        count: 1,
        totalRevenue: 900000,
      });
      expect(result.revenueByPosition['Bob']).toBeUndefined(); // positionIdなしは内訳に含まれない
    });

    it('空の配列でも正常に処理できる', () => {
      const result = FinancialService.calculateTeamFinancials([]);

      expect(result.monthlyRevenue).toBe(0);
      expect(result.annualRevenue).toBe(0);
      expect(result.averageRatePerMember).toBe(0);
      expect(result.revenueByPosition).toEqual({});
    });

    it('ポジション別内訳を正しく集計する', () => {
      const members: MemberStrengths[] = [
        {
          id: '1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: [],
        },
        {
          id: '2',
          name: 'Bob',
          department: 'DEV',
          positionId: 'MG',
          strengths: [],
        },
        {
          id: '3',
          name: 'Charlie',
          department: 'DEV',
          positionId: 'ST',
          strengths: [],
        },
      ];
      const memberRates = [
        { memberId: '1', memberRate: { rateType: 'monthly' as const, rate: 900000 } },
        { memberId: '2', memberRate: { rateType: 'monthly' as const, rate: 900000 } },
        { memberId: '3', memberRate: { rateType: 'monthly' as const, rate: 550000 } },
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      expect(result.revenueByPosition['MG']).toEqual({
        count: 2,
        totalRevenue: 1800000,
      });
      expect(result.revenueByPosition['ST']).toEqual({
        count: 1,
        totalRevenue: 550000,
      });
    });

    it('時給メンバーのポジション別内訳も正しく集計する', () => {
      const members: MemberStrengths[] = [
        {
          id: '1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'DISPATCH',
          strengths: [],
        },
        {
          id: '2',
          name: 'Bob',
          department: 'DEV',
          positionId: 'DISPATCH',
          strengths: [],
        },
      ];
      const memberRates = [
        { memberId: '1', memberRate: { rateType: 'hourly' as const, rate: 3000, hours: 160 } },
        { memberId: '2', memberRate: { rateType: 'hourly' as const, rate: 2500, hours: 180 } },
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      expect(result.revenueByPosition['DISPATCH']).toEqual({
        count: 2,
        totalRevenue: 930000, // 480k + 450k
      });
    });

    it('契約タイプメンバーを含めて正しく計算する', () => {
      const members: MemberStrengths[] = [
        {
          id: '1',
          name: 'Alice',
          department: 'DEV',
          positionId: 'MG',
          strengths: [],
        },
        {
          id: '2',
          name: 'Eve',
          department: 'DEV',
          positionId: 'ST',
          strengths: [],
        },
      ];
      const memberRates = [
        { memberId: '1', memberRate: { rateType: 'monthly' as const, rate: 900000 } },
        { memberId: '2', memberRate: {
          rateType: 'contract' as const,
          rate: 800000,  // 客先単価
          contractAmount: 600000  // 支払額
        }},
      ];

      const result = FinancialService.calculateTeamFinancials(members, memberRates);

      expect(result.monthlyRevenue).toBe(1700000); // 900k + 800k
      expect(result.averageRatePerMember).toBe(850000); // 1700k / 2
    });
  });

  describe('formatCurrency', () => {
    it('日本円形式でフォーマットする', () => {
      expect(FinancialService.formatCurrency(1000000)).toBe('￥1,000,000');
      expect(FinancialService.formatCurrency(123456)).toBe('￥123,456');
      expect(FinancialService.formatCurrency(0)).toBe('￥0');
    });

    it('負の数値もフォーマットできる', () => {
      expect(FinancialService.formatCurrency(-500000)).toBe('-￥500,000');
    });

    it('小数点以下は表示しない', () => {
      expect(FinancialService.formatCurrency(1234.56)).toBe('￥1,235'); // 四捨五入
    });
  });

  describe('formatHourlyRate', () => {
    it('時給メンバーの表示文字列を生成する', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Bob',
        department: 'DEV',
        positionId: 'DISPATCH',
        strengths: [],
      };
      const memberRate = { rateType: 'hourly' as const, rate: 3000, hours: 160 };

      const result = FinancialService.formatHourlyRate(member, memberRate);

      expect(result).toBe('￥3,000/h × 160h = ￥480,000');
    });

    it('稼働時間デフォルト値で表示文字列を生成する', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Bob',
        department: 'DEV',
        positionId: 'DISPATCH',
        strengths: [],
      };
      const memberRate = { rateType: 'hourly' as const, rate: 2500 };

      const result = FinancialService.formatHourlyRate(member, memberRate);

      expect(result).toBe('￥2,500/h × 160h = ￥400,000');
    });

    it('月額メンバーの場合はnullを返す', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        positionId: 'MG',
        strengths: [],
      };
      const memberRate = { rateType: 'monthly' as const, rate: 900000 };

      const result = FinancialService.formatHourlyRate(member, memberRate);

      expect(result).toBeNull();
    });

    it('契約タイプの場合はnullを返す', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Eve',
        department: 'DEV',
        positionId: 'ST',
        strengths: [],
      };
      const memberRate = {
        rateType: 'contract' as const,
        rate: 800000,
        contractAmount: 600000
      };

      const result = FinancialService.formatHourlyRate(member, memberRate);

      expect(result).toBeNull();
    });

    it('memberRateがない場合はnullを返す', () => {
      const member: MemberStrengths = {
        id: '1',
        name: 'Charlie',
        department: 'DEV',
        positionId: 'ST',
        strengths: [],
      };

      const result = FinancialService.formatHourlyRate(member);

      expect(result).toBeNull();
    });
  });
});
