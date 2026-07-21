#!/usr/bin/env node
/**
 * e-staffing 勤怠データスクレイパー
 *
 * 使い方:
 *   node scripts/scrape-estaffing.js               # 前月データを取得
 *   node scripts/scrape-estaffing.js --year 2026 --month 06
 *
 * 前提:
 *   - Playwright がインストール済み (npm install -D playwright)
 *   - Chrome がインストール済み
 *   - e-staffing にログイン済み (またはブラウザが開いたらログインする)
 */

const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const os = require('os');

// ── .env 読み込み ────────────────────────────────────────────
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

// ── 対象年月の決定 ──────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};
const today = new Date();
const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const TARGET_YEAR  = parseInt(getArg('year')  || prevMonth.getFullYear());
const TARGET_MONTH = parseInt(getArg('month') || (prevMonth.getMonth() + 1));
const TARGET_YM_LABEL = `${TARGET_YEAR}/${String(TARGET_MONTH).padStart(2, '0')}`;

// ── 出力先（ダウンロードフォルダ）──────────────────────────────
const OUTPUT_DIR  = path.join(os.homedir(), 'Downloads');
const OUTPUT_FILE = path.join(OUTPUT_DIR,
  `estaffing_attendance_${TARGET_YEAR}${String(TARGET_MONTH).padStart(2, '0')}.csv`);

// ── ユーティリティ ──────────────────────────────────────────
function parseMinutes(text) {
  if (!text || text.trim() === '0分') return 0;
  const h = text.match(/(\d+)時間/);
  const m = text.match(/(\d+)分/);
  return (h ? parseInt(h[1]) * 60 : 0) + (m ? parseInt(m[1]) : 0);
}

function minutesToHHMM(min) {
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}m`;
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ── サマリー取得 ─────────────────────────────────────────────
async function openSummary(page) {
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div'))
      .find(d => d.textContent.trim() === '勤怠実績サマリーを確認する');
    if (el) el.click();
  });
  await sleep(600);
}

// 個人ページの innerText から部署を試行抽出する
async function extractCurrentDept(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    // パターン1: 「所属：東SI1-2-1」「部署：東SI1-2-1」
    const m1 = text.match(/(?:所属|部署)[：:]\s*(\S+)/);
    if (m1) return m1[1];
    // パターン2: 「東SI」で始まる部署コード（半角英数字ハイフン）
    const m2 = text.match(/東[A-Z]{1,3}\d+-\d+-\d+/);
    if (m2) return m2[0];
    // パターン3: ページ内の専用クラス要素（class名に dept / section / place を含む）
    const el = document.querySelector('[class*="dept"],[class*="section"],[class*="place"],[class*="belong"]');
    if (el && el.textContent.trim()) return el.textContent.trim();
    return '';
  });
}

// 表示中の契約期間（開始日・終了日）を取得する
async function extractContractPeriod(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    // 「2026/06/08〜2026/09/30」「2026/06/08 〜 2026/09/30」など
    const m = text.match(/(\d{4}\/\d{2}\/\d{2})\s*[〜~]\s*(\d{4}\/\d{2}\/\d{2})/);
    if (m) return { start: m[1], end: m[2] };
    // 「YYYY/MM/DD ～ YYYY/MM/DD」（全角チルダ）
    const m2 = text.match(/(\d{4}\/\d{2}\/\d{2})\s*～\s*(\d{4}\/\d{2}\/\d{2})/);
    if (m2) return { start: m2[1], end: m2[2] };
    return { start: '', end: '' };
  });
}

async function parseSummary(page) {
  const text = await page.evaluate(() => document.body.innerText);

  const name     = (text.match(/\n(.+?) さん\n/)     || [])[1] || '';
  const code     = (text.match(/スタッフコード：(.+?)\)/) || [])[1] || '';
  const mon      = (text.match(/\n(\d+)\n月\n(\d+)\n/) || []);
  const dispYear = mon[2] ? parseInt(mon[2]) : 0;
  const dispMon  = mon[1] ? parseInt(mon[1]) : 0;

  const att      = parseInt((text.match(/出勤日数\t···\t(\d+)日/) || [])[1] || '0');
  const absent   = parseInt((text.match(/欠勤日数\t···\t(\d+)日/) || [])[1] || '0');
  const leave    = parseInt((text.match(/年休日数\t···\t(\d+)日/) || [])[1] || '0');
  const totalTxt = (text.match(/総就業時間\t···\t(.+?)\t/)   || [])[1] || '0分';
  const baseTxt  = (text.match(/基準内時間\t···\t(.+?)\n/)   || [])[1] || '0分';
  const otTxt    = (text.match(/基準外時間\t···\t(.+?)\n/)   || [])[1] || '0分';

  // 契約期間をページから抽出
  const period = await extractContractPeriod(page);

  return {
    name,
    code,
    dept:            '',  // 呼び出し元で currentDept を設定する
    contractStart:   period.start,
    contractEnd:     period.end,
    attendance:      att,
    absent,
    leave,
    totalMinutes:    parseMinutes(totalTxt),
    baseMinutes:     parseMinutes(baseTxt),
    overtimeMinutes: parseMinutes(otTxt),
    displayYear:     dispYear,
    displayMonth:    dispMon,
    note:            '',
  };
}

// ── 月移動 ───────────────────────────────────────────────────
async function navigateToMonth(page, targetYear, targetMonth) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const info = await page.evaluate(() => {
      const body = document.body.innerText;
      const m = body.match(/\n(\d+)\n月\n(\d+)\n/);
      const prevBtn = document.querySelector('.content-work-prev.js-staff-change-month');
      const nextBtn = document.querySelector('.content-work-next.js-staff-change-month');
      return {
        month: m ? parseInt(m[1]) : 0,
        year:  m ? parseInt(m[2]) : 0,
        hasPrev: !!prevBtn,
        hasNext: !!nextBtn,
      };
    });

    if (info.year === targetYear && info.month === targetMonth) return true;
    if (info.year === 0) { await sleep(500); continue; }

    const diff = (info.year - targetYear) * 12 + (info.month - targetMonth);
    if (diff > 0) {
      // 前月へ
      if (!info.hasPrev) return false; // disabled → 前契約なし
      await page.evaluate(() =>
        document.querySelector('.content-work-prev.js-staff-change-month').click()
      );
    } else {
      // 翌月へ
      if (!info.hasNext) return false;
      await page.evaluate(() =>
        document.querySelector('.content-work-next.js-staff-change-month').click()
      );
    }
    await sleep(800);
  }
  return false;
}

// ── メイン ──────────────────────────────────────────────────
async function main() {
  console.log('\n======================================');
  console.log(' e-staffing 勤怠スクレイパー');
  console.log(`  対象年月 : ${TARGET_YM_LABEL}`);
  console.log(`  出力先   : ${OUTPUT_FILE}`);
  console.log('======================================\n');

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  // ── ブラウザ起動 ─────────────────────────────────────────
  const PROFILE_DIR = path.join(__dirname, '..', '.chrome-profile-estaffing');

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

  // ── ログイン（必要な場合のみ）────────────────────────────
  await page.goto('https://mbc.e-staffing.ne.jp/client/mnu/clogin');
  await sleep(1000);

  if (page.url().includes('clogin')) {
    console.log('>>> ブラウザでログインしてください。ログイン後、自動でスクレイプが始まります...\n');
    await page.waitForFunction(() => !location.href.includes('clogin'), { timeout: 300_000 });
    console.log('✓ ログイン確認\n');
    await sleep(1000);
  }

  // 勤怠承認検索ページへ移動
  await page.goto('https://mbc.e-staffing.ne.jp/client/stf/workschedulesearch/approvesearch');
  await sleep(1000);

  // ── メンバーリスト取得 ──────────────────────────────────
  const listItems = await page.evaluate(() => {
    const result = [];
    // メンバーカード
    const cards = document.querySelectorAll('.content-stf-list > li, [class*="list"] > li');
    cards.forEach(card => {
      const nameEl  = card.querySelector('a:first-of-type');
      const deptEl  = card.querySelector('[class*="section"],[class*="dept"],[class*="place"]');
      const periodEls = card.querySelectorAll('[class*="period"],[class*="date"]');
      if (nameEl) {
        result.push({
          name:   nameEl.textContent.trim(),
          dept:   deptEl ? deptEl.textContent.trim() : '',
          period: periodEls.length ? Array.from(periodEls).map(e=>e.textContent.trim()).join(' ') : '',
        });
      }
    });
    return result;
  });

  // カード形式で取得できない場合のフォールバック
  const memberNames = listItems.length > 0
    ? listItems.map(i => i.name)
    : await page.evaluate(() => {
        const anchors = Array.from(document.querySelectorAll('a[href="javascript:void(0);"]'));
        return anchors
          .map(a => a.textContent.trim())
          .filter(t => t.length > 0 && !t.includes('詳細') && !t.includes('選択') && !t.includes('確認'));
      });

  console.log(`対象メンバー ${memberNames.length}名: ${memberNames.join(', ')}\n`);

  // ── 1人目をクリック ─────────────────────────────────────
  const firstLink = await page.$(`a:text("${memberNames[0]}")`);
  if (!firstLink) throw new Error('最初のメンバーリンクが見つかりません');
  await firstLink.click();
  await page.waitForURL('**/staff**');
  await sleep(800);

  // ── 各メンバーを処理 ────────────────────────────────────
  const results = [];

  for (let i = 0; i < memberNames.length; i++) {
    const memberName = memberNames[i];
    console.log(`[${i + 1}/${memberNames.length}] ${memberName}`);

    // 現在ページ（最新契約）から部署を取得 ← 分析実行時点の所属
    const currentDept = (await extractCurrentDept(page))
      || listItems[i]?.dept
      || '';
    if (currentDept) {
      console.log(`  部署: ${currentDept}`);
    } else {
      console.warn('  ⚠ 部署を取得できませんでした');
    }

    // 対象月へ移動
    const reached = await navigateToMonth(page, TARGET_YEAR, TARGET_MONTH);

    if (!reached) {
      console.log(`  → ${TARGET_YM_LABEL} の実績なし（前契約なし）`);
      results.push({
        name: memberName, code: '', dept: currentDept,
        contractStart: '', contractEnd: '',
        attendance: 0, absent: 0, leave: 0,
        totalMinutes: 0, baseMinutes: 0, overtimeMinutes: 0,
        note: `${TARGET_YM_LABEL}実績なし`,
      });
    } else {
      await openSummary(page);
      const summary = await parseSummary(page);
      summary.dept = currentDept;  // 最新契約の部署（分析時点）
      summary.note = '';

      const otLabel = summary.overtimeMinutes > 0
        ? `残業 ${minutesToHHMM(summary.overtimeMinutes)} ⚠️`
        : '残業なし';
      console.log(`  出勤: ${summary.attendance}日  総就業: ${minutesToHHMM(summary.totalMinutes)}  ${otLabel}`);
      results.push(summary);
    }

    // 次のメンバーへ（最後以外）
    if (i < memberNames.length - 1) {
      const moved = await page.evaluate(() => {
        const btn = document.querySelector('.content-personal-next.js-contract-change');
        if (btn) { btn.click(); return true; }
        return false;
      });
      if (!moved) {
        console.warn('  ⚠ 次メンバーへの遷移ボタンが見つかりません');
        break;
      }
      await sleep(1000);
    }
  }

  // ── CSV 生成（BOM付き UTF-8 → Excel で文字化けしない）──
  const BOM = '﻿';
  const header = '氏名,スタッフコード,部署,契約開始,契約終了,出勤日数,欠勤日数,年休日数,総就業時間_分,基準内時間_分,基準外時間_分,対象年月,備考';
  const rows = results.map(r =>
    [
      r.name, r.code, r.dept,
      r.contractStart || '', r.contractEnd || '',
      r.attendance, r.absent, r.leave,
      r.totalMinutes, r.baseMinutes, r.overtimeMinutes,
      TARGET_YM_LABEL, r.note,
    ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
  );

  fs.writeFileSync(OUTPUT_FILE, BOM + [header, ...rows].join('\n'), 'utf8');

  // ── 結果サマリー表示 ────────────────────────────────────
  console.log('\n======================================');
  console.log(` 完了: ${results.length}名`);
  console.log(` 出力: ${OUTPUT_FILE}`);

  const warnings = results.filter(r => r.overtimeMinutes > 0);
  if (warnings.length > 0) {
    console.log('\n  ⚠ 残業あり:');
    warnings.forEach(r =>
      console.log(`    ${r.name}: ${minutesToHHMM(r.overtimeMinutes)}`)
    );
  }
  console.log('======================================\n');

  await context.close();
}

main().catch(err => {
  console.error('\n❌ エラー:', err.message);
  process.exit(1);
});
