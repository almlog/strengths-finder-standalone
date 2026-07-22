#!/usr/bin/env node
/**
 * e-staffing 勤怠データスクレイパー
 *
 * 使い方:
 *   node scripts/scrape-estaffing.js               # 前月データを取得
 *   node scripts/scrape-estaffing.js --year 2026 --month 07
 *
 * 検索ロジック:
 *   1. 就業先部署モーダルで "SI1" を検索 → 全部署チェック → 選択
 *   2. 承認者フラグ 1〜3 を全てON
 *   3. 対象月を設定して検索
 *   ※ 承認者設定が変わってもメンバーを最大限カバーする
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── .env 読み込み ────────────────────────────────────────────────
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

// ── 引数解析 ─────────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};

const today = new Date();
const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const TARGET_YEAR  = parseInt(getArg('year')  || prevMonth.getFullYear());
const TARGET_MONTH = parseInt(getArg('month') || (prevMonth.getMonth() + 1));
const TARGET_YM       = `${TARGET_YEAR}${String(TARGET_MONTH).padStart(2, '0')}`;      // 202607
const TARGET_YM_LABEL = `${TARGET_YEAR}/${String(TARGET_MONTH).padStart(2, '0')}`;     // 2026/07
const TARGET_YM_SLASH = `${TARGET_YEAR}/${String(TARGET_MONTH).padStart(2, '0')}`;     // 2026/07

// ── 定数 ──────────────────────────────────────────────────────
const OUTPUT_DIR  = path.join(os.homedir(), 'Downloads');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `estaffing_attendance_${TARGET_YM}.csv`);
const PROFILE_DIR = path.join(__dirname, '..', '.chrome-profile-estaffing');
const LOGIN_URL   = 'https://mbc.e-staffing.ne.jp/client/mnu/clogin';
const INIT_URL    = 'https://mbc.e-staffing.ne.jp/client/stf/workschedulesearch/approveinit';

// ── ユーティリティ ────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseMinutes(text) {
  if (!text) return 0;
  const t = text.trim();
  if (t === '0分' || t === '') return 0;
  const h = t.match(/(\d+)時間/);
  const m = t.match(/(\d+)分/);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

// ── 検索フォーム送信（SI1部署全選択 + 承認者1〜3フラグ全ON）──────
async function submitSearchWithDeptFilter(page) {
  console.log('  approveinit へ移動...');
  await page.goto(INIT_URL);
  await sleep(1500);

  // Step1: 就業先部署モーダルを開く
  await page.evaluate(() => {
    document.querySelector('.js-open-department-search-modal')?.click();
  });
  await sleep(1200);

  // Step2: モーダル内で SI1 を検索
  await page.evaluate(() => {
    const inp = document.getElementById('inputName');
    if (inp) {
      inp.value = 'SI1';
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    }
    document.querySelector('.js-dept-search-btn')?.click();
  });
  await sleep(1500);

  // Step3: 検索結果の全チェックボックスをON
  const checkedCount = await page.evaluate(() => {
    const boxes = document.querySelectorAll('#dept-srch-form .mstrpickup-checkbox');
    boxes.forEach(cb => {
      cb.checked = true;
      cb.dispatchEvent(new Event('change', { bubbles: true }));
    });
    return boxes.length;
  });
  console.log(`  部署選択: SI1一致 ${checkedCount}件 チェック済み`);

  if (checkedCount === 0) {
    throw new Error('就業先部署モーダルで SI1 に一致する部署が見つかりませんでした');
  }

  // Step4: 「選択する」でモーダルを確定・閉じる
  await page.evaluate(() => {
    document.querySelector('.js-dept-select-all')?.click();
  });
  await sleep(1000);

  // Step5: 承認者フラグ 1〜3 全てON、対象月を設定
  await page.evaluate(([ym, ymSlash]) => {
    ['priorityApprovalFlg', 'timecardApproverno2Flg', 'timecardApproverno3Flg'].forEach(name => {
      const el = document.querySelector(`input[name="${name}"]`);
      if (el && !el.checked) {
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    // hidden inputs (YYYYMM 形式)
    const hf = document.querySelector('input[name="targetMonthFromSearch"]');
    const ht = document.querySelector('input[name="targetMonthToSearch"]');
    if (hf) hf.value = ym;
    if (ht) ht.value = ym;
    // visible text inputs (YYYY/MM 形式)
    document.querySelectorAll('input.js-yearmonthpicker').forEach(inp => {
      inp.value = ymSlash;
    });
  }, [TARGET_YM, TARGET_YM_SLASH]);

  // Step6: 検索ボタンクリック
  await page.evaluate(() => {
    document.querySelector('button.el--icon-search')?.click();
  });
  await sleep(1800);

  const url = page.url();
  if (!url.includes('approvesearch')) {
    throw new Error(`検索後のURLが想定外: ${url}`);
  }
}

// ── 検索結果からメンバーカード情報を収集 ──────────────────────────
async function collectMemberCards(page) {
  return await page.evaluate(() => {
    const cards = document.querySelectorAll('.bl--card-mb');
    return Array.from(cards).map((card, idx) => {
      const name = card.querySelector('a')?.textContent?.trim() || '';
      const lines = card.innerText.trim().split('\n').map(l => l.trim()).filter(Boolean);
      // lines[0]=名前, lines[1]=部署, lines[2]=期間, lines[3]="詳細を開く"
      const dept   = lines[1] || '';
      const period = lines[2] || '';
      const periodParts = period.split(/\s*-\s*/);
      return {
        idx,
        name,
        dept,
        contractStart: periodParts[0] || '',
        contractEnd:   periodParts[1] || '',
      };
    });
  });
}

// ── 最初のメンバーカードをクリックして個別ページへ ─────────────────
async function clickFirstMemberCard(page) {
  await page.evaluate(() => {
    document.querySelector('.bl--card-mb a')?.click();
  });
  await sleep(1200);
}

// ── 対象月へ移動（月ナビボタンはオーバーレイ回避のためJS経由）────────
async function navigateToTargetMonth(page) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const info = await page.evaluate(() => {
      const text = document.body.innerText;
      // パターン: "7\n月\n2026\n" の形式
      const m1 = text.match(/(\d{1,2})\n月\n(\d{4})/);
      if (m1) return { month: parseInt(m1[1]), year: parseInt(m1[2]) };
      // 代替パターン: "2026年7月"
      const m2 = text.match(/(\d{4})年(\d{1,2})月/);
      if (m2) return { year: parseInt(m2[1]), month: parseInt(m2[2]) };
      return { month: 0, year: 0 };
    });

    if (info.year === TARGET_YEAR && info.month === TARGET_MONTH) return true;
    if (info.year === 0) { await sleep(500); continue; }

    const diff = (info.year - TARGET_YEAR) * 12 + (info.month - TARGET_MONTH);

    if (diff > 0) {
      // 前月へ
      const ok = await page.evaluate(() => {
        const btn = document.querySelector('.content-work-prev.js-staff-change-month');
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (!ok) return false;
    } else {
      // 次月へ
      const ok = await page.evaluate(() => {
        const btn = document.querySelector('.content-work-next.js-staff-change-month');
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (!ok) return false;
    }
    await sleep(900);
  }
  return false;
}

// ── サマリーを開いてデータを解析 ───────────────────────────────────
async function openAndParseSummary(page, cardInfo) {
  // 「勤怠実績サマリーを確認する」をクリック
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div, button, a, span'))
      .find(e => e.textContent.trim() === '勤怠実績サマリーを確認する');
    if (el) el.click();
  });
  await sleep(800);

  const raw = await page.evaluate(() => {
    const text = document.body.innerText;

    // 氏名: "〇〇 さん"
    const nameM = text.match(/(.+?)\s*さん/);

    // スタッフコード: "スタッフコード：XXX)"
    const codeM = text.match(/スタッフコード[：:]\s*([^\)）\n]+)/);

    // 各実績値
    const attM    = text.match(/出勤日数[\s\S]{1,10}?(\d+)日/);
    const absM    = text.match(/欠勤日数[\s\S]{1,10}?(\d+)日/);
    const leavM   = text.match(/年休日数[\s\S]{1,10}?(\d+)日/);
    const totalM  = text.match(/総就業時間[\s\S]{1,10}?([0-9時間分]+)/);
    const baseM   = text.match(/基準内時間[\s\S]{1,10}?([0-9時間分]+)/);
    const otM     = text.match(/基準外時間[\s\S]{1,10}?([0-9時間分]+)/);

    // 契約期間: "2026/04/01 - 2026/06/30" or "〜" or "～"
    const periodM = text.match(/(\d{4}\/\d{2}\/\d{2})\s*[-〜~～]\s*(\d{4}\/\d{2}\/\d{2})/);

    return {
      name:          nameM   ? nameM[1].trim()   : '',
      code:          codeM   ? codeM[1].trim()   : '',
      attendance:    attM    ? parseInt(attM[1])  : 0,
      absent:        absM    ? parseInt(absM[1])  : 0,
      leave:         leavM   ? parseInt(leavM[1]) : 0,
      totalTxt:      totalM  ? totalM[1]          : '0分',
      baseTxt:       baseM   ? baseM[1]           : '0分',
      otTxt:         otM     ? otM[1]             : '0分',
      contractStart: periodM ? periodM[1]         : '',
      contractEnd:   periodM ? periodM[2]         : '',
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

// ── 次のメンバーへ移動（オーバーレイ回避のため JS クリック）─────────
async function clickNextMember(page) {
  return await page.evaluate(() => {
    const btn = document.querySelector('.content-personal-next.js-contract-change');
    if (!btn) return false;
    btn.click();
    return true;
  });
}

// ── メイン ──────────────────────────────────────────────────────
async function main() {
  console.log('\n======================================');
  console.log(' e-staffing 勤怠スクレイパー');
  console.log(`  対象年月 : ${TARGET_YM_LABEL}`);
  console.log(`  出力先   : ${OUTPUT_FILE}`);
  console.log('======================================\n');

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

  // ── ログイン確認 ──────────────────────────────────────────────
  await page.goto(LOGIN_URL);
  await sleep(1000);
  if (page.url().includes('clogin')) {
    console.log('>>> ブラウザでログインしてください。ログイン後、自動でスクレイプが始まります...\n');
    await page.waitForFunction(() => !location.href.includes('clogin'), { timeout: 300_000 });
    console.log('✓ ログイン確認\n');
    await sleep(1000);
  }

  // ── 検索実行 ─────────────────────────────────────────────────
  console.log('検索中（SI1部署 + 承認者1〜3フラグ全ON）...');
  await submitSearchWithDeptFilter(page);

  // ── メンバーリスト取得 ────────────────────────────────────────
  const memberCards = await collectMemberCards(page);
  if (memberCards.length === 0) {
    console.error('✖ メンバーが見つかりません。ログインセッションが切れている可能性があります。');
    console.error('  launch-estaffing.bat で再ログインしてから再実行してください。');
    await context.close();
    process.exit(1);
  }
  console.log(`\n対象メンバー ${memberCards.length}名:`);
  memberCards.forEach((c, i) => console.log(`  ${i + 1}. ${c.name} (${c.dept})`));
  console.log('');

  // ── 最初のメンバーページへ遷移 ───────────────────────────────
  await clickFirstMemberCard(page);

  // ── 各メンバーのデータを収集 ─────────────────────────────────
  const results = [];

  for (let i = 0; i < memberCards.length; i++) {
    const card = memberCards[i];
    console.log(`[${i + 1}/${memberCards.length}] ${card.name}`);

    // 対象月へ移動
    const reached = await navigateToTargetMonth(page);
    if (!reached) {
      console.log(`  → ${TARGET_YM_LABEL} の実績なし（契約外）`);
      results.push({
        name: card.name, code: '', dept: card.dept,
        contractStart: card.contractStart,
        contractEnd:   card.contractEnd,
        attendance: 0, absent: 0, leave: 0,
        totalMinutes: 0, baseMinutes: 0, overtimeMinutes: 0,
        note: `${TARGET_YM_LABEL}実績なし`,
      });
    } else {
      const summary = await openAndParseSummary(page, card);
      const otLabel = summary.overtimeMinutes > 0
        ? ` 残業${Math.floor(summary.overtimeMinutes / 60)}h${summary.overtimeMinutes % 60}m ⚠`
        : '';
      console.log(`  出勤:${summary.attendance}日 総:${summary.totalMinutes}分 基準内:${summary.baseMinutes}分${otLabel}`);
      results.push(summary);
    }

    // 次のメンバーへ（最後は不要）
    if (i < memberCards.length - 1) {
      const moved = await clickNextMember(page);
      if (!moved) {
        console.warn(`  ⚠ 次のメンバーへの移動ができませんでした（インデックス ${i + 1}）`);
        break;
      }
      await sleep(900);
    }
  }

  // ── CSV 生成 ─────────────────────────────────────────────────
  const BOM = '﻿';
  const header = '氏名,スタッフコード,部署,契約開始,契約終了,出勤日数,欠勤日数,年休日数,総就業時間_分,基準内時間_分,基準外時間_分,対象年月,備考';
  const rows = results.map(r =>
    [
      r.name, r.code, r.dept,
      r.contractStart, r.contractEnd,
      r.attendance, r.absent, r.leave,
      r.totalMinutes, r.baseMinutes, r.overtimeMinutes,
      TARGET_YM_LABEL, r.note,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );
  fs.writeFileSync(OUTPUT_FILE, BOM + [header, ...rows].join('\n'), 'utf8');

  // ── 結果サマリー ─────────────────────────────────────────────
  console.log('\n======================================');
  console.log(` 完了: ${results.length}名`);
  console.log(` 出力: ${OUTPUT_FILE}`);
  const withOT = results.filter(r => r.overtimeMinutes > 0);
  if (withOT.length > 0) {
    console.log('\n  残業あり:');
    withOT.forEach(r => {
      const h = Math.floor(r.overtimeMinutes / 60);
      const m = r.overtimeMinutes % 60;
      console.log(`    ${r.name}: ${h}h${m}m`);
    });
  }
  const noData = results.filter(r => r.note && r.note.includes('実績なし'));
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
