// scripts/analyze-columns.js
// XLSXカラム構造の分析スクリプト

const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const xlsxPath = path.join(__dirname, '../docs/rakurakukintai/出勤簿_日別詳細_20260108113124.xlsx');

if (!fs.existsSync(xlsxPath)) {
  console.log('XLSX file not found:', xlsxPath);
  process.exit(1);
}

const workbook = XLSX.readFile(xlsxPath);
const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

// ヘッダー行を取得
const headers = data[0] || [];
console.log('=== カラム一覧（インデックス: カラム名） ===');
headers.forEach((h, i) => {
  if (h) console.log(`${i}: ${h}`);
});

// 特定のカラムを検索
console.log('\n=== 重要カラムの検索 ===');
const targetColumns = [
  '休憩', '計算開始', '計算終了', 'AltX', '残業出', '残業退',
  '平日法定外', '36協定', 'カレンダー', '出社', '退社'
];

headers.forEach((h, i) => {
  if (h && targetColumns.some(t => h.includes(t))) {
    console.log(`${i}: ${h}`);
  }
});

// サンプルデータ行を表示（2行目以降のデータ）
console.log('\n=== サンプルデータ（2行目） ===');
const sampleRow = data[1] || [];
headers.forEach((h, i) => {
  if (h && sampleRow[i] !== undefined && sampleRow[i] !== '') {
    console.log(`${i} (${h}): ${sampleRow[i]}`);
  }
});
