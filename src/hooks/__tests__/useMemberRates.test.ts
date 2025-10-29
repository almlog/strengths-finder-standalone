/**
 * useMemberRates カスタムフックのテスト
 *
 * @module hooks/__tests__/useMemberRates.test
 * @description メンバー単価情報を管理するReactフックのテスト
 */

import { renderHook, act } from '@testing-library/react';
import { useMemberRates } from '../useMemberRates';
import { MemberRateService } from '../../services/MemberRateService';
import { MemberRate } from '../../types/financial';

// MemberRateServiceをモック
jest.mock('../../services/MemberRateService');

describe('useMemberRates', () => {
  beforeEach(() => {
    // モックをリセット
    jest.clearAllMocks();
  });

  describe('初期化', () => {
    test('初期状態でMemberRateServiceから単価情報を読み込む', () => {
      const mockRates = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 800000 } as MemberRate,
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      ];

      (MemberRateService.getMemberRates as jest.Mock).mockReturnValue(mockRates);

      const { result } = renderHook(() => useMemberRates());

      expect(result.current.memberRates).toEqual(mockRates);
      expect(MemberRateService.getMemberRates).toHaveBeenCalledTimes(1);
    });

    test('単価情報がない場合は空配列', () => {
      (MemberRateService.getMemberRates as jest.Mock).mockReturnValue([]);

      const { result } = renderHook(() => useMemberRates());

      expect(result.current.memberRates).toEqual([]);
    });
  });

  describe('getMemberRate - 特定メンバーの単価取得', () => {
    test('指定したメンバーIDの単価情報を取得できる', () => {
      const mockRates = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 800000 } as MemberRate,
          updatedAt: '2025-01-01T00:00:00.000Z'
        },
        {
          memberId: 'member-2',
          memberRate: { rateType: 'hourly', rate: 5000, hours: 160 } as MemberRate,
          updatedAt: '2025-01-02T00:00:00.000Z'
        }
      ];

      (MemberRateService.getMemberRates as jest.Mock).mockReturnValue(mockRates);

      const { result } = renderHook(() => useMemberRates());

      const rate = result.current.getMemberRate('member-1');

      expect(rate).toEqual({ rateType: 'monthly', rate: 800000 });
    });

    test('存在しないメンバーIDの場合はundefinedを返す', () => {
      (MemberRateService.getMemberRates as jest.Mock).mockReturnValue([]);

      const { result } = renderHook(() => useMemberRates());

      const rate = result.current.getMemberRate('non-existent');

      expect(rate).toBeUndefined();
    });
  });

  describe('setMemberRate - 単価情報の設定', () => {
    test('新しい単価情報を設定できる', () => {
      (MemberRateService.getMemberRates as jest.Mock).mockReturnValue([]);
      (MemberRateService.setMemberRate as jest.Mock).mockImplementation(() => {});

      const { result } = renderHook(() => useMemberRates());

      const newRate: MemberRate = { rateType: 'monthly', rate: 900000 };

      act(() => {
        result.current.setMemberRate('member-1', newRate);
      });

      expect(MemberRateService.setMemberRate).toHaveBeenCalledWith('member-1', newRate);
      expect(MemberRateService.getMemberRates).toHaveBeenCalledTimes(2); // 初期化 + 更新後
    });

    test('既存の単価情報を更新できる', () => {
      const initialRates = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 800000 } as MemberRate,
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      ];

      (MemberRateService.getMemberRates as jest.Mock)
        .mockReturnValueOnce(initialRates)
        .mockReturnValueOnce([
          {
            memberId: 'member-1',
            memberRate: { rateType: 'monthly', rate: 900000 } as MemberRate,
            updatedAt: '2025-01-02T00:00:00.000Z'
          }
        ]);

      const { result } = renderHook(() => useMemberRates());

      const updatedRate: MemberRate = { rateType: 'monthly', rate: 900000 };

      act(() => {
        result.current.setMemberRate('member-1', updatedRate);
      });

      expect(MemberRateService.setMemberRate).toHaveBeenCalledWith('member-1', updatedRate);
    });
  });

  describe('deleteMemberRate - 単価情報の削除', () => {
    test('指定したメンバーの単価情報を削除できる', () => {
      const initialRates = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 800000 } as MemberRate,
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      ];

      (MemberRateService.getMemberRates as jest.Mock)
        .mockReturnValueOnce(initialRates)
        .mockReturnValueOnce([]);

      (MemberRateService.deleteMemberRate as jest.Mock).mockImplementation(() => {});

      const { result } = renderHook(() => useMemberRates());

      act(() => {
        result.current.deleteMemberRate('member-1');
      });

      expect(MemberRateService.deleteMemberRate).toHaveBeenCalledWith('member-1');
      expect(MemberRateService.getMemberRates).toHaveBeenCalledTimes(2);
    });
  });

  describe('refreshRates - 単価情報の再読み込み', () => {
    test('単価情報を最新の状態に更新できる', () => {
      const initialRates = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 800000 } as MemberRate,
          updatedAt: '2025-01-01T00:00:00.000Z'
        }
      ];

      const updatedRates = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 900000 } as MemberRate,
          updatedAt: '2025-01-02T00:00:00.000Z'
        },
        {
          memberId: 'member-2',
          memberRate: { rateType: 'hourly', rate: 5000, hours: 160 } as MemberRate,
          updatedAt: '2025-01-02T00:00:00.000Z'
        }
      ];

      (MemberRateService.getMemberRates as jest.Mock)
        .mockReturnValueOnce(initialRates)
        .mockReturnValueOnce(updatedRates);

      const { result } = renderHook(() => useMemberRates());

      expect(result.current.memberRates).toEqual(initialRates);

      act(() => {
        result.current.refreshRates();
      });

      expect(result.current.memberRates).toEqual(updatedRates);
      expect(MemberRateService.getMemberRates).toHaveBeenCalledTimes(2);
    });
  });

  describe('importRates - 単価情報のインポート', () => {
    test('JSONから単価情報をインポートできる（上書きモード）', () => {
      (MemberRateService.getMemberRates as jest.Mock)
        .mockReturnValueOnce([])
        .mockReturnValueOnce([
          {
            memberId: 'member-1',
            memberRate: { rateType: 'monthly', rate: 800000 } as MemberRate,
            updatedAt: '2025-01-01T00:00:00.000Z'
          }
        ]);

      (MemberRateService.importFromJsonReplace as jest.Mock).mockImplementation(() => {});

      const { result } = renderHook(() => useMemberRates());

      const json = JSON.stringify({
        rates: [
          {
            memberId: 'member-1',
            memberRate: { rateType: 'monthly', rate: 800000 }
          }
        ]
      });

      act(() => {
        result.current.importRates(json, 'replace');
      });

      expect(MemberRateService.importFromJsonReplace).toHaveBeenCalledWith(json);
      expect(MemberRateService.getMemberRates).toHaveBeenCalledTimes(2);
    });

    test('JSONから単価情報をインポートできる（追加モード）', () => {
      (MemberRateService.getMemberRates as jest.Mock).mockReturnValue([]);
      (MemberRateService.importFromJsonAddOnly as jest.Mock).mockImplementation(() => {});

      const { result } = renderHook(() => useMemberRates());

      const json = '{"rates":[]}';

      act(() => {
        result.current.importRates(json, 'add');
      });

      expect(MemberRateService.importFromJsonAddOnly).toHaveBeenCalledWith(json);
    });

    test('JSONから単価情報をインポートできる（マージモード）', () => {
      (MemberRateService.getMemberRates as jest.Mock).mockReturnValue([]);
      (MemberRateService.importFromJsonMerge as jest.Mock).mockImplementation(() => {});

      const { result } = renderHook(() => useMemberRates());

      const json = '{"rates":[]}';

      act(() => {
        result.current.importRates(json, 'merge');
      });

      expect(MemberRateService.importFromJsonMerge).toHaveBeenCalledWith(json);
    });
  });

  describe('exportRates - 単価情報のエクスポート', () => {
    test('単価情報をJSONでエクスポートできる', () => {
      const mockJson = JSON.stringify({
        _comment: ['単価情報'],
        version: '1.0.0',
        exportedAt: '2025-01-01T00:00:00.000Z',
        rates: [
          {
            memberId: 'member-1',
            memberRate: { rateType: 'monthly', rate: 800000 },
            updatedAt: '2025-01-01T00:00:00.000Z'
          }
        ]
      });

      (MemberRateService.getMemberRates as jest.Mock).mockReturnValue([]);
      (MemberRateService.exportToJson as jest.Mock).mockReturnValue(mockJson);

      const { result } = renderHook(() => useMemberRates());

      const json = result.current.exportRates();

      expect(json).toBe(mockJson);
      expect(MemberRateService.exportToJson).toHaveBeenCalledTimes(1);
    });
  });
});
