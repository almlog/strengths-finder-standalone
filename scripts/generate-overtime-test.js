// 36協定テスト用CSVデータ生成

// 2026年1月の平日（1/5〜1/10、11日が今日なので10日まで）
const jan2026Workdays = [];
for (let d = 5; d <= 10; d++) {
  const date = new Date(2026, 0, d);
  const dow = ["日","月","火","水","木","金","土"][date.getDay()];
  if (dow !== "土" && dow !== "日") {
    jan2026Workdays.push({ date: '2026-01-' + String(d).padStart(2,'0'), dow });
  }
}

console.log("// 平日数:", jan2026Workdays.length);

// 残業テスト対象（目標累計残業時間）
const overtimeTargets = [
  { id: 9999009, name: "残業35h 八郎", targetHours: 35 },
  { id: 9999010, name: "残業45h 九郎", targetHours: 46 },
  { id: 9999011, name: "残業55h 十郎", targetHours: 56 },
  { id: 9999012, name: "残業65h 十一郎", targetHours: 66 },
  { id: 9999013, name: "残業70h 十二郎", targetHours: 71 },
  { id: 9999014, name: "残業80h 十三郎", targetHours: 82 },
  { id: 9999015, name: "残業100h 十四郎", targetHours: 102 },
];

// 時間を "H:MM" 形式に変換
function formatTime(hours) {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return h + ':' + String(m).padStart(2, '0');
}

// 累計時間を "H:MM" 形式に変換
function formatCumulativeTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h + ':' + String(m).padStart(2, '0');
}

// ヘッダー
const headers = [
  "社員番号","氏名","部門","役職","日付","曜日","カレンダー","申請内容",
  "出社","早出フラグ","退社","計算開始","計算終了",
  "早出中抜け開始時刻","早出中抜け終了時刻","早出中抜け時間",
  "AltX残業出","AltX残業退","残業出計算開始","残業退計算終了","AltX残業労働時間",
  "早出開始","残業終了","出社2","退社2","計算開始2","計算終了2","労働時間2",
  "私用外出","私用戻り","出社3","退社3","計算開始3","計算終了3","労働時間3",
  "外出時間","休憩時間","休憩修正","深夜休憩修正","実働時間","勤務時間",
  "有休時間","所定内労働","法定内残業","残業時間","深夜労働","所定内深夜",
  "法定外休出","法定内休出","遅刻","早退","代休付与基準日数","振休付与基準日数",
  "法定内休出日数","法定外休出日数","在宅フラグ","子の看護時間","介護時間",
  "平日法定外残業(36協定用)","残業時間(週40超過)","備考"
];

// CSVデータ生成
const rows = [headers.join(',')];

overtimeTargets.forEach(target => {
  const daysCount = jan2026Workdays.length;
  const dailyOvertimeHours = target.targetHours / daysCount;
  const dailyOvertimeMinutes = Math.round(dailyOvertimeHours * 60);

  let cumulativeMinutes = 0;

  jan2026Workdays.forEach((day, idx) => {
    cumulativeMinutes += dailyOvertimeMinutes;

    // 退社時刻を計算（17:30 + 残業時間）
    const baseEndHour = 17;
    const baseEndMin = 30;
    const endMinutes = baseEndHour * 60 + baseEndMin + dailyOvertimeMinutes;
    const endHour = Math.floor(endMinutes / 60);
    const endMin = endMinutes % 60;
    const clockOut = day.date + ' ' + endHour + ':' + String(endMin).padStart(2, '0');

    // 実働時間 = 7:30 + 残業時間
    const actualWorkMinutes = 7 * 60 + 30 + dailyOvertimeMinutes;

    // 行データ作成（61列）
    const row = new Array(61).fill('');
    row[0] = target.id;                          // 社員番号
    row[1] = target.name;                        // 氏名
    row[2] = '13D99999';                         // 部門
    row[3] = '一般';                             // 役職
    row[4] = day.date;                           // 日付
    row[5] = day.dow;                            // 曜日
    row[6] = '平日';                             // カレンダー
    row[7] = '残業終了,900-1730/1200-1300/7.75/5';  // 申請内容
    row[8] = day.date + ' 09:00';                // 出社
    row[10] = clockOut;                          // 退社
    row[11] = day.date + ' 09:00';               // 計算開始
    row[12] = clockOut;                          // 計算終了
    row[36] = '1:00';                            // 休憩時間
    row[39] = formatCumulativeTime(actualWorkMinutes);  // 実働時間
    row[40] = formatCumulativeTime(actualWorkMinutes);  // 勤務時間
    row[42] = '7:30';                            // 所定内労働
    row[44] = formatTime(dailyOvertimeHours);    // 残業時間
    row[58] = formatCumulativeTime(cumulativeMinutes);  // 平日法定外残業(36協定用) - 累計
    row[60] = '36協定テスト: 目標' + target.targetHours + 'h';  // 備考

    rows.push(row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(','));
  });
});

console.log(rows.join('\n'));
