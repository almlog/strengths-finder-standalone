#!/usr/bin/env node
/**
 * e-staffing ログイン用ブラウザ起動スクリプト
 *
 * 使い方:
 *   launch-estaffing.bat を実行 → ブラウザでログイン → 自動で閉じる
 *   次回以降は scrape-estaffing.bat だけで自動実行できる
 */

const { chromium } = require('playwright');
const path = require('path');

const PROFILE_DIR = path.join(__dirname, '..', '.chrome-profile-estaffing');
const LOGIN_URL    = 'https://mbc.e-staffing.ne.jp/client/mnu/clogin';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function main() {
  console.log('\n======================================');
  console.log(' e-staffing ログインブラウザ');
  console.log('======================================');
  console.log('\nChromeを起動します。');
  console.log('ログインID・企業ID・パスワードを入力してログインしてください。');
  console.log('ログイン完了後、ブラウザは自動で閉じます。\n');

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel: 'chrome',
    args: ['--disable-blink-features=AutomationControlled'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = context.pages()[0] || await context.newPage();
  await page.goto(LOGIN_URL);

  console.log('ログイン待機中...');
  await page.waitForFunction(
    () => !location.href.includes('clogin'),
    { timeout: 300_000 }
  );

  // セッションがディスクに書き込まれるのを待つ
  console.log('\n✓ ログイン確認。セッションを保存中です（3秒後に自動で閉じます）...');
  await page.evaluate(() => {
    document.title = '✓ ログイン完了 - 自動で閉じます';
  });
  await sleep(3000);

  await context.close();
  console.log('✓ 完了。次回から scrape-estaffing.bat で自動実行できます。\n');
}

main().catch(err => {
  console.error('\nエラー:', err.message);
  process.exit(1);
});
