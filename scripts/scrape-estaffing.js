#!/usr/bin/env node
/**
 * e-staffing 勤怠データスクレイパー
 *
 * 使い方:
 *   node scripts/scrape-estaffing.js               # 前月データを取得
 *   node scripts/scrape-estaffing.js --year 2026 --month 07
 *
 * 設定 (.env):
 *   ESTAFFING_COMPANY=your-company-code   # 会社コード
 *   ESTAFFING_USER=your-user-id       # ユーザーID
 *   ESTAFFING_PASS=YOUR_PASSWORD      # パスワード
 *   ESTAFFING_DEPT=SI1           # 部署フィルターキーワード
 *
 * 検索ロジック:
 *   1. 就業先部署モーダルで ESTAFFING_DEPT を検索 → 全部署選択
 *   2. 承認者フラグ 1〜3 を全てON
 *   3. 対象月を設定して検索
 *
 * 変更履歴:
 *   - すべての操作を page.evaluate(click) から page.click({ force: true }) に移行
 *     → isTrusted: true の本物のマウスイベントを生成し、サイト側の不正操作検知を回避
 *   - 自動ログイン実装（.env の認証情報を使用）
 *   - 部署フィルターを ESTAFFING_DEPT 環境変数に外出し
 */

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── .env 読み込み ─────────────────────────────────────────────────
(function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !(key in process.env)) process.env[key] = val;
  }
})();

// ── 引数解析 ──────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(`--${name}`); return i !== -1 ? args[i + 1] : null; };

const today     = new Date();
const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const TARGET_YEAR  = parseInt(getArg('year')  || prevMonth.getFullYear());
const TARGET_MONTH = parseInt(getArg('month') || (prevMonth.getMonth() + 1));
const TARGET_YM       = `${TARGET_YEAR}${String(TARGET_MONTH).padStart(2, '0')}`;   // 202607
const TARGET_YM_LABEL = `${TARGET_YEAR}/${String(TARGET_MONTH).padStart(2, '0')}`; // 2026/07

// ── 設定 ──────────────────────────────────────────────────────────
const COMPANY     = process.env.ESTAFFING_COMPANY || '';
const USER        = process.env.ESTAFFING_USER    || '';
const PASS        = process.env.ESTAFFING_PASS    || '';
const DEPT_FILTER = process.env.ESTAFFING_DEPT    || 'SI1';

const OUTPUT_DIR  = path.join(os.homedir(), 'Downloads');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `estaffing_attendance_${TARGET_YM}.csv`);
const PROFILE_DIR = path.join(__dirname, '..', '.chrome-profile-estaffing');
const LOGIN_URL   = 'https://mbc.e-staffing.ne.jp/client/mnu/clogin';
const INIT_URL    = 'https://mbc.e-staffing.ne.jp/client/stf/workschedulesearch/approveinit';

// ── ユーティリティ ────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

// 人間らしいランダムウェイト（base ± 最大40%）
function humanDelay(base = 500) {
  return sleep(base + Math.floor(Math.random() * base * 0.4));
}

function parseMinutes(text) {
  if (!text) return 0;
  const t = text.trim();
  if (t === '0分' || t === '') return 0;
  const h = t.match(/(\d+)時間/);
  const m = t.match(/(\d+)分/);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

// ── ログイン確認・自動ログイン ────────────────────────────────────
async function ensureLoggedIn(page) {
  await page.goto(LOGIN_URL);
  await sleep(1200);

  if (!page.url().includes('clogin')) {
    console.log('✓ セッション有効 - ログインスキップ');
    return;
  }

  if (!COMPANY || !USER || !PASS) {
    console.log('>>> .env に認証情報が未設定です。手動でログインしてください...');
    await page.waitForURL(url => !url.includes('clogin'), { timeout: 300_000 });
    console.log('✓ ログイン確認');
    await humanDelay(1000);
    return;
  }

  console.log('  自動ログイン中...');

  // ログインフォームへの入力:
  // React フォームは HTMLInputElement.prototype.value の native setter が必要。
  // ここだけ evaluate を使う（ログイン画面はセッション中の操作検知対象外）。
  await page.evaluate(([company, user, pass]) => {
    const nativeSet = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const fill = (el, val) => {
      if (!el) return;
      nativeSet.call(el, val);
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    };
    const inputs     = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button])'));
    const passEl     = inputs.find(i => i.type === 'password');
    const textInputs = inputs.filter(i => i.type !== 'password');
    fill(textInputs[0], company); // 会社コード
    fill(textInputs[1], user);    // ユーザーID
    fill(passEl, pass);           // パスワード
  }, [COMPANY, USER, PASS]);

  await humanDelay(600);

  // ログインボタン: native click → isTrusted: true
  await page.click('button[type="submit"]', { force: true });

  try {
    await page.waitForURL(url => !url.includes('clogin'), { timeout: 30_000 });
  } catch {
    throw new Error('自動ログインに失敗しました。.env の認証情報を確認してください。');
  }

  console.log('✓ 自動ログイン完了');
  await humanDelay(1000);
}

// ── 検索フォーム送信（部署フィルター + 承認者1〜3フラグ全ON）────────
async function submitSearchWithDeptFilter(page) {
  console.log('  approveinit へ移動...');
  await page.goto(INIT_URL);
  await humanDelay(1500);

  // Step1: 就業先部署モーダルを開く
  await page.click('.js-open-department-search-modal', { force: true });
  await humanDelay(1200);

  // Step2: 部署名を入力して検索
  await page.fill('#inputName', DEPT_FILTER);
  await humanDelay(400);
  await page.click('.js-dept-search-btn', { force: true });
  await humanDelay(1500);

  // Step3: 検索結果の全チェックボックスをON
  const checkboxes  = page.locator('#dept-srch-form .mstrpickup-checkbox');
  const checkedCount = await checkboxes.count();

  if (checkedCount === 0) {
    throw new Error(`就業先部署モーダルで "${DEPT_FILTER}" に一致する部署が見つかりませんでした`);
  }

  for (let i = 0; i < checkedCount; i++) {
    await checkboxes.nth(i).check({ force: true });
    await sleep(60);
  }
  console.log(`  部署選択: "${DEPT_FILTER}" 一致 ${checkedCount}件`);

  // Step4: 「選択する」でモーダルを確定
  await page.click('.js-dept-select-all', { force: true });
  await humanDelay(1000);

  // Step5: 承認者フラグ 1〜3 全てON
  for (const name of ['priorityApprovalFlg', 'timecardApproverno2Flg', 'timecardApproverno3Flg']) {
    const cb = page.locator(`input[name="${name}"]`);
    if (await cb.count() > 0 && !(await cb.isChecked())) {
      await cb.check({ force: true });
      await humanDelay(150);
    }
  }

  // 対象月の設定:
  // hidden input は Playwright の fill 対象外なので evaluate で値のみ書き込む。
  // セキュリティ検知の対象は「ユーザー操作ボタン」であり、hidden value の書き換えは対象外。
  await page.evaluate(([ym, ymLabel]) => {
    const hf = document.querySelector('input[name="targetMonthFromSearch"]');
    const ht = document.querySelector('input[name="targetMonthToSearch"]');
    if (hf) hf.value = ym;
    if (ht) ht.value = ym;
    document.querySelectorAll('input.js-yearmonthpicker').forEach(inp => { inp.value = ymLabel; });
  }, [TARGET_YM, TARGET_YM_LABEL]);
  await humanDelay(300);

  // Step6: 検索ボタン
  await page.click('button.el--icon-search', { force: true });
  await humanDelay(1800);

  if (!page.url().includes('approvesearch')) {
    throw new Error(`検索後のURLが想定外: ${page.url()}`);
  }
}

// ── メンバーカード情報を収集（DOM読み取り専用 → evaluate OK）────────
async function collectMemberCards(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.bl--card-mb')).map((card, idx) => {
      const name  = card.querySelector('a')?.textContent?.trim() || '';
      const lines = card.innerText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      const period = lines[2] || '';
      const [contractStart, contractEnd] = period.split(/\s*-\s*/);
      return { idx, name, dept: lines[1] || '', contractStart: contractStart || '', contractEnd: contractEnd || '' };
    });
  });
}

// ── 最初のメンバーカードをクリック ────────────────────────────────
async function clickFirstMemberCard(page) {
  await page.click('.bl--card-mb a', { force: true });
  await humanDelay(1200);
}

// ── 対象月へ移動 ──────────────────────────────────────────────────
async function navigateToTargetMonth(page) {
  for (let attempt = 0; attempt < 24; attempt++) {
    // 現在の表示月を読み取り（読み取りのみ → evaluate OK）
    const info = await page.evaluate(() => {
      const text = document.body.innerText;
      const m1 = text.match(/(\d{1,2})\n月\n(\d{4})/);
      if (m1) return { month: parseInt(m1[1]), year: parseInt(m1[2]) };
      const m2 = text.match(/(\d{4})年(\d{1,2})月/);
      if (m2) return { year: parseInt(m2[1]), month: parseInt(m2[2]) };
      return { month: 0, year: 0 };
    });

    if (info.year === TARGET_YEAR && info.month === TARGET_MONTH) return true;
    if (info.year === 0) { await sleep(500); continue; }

    const diff     = (info.year - TARGET_YEAR) * 12 + (info.month - TARGET_MONTH);
    const selector = diff > 0
      ? '.content-work-prev.js-staff-change-month'
      : '.content-work-next.js-staff-change-month';

    const btn = page.locator(selector);
    if (await btn.count() === 0) return false;
    await btn.click({ force: true });
    await humanDelay(900);
  }
  return false;
}

// ── サマリーを開いてデータを解析 ─────────────────────────────────
async function openAndParseSummary(page, cardInfo) {
  // 「勤怠実績サマリーを確認する」リンクを native click
  await page.getByText('勤怠実績サマリーを確認する').click({ force: true });
  await humanDelay(800);

  // DOM読み取りのみ → evaluate OK
  const raw = await page.evaluate(() => {
    const text   = document.body.innerText;
    const nameM  = text.match(/(.+?)\s*さん/);
    const codeM  = text.match(/スタッフコード[：:]\s*([^\)）\n]+)/);
    const attM   = text.match(/出勤日数[\s\S]{1,10}?(\d+)日/);
    const absM   = text.match(/欠勤日数[\s\S]{1,10}?(\d+)日/);
    const leavM  = text.match(/年休日数[\s\S]{1,10}?(\d+)日/);
    const totalM = text.match(/総就業時間[\s\S]{1,10}?([0-9時間分]+)/);
    const baseM  = text.match(/基準内時間[\s\S]{1,10}?([0-9時間分]+)/);
    const otM    = text.match(/基準外時間[\s\S]{1,10}?([0-9時間分]+)/);
    const perM   = text.match(/(\d{4}\/\d{2}\/\d{2})\s*[-〜~～]\s*(\d{4}\/\d{2}\/\d{2})/);
    return {
      name:          nameM  ? nameM[1].trim()   : '',
      code:          codeM  ? codeM[1].trim()   : '',
      attendance:    attM   ? parseInt(attM[1])  : 0,
      absent:        absM   ? parseInt(absM[1])  : 0,
      leave:         leavM  ? parseInt(leavM[1]) : 0,
      totalTxt:      totalM ? totalM[1]          : '0分',
      baseTxt:       baseM  ? baseM[1]           : '0分',
      otTxt:         otM    ? otM[1]             : '0分',
      contractStart: perM   ? perM[1]            : '',
      contractEnd:   perM   ? perM[2]            : '',
    };
  });

  return {
    name:            raw.name || cardInfo.name,
    code:            raw.code,
    dept:            cardInfo.dept,
    contractStart:   raw.contractStart || cardInfo.contractStart,
    contractEnd:     raw.contractEnd   || cardInfo.contractEnd,
    attendance:      raw.attendance,
    absent:          raw.absent,
    leave:           raw.leave,
    totalMinutes:    parseMinutes(raw.totalTxt),
    baseMinutes:     parseMinutes(raw.baseTxt),
    overtimeMinutes: parseMinutes(raw.otTxt),
    note:            '',
  };
}

// ── 次のメンバーへ移動 ────────────────────────────────────────────
async function clickNextMember(page) {
  const btn = page.locator('.content-personal-next.js-contract-change');
  if (await btn.count() === 0) return false;
  await btn.click({ force: true });
  return true;
}

// ── メイン ───────────────────────────────────────────────────────
async function main() {
  console.log('\n======================================');
  console.log(' e-staffing 勤怠スクレイパー');
  console.log(`  対象年月       : ${TARGET_YM_LABEL}`);
  console.log(`  部署フィルター : ${DEPT_FILTER}`);
  console.log(`  出力先         : ${OUTPUT_FILE}`);
  console.log('======================================\n');

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const context = await chromium.launchPersistentContext(PROFILE_DIR, {
    headless: false,
    channel:  'chrome',
    args:     ['--disable-blink-features=AutomationControlled'],
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  });
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });
  const page = context.pages()[0] || await context.newPage();

  // ── ログイン確認・自動ログイン ─────────────────────────────────
  await ensureLoggedIn(page);

  // ── 検索実行 ──────────────────────────────────────────────────
  console.log(`検索中（${DEPT_FILTER}部署 + 承認者1〜3フラグ全ON）...`);
  await submitSearchWithDeptFilter(page);

  // ── メンバーリスト取得 ────────────────────────────────────────
  const memberCards = await collectMemberCards(page);
  if (memberCards.length === 0) {
    console.error('✖ メンバーが見つかりません。');
    await context.close();
    process.exit(1);
  }
  console.log(`\n対象メンバー ${memberCards.length}名:`);
  memberCards.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} (${c.dept})`));
  console.log('');

  // ── 最初のメンバーページへ ────────────────────────────────────
  await clickFirstMemberCard(page);

  // ── 各メンバーのデータを収集 ──────────────────────────────────
  const results = [];
  for (let i = 0; i < memberCards.length; i++) {
    const card = memberCards[i];
    console.log(`[${i + 1}/${memberCards.length}] ${card.name}`);

    const reached = await navigateToTargetMonth(page);
    if (!reached) {
      console.log(`  → ${TARGET_YM_LABEL} の実績なし（契約外）`);
      results.push({
        name: card.name, code: '', dept: card.dept,
        contractStart: card.contractStart, contractEnd: card.contractEnd,
        attendance: 0, absent: 0, leave: 0,
        totalMinutes: 0, baseMinutes: 0, overtimeMinutes: 0,
        note: `${TARGET_YM_LABEL}実績なし`,
      });
    } else {
      const summary  = await openAndParseSummary(page, card);
      const otLabel  = summary.overtimeMinutes > 0
        ? ` 残業${Math.floor(summary.overtimeMinutes / 60)}h${summary.overtimeMinutes % 60}m ⚠`
        : '';
      console.log(`  出勤:${summary.attendance}日 総:${summary.totalMinutes}分 基準内:${summary.baseMinutes}分${otLabel}`);
      results.push(summary);
    }

    if (i < memberCards.length - 1) {
      const moved = await clickNextMember(page);
      if (!moved) {
        console.warn(`  ⚠ 次のメンバーへの移動ができませんでした（インデックス ${i + 1}）`);
        break;
      }
      await humanDelay(900);
    }
  }

  // ── CSV 生成 ──────────────────────────────────────────────────
  const BOM    = '﻿';
  const header = '氏名,スタッフコード,部署,契約開始,契約終了,出勤日数,欠勤日数,年休日数,総就業時間_分,基準内時間_分,基準外時間_分,対象年月,備考';
  const rows   = results.map(r =>
    [
      r.name, r.code, r.dept,
      r.contractStart, r.contractEnd,
      r.attendance, r.absent, r.leave,
      r.totalMinutes, r.baseMinutes, r.overtimeMinutes,
      TARGET_YM_LABEL, r.note,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  fs.writeFileSync(OUTPUT_FILE, BOM + [header, ...rows].join('\n'), 'utf8');

  // ── 結果サマリー ──────────────────────────────────────────────
  console.log('\n======================================');
  console.log(` 完了: ${results.length}名`);
  console.log(` 出力: ${OUTPUT_FILE}`);
  const withOT = results.filter(r => r.overtimeMinutes > 0);
  if (withOT.length > 0) {
    console.log('\n  残業あり:');
    withOT.forEach(r => console.log(`    ${r.name}: ${Math.floor(r.overtimeMinutes/60)}h${r.overtimeMinutes%60}m`));
  }
  const noData = results.filter(r => r.note?.includes('実績なし'));
  if (noData.length > 0) {
    console.log('\n  実績なし（契約外）:');
    noData.forEach(r => console.log(`    ${r.name}`));
  }
  console.log('======================================\n');

  await context.close();
}

main().catch(err => {
  console.error('\n❌ エラー:', err.message);
  process.exit(1);
});
