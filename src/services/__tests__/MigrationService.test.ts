/**
 * MigrationService ユニットテスト
 *
 * @module services/__tests__/MigrationService.test
 * @description メンバーデータから単価情報を分離するマイグレーション処理のテスト
 */

import { MigrationService } from '../MigrationService';
import { MemberRateService } from '../MemberRateService';
import { STORAGE_KEYS } from '../../constants/storage';

describe('MigrationService', () => {
  beforeEach(() => {
    // 各テストの前にLocalStorageをクリア
    localStorage.clear();
  });

  afterEach(() => {
    // 各テストの後にもクリーンアップ
    localStorage.clear();
  });

  describe('needsMigration - マイグレーションが必要かチェック', () => {
    test('LocalStorageにデータがない場合はfalse', () => {
      const result = MigrationService.needsMigration();
      expect(result).toBe(false);
    });

    test('memberRateフィールドを持つメンバーが存在する場合はtrue', () => {
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      const result = MigrationService.needsMigration();
      expect(result).toBe(true);
    });

    test('memberRateフィールドを持たないメンバーのみの場合はfalse', () => {
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      const result = MigrationService.needsMigration();
      expect(result).toBe(false);
    });

    test('一部のメンバーだけがmemberRateを持つ場合はtrue', () => {
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          strengths: []
        },
        {
          id: 'member-2',
          name: '佐藤花子',
          department: '営業部',
          memberRate: { rateType: 'monthly', rate: 700000 },
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      const result = MigrationService.needsMigration();
      expect(result).toBe(true);
    });

    test('不正なJSONの場合はfalse', () => {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, 'invalid json');

      const result = MigrationService.needsMigration();
      expect(result).toBe(false);
    });
  });

  describe('migrateMemberRatesToSeparateStorage - メンバーデータから単価情報を分離', () => {
    test('memberRateを持つメンバーの単価情報を別管理に移行する', () => {
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },
          strengths: []
        },
        {
          id: 'member-2',
          name: '佐藤花子',
          department: '営業部',
          memberRate: { rateType: 'hourly', rate: 5000, hours: 160 },
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      MigrationService.migrateMemberRatesToSeparateStorage();

      // 単価情報が別管理に移行されている
      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(2);
      expect(rates[0].memberId).toBe('member-1');
      expect(rates[0].memberRate.rate).toBe(800000);
      expect(rates[1].memberId).toBe('member-2');
      expect(rates[1].memberRate.rate).toBe(5000);
    });

    test('メンバーデータからmemberRateフィールドが削除される', () => {
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      MigrationService.migrateMemberRatesToSeparateStorage();

      // メンバーデータからmemberRateが削除されている
      const stored = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      const updatedMembers = JSON.parse(stored!);
      expect(updatedMembers).toHaveLength(1);
      expect(updatedMembers[0].id).toBe('member-1');
      expect(updatedMembers[0].name).toBe('山田太郎');
      expect(updatedMembers[0].memberRate).toBeUndefined();
    });

    test('memberRateを持たないメンバーは影響を受けない', () => {
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },
          strengths: []
        },
        {
          id: 'member-2',
          name: '佐藤花子',
          department: '営業部',
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      MigrationService.migrateMemberRatesToSeparateStorage();

      // member-2のデータは変更されていない（memberRateがないため）
      const stored = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      const updatedMembers = JSON.parse(stored!);
      const member2 = updatedMembers.find((m: any) => m.id === 'member-2');
      expect(member2.name).toBe('佐藤花子');
      expect(member2.department).toBe('営業部');

      // 単価情報はmember-1のみ
      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(1);
      expect(rates[0].memberId).toBe('member-1');
    });

    test('updatedAtフィールドが自動的に追加される', () => {
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      MigrationService.migrateMemberRatesToSeparateStorage();

      const rates = MemberRateService.getMemberRates();
      expect(rates[0].updatedAt).toBeDefined();
      expect(typeof rates[0].updatedAt).toBe('string');
      // ISO 8601形式かチェック
      expect(new Date(rates[0].updatedAt!).toISOString()).toBe(rates[0].updatedAt);
    });

    test('LocalStorageにデータがない場合は何もしない', () => {
      // データがない状態で実行
      MigrationService.migrateMemberRatesToSeparateStorage();

      // 何も変更されていない
      const members = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      expect(members).toBeNull();

      const rates = MemberRateService.getMemberRates();
      expect(rates).toEqual([]);
    });

    test('不正なJSONの場合はエラーにならず処理をスキップ', () => {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, 'invalid json');

      // エラーにならずに完了する
      expect(() => {
        MigrationService.migrateMemberRatesToSeparateStorage();
      }).not.toThrow();

      // 単価情報は作成されない
      const rates = MemberRateService.getMemberRates();
      expect(rates).toEqual([]);
    });

    test('既に単価情報が別管理に存在する場合は統合される', () => {
      // 既存の単価情報
      MemberRateService.setMemberRate('member-existing', {
        rateType: 'monthly',
        rate: 600000
      });

      // マイグレーション対象のメンバーデータ
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      MigrationService.migrateMemberRatesToSeparateStorage();

      // 両方の単価情報が保存されている
      const rates = MemberRateService.getMemberRates();
      expect(rates.length).toBeGreaterThanOrEqual(2);

      const existingRate = MemberRateService.getMemberRate('member-existing');
      expect(existingRate?.rate).toBe(600000);

      const migratedRate = MemberRateService.getMemberRate('member-1');
      expect(migratedRate?.rate).toBe(800000);
    });

    test('重複するmemberIdの場合は新しい単価情報で上書きされる', () => {
      // 既存の単価情報
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 700000 // 古い単価
      });

      // マイグレーション対象のメンバーデータ（同じID）
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 }, // 新しい単価
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      MigrationService.migrateMemberRatesToSeparateStorage();

      // 新しい単価で上書きされている
      const rate = MemberRateService.getMemberRate('member-1');
      expect(rate?.rate).toBe(800000);

      // 単価情報は1件のみ（重複していない）
      const rates = MemberRateService.getMemberRates();
      const member1Rates = rates.filter(r => r.memberId === 'member-1');
      expect(member1Rates).toHaveLength(1);
    });

    test('空配列の場合は正常に処理される', () => {
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify([]));

      expect(() => {
        MigrationService.migrateMemberRatesToSeparateStorage();
      }).not.toThrow();

      const rates = MemberRateService.getMemberRates();
      expect(rates).toEqual([]);
    });
  });

  describe('統合テスト - needsMigration → migrate の流れ', () => {
    test('マイグレーションが必要な場合、実行後はneedsMigrationがfalseになる', () => {
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      // マイグレーション前はtrue
      expect(MigrationService.needsMigration()).toBe(true);

      // マイグレーション実行
      MigrationService.migrateMemberRatesToSeparateStorage();

      // マイグレーション後はfalse
      expect(MigrationService.needsMigration()).toBe(false);
    });

    test('複数回実行しても冪等性が保たれる', () => {
      const members = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },
          strengths: []
        }
      ];
      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(members));

      // 1回目の実行
      MigrationService.migrateMemberRatesToSeparateStorage();
      const rates1 = MemberRateService.getMemberRates();

      // 2回目の実行
      MigrationService.migrateMemberRatesToSeparateStorage();
      const rates2 = MemberRateService.getMemberRates();

      // 結果は同じ
      expect(rates1).toHaveLength(1);
      expect(rates2).toHaveLength(1);
      expect(rates2[0].memberId).toBe('member-1');
      expect(rates2[0].memberRate.rate).toBe(800000);
    });
  });
});
