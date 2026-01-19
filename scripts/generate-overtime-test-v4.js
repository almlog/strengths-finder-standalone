// 36協定テスト用CSVデータ生成 v4
// - 社員番号をユニークに（9999101〜）
// - 時刻は23:59を上限
// - CSV出力時にカンマ含むフィールドをクォート

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

// 残業テスト対象（ユニークな社員番号: 9999101〜）
const overtimeTargets = [
  { id: 9999101, name: "協定35h 太郎", dept: "13D99999", targetHours: 35 },
  { id: 9999102, name: "協定45h 次郎", dept: "13D99999", targetHours: 46 },
  { id: 9999103, name: "協定55h 三郎", dept: "13D99999", targetHours: 56 },
  { id: 9999104, name: "協定65h 四郎", dept: "13D99999", targetHours: 66 },
  { id: 9999105, name: "協定70h 五郎", dept: "13D99999", targetHours: 71 },
  { id: 9999106, name: "協定80h 六郎", dept: "13D99999", targetHours: 82 },
  { id: 9999107, name: "協定100h 七郎", dept: "13D99999", targetHours: 102 },
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

      row[7] = '残業終了,900-1730/1200-1300/7.75/5';
      row[8] = clockIn;
      row[10] = clockOut;
      row[11] = clockIn;
      row[12] = clockOut;
      row[36] = '1:00';
      row[39] = formatTime(actualWorkMinutes);
      row[40] = formatTime(actualWorkMinutes);
      row[42] = '7:30';
      row[44] = formatTime(dailyOvertimeMinutes);
      row[58] = formatTime(cumulativeOvertimeMinutes);
      row[60] = '36協定テスト: 目標' + target.targetHours + 'h';
    }

    // カンマを含むフィールドをダブルクォートでエスケープ
    const escapedRow = row.map(cell => {
      const str = String(cell);
      if (str.includes(',') || str.includes('"')) {
        return '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    });
    rows.push(escapedRow.join(','));
  });
});

console.log(rows.join('\n'));
