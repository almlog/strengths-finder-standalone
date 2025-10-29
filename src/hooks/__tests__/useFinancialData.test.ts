/**
 * useFinancialData v2.0 フックのユニットテスト
 */

import { renderHook } from '@testing-library/react';
import { useFinancialData } from '../useFinancialData';
import { MemberStrengths } from '../../models/StrengthsTypes';

describe('useFinancialData v2.0', () => {
  it('メンバー配列から金額情報を計算する', () => {
    const members: MemberStrengths[] = [
      {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        positionId: 'MG',
        memberRate: { rateType: 'monthly', rate: 900000 },
        strengths: [],
      },
      {
        id: '2',
        name: 'Bob',
        department: 'DEV',
        positionId: 'SM',
        memberRate: { rateType: 'monthly', rate: 800000 },
        strengths: [],
      },
      {
        id: '3',
        name: 'Charlie',
        department: 'DEV',
        positionId: 'ST',
        memberRate: { rateType: 'monthly', rate: 550000 },
        strengths: [],
      },
    ];

    const { result } = renderHook(() => useFinancialData(members));

    expect(result.current.monthlyRevenue).toBe(2250000); // 900k + 800k + 550k
    expect(result.current.annualRevenue).toBe(27000000); // 2250k * 12
    expect(result.current.averageRatePerMember).toBe(750000); // 2250k / 3
  });

  it('時給メンバーを月額換算して計算する', () => {
    const members: MemberStrengths[] = [
      {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        positionId: 'MG',
        memberRate: { rateType: 'monthly', rate: 900000 },
        strengths: [],
      },
      {
        id: '2',
        name: 'Bob',
        department: 'DEV',
        positionId: 'DISPATCH',
        memberRate: { rateType: 'hourly', rate: 3000, hours: 160 },
        strengths: [],
      },
    ];

    const { result } = renderHook(() => useFinancialData(members));

    expect(result.current.monthlyRevenue).toBe(1380000); // 900k + 480k
    expect(result.current.averageRatePerMember).toBe(690000); // 1380k / 2
  });

  it('空の配列でも正常に処理できる', () => {
    const { result } = renderHook(() => useFinancialData([]));

    expect(result.current.monthlyRevenue).toBe(0);
    expect(result.current.annualRevenue).toBe(0);
    expect(result.current.averageRatePerMember).toBe(0);
    expect(result.current.revenueByPosition).toEqual({});
  });

  it('memberRateがないメンバーは計算から除外される', () => {
    const members: MemberStrengths[] = [
      {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        positionId: 'MG',
        memberRate: { rateType: 'monthly', rate: 900000 },
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

    const { result } = renderHook(() => useFinancialData(members));

    expect(result.current.monthlyRevenue).toBe(900000);
    expect(result.current.averageRatePerMember).toBe(900000); // 900k / 1人
  });

  it('ポジション別内訳を正しく集計する', () => {
    const members: MemberStrengths[] = [
      {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        positionId: 'MG',
        memberRate: { rateType: 'monthly', rate: 900000 },
        strengths: [],
      },
      {
        id: '2',
        name: 'Bob',
        department: 'DEV',
        positionId: 'MG',
        memberRate: { rateType: 'monthly', rate: 900000 },
        strengths: [],
      },
      {
        id: '3',
        name: 'Charlie',
        department: 'DEV',
        positionId: 'ST',
        memberRate: { rateType: 'monthly', rate: 550000 },
        strengths: [],
      },
    ];

    const { result } = renderHook(() => useFinancialData(members));

    expect(result.current.revenueByPosition['MG']).toEqual({
      count: 2,
      totalRevenue: 1800000,
    });
    expect(result.current.revenueByPosition['ST']).toEqual({
      count: 1,
      totalRevenue: 550000,
    });
  });

  it('メンバー配列が変更されたら再計算する', () => {
    const initialMembers: MemberStrengths[] = [
      {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        positionId: 'MG',
        memberRate: { rateType: 'monthly', rate: 900000 },
        strengths: [],
      },
    ];

    const { result, rerender } = renderHook(
      ({ members }) => useFinancialData(members),
      { initialProps: { members: initialMembers } }
    );

    expect(result.current.monthlyRevenue).toBe(900000);

    // メンバーを追加
    const updatedMembers: MemberStrengths[] = [
      ...initialMembers,
      {
        id: '2',
        name: 'Bob',
        department: 'DEV',
        positionId: 'SM',
        memberRate: { rateType: 'monthly', rate: 800000 },
        strengths: [],
      },
    ];

    rerender({ members: updatedMembers });

    expect(result.current.monthlyRevenue).toBe(1700000); // 900k + 800k
  });

  it('時給メンバーのポジション別内訳を正しく集計する', () => {
    const members: MemberStrengths[] = [
      {
        id: '1',
        name: 'Alice',
        department: 'DEV',
        positionId: 'DISPATCH',
        memberRate: { rateType: 'hourly', rate: 3000, hours: 160 },
        strengths: [],
      },
      {
        id: '2',
        name: 'Bob',
        department: 'DEV',
        positionId: 'DISPATCH',
        memberRate: { rateType: 'hourly', rate: 2500, hours: 180 },
        strengths: [],
      },
    ];

    const { result } = renderHook(() => useFinancialData(members));

    expect(result.current.revenueByPosition['DISPATCH']).toEqual({
      count: 2,
      totalRevenue: 930000, // 480k + 450k
    });
  });
});
