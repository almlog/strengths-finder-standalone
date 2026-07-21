#!/usr/bin/env node
/**
 * e-staffing 勤怠データスクレイパー
 *
 * 使い方:
 *   node scripts/scrape-estaffing.js               # 前月データを取得
 *   node scripts/scrape-estaffing.js --year 2026 --month 06
 *   node scripts/scrape-estaffing.js --debug        # ページ構造をファイル出力してデバッグ
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

// ── 引数解析 ──────────────────────────────────────────────────
const args = process.argv.slice(2);
const getArg = (name) => {
  const idx = args.indexOf(`--${name}`);
  return idx !== -1 ? args[idx + 1] : null;
};
const DEBUG = args.includes('--debug');

const today = new Date();
const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
const TARGET_YEAR  = parseInt(getArg('year')  || prevMonth.getFullYear());
const TARGET_MONTH = parseInt(getArg('month') || (prevMonth.getMonth() + 1));
const TARGET_YM_LABEL = `${TARGET_YEAR}/${String(TARGET_MONTH).padStart(2, '0')}`;

// ── 出力先 ─────────────────────────────────────────────────
const OUTPUT_DIR  = path.join(os.homedir(), 'Downloads');
const OUTPUT_FILE = path.join(OUTPUT_DIR,
  `estaffing_attendance_${TARGET_YEAR}${String(TARGET_MONTH).padStart(2, '0')}.csv`);
const DEBUG_FILE  = path.join(OUTPUT_DIR, 'estaffing_debug.html');

const SEARCH_URL = 'https://mbc.e-staffing.ne.jp/client/stf/workschedulesearch/approvesearch';

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

// ── 検索フォームを送信（年月 + 全ステータス） ──────────────────
async function submitSearchForm(page, year, month) {
  if (DEBUG) {
    const html = await page.evaluate(() => document.body.outerHTML);
    fs.writeFileSync(DEBUG_FILE, html, 'utf8');
    console.log(`  [DEBUG] ページHTMLを保存: ${DEBUG_FILE}`);
  }

  const result = await page.evaluate(([y, m]) => {
    const log = [];

    // セレクトボックス操作
    const selects = Array.from(document.querySelectorAll('select'));
    selects.forEach(sel => {
      const ctx = [sel.name, sel.id,
        sel.closest('tr,div,td,label')?.textContent?.replace(/\s+/g, ' ').trim() || ''
      ].join(' ').toLowerCase();

      // 年の設定
      if (/year|nen|年/.test(ctx)) {
        const opt = Array.from(sel.options).find(o =>
          o.value === String(y) || o.text.trim() === String(y));
        if (opt) { sel.value = opt.value; log.push(`年=${y}`); }
      }
      // 月の設定
      else if (/month|tsuki|月/.test(ctx)) {
        const mStr = String(m);
        const mPad = String(m).padStart(2, '0');
        const opt = Array.from(sel.options).find(o =>
          o.value === mStr || o.value === mPad ||
          o.text.trim() === mStr || o.text.trim() === mPad);
        if (opt) { sel.value = opt.value; log.push(`月=${m}`); }
      }
      // 承認状況 → 「全て」を選択
      else if (/status|approv|承認|状況|区分/.test(ctx)) {
        const allOpt = Array.from(sel.options).find(o =>
          /全て|全|すべて/i.test(o.text));
        if (allOpt) { sel.value = allOpt.value; log.push(`ステータス=全て`); }
      }
    });

    // テキスト入力の年月設定（select がない場合）
    document.querySelectorAll('input[type="text"], input[type="number"]').forEach(inp => {
      const ctx = [inp.name, inp.id, inp.placeholder,
        inp.closest('tr,div,td')?.textContent?.replace(/\s+/g, ' ').trim() || ''
      ].join(' ').toLowerCase();
      if (/year|nen|年/.test(ctx) && inp.value === '') {
        inp.value = String(y); log.push(`年(input)=${y}`);
      }
      if (/month|tsuki|月/.test(ctx) && inp.value === '') {
        inp.value = String(m).padStart(2, '0'); log.push(`月(input)=${m}`);
      }
    });

    // 検索ボタンを探してクリック
    const btn = (
      document.querySelector('.js-search-execute') ||
      document.querySelector('.search-execute') ||
      document.querySelector('[class*="search"][class*="btn"]') ||
      document.querySelector('[class*="btn"][class*="search"]') ||
      Array.from(document.querySelectorAll('button, input[type="submit"]'))
        .find(el => /検索|search/i.test(el.textContent + el.value)) ||
      document.querySelector('input[type="submit"]') ||
      document.querySelector('button[type="submit"]')
    );
    if (btn) {
      btn.click();
      log.push(`ボタン="${btn.textContent?.trim() || btn.value || '(submit)'}"`);
      return { ok: true, log };
    }
    return { ok: false, log };
  }, [year, month]);

  if (result.log.length) {
    console.log(`  フォーム操作: ${result.log.join(', ')}`);
  }
  if (!result.ok) {
    console.warn('  ⚠ 検索ボタンなし（現在の表示をそのまま使用）');
  }
  await sleep(1500);
}

// ── メンバーリスト収集 ────────────────────────────────────────
// href を持つリンクは直接遷移、javascript:void はクリック経由
async function collectMemberItems(page) {
  return await page.evaluate(() => {
    const results = [];

    // 優先: リストカード
    const cards = document.querySelectorAll(
      '.content-stf-list > li, [class*="stf-list"] > li, [class*="staff-list"] > li'
    );
    if (cards.length > 0) {
      cards.forEach(card => {
        const link = card.querySelector('a[href*="staff"], a[href*="approve"], a:first-of-type');
        const nameEl = card.querySelector('[class*="name"]') || link;
        if (link && nameEl) {
          results.push({
            name: nameEl.textContent.trim(),
            href: (link.getAttribute('href') || '').includes('javascript') ? null : link.href,
          });
        }
      });
      if (results.length > 0) return results;
    }

    // テーブル形式
    document.querySelectorAll('table tbody tr').forEach(tr => {
      const links = tr.querySelectorAll('a');
      links.forEach(a => {
        const name = a.textContent.trim();
        if (name && !/詳細|選択|確認|承認|▼|▲/.test(name)) {
          const href = a.getAttribute('href') || '';
          results.push({
            name,
            href: href.includes('javascript') ? null : a.href,
          });
        }
      });
    });
    if (results.length > 0) return results;

    // フォールバック: javascript:void なリンク全て
    document.querySelectorAll('a[href="javascript:void(0);"], a[href="javascript:void(0)"]')
      .forEach(a => {
        const name = a.textContent.trim();
        if (name && !/詳細|選択|確認|承認|▼|▲|ページ|次へ|前へ/.test(name)) {
          results.push({ name, href: null });
        }
      });
    return results;
  });
}

// ── 部署抽出 ──────────────────────────────────────────────────
async function extractCurrentDept(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    const m1 = text.match(/(?:所属|部署)[：:]\s*(\S+)/);
    if (m1) return m1[1];
    const m2 = text.match(/東[A-Z]{1,3}\d+-\d+-\d+/);
    if (m2) return m2[0];
    const el = document.querySelector('[class*="dept"],[class*="section"],[class*="place"],[class*="belong"]');
    if (el && el.textContent.trim()) return el.textContent.trim();
    return '';
  });
}

// ── 契約期間抽出 ─────────────────────────────────────────────
async function extractContractPeriod(page) {
  return await page.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/(\d{4}\/\d{2}\/\d{2})\s*[〜~～]\s*(\d{4}\/\d{2}\/\d{2})/);
    if (m) return { start: m[1], end: m[2] };
    return { start: '', end: '' };
  });
}

// ── サマリーパネルを開く ──────────────────────────────────────
async function openSummary(page) {
  await page.evaluate(() => {
    const el = Array.from(document.querySelectorAll('div'))
      .find(d => d.textContent.trim() === '勤怠実績サマリーを確認する');
    if (el) el.click();
  });
  await sleep(600);
}

// ── サマリー解析 ─────────────────────────────────────────────
async function parseSummary(page) {
  const text = await page.evaluate(() => document.body.innerText);

  const name     = (text.match(/\n(.+?) さん\n/) || [])[1] || '';
  const code     = (text.match(/スタッフコード：(.+?)\)/) || [])[1] || '';

  const att    = parseInt((text.match(/出勤日数\t\xb7\xb7\xb7\t(\d+)日/) || [])[1] || '0');
  const absent = parseInt((text.match(/欠勤日数\t\xb7\xb7\xb7\t(\d+)日/) || [])[1] || '0');
  const leave  = parseInt((text.match(/年休日数\t\xb7\xb7\xb7\t(\d+)日/) || [])[1] || '0');
  const totalTxt = (text.match(/総就業時間\t\xb7\xb7\xb7\t(.+?)\t/) || [])[1] || '0分';
  const baseTxt  = (text.match(/基準内時間\t\xb7\xb7\xb7\t(.+?)\n/) || [])[1] || '0分';
  const otTxt    = (text.match(/基準外時間\t\xb7\xb7\xb7\t(.+?)\n/) || [])[1] || '0分';

  const period = await extractContractPeriod(page);

  return {
    name,
    code,
    dept: '',
    contractStart:   period.start,
    contractEnd:     period.end,
    attendance:      att,
    absent,
    leave,
    totalMinutes:    parseMinutes(totalTxt),
    baseMinutes:     parseMinutes(baseTxt),
    overtimeMinutes: parseMinutes(otTxt),
    note: '',
  };
}

// ── 月移動 ───────────────────────────────────────────────────
async function navigateToMonth(page, targetYear, targetMonth) {
  for (let attempt = 0; attempt < 24; attempt++) {
    const info = await page.evaluate(() => {
      const body = document.body.innerText;
      const m = body.match(/\n(\d+)\n月\n(\d+)\n/);
      return {
        month:   m ? parseInt(m[1]) : 0,
        year:    m ? parseInt(m[2]) : 0,
        hasPrev: !!document.querySelector('.content-work-prev.js-staff-change-month'),
        hasNext: !!document.querySelector('.content-work-next.js-staff-change-month'),
      };
    });

    if (info.year === targetYear && info.month === targetMonth) return true;
    if (info.year === 0) { await sleep(500); continue; }

    const diff = (info.year - targetYear) * 12 + (info.month - targetMonth);
    if (diff > 0) {
      if (!info.hasPrev) return false;
      await page.evaluate(() =>
        document.querySelector('.content-work-prev.js-staff-change-month').click());
    } else {
      if (!info.hasNext) return false;
      await page.evaluate(() =>
        document.querySelector('.content-work-next.js-staff-change-month').click());
    }
    await sleep(800);
  }
  return false;
}

// ── メンバー個別ページへ遷移（クリックまたは直接URL）────────────
async function navigateToMember(page, item, searchUrl) {
  if (item.href) {
    await page.goto(item.href);
    await sleep(800);
    return true;
  }
  // href なし → リストページに戻ってクリック
  if (!page.url().includes('approvesearch')) {
    await page.goto(searchUrl);
    await sleep(800);
    await submitSearchForm(page, TARGET_YEAR, TARGET_MONTH);
  }
  const link = await page.$(`a:text("${item.name}")`);
  if (!link) return false;
  await link.click();
  try {
    await page.waitForURL('**/staff**', { timeout: 8000 });
  } catch {
    await sleep(500);
  }
  await sleep(800);
  return true;
}

// ── メイン ──────────────────────────────────────────────────
async function main() {
  console.log('\n======================================');
  console.log(' e-staffing 勤怠スクレイパー');
  console.log(`  対象年月 : ${TARGET_YM_LABEL}`);
  console.log(`  出力先   : ${OUTPUT_FILE}`);
  if (DEBUG) console.log('  [DEBUGモード]');
  console.log('======================================\n');

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

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

  // ── ログイン ────────────────────────────────────────────
  await page.goto('https://mbc.e-staffing.ne.jp/client/mnu/clogin');
  await sleep(1000);
  if (page.url().includes('clogin')) {
    console.log('>>> ブラウザでログインしてください。ログイン後、自動でスクレイプが始まります...\n');
    await page.waitForFunction(() => !location.href.includes('clogin'), { timeout: 300_000 });
    console.log('✓ ログイン確認\n');
    await sleep(1000);
  }

  // ── 承認検索ページで検索フォーム送信 ────────────────────────
  console.log('検索ページへ移動中...');
  await page.goto(SEARCH_URL);
  await sleep(1200);

  console.log('検索フォームを送信中...');
  await submitSearchForm(page, TARGET_YEAR, TARGET_MONTH);

  // ── メンバーリスト収集 ──────────────────────────────────
  const memberItems = await collectMemberItems(page);

  if (memberItems.length === 0) {
    console.error('✖ メンバーが見つかりません。');
    console.error('  --debug フラグで再実行するとページ構造をファイルに保存します:');
    console.error(`  ${DEBUG_FILE}`);
    await context.close();
    process.exit(1);
  }

  console.log(`対象メンバー ${memberItems.length}名: ${memberItems.map(i => i.name).join(', ')}\n`);

  // ── 各メンバーを個別に処理 ──────────────────────────────
  // 「次へ」ボタン依存ではなくリストページへ都度戻って個別ナビ
  // → 承認段階が異なるメンバーも全員カバーできる
  const results = [];

  for (let i = 0; i < memberItems.length; i++) {
    const item = memberItems[i];
    console.log(`[${i + 1}/${memberItems.length}] ${item.name}`);

    const reached = await navigateToMember(page, item, SEARCH_URL);
    if (!reached) {
      console.warn(`  ⚠ ページへの遷移失敗—スキップ`);
      results.push({
        name: item.name, code: '', dept: '',
        contractStart: '', contractEnd: '',
        attendance: 0, absent: 0, leave: 0,
        totalMinutes: 0, baseMinutes: 0, overtimeMinutes: 0,
        note: 'ページ遷移失敗',
      });
      continue;
    }

    // 部署（最新契約の所属）を取得
    const currentDept = await extractCurrentDept(page);
    if (currentDept) {
      console.log(`  部署: ${currentDept}`);
    } else {
      console.warn('  ⚠ 部署を取得できませんでした');
    }

    // 対象月へ移動
    const monthReached = await navigateToMonth(page, TARGET_YEAR, TARGET_MONTH);

    if (!monthReached) {
      console.log(`  → ${TARGET_YM_LABEL} の実績なし`);
      results.push({
        name: item.name, code: '', dept: currentDept,
        contractStart: '', contractEnd: '',
        attendance: 0, absent: 0, leave: 0,
        totalMinutes: 0, baseMinutes: 0, overtimeMinutes: 0,
        note: `${TARGET_YM_LABEL}実績なし`,
      });
    } else {
      await openSummary(page);
      const summary = await parseSummary(page);
      summary.dept = currentDept;
      summary.note = '';

      const otLabel = summary.overtimeMinutes > 0
        ? `残業 ${minutesToHHMM(summary.overtimeMinutes)} ⚠️`
        : '残業なし';
      console.log(`  出勤: ${summary.attendance}日  総就業: ${minutesToHHMM(summary.totalMinutes)}  ${otLabel}`);
      results.push(summary);
    }
  }

  // ── CSV 生成 ─────────────────────────────────────────────
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

  // ── 結果サマリー ─────────────────────────────────────────
  console.log('\n======================================');
  console.log(` 完了: ${results.length}名`);
  console.log(` 出力: ${OUTPUT_FILE}`);
  const warnings = results.filter(r => r.overtimeMinutes > 0);
  if (warnings.length > 0) {
    console.log('\n  ⚠ 残業あり:');
    warnings.forEach(r => console.log(`    ${r.name}: ${minutesToHHMM(r.overtimeMinutes)}`));
  }
  const skipped = results.filter(r => r.note && r.note.includes('失敗'));
  if (skipped.length > 0) {
    console.log('\n  ✖ 取得失敗:');
    skipped.forEach(r => console.log(`    ${r.name}: ${r.note}`));
  }
  console.log('======================================\n');

  await context.close();
}

main().catch(err => {
  console.error('\n❌ エラー:', err.message);
  process.exit(1);
});
