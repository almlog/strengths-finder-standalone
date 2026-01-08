/**
 * Domain Validator
 *
 * メールアドレスのドメイン検証
 * 許可されたドメインのみ登録を許可
 */

// 許可ドメイン一覧
const ALLOWED_DOMAINS = ['altx.co.jp'];

/**
 * メールアドレスが許可されたドメインかチェック
 *
 * @param {string} email - 検証するメールアドレス
 * @returns {boolean} 許可されたドメインの場合true
 *
 * @example
 * isAllowedDomain('user@altx.co.jp') // => true
 * isAllowedDomain('user@example.com') // => false
 */
export function isAllowedDomain(email: string): boolean {
  if (!email || !email.includes('@')) {
    return false;
  }

  const domain = email.split('@')[1];
  return ALLOWED_DOMAINS.includes(domain);
}

/**
 * 許可ドメイン一覧を取得
 *
 * @returns {string[]} 許可されたドメインの配列
 */
export function getAllowedDomains(): string[] {
  return [...ALLOWED_DOMAINS];
}

/**
 * 許可ドメインを表示用文字列で取得
 *
 * @returns {string} カンマ区切りのドメイン文字列
 *
 * @example
 * getAllowedDomainsString() // => "altx.co.jp"
 */
export function getAllowedDomainsString(): string {
  return ALLOWED_DOMAINS.join(', ');
}
