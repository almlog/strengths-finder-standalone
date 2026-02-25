/**
 * ダミー勤怠XLSX生成スクリプト
 *
 * 予兆アラート・36協定アラート・各種違反パターンをテストするための
 * サンプルデータを生成する
 *
 * 使い方: node scripts/generate-dummy-xlsx.js
 * 出力先: docs/rakurakukintai/出勤簿_日別詳細_ダミー.xlsx
 */

const XLSX = require('xlsx');
const path = require('path');

// ===== 定数 =====
const HEADER = [
  '社員番号','氏名','部門','役職','日付','曜日','カレンダー','申請内容',
  '出社','早出フラグ','退社','計算開始','計算終了',
  '早出中抜け開始時刻','早出中抜け終了時刻','早出中抜け時間',
  'AltX残業出','AltX残業退','残業出計算開始','残業退計算終了',
  'AltX残業労働時間','早出開始','残業終了','出社2','退社2',
  '計算開始2','計算終了2','労働時間2','私用外出','私用戻り',
  '出社3','退社3','計算開始3','計算終了3','労働時間3',
  '外出時間','休憩時間','休憩修正','深夜休憩修正','実働時間',
  '勤務時間','有休時間','所定内労働','法定内残業','残業時間',
  '深夜労働','所定内深夜','法定外休出','法定内休出','遅刻',
  '早退','代休付与基準日数','振休付与基準日数','法定内休出日数',
  '法定外休出日数','在宅フラグ','子の看護時間','介護時間',
  '平日法定外残業(36協定用)','残業時間(週40超過)','備考',''
];

// 2026年2月のカレンダー（日→カレンダー種別）
const FEB_2026 = {
  1: { dow: '日', cal: '法定外' },
  2: { dow: '月', cal: '平日' },
  3: { dow: '火', cal: '平日' },
  4: { dow: '水', cal: '平日' },
  5: { dow: '木', cal: '平日' },
  6: { dow: '金', cal: '平日' },
  7: { dow: '土', cal: '法定外' },
  8: { dow: '日', cal: '法定外' },
  9: { dow: '月', cal: '平日' },
  10: { dow: '火', cal: '平日' },
  11: { dow: '水', cal: '平日' }, // 建国記念の日だが、テスト用に平日扱い
  12: { dow: '木', cal: '平日' },
  13: { dow: '金', cal: '平日' },
  14: { dow: '土', cal: '法定外' },
  15: { dow: '日', cal: '法定外' },
  16: { dow: '月', cal: '平日' },
  17: { dow: '火', cal: '平日' },
  18: { dow: '水', cal: '平日' },
  19: { dow: '木', cal: '平日' },
  20: { dow: '金', cal: '平日' },
  21: { dow: '土', cal: '法定外' },
  22: { dow: '日', cal: '法定外' },
  23: { dow: '月', cal: '平日' }, // 天皇誕生日だが、テスト用に平日扱い
  24: { dow: '火', cal: '平日' },
  25: { dow: '水', cal: '平日' },
  26: { dow: '木', cal: '平日' },
  27: { dow: '金', cal: '平日' },
  28: { dow: '土', cal: '法定外' },
};

// Excelの日付シリアル変換（1900年基準）
function toExcelDate(year, month, day, hour = 0, minute = 0) {
  const d = new Date(year, month - 1, day, hour, minute);
  // Excelの日付シリアル値: 1900/1/1 = 1, 1900/1/2 = 2, ...
  // ただし1900/2/29のバグがあるため +1
  const epoch = new Date(1899, 11, 30);
  return (d - epoch) / (24 * 60 * 60 * 1000);
}

function formatTime(hours, minutes) {
  return `${hours}:${String(minutes).padStart(2, '0')}`;
}

/**
 * 1日分のデータ行を生成
 */
function createRow(emp, day, workPattern) {
  const dayInfo = FEB_2026[day];
  const row = new Array(HEADER.length).fill('');

  row[0] = emp.id;
  row[1] = emp.name;
  row[2] = emp.dept;
  row[3] = emp.position;
  row[4] = toExcelDate(2026, 2, day); // 日付
  row[5] = dayInfo.dow;
  row[6] = dayInfo.cal;

  if (!workPattern) return row; // 休み・データなし

  const { startH, startM, endH, endM, breakMin, app, earlyFlag, lateMin, earlyLeaveMin, remarks } = workPattern;

  // 出社・退社・計算開始・計算終了
  const clockIn = toExcelDate(2026, 2, day, startH, startM);
  const clockOut = toExcelDate(2026, 2, day, endH, endM);
  row[8] = clockIn;   // 出社
  row[9] = earlyFlag || ''; // 早出フラグ
  row[10] = clockOut; // 退社
  row[11] = clockIn;  // 計算開始
  row[12] = clockOut; // 計算終了

  // 申請内容
  row[7] = app || '';

  // 休憩時間
  const breakH = Math.floor(breakMin / 60);
  const breakM = breakMin % 60;
  row[36] = formatTime(breakH, breakM);

  // 実働時間計算
  const totalMin = (endH * 60 + endM) - (startH * 60 + startM) - breakMin;
  const workH = Math.floor(totalMin / 60);
  const workM = totalMin % 60;
  row[39] = formatTime(workH, workM); // 実働時間

  // 残業時間 (所定7:45超過)
  const overtimeMin = Math.max(0, totalMin - 465);
  if (overtimeMin > 0) {
    row[44] = formatTime(Math.floor(overtimeMin / 60), overtimeMin % 60);
  }

  // 法定外残業 (8h超過) — 36協定カラム
  const legalOtMin = Math.max(0, totalMin - 480);
  if (legalOtMin > 0) {
    row[58] = formatTime(Math.floor(legalOtMin / 60), legalOtMin % 60);
  }

  // 休日の場合は全量が残業
  if (dayInfo.cal !== '平日') {
    row[44] = formatTime(workH, workM);
    row[58] = formatTime(workH, workM);
  }

  // 遅刻
  if (lateMin) {
    const lH = Math.floor(lateMin / 60);
    const lM = lateMin % 60;
    row[49] = formatTime(lH, lM);
  }

  // 早退
  if (earlyLeaveMin) {
    const eH = Math.floor(earlyLeaveMin / 60);
    const eM = earlyLeaveMin % 60;
    row[50] = formatTime(eH, eM);
  }

  // 備考
  row[60] = remarks || '';

  return row;
}

// ===== 社員定義（テストシナリオ別） =====
const EMPLOYEES = {
  // シート1: 通常9時勤務
  sheet1: [
    {
      id: '2260001', name: '徳川 家康', dept: '13D51210', position: '一般',
      scenario: '予兆対象（ペース高）',
      // 10営業日で法定外20h → 月末予測40h → 注意レベル
      // 毎日9:00-21:00 (実働11h, 法定外3h → 10日で法定外30h相当だと高すぎる)
      // 毎日9:00-20:00 (実働10h, 法定外2h → 10日で法定外20h → 月末予測40h) ← これ
      pattern: (day) => {
        const info = FEB_2026[day];
        if (info.cal !== '平日') return null;
        if (day > 13) return null; // 2/13まで（今日=2/13なので10営業日分）
        return { startH: 9, startM: 0, endH: 20, endM: 0, breakMin: 60 };
      }
    },
    {
      id: '2260002', name: '豊臣 秀吉', dept: '13D51210', position: '一般',
      scenario: '予兆対象（高ペース・超過見込み）',
      // 10営業日で法定外25h → 月末予測50h → 超過レベル
      // 毎日9:00-20:30 (実働10.5h, 法定外2.5h → 10日で25h → 予測50h)
      pattern: (day) => {
        const info = FEB_2026[day];
        if (info.cal !== '平日') return null;
        if (day > 13) return null;
        return { startH: 9, startM: 0, endH: 20, endM: 30, breakMin: 60 };
      }
    },
    {
      id: '2260003', name: '武田 信玄', dept: '13D51220', position: '主任',
      scenario: '予兆対象（現在30h台・深刻レベル到達見込み）',
      // 10営業日で法定外32h（<35h=正常）だが月末予測64h → 深刻レベル到達見込み
      // 高残業日と通常日が混在するリアルなパターン
      pattern: (day) => {
        const info = FEB_2026[day];
        if (info.cal !== '平日') return null;
        if (day > 13) return null;
        // 高残業日と通常日を混ぜる
        const heavy = [2, 3, 5, 6, 9, 10]; // 高残業日
        if (heavy.includes(day)) {
          return { startH: 9, startM: 0, endH: 22, endM: 0, breakMin: 60 }; // 実働12h, 法定外4h
        }
        return { startH: 9, startM: 0, endH: 20, endM: 0, breakMin: 60 }; // 実働10h, 法定外2h
      }
    },
    {
      id: '2260004', name: '上杉 謙信', dept: '13D51220', position: '一般',
      scenario: '36協定対象（警戒 55h超）',
      // 10営業日で法定外65h+ → 深刻レベル
      // ほぼ毎日深夜まで: 9:00-00:30翌日 (実働14.5h, 法定外6.5h → 10日で65h)
      pattern: (day) => {
        const info = FEB_2026[day];
        if (info.cal !== '平日') return null;
        if (day > 13) return null;
        return { startH: 9, startM: 0, endH: 24, endM: 30, breakMin: 60 };
      }
    },
    {
      id: '2260005', name: '伊達 政宗', dept: '13D51230', position: '一般',
      scenario: '正常（残業少なめ）',
      // 10営業日で法定外5h → 月末予測10h → 正常
      // たまに残業: 半分は定時、半分は1h残業
      pattern: (day) => {
        const info = FEB_2026[day];
        if (info.cal !== '平日') return null;
        if (day > 13) return null;
        if ([2, 4, 6, 10, 12].includes(day)) {
          return { startH: 9, startM: 0, endH: 19, endM: 0, breakMin: 60 }; // 実働9h, 法定外1h
        }
        return { startH: 9, startM: 0, endH: 17, endM: 45, breakMin: 60 }; // 実働7:45, 法定外0
      }
    },
    {
      id: '2260006', name: '真田 幸村', dept: '13D51230', position: '一般',
      scenario: '正常ギリギリ（月末予測34h台）',
      // 10営業日で法定外17h → 月末予測34h → 正常（ぎりぎり35h未満）
      // 毎日9:00-19:42 (実働9h42m=582min, 法定外102min=1:42 → 10日で1020min=17h)
      pattern: (day) => {
        const info = FEB_2026[day];
        if (info.cal !== '平日') return null;
        if (day > 13) return null;
        return { startH: 9, startM: 0, endH: 19, endM: 42, breakMin: 60 };
      }
    },
    {
      id: '2260007', name: '明智 光秀', dept: '13D51240', position: '一般',
      scenario: '遅刻あり＋予兆対象',
      // 遅刻2回（申請なし）、法定外22h → 月末予測44h → 注意（ギリ）
      pattern: (day) => {
        const info = FEB_2026[day];
        if (info.cal !== '平日') return null;
        if (day > 13) return null;
        if (day === 3 || day === 10) {
          // 遅刻日: 9:30出社（30分遅刻・申請なし）
          return { startH: 9, startM: 30, endH: 20, endM: 42, breakMin: 60, lateMin: 30 };
        }
        return { startH: 9, startM: 0, endH: 20, endM: 12, breakMin: 60 }; // 実働10:12, 法定外2:12
      }
    },
  ],
  // シート2: 8時スケジュール
  sheet2: [
    {
      id: '2260008', name: '島津 義弘', dept: '13D51250', position: '一般',
      scenario: '8時スケジュール・正常',
      // 8:00出社、10営業日で法定外15h → 月末予測30h → 正常
      pattern: (day) => {
        const info = FEB_2026[day];
        if (info.cal !== '平日') return null;
        if (day > 13) return null;
        return { startH: 8, startM: 0, endH: 18, endM: 30, breakMin: 60 }; // 実働9:30, 法定外1:30
      }
    },
    {
      id: '2260009', name: '毛利 元就', dept: '13D51250', position: '主任',
      scenario: '8時スケジュール・36協定対象（超過45h+）',
      // 8:00出社、10営業日で法定外50h → 超過レベル
      // 毎日8:00-21:00 (実働12h, 法定外4h) + 一部さらに残業
      pattern: (day) => {
        const info = FEB_2026[day];
        if (info.cal !== '平日') return null;
        if (day > 13) return null;
        if ([2, 3, 5, 9, 10].includes(day)) {
          return { startH: 8, startM: 0, endH: 22, endM: 0, breakMin: 60 }; // 実働13h, 法定外5h
        }
        return { startH: 8, startM: 0, endH: 22, endM: 0, breakMin: 60 }; // 実働13h, 法定外5h
      }
    },
    {
      id: '2260010', name: '北条 氏康', dept: '13D51260', position: '一般',
      scenario: '8時スケジュール・休日出勤あり・予兆対象',
      // 平日は8:00-19:00 (法定外2h)、休日1回出勤(6h)
      // 10営業日で法定外20h + 休日6h = 26h → 月末予測52h → 超過レベル予兆
      // ただし予兆は法定外で計算。休日全量が法定外
      pattern: (day) => {
        const info = FEB_2026[day];
        if (day > 13) return null;
        if (day === 7) {
          // 土曜出勤
          return { startH: 9, startM: 0, endH: 16, endM: 0, breakMin: 60 }; // 実働6h（全量残業）
        }
        if (info.cal !== '平日') return null;
        return { startH: 8, startM: 0, endH: 19, endM: 0, breakMin: 60 }; // 実働10h, 法定外2h
      }
    },
  ],
};

// ===== XLSX生成 =====
function generateSheet(sheetName, employees) {
  const rows = [HEADER];

  for (const emp of employees) {
    for (let day = 1; day <= 28; day++) {
      const workPattern = emp.pattern(day);
      const row = createRow(emp, day, workPattern);
      rows.push(row);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);

  // 日付列のフォーマット設定
  const range = XLSX.utils.decode_range(ws['!ref']);
  for (let r = 1; r <= range.e.r; r++) {
    // 日付列 (col 4)
    const dateCell = ws[XLSX.utils.encode_cell({ r, c: 4 })];
    if (dateCell && typeof dateCell.v === 'number') {
      dateCell.t = 'n';
      dateCell.z = 'm/d/yy';
    }
    // 出社・退社・計算開始・計算終了 (col 8, 10, 11, 12)
    for (const c of [8, 10, 11, 12]) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (cell && typeof cell.v === 'number' && cell.v > 0) {
        cell.t = 'n';
        cell.z = 'm/d/yy h:mm';
      }
    }
  }

  return ws;
}

// メイン
const wb = XLSX.utils.book_new();

// シート1: 通常9時勤務
const ws1 = generateSheet('プロジェクトA_900-1800', EMPLOYEES.sheet1);
XLSX.utils.book_append_sheet(wb, ws1, 'プロジェクトA_900-1800');

// シート2: 8時スケジュール
const ws2 = generateSheet('KDDI_日勤_800-1630～930-1800_1200', EMPLOYEES.sheet2);
XLSX.utils.book_append_sheet(wb, ws2, 'KDDI_日勤_800-1630～930-1800_1200');

// 出力
const outPath = path.resolve(__dirname, '../docs/rakurakukintai/出勤簿_日別詳細_ダミー.xlsx');
XLSX.writeFile(wb, outPath);

console.log('ダミーXLSX生成完了:', outPath);
console.log('');
console.log('=== テストシナリオ一覧 ===');
console.log('');
console.log('【シート1: プロジェクトA_900-1800（9時勤務）】');
EMPLOYEES.sheet1.forEach(e => {
  console.log(`  ${e.id} ${e.name} (${e.dept}) — ${e.scenario}`);
});
console.log('');
console.log('【シート2: KDDI_日勤_800-1630～930-1800_1200（8時勤務）】');
EMPLOYEES.sheet2.forEach(e => {
  console.log(`  ${e.id} ${e.name} (${e.dept}) — ${e.scenario}`);
});
console.log('');
console.log('期間: 2026年2月1日〜28日');
console.log('データは2/13（今日）までの営業日にのみ勤務データあり');
console.log('2/14以降は行のみ存在（勤務データなし）→ 予兆計算が機能する');
