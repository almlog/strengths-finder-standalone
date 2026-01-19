// 36協定テスト用CSVデータ生成 v3
// - 時刻は23:59を上限として適正化
// - カラム数を既存フォーマットに完全一致

// 2026年1月のカレンダー
function getJan2026Calendar() {
  const days = [];
  const dows = ["日","月","火","水","木","金","土"];

  for (let d = 1; d <= 31; d++) {
    const date = new Date(2026, 0, d);
    const dow = dows[date.getDay()];
    const isHoliday = dow === "土" || dow === "日" || d <= 4 || d === 12;
    days.push({
      date: '2026-01-' + String(d).padStart(2, '0'),
      dow,
      calendar: isHoliday ? '法定外' : '平日'
    });
  }
  return days;
}

// 残業テスト対象
const overtimeTargets = [
  { id: 9999009, name: "残業35h 八郎", dept: "13D99999", targetHours: 35 },
  { id: 9999010, name: "残業45h 九郎", dept: "13D99999", targetHours: 46 },
  { id: 9999011, name: "残業55h 十郎", dept: "13D99999", targetHours: 56 },
  { id: 9999012, name: "残業65h 十一郎", dept: "13D99999", targetHours: 66 },
  { id: 9999013, name: "残業70h 十二郎", dept: "13D99999", targetHours: 71 },
  { id: 9999014, name: "残業80h 十三郎", dept: "13D99999", targetHours: 82 },
  { id: 9999015, name: "残業100h 十四郎", dept: "13D99999", targetHours: 102 },
];

const calendar = getJan2026Calendar();
const workdays = calendar.filter(d => d.calendar === '平日' && d.date < '2026-01-11');

// 時間を "H:MM" 形式に変換
function formatTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return h + ':' + String(m).padStart(2, '0');
}

// 退社時刻を計算（23:59上限）
function calcClockOut(dateStr, overtimeMinutes) {
  const endMinutes = 17 * 60 + 30 + overtimeMinutes;
  let endHour = Math.floor(endMinutes / 60);
  let endMin = endMinutes % 60;

  // 23:59を上限にする（Excel互換性のため）
  if (endHour >= 24) {
    endHour = 23;
    endMin = 59;
  }

  return dateStr + ' ' + endHour + ':' + String(endMin).padStart(2, '0');
}

// CSVデータ生成
const rows = [];

overtimeTargets.forEach(target => {
  const daysCount = workdays.length;
  const dailyOvertimeMinutes = Math.round((target.targetHours * 60) / daysCount);

  let cumulativeOvertimeMinutes = 0;

  calendar.forEach(day => {
    const isWorkday = day.calendar === '平日' && day.date < '2026-01-11';

    // 61カラムの行（インデックス0〜60）
    const row = new Array(61).fill('');
    row[0] = target.id;
    row[1] = target.name;
    row[2] = target.dept;
    row[3] = '一般';
    row[4] = day.date;
    row[5] = day.dow;
    row[6] = day.calendar;

    if (isWorkday) {
      cumulativeOvertimeMinutes += dailyOvertimeMinutes;

      const clockIn = day.date + ' 09:00';
      const clockOut = calcClockOut(day.date, dailyOvertimeMinutes);
      const actualWorkMinutes = 7 * 60 + 30 + dailyOvertimeMinutes;

      row[7] = '残業終了,900-1730/1200-1300/7.75/5';  // 申請内容
      row[8] = clockIn;   // 出社
      // row[9] = 早出フラグ（空）
      row[10] = clockOut;  // 退社
      row[11] = clockIn;   // 計算開始
      row[12] = clockOut;  // 計算終了
      // 13-35: 空
      row[36] = '1:00';    // 休憩時間
      // 37-38: 空
      row[39] = formatTime(actualWorkMinutes);   // 実働時間
      row[40] = formatTime(actualWorkMinutes);   // 勤務時間
      // 41: 空
      row[42] = '7:30';    // 所定内労働
      // 43: 空
      row[44] = formatTime(dailyOvertimeMinutes);  // 残業時間
      // 45-57: 空
      row[58] = formatTime(cumulativeOvertimeMinutes);  // 平日法定外残業(36協定用)
      // 59: 空
      row[60] = '36協定テスト: 目標' + target.targetHours + 'h';  // 備考
    }

    rows.push(row.join(','));
  });
});

console.log(rows.join('\n'));
