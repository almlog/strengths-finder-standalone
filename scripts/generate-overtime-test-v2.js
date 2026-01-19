// 36協定テスト用CSVデータ生成 v2
// 実際のデータフォーマットに合わせて1月全日のレコードを生成

// 2026年1月のカレンダー
function getJan2026Calendar() {
  const days = [];
  const dows = ["日","月","火","水","木","金","土"];

  for (let d = 1; d <= 31; d++) {
    const date = new Date(2026, 0, d);
    const dow = dows[date.getDay()];
    // 土日、1/1〜1/4は法定外（年始休み）、1/12は振替休日
    const isHoliday = dow === "土" || dow === "日" || d <= 4 || d === 12;
    days.push({
      date: '2026-01-' + String(d).padStart(2, '0'),
      dow,
      calendar: isHoliday ? '法定外' : '平日'
    });
  }
  return days;
}

// 残業テスト対象（目標累計残業時間）
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

// 平日のみ抽出（今日1/11より前）
const workdays = calendar.filter(d => d.calendar === '平日' && d.date < '2026-01-11');
console.error('平日数（1/10まで）:', workdays.length);

// 時間を "H:MM" 形式に変換
function formatTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return h + ':' + String(m).padStart(2, '0');
}

// CSVデータ生成（ヘッダーなし、データのみ）
const rows = [];

overtimeTargets.forEach(target => {
  const daysCount = workdays.length;
  const dailyOvertimeMinutes = Math.round((target.targetHours * 60) / daysCount);

  let cumulativeOvertimeMinutes = 0;

  calendar.forEach(day => {
    // 今日(1/11)以降はスキップしない - 全日出力
    const isWorkday = day.calendar === '平日' && day.date < '2026-01-11';

    // 61カラムの空行を作成
    const row = new Array(61).fill('');
    row[0] = target.id;           // 社員番号
    row[1] = target.name;         // 氏名
    row[2] = target.dept;         // 部門
    row[3] = '一般';              // 役職
    row[4] = day.date;            // 日付
    row[5] = day.dow;             // 曜日
    row[6] = day.calendar;        // カレンダー

    if (isWorkday) {
      // 平日で1/10以前の場合は勤務データを入力
      cumulativeOvertimeMinutes += dailyOvertimeMinutes;

      // 退社時刻を計算（17:30 + 残業時間）
      const endMinutes = 17 * 60 + 30 + dailyOvertimeMinutes;
      const endHour = Math.floor(endMinutes / 60);
      const endMin = endMinutes % 60;
      const clockOut = day.date + ' ' + endHour + ':' + String(endMin).padStart(2, '0');

      // 実働時間 = 7:30 + 残業時間
      const actualWorkMinutes = 7 * 60 + 30 + dailyOvertimeMinutes;

      row[7] = '残業終了,900-1730/1200-1300/7.75/5';  // 申請内容
      row[8] = day.date + ' 09:00';    // 出社
      row[10] = clockOut;               // 退社
      row[11] = day.date + ' 09:00';   // 計算開始
      row[12] = clockOut;               // 計算終了
      row[36] = '1:00';                 // 休憩時間
      row[39] = formatTime(actualWorkMinutes);   // 実働時間
      row[40] = formatTime(actualWorkMinutes);   // 勤務時間
      row[42] = '7:30';                 // 所定内労働
      row[44] = formatTime(dailyOvertimeMinutes);  // 残業時間
      row[58] = formatTime(cumulativeOvertimeMinutes);  // 平日法定外残業(36協定用)
      row[60] = '36協定テスト: 目標' + target.targetHours + 'h';  // 備考
    }

    rows.push(row.join(','));
  });
});

console.log(rows.join('\n'));
