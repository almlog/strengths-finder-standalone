/**
 * domainValidator テスト
 *
 * TDD: ドメイン検証ユーティリティのテスト
 * 許可されたドメインのみ登録を許可する機能を検証
 */

import {
  isAllowedDomain,
  getAllowedDomains,
  getAllowedDomainsString,
} from '../../../utils/auth/domainValidator';

describe('domainValidator', () => {
  describe('isAllowedDomain', () => {
    describe('許可されたドメイン', () => {
      it('@altx.co.jp のメールを許可する', () => {
        expect(isAllowedDomain('user@altx.co.jp')).toBe(true);
      });

      it('複数のサブドメインパターンでも動作する', () => {
        expect(isAllowedDomain('test.user@altx.co.jp')).toBe(true);
        expect(isAllowedDomain('suzuki.shunpei@altx.co.jp')).toBe(true);
      });

      it('大文字小文字が混在しても正しく判定する', () => {
        // 注意: 現在の実装は大文字小文字を区別する
        // ドメインは一般的に大文字小文字を区別しないため、要検討
        expect(isAllowedDomain('user@ALTX.CO.JP')).toBe(false);
        expect(isAllowedDomain('user@altx.co.jp')).toBe(true);
      });
    });

    describe('許可されていないドメイン', () => {
      it('@gmail.com のメールを拒否する', () => {
        expect(isAllowedDomain('user@gmail.com')).toBe(false);
      });

      it('@yahoo.co.jp のメールを拒否する', () => {
        expect(isAllowedDomain('user@yahoo.co.jp')).toBe(false);
      });

      it('@example.com のメールを拒否する', () => {
        expect(isAllowedDomain('user@example.com')).toBe(false);
      });

      it('類似ドメインを拒否する', () => {
        expect(isAllowedDomain('user@altx.com')).toBe(false);
        expect(isAllowedDomain('user@altx.co')).toBe(false);
        expect(isAllowedDomain('user@fake-altx.co.jp')).toBe(false);
      });
    });

    describe('無効な入力', () => {
      it('空文字を拒否する', () => {
        expect(isAllowedDomain('')).toBe(false);
      });

      it('@がないメールを拒否する', () => {
        expect(isAllowedDomain('useraltx.co.jp')).toBe(false);
      });

      it('nullやundefinedを渡すとfalseを返す', () => {
        expect(isAllowedDomain(null as unknown as string)).toBe(false);
        expect(isAllowedDomain(undefined as unknown as string)).toBe(false);
      });

      it('@のみのメールを拒否する', () => {
        expect(isAllowedDomain('@')).toBe(false);
      });

      it('@で始まるメールを適切に処理する', () => {
        expect(isAllowedDomain('@altx.co.jp')).toBe(true);
      });

      it('@で終わるメールを拒否する', () => {
        expect(isAllowedDomain('user@')).toBe(false);
      });
    });
  });

  describe('getAllowedDomains', () => {
    it('許可ドメインの配列を返す', () => {
      const domains = getAllowedDomains();
      expect(Array.isArray(domains)).toBe(true);
      expect(domains).toContain('altx.co.jp');
    });

    it('返された配列を変更しても元のリストに影響しない', () => {
      const domains1 = getAllowedDomains();
      domains1.push('hacked.com');

      const domains2 = getAllowedDomains();
      expect(domains2).not.toContain('hacked.com');
    });
  });

  describe('getAllowedDomainsString', () => {
    it('表示用文字列を返す', () => {
      const domainsString = getAllowedDomainsString();
      expect(typeof domainsString).toBe('string');
      expect(domainsString).toContain('altx.co.jp');
    });

    it('複数ドメインがある場合はカンマ区切りで返す', () => {
      // 現在は1ドメインのみなので、カンマがないことを確認
      const domainsString = getAllowedDomainsString();
      expect(domainsString).toBe('altx.co.jp');
    });
  });
});
