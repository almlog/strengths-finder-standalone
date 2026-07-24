#!/usr/bin/env node
/**
 * e-staffing 勤怠データ一括取得スクリプト
 *
 * 使い方:
 *   node scripts/scrape-estaffing-batch.js --from 202601 --to 202607
 *
 * 設定（2通り）:
 *   [汎用] scripts/estaffing.config.js を作成（テンプレート: estaffing.config.example.js）
 *   [個人] プロジェクトルートの .env に ESTAFFING_COMPANY / USER / PASS / DEPT を記述
 *   ※ config.js が存在する場合は .env より優先
 *
 * 出力先: ~/Downloads/estaffing_attendance_YYYYMM.csv (月ごとに1ファイル)
 */

const { chromium } = require('playwright');
const fs   = require('fs');
const path = require('path');
const os   = require('os');

// ── 設定読み込み ──────────────────────────────────────────────────
(function loadConfig() {
  const configPath = path.join(__dirname, 'estaffing.config.js');
  if (fs.existsSync(configPath)) {
    const cfg = require(configPath);
    if (cfg.company) process.env.ESTAFFING_COMPANY = cfg.company;
    if (cfg.user)    process.env.ESTAFFING_USER    = cfg.user;
    if (cfg.pass)    process.env.ESTAFFING_PASS    = cfg.pass;
    if (cfg.dept)    process.env.ESTAFFING_DEPT    = cfg.dept;
    console.log('設定読み込み: scripts/estaffing.config.js');
    return;
  }
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
  console.log('設定読み込み: .env');
})();

// ── 引数解析 ──────────────────────────────────────────────────────
const args   = process.argv.slice(2);
const getArg = (name) => { const i = args.indexOf(`--${name}`); return i !== -1 ? args[i + 1] : null; };

const fromArg = getArg('from');
const toArg   = getArg('to');

if (!fromArg || !toArg) {
  console.error('使い方: node scripts/scrape-estaffing-batch.js --from 202601 --to 202607');
  process.exit(1);
}

const fromYear  = parseInt(fromArg.slice(0, 4));
const fromMonth = parseInt(fromArg.slice(4, 6));
const toYear    = parseInt(toArg.slice(0, 4));
const toMonth   = parseInt(toArg.slice(4, 6));

// 対象月のリストを生成
const months = [];
let y = fromYear, m = fromMonth;
while (y < toYear || (y === toYear && m <= toMonth)) {
  months.push({ year: y, month: m });
  m++;
  if (m > 12) { m = 1; y++; }
}

if (months.length === 0) {
  console.error('対象月が0件です。--from と --to を確認してください。');
  process.exit(1);
}

// ── 設定 ──────────────────────────────────────────────────────────
const COMPANY     = process.env.ESTAFFING_COMPANY || '';
const USER        = process.env.ESTAFFING_USER    || '';
const PASS        = process.env.ESTAFFING_PASS    || '';
const DEPT_FILTER = process.env.ESTAFFING_DEPT    || 'SI1';

const OUTPUT_DIR  = path.join(os.homedir(), 'Downloads');
const PROFILE_DIR = path.join(__dirname, '..', '.chrome-profile-estaffing');
const LOGIN_URL   = 'https://mbc.e-staffing.ne.jp/client/mnu/clogin';
const INIT_URL    = 'https://mbc.e-staffing.ne.jp/client/stf/workschedulesearch/approveinit';

// ── ユーティリティ ────────────────────────────────────────────────
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function humanDelay(base = 500) {
  return sleep(base + Math.floor(Math.random() * base * 0.4));
}

// 新モバイル版サイトはチェックボックスがカスタムCSSで視覚的に隠されており、
// Playwrightのcheck({force:true})でも "Element is not visible" になることがある。
// その場合はJS側でchecked=trueにしてchange/clickイベントを発火する。
async function forceCheckCheckbox(page, locator) {
  try {
    await locator.check({ force: true });
  } catch {
    const id = await locator.getAttribute('id');
    if (id) {
      await page.evaluate((elId) => {
        const el = document.getElementById(elId);
        if (el && !el.checked) {
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('click', { bubbles: true }));
        }
      }, id);
    } else {
      await locator.evaluate((el) => {
        if (!el.checked) {
          el.checked = true;
          el.dispatchEvent(new Event('change', { bubbles: true }));
          el.dispatchEvent(new Event('click', { bubbles: true }));
        }
      });
    }
  }
}

function parseMinutes(text) {
  if (!text) return 0;
  const t = text.trim();
  if (t === '0分' || t === '') return 0;
  const h = t.match(/(\d+)時間/);
  const m = t.match(/(\d+)分/);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

function ym(year, month) {
  return `${year}${String(month).padStart(2, '0')}`;
}

function ymLabel(year, month) {
  return `${year}/${String(month).padStart(2, '0')}`;
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

  // 新モバイル版サイトはReactの制御コンポーネントで、JS側からvalueを直接セット
  // するだけではボタンの活性化バリデーションが反応しない。実際のキー入力に
  // 近いPlaywrightのfill()（keydown/input/keyup相当を発火）を使う。
  const textInputs = page.locator(
    'input:not([type=hidden]):not([type=submit]):not([type=button]):not([type=password])'
  );
  await textInputs.nth(0).fill(COMPANY);
  await humanDelay(200);
  await textInputs.nth(1).fill(USER);
  await humanDelay(200);
  await page.locator('input[type=password]').fill(PASS);
  await humanDelay(400);

  // デバッグ: 入力欄に値が入ったか、ボタンが活性化したか確認（値の中身は出力しない）
  const filledCheck = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input:not([type=hidden]):not([type=submit]):not([type=button])'));
    const loginBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'ログイン');
    return {
      inputs: inputs.map(i => ({ type: i.type, filled: i.value.length > 0 })),
      buttonDisabled: loginBtn ? loginBtn.disabled : null,
    };
  });
  console.log('  入力欄の充填状態:', JSON.stringify(filledCheck));

  // ログインボタン: type="submit"ではなくtype="button"（class: login-btn）のため
  // アクセシブルネームで検索する
  await page.getByRole('button', { name: 'ログイン', exact: true }).click({ force: true });

  // 新モバイル版はURLを変えずSPA遷移するため、URL変化ではなく
  // ログインフォーム（パスワード欄）がDOMから消えたこと（＝ログイン完了）を判定材料にする
  try {
    await page.waitForSelector('input[type=password]', { state: 'detached', timeout: 30_000 });
  } catch {
    // デバッグ: 失敗時のエラーメッセージ・スクリーンショットを保存（認証情報は含めない）
    try {
      const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 2000));
      fs.writeFileSync(path.join(__dirname, 'login-debug.txt'), bodyText, 'utf8');
      await page.screenshot({ path: path.join(__dirname, 'login-debug.png') });
    } catch {}
    throw new Error('自動ログインに失敗しました。scripts/login-debug.png / login-debug.txt を確認してください。');
  }

  console.log('✓ 自動ログイン完了');
  await humanDelay(1000);
}

// ── 検索フォーム送信 ─────────────────────────────────────────────
async function submitSearchWithDeptFilter(page, year, month) {
  console.log(`  approveinit へ移動... (${ymLabel(year, month)})`);
  await page.goto(INIT_URL);
  await humanDelay(1500);

  await page.click('.js-open-department-search-modal', { force: true });
  await humanDelay(1200);

  await page.fill('#inputName', DEPT_FILTER);
  await humanDelay(400);
  await page.click('.js-dept-search-btn', { force: true });
  await humanDelay(1500);

  const checkboxes   = page.locator('#dept-srch-form .mstrpickup-checkbox');
  const checkedCount = await checkboxes.count();

  if (checkedCount === 0) {
    await page.screenshot({ path: path.join(__dirname, 'deptsearch-debug.png') }).catch(() => {});
    throw new Error(`就業先部署モーダルで "${DEPT_FILTER}" に一致する部署が見つかりませんでした`);
  }

  for (let i = 0; i < checkedCount; i++) {
    await forceCheckCheckbox(page, checkboxes.nth(i));
    await sleep(60);
  }
  console.log(`  部署選択: "${DEPT_FILTER}" 一致 ${checkedCount}件`);

  await page.click('.js-dept-select-all', { force: true });
  await humanDelay(1000);

  for (const name of ['priorityApprovalFlg', 'timecardApproverno2Flg', 'timecardApproverno3Flg']) {
    const cb = page.locator(`input[name="${name}"]`);
    if (await cb.count() > 0 && !(await cb.isChecked())) {
      await forceCheckCheckbox(page, cb);
      await humanDelay(150);
    }
  }

  const targetYmLabel = ymLabel(year, month);

  // 新モバイル版は日付ピッカーがReact制御コンポーネントのため、JSでvalueを
  // 直接書き換えても内部state・隠しフィールドに反映されない（ログインと同様）。
  // 表示されている年月ピッカーに実際のキー入力(fill)で入力する。
  // js-yearmonthpicker クラスは flatpickr の非表示ミラー入力にも付いているため、
  // from/to それぞれの専用クラスで表示中の入力欄を個別に特定する
  const fromPicker = page.locator('input.js-dl-term-ctl-from:visible');
  const toPicker    = page.locator('input.js-dl-term-ctl-to:visible');
  if (await fromPicker.count() > 0) {
    await fromPicker.first().fill(targetYmLabel);
    await humanDelay(200);
  }
  if (await toPicker.count() > 0) {
    await toPicker.first().fill(targetYmLabel);
    await humanDelay(200);
  }
  await humanDelay(300);

  await page.click('button.el--icon-search', { force: true });
  await humanDelay(1800);

  const searchError = await page.locator('text=検索条件に誤りがあります').count();
  if (searchError > 0) {
    await page.screenshot({ path: path.join(__dirname, 'searcherror-debug.png'), fullPage: true }).catch(() => {});
    throw new Error(`検索条件エラー（対象年月: ${targetYmLabel}）。scripts/searcherror-debug.png を確認してください。`);
  }
}

// ── メンバーカード情報を収集 ──────────────────────────────────────
// 新モバイル版の検索結果は <table> ではなく
// <ul class="content-result-record js-daily-record"> の繰り返し（各列は <li class="content-column-*">）
async function collectMemberCards(page) {
  return await page.evaluate(() => {
    return Array.from(document.querySelectorAll('.content-result-record')).map((row, idx) => {
      const name   = row.querySelector('.content-column-staffname a')?.textContent?.trim() || '';
      const dept   = row.querySelector('.content-column-departmentname')?.textContent?.trim() || '';
      const period = row.querySelector('.content-column-contractperiod')?.textContent?.trim() || '';
      const [contractStart, contractEnd] = period.split(/\s*-\s*/);
      return { idx, name, dept, contractStart: contractStart || '', contractEnd: contractEnd || '' };
    });
  });
}

// ── 最初のメンバーカードをクリック ────────────────────────────────
async function clickFirstMemberCard(page) {
  await page.click('.content-column-staffname a.js-staff-name', { force: true });
  await humanDelay(1200);
}

// ── 対象月へ移動 ──────────────────────────────────────────────────
async function navigateToTargetMonth(page, year, month) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const info = await page.evaluate(() => {
      const text = document.body.innerText;
      const m1 = text.match(/(\d{1,2})\n月\n(\d{4})/);
      if (m1) return { month: parseInt(m1[1]), year: parseInt(m1[2]) };
      const m2 = text.match(/(\d{4})年(\d{1,2})月/);
      if (m2) return { year: parseInt(m2[1]), month: parseInt(m2[2]) };
      return { month: 0, year: 0 };
    });

    if (info.year === year && info.month === month) return true;
    if (info.year === 0) { await sleep(500); continue; }

    const diff     = (info.year - year) * 12 + (info.month - month);
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
  // 新モバイル版は月移動後、サマリー（出勤日数・総就業時間等）がページ上に
  // 直接表示されており、旧版のような別画面を開くクリックは不要
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

// ── 1ヶ月分のデータを収集してCSVに書き出す ──────────────────────
async function scrapeMonth(page, year, month) {
  const targetYm      = ym(year, month);
  const targetYmLabel = ymLabel(year, month);
  const outputFile    = path.join(OUTPUT_DIR, `estaffing_attendance_${targetYm}.csv`);

  console.log(`\n──────────────────────────────────────`);
  console.log(` 対象年月: ${targetYmLabel}`);
  console.log(`──────────────────────────────────────`);

  await submitSearchWithDeptFilter(page, year, month);

  const memberCards = await collectMemberCards(page);
  if (memberCards.length === 0) {
    await page.screenshot({ path: path.join(__dirname, 'nomembers-debug.png'), fullPage: true }).catch(() => {});
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 3000)).catch(() => '');
    fs.writeFileSync(path.join(__dirname, 'nomembers-debug.txt'), bodyText, 'utf8');
    console.error(`✖ ${targetYmLabel}: メンバーが見つかりません。スキップします。(診断: scripts/nomembers-debug.png/.txt)`);
    return;
  }
  console.log(`対象メンバー ${memberCards.length}名:`);
  memberCards.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} (${c.dept})`));

  await clickFirstMemberCard(page);

  const results = [];
  for (let i = 0; i < memberCards.length; i++) {
    const card = memberCards[i];
    console.log(`[${i + 1}/${memberCards.length}] ${card.name}`);

    const reached = await navigateToTargetMonth(page, year, month);
    if (!reached) {
      console.log(`  → ${targetYmLabel} の実績なし（契約外）`);
      results.push({
        name: card.name, code: '', dept: card.dept,
        contractStart: card.contractStart, contractEnd: card.contractEnd,
        attendance: 0, absent: 0, leave: 0,
        totalMinutes: 0, baseMinutes: 0, overtimeMinutes: 0,
        note: `${targetYmLabel}実績なし`,
      });
    } else {
      const summary = await openAndParseSummary(page, card);
      const otLabel = summary.overtimeMinutes > 0
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

  // CSV 生成
  const BOM    = '﻿';
  const header = '氏名,スタッフコード,部署,契約開始,契約終了,出勤日数,欠勤日数,年休日数,総就業時間_分,基準内時間_分,基準外時間_分,対象年月,備考';
  const rows   = results.map(r =>
    [
      r.name, r.code, r.dept,
      r.contractStart, r.contractEnd,
      r.attendance, r.absent, r.leave,
      r.totalMinutes, r.baseMinutes, r.overtimeMinutes,
      targetYmLabel, r.note,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  fs.writeFileSync(outputFile, BOM + [header, ...rows].join('\n'), 'utf8');

  console.log(`✓ 出力完了: ${outputFile} (${results.length}名)`);

  const withOT = results.filter(r => r.overtimeMinutes > 0);
  if (withOT.length > 0) {
    console.log('  残業あり:');
    withOT.forEach(r => console.log(`    ${r.name}: ${Math.floor(r.overtimeMinutes/60)}h${r.overtimeMinutes%60}m`));
  }
}

// ── メイン ───────────────────────────────────────────────────────
async function main() {
  console.log('\n======================================');
  console.log(' e-staffing 勤怠スクレイパー（一括）');
  console.log(`  対象期間       : ${ymLabel(fromYear, fromMonth)} 〜 ${ymLabel(toYear, toMonth)}`);
  console.log(`  対象月数       : ${months.length}ヶ月`);
  console.log(`  部署フィルター : ${DEPT_FILTER}`);
  console.log(`  出力先         : ${OUTPUT_DIR}`);
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

  await ensureLoggedIn(page);

  const succeeded = [];
  const failed    = [];

  for (const { year, month } of months) {
    try {
      await scrapeMonth(page, year, month);
      succeeded.push(ymLabel(year, month));
    } catch (err) {
      const label = ymLabel(year, month);
      console.error(`\n❌ ${label} エラー: ${err.message}`);
      failed.push({ label, error: err.message });
    }
  }

  await context.close();

  console.log('\n======================================');
  console.log(` 一括取得完了`);
  console.log(`  成功: ${succeeded.length}ヶ月 (${succeeded.join(', ')})`);
  if (failed.length > 0) {
    console.log(`  失敗: ${failed.length}ヶ月`);
    failed.forEach(f => console.log(`    ${f.label}: ${f.error}`));
  }
  console.log('======================================\n');
}

main().catch(err => {
  console.error('\n❌ 致命的エラー:', err.message);
  process.exit(1);
});
