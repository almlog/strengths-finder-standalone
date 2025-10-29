/**
 * MemberRateService ユニットテスト
 *
 * @module services/__tests__/MemberRateService.test
 */

import { MemberRateService } from '../MemberRateService';
import { MemberRate, MemberRateRecord } from '../../types/financial';

describe('MemberRateService', () => {
  beforeEach(() => {
    // 各テストの前にLocalStorageをクリア
    localStorage.clear();
  });

  afterEach(() => {
    // 各テストの後にもクリーンアップ
    localStorage.clear();
  });

  describe('getMemberRates - 全ての単価情報を取得', () => {
    test('LocalStorageにデータがない場合は空配列を返す', () => {
      const result = MemberRateService.getMemberRates();
      expect(result).toEqual([]);
    });

    test('LocalStorageに保存済みのデータを取得できる', () => {
      const rates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 800000 },
          updatedAt: '2025-10-29T00:00:00.000Z'
        }
      ];
      localStorage.setItem('strengths-member-rates', JSON.stringify(rates));

      const result = MemberRateService.getMemberRates();
      expect(result).toEqual(rates);
    });

    test('不正なJSONの場合は空配列を返す', () => {
      localStorage.setItem('strengths-member-rates', 'invalid json');

      const result = MemberRateService.getMemberRates();
      expect(result).toEqual([]);
    });
  });

  describe('saveMemberRates - 全ての単価情報を保存', () => {
    test('単価情報をLocalStorageに保存できる', () => {
      const rates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 800000 }
        }
      ];

      MemberRateService.saveMemberRates(rates);

      const stored = localStorage.getItem('strengths-member-rates');
      expect(stored).not.toBeNull();
      expect(JSON.parse(stored!)).toEqual(rates);
    });

    test('空配列も保存できる', () => {
      MemberRateService.saveMemberRates([]);

      const stored = localStorage.getItem('strengths-member-rates');
      expect(stored).toBe('[]');
    });
  });

  describe('getMemberRate - 特定メンバーの単価情報を取得', () => {
    test('指定したメンバーIDの単価情報を取得できる', () => {
      const rates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 800000 }
        },
        {
          memberId: 'member-2',
          memberRate: { rateType: 'hourly', rate: 5000, hours: 160 }
        }
      ];
      localStorage.setItem('strengths-member-rates', JSON.stringify(rates));

      const result = MemberRateService.getMemberRate('member-1');
      expect(result).toEqual({ rateType: 'monthly', rate: 800000 });
    });

    test('存在しないメンバーIDの場合はundefinedを返す', () => {
      const rates: MemberRateRecord[] = [
        {
          memberId: 'member-1',
          memberRate: { rateType: 'monthly', rate: 800000 }
        }
      ];
      localStorage.setItem('strengths-member-rates', JSON.stringify(rates));

      const result = MemberRateService.getMemberRate('member-999');
      expect(result).toBeUndefined();
    });
  });

  describe('setMemberRate - 特定メンバーの単価情報を設定/更新', () => {
    test('新規メンバーの単価を設定できる', () => {
      const memberRate: MemberRate = { rateType: 'monthly', rate: 800000 };

      MemberRateService.setMemberRate('member-1', memberRate);

      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(1);
      expect(rates[0].memberId).toBe('member-1');
      expect(rates[0].memberRate).toEqual(memberRate);
      expect(rates[0].updatedAt).toBeDefined();
    });

    test('既存メンバーの単価を更新できる', () => {
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });

      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 900000
      });

      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(1);
      expect(rates[0].memberRate.rate).toBe(900000);
    });

    test('時給タイプの単価を設定できる', () => {
      MemberRateService.setMemberRate('member-1', {
        rateType: 'hourly',
        rate: 5000,
        hours: 160
      });

      const memberRate = MemberRateService.getMemberRate('member-1');
      expect(memberRate?.rateType).toBe('hourly');
      expect(memberRate?.rate).toBe(5000);
      expect(memberRate?.hours).toBe(160);
    });
  });

  describe('deleteMemberRate - 特定メンバーの単価情報を削除', () => {
    test('指定したメンバーIDの単価情報を削除できる', () => {
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });
      MemberRateService.setMemberRate('member-2', {
        rateType: 'monthly',
        rate: 700000
      });

      MemberRateService.deleteMemberRate('member-1');

      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(1);
      expect(rates[0].memberId).toBe('member-2');
    });

    test('存在しないメンバーIDを削除してもエラーにならない', () => {
      expect(() => {
        MemberRateService.deleteMemberRate('member-999');
      }).not.toThrow();
    });
  });

  describe('exportToJson - 単価情報をJSONとしてエクスポート', () => {
    test('JSON形式でエクスポートできる', () => {
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });

      const json = MemberRateService.exportToJson();
      const data = JSON.parse(json);

      expect(data.version).toBe('1.0');
      expect(data.exportedAt).toBeDefined();
      expect(data.rates).toHaveLength(1);
      expect(data.rates[0].memberId).toBe('member-1');
      expect(data.rates[0].memberRate.rate).toBe(800000);
      expect(data._comment).toBeDefined();
      expect(Array.isArray(data._comment)).toBe(true);
    });

    test('空の場合でもエクスポートできる', () => {
      const json = MemberRateService.exportToJson();
      const data = JSON.parse(json);

      expect(data.rates).toEqual([]);
    });
  });

  describe('importFromJson - JSONから単価情報をインポート', () => {
    test('新形式（MemberRatesExport）のJSONをインポートできる', () => {
      const json = JSON.stringify({
        version: '1.0',
        exportedAt: '2025-10-29T00:00:00.000Z',
        rates: [
          { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: 800000 } }
        ]
      });

      const rates = MemberRateService.importFromJson(json);
      expect(rates).toHaveLength(1);
      expect(rates[0].memberId).toBe('member-1');
    });

    test('旧形式（MemberRateRecord[]）のJSONをインポートできる', () => {
      const json = JSON.stringify([
        { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: 800000 } }
      ]);

      const rates = MemberRateService.importFromJson(json);
      expect(rates).toHaveLength(1);
      expect(rates[0].memberId).toBe('member-1');
    });

    test('不正なJSON形式の場合はエラー', () => {
      expect(() => {
        MemberRateService.importFromJson('invalid json');
      }).toThrow('JSONのパースに失敗しました');
    });

    test('rateTypeが不正な場合はエラー', () => {
      const json = JSON.stringify({
        rates: [
          { memberId: 'member-1', memberRate: { rateType: 'invalid', rate: 800000 } }
        ]
      });

      expect(() => {
        MemberRateService.importFromJson(json);
      }).toThrow('不正なrateType');
    });

    test('rateが負の値の場合はエラー', () => {
      const json = JSON.stringify({
        rates: [
          { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: -100 } }
        ]
      });

      expect(() => {
        MemberRateService.importFromJson(json);
      }).toThrow('不正なrate');
    });

    test('memberIdがない場合はエラー', () => {
      const json = JSON.stringify({
        rates: [
          { memberRate: { rateType: 'monthly', rate: 800000 } }
        ]
      });

      expect(() => {
        MemberRateService.importFromJson(json);
      }).toThrow('memberIdが不正です');
    });

    test('空配列の場合はエラー', () => {
      const json = JSON.stringify({ rates: [] });

      expect(() => {
        MemberRateService.importFromJson(json);
      }).toThrow('単価情報が空です');
    });
  });

  describe('getImportConflictInfo - インポート時の重複情報を取得', () => {
    test('重複情報を取得できる', () => {
      // 既存データ
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });
      MemberRateService.setMemberRate('member-2', {
        rateType: 'monthly',
        rate: 700000
      });

      // 新規データ（member-1は重複、member-3は新規）
      const json = JSON.stringify({
        rates: [
          { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: 900000 } },
          { memberId: 'member-3', memberRate: { rateType: 'monthly', rate: 600000 } }
        ]
      });

      const conflictInfo = MemberRateService.getImportConflictInfo(json);

      expect(conflictInfo.existingCount).toBe(2);
      expect(conflictInfo.newCount).toBe(2);
      expect(conflictInfo.duplicateIds).toEqual(['member-1']);
    });

    test('重複がない場合', () => {
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });

      const json = JSON.stringify({
        rates: [
          { memberId: 'member-2', memberRate: { rateType: 'monthly', rate: 700000 } }
        ]
      });

      const conflictInfo = MemberRateService.getImportConflictInfo(json);

      expect(conflictInfo.duplicateIds).toEqual([]);
    });
  });

  describe('importFromJsonReplace - 単価情報をインポート（完全置換）', () => {
    test('既存データを完全に置き換える', () => {
      // 既存データ
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });

      // 新規データ
      const json = JSON.stringify({
        rates: [
          { memberId: 'member-2', memberRate: { rateType: 'monthly', rate: 700000 } }
        ]
      });

      MemberRateService.importFromJsonReplace(json);

      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(1);
      expect(rates[0].memberId).toBe('member-2');
    });
  });

  describe('importFromJsonAddOnly - 単価情報をインポート（新規のみ追加）', () => {
    test('重複しない新規データのみを追加する', () => {
      // 既存データ
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });

      // 新規データ（member-1は重複、member-2は新規）
      const json = JSON.stringify({
        rates: [
          { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: 900000 } },
          { memberId: 'member-2', memberRate: { rateType: 'monthly', rate: 700000 } }
        ]
      });

      MemberRateService.importFromJsonAddOnly(json);

      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(2);

      const member1 = MemberRateService.getMemberRate('member-1');
      expect(member1?.rate).toBe(800000); // 既存データが保持される

      const member2 = MemberRateService.getMemberRate('member-2');
      expect(member2?.rate).toBe(700000); // 新規データが追加される
    });
  });

  describe('importFromJsonMerge - 単価情報をインポート（マージ・更新）', () => {
    test('既存データを保持し、重複は更新、新規は追加', () => {
      // 既存データ
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });
      MemberRateService.setMemberRate('member-2', {
        rateType: 'monthly',
        rate: 700000
      });

      // 新規データ（member-1を更新、member-3を追加）
      const json = JSON.stringify({
        rates: [
          { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: 900000 } },
          { memberId: 'member-3', memberRate: { rateType: 'hourly', rate: 5000, hours: 160 } }
        ]
      });

      MemberRateService.importFromJsonMerge(json);

      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(3);

      const member1 = MemberRateService.getMemberRate('member-1');
      expect(member1?.rate).toBe(900000); // 更新される

      const member2 = MemberRateService.getMemberRate('member-2');
      expect(member2?.rate).toBe(700000); // 保持される

      const member3 = MemberRateService.getMemberRate('member-3');
      expect(member3?.rate).toBe(5000); // 追加される
    });
  });

  describe('clearAll - 単価情報を全削除', () => {
    test('LocalStorageから単価情報を完全に削除できる', () => {
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });

      MemberRateService.clearAll();

      const stored = localStorage.getItem('strengths-member-rates');
      expect(stored).toBeNull();

      const rates = MemberRateService.getMemberRates();
      expect(rates).toEqual([]);
    });
  });
});
