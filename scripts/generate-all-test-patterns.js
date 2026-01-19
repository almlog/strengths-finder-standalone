// 勤怠テスト用CSV統合生成スクリプト
// - 違反パターンテスト（9999001〜9999018）
// - 36協定テスト（9999101〜9999107）

// CSVエスケープ関数
function escapeCSV(value) {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

// 時間を "H:MM" 形式に変換
function formatTime(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = Math.round(totalMinutes % 60);
  return h + ':' + String(m).padStart(2, '0');
}

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

// 61カラムの空行を作成
function createEmptyRow() {
  return new Array(61).fill('');
}

// 基本情報を設定
function setBasicInfo(row, id, name, dept, date, dow, calendar) {
  row[0] = id;
  row[1] = name;
  row[2] = dept;
  row[3] = '一般';
  row[4] = date;
  row[5] = dow;
  row[6] = calendar;
  return row;
}

// 通常勤務データを設定（9:00-17:30）
function setNormalWork(row, date, overtimeMinutes = 0) {
  const clockIn = date + ' 09:00';
  const endMinutes = 17 * 60 + 30 + overtimeMinutes;
  let endHour = Math.floor(endMinutes / 60);
  let endMin = endMinutes % 60;
  if (endHour >= 24) { endHour = 23; endMin = 59; }
  const clockOut = date + ' ' + endHour + ':' + String(endMin).padStart(2, '0');

  row[7] = '残業終了,900-1730/1200-1300/7.75/5';
  row[8] = clockIn;
  row[10] = clockOut;
  row[11] = clockIn;
  row[12] = clockOut;
  row[36] = '1:00';
  const workMinutes = 7 * 60 + 30 + overtimeMinutes;
  row[39] = formatTime(workMinutes);
  row[40] = formatTime(workMinutes);
  row[42] = '7:30';
  if (overtimeMinutes > 0) {
    row[44] = formatTime(overtimeMinutes);
  }
  return row;
}

const rows = [];
const calendar = getJan2026Calendar();

// ========================================
// 違反パターンテスト（9999001〜9999018）
// ========================================

const violationPatterns = [
  // 打刻漏れパターン
  { id: 9999001, name: "打刻漏れ花子", type: "退社打刻漏れ" },
  { id: 9999002, name: "打刻漏れ次郎", type: "出社打刻漏れ" },

  // 休憩不足パターン
  { id: 9999003, name: "休憩不足太郎", type: "休憩不足" },

  // 申請漏れパターン
  { id: 9999004, name: "遅刻申請漏れ一郎", type: "遅刻申請漏れ" },
  { id: 9999005, name: "早退申請漏れ二郎", type: "早退申請漏れ" },
  { id: 9999006, name: "早出申請漏れ三郎", type: "早出申請漏れ" },

  // 深夜関連
  { id: 9999007, name: "深夜休憩漏れ四郎", type: "深夜休憩漏れ" },
  { id: 9999008, name: "深夜勤務五郎", type: "深夜勤務" },

  // 正常パターン（違反なし）
  { id: 9999009, name: "正常勤務六郎", type: "正常" },
  { id: 9999010, name: "有休取得七郎", type: "有休" },

  // 複合違反
  { id: 9999011, name: "複合違反八郎", type: "複合" },

  // 休日出勤
  { id: 9999012, name: "休日出勤九郎", type: "休日出勤" },

  // 時間有休
  { id: 9999013, name: "時間有休十郎", type: "時間有休" },

  // AltX残業
  { id: 9999014, name: "AltX残業十一郎", type: "AltX残業" },

  // 追加パターン
  { id: 9999015, name: "遅刻早退十二郎", type: "遅刻早退" },
  { id: 9999016, name: "長時間残業十三郎", type: "長時間残業" },
  { id: 9999017, name: "完全未入力十四郎", type: "完全未入力" },
  { id: 9999018, name: "申請のみ十五郎", type: "申請のみ" },
];

// 違反パターンデータ生成（1/5〜1/9の平日5日分）
violationPatterns.forEach(pattern => {
  calendar.forEach(day => {
    const row = createEmptyRow();
    setBasicInfo(row, pattern.id, pattern.name, '13D99999', day.date, day.dow, day.calendar);

    const isWorkday = day.calendar === '平日' && day.date >= '2026-01-05' && day.date <= '2026-01-09';

    if (isWorkday) {
      switch (pattern.type) {
        case "退社打刻漏れ":
          // 出社のみ、退社なし
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 09:00';
          row[11] = day.date + ' 09:00';
          // 退社なし
          row[36] = '1:00';
          row[39] = '7:30';
          row[40] = '7:30';
          row[42] = '7:30';
          break;

        case "出社打刻漏れ":
          // 退社のみ、出社なし
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[10] = day.date + ' 17:30';
          row[12] = day.date + ' 17:30';
          // 出社なし
          row[36] = '1:00';
          row[39] = '7:30';
          row[40] = '7:30';
          row[42] = '7:30';
          break;

        case "休憩不足":
          // 6時間超勤務で休憩45分未満
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 09:00';
          row[10] = day.date + ' 17:30';
          row[11] = day.date + ' 09:00';
          row[12] = day.date + ' 17:30';
          row[36] = '0:30'; // 休憩30分（不足）
          row[39] = '8:00';
          row[40] = '8:00';
          row[42] = '7:30';
          break;

        case "遅刻申請漏れ":
          // 9:30出社だが遅刻申請なし
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 09:30';
          row[10] = day.date + ' 17:30';
          row[11] = day.date + ' 09:30';
          row[12] = day.date + ' 17:30';
          row[36] = '1:00';
          row[39] = '7:00';
          row[40] = '7:00';
          row[42] = '7:00';
          row[49] = '0:30'; // 遅刻30分
          break;

        case "早退申請漏れ":
          // 17:00退社だが早退申請なし
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 09:00';
          row[10] = day.date + ' 17:00';
          row[11] = day.date + ' 09:00';
          row[12] = day.date + ' 17:00';
          row[36] = '1:00';
          row[39] = '7:00';
          row[40] = '7:00';
          row[42] = '7:00';
          row[50] = '0:30'; // 早退30分
          break;

        case "早出申請漏れ":
          // 8:00出社だが早出フラグなし
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 08:00';
          row[10] = day.date + ' 17:30';
          row[11] = day.date + ' 08:00';
          row[12] = day.date + ' 17:30';
          // row[9] = ''; // 早出フラグなし（違反）
          row[36] = '1:00';
          row[39] = '8:30';
          row[40] = '8:30';
          row[42] = '7:30';
          row[44] = '1:00';
          break;

        case "深夜休憩漏れ":
          // 22時以降勤務で深夜休憩なし
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 09:00';
          row[10] = day.date + ' 23:00';
          row[11] = day.date + ' 09:00';
          row[12] = day.date + ' 23:00';
          row[36] = '1:00';
          row[38] = ''; // 深夜休憩修正なし（違反）
          row[39] = '13:00';
          row[40] = '13:00';
          row[42] = '7:30';
          row[44] = '5:30';
          row[45] = '1:00'; // 深夜労働1時間
          break;

        case "深夜勤務":
          // 深夜勤務あり（違反ではない）
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 09:00';
          row[10] = day.date + ' 23:30';
          row[11] = day.date + ' 09:00';
          row[12] = day.date + ' 23:30';
          row[36] = '1:00';
          row[38] = '0:30'; // 深夜休憩あり
          row[39] = '13:00';
          row[40] = '13:00';
          row[42] = '7:30';
          row[44] = '5:30';
          row[45] = '1:30';
          break;

        case "正常":
          setNormalWork(row, day.date);
          break;

        case "有休":
          row[7] = '有休';
          row[41] = '7:30'; // 有休時間
          break;

        case "複合":
          // 遅刻 + 休憩不足
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 09:30';
          row[10] = day.date + ' 17:30';
          row[11] = day.date + ' 09:30';
          row[12] = day.date + ' 17:30';
          row[36] = '0:30';
          row[39] = '7:30';
          row[40] = '7:30';
          row[42] = '7:00';
          row[49] = '0:30';
          break;

        case "休日出勤":
          // 平日だが休日出勤扱いのデータは土日に
          setNormalWork(row, day.date);
          break;

        case "時間有休":
          // 私用外出あり
          row[7] = '時間有休,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 09:00';
          row[10] = day.date + ' 17:30';
          row[11] = day.date + ' 09:00';
          row[12] = day.date + ' 17:30';
          row[28] = day.date + ' 14:00'; // 私用外出
          row[29] = day.date + ' 15:00'; // 私用戻り
          row[36] = '1:00';
          row[39] = '6:30';
          row[40] = '7:30';
          row[41] = '1:00'; // 有休時間
          row[42] = '7:30';
          break;

        case "AltX残業":
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 09:00';
          row[10] = day.date + ' 17:30';
          row[11] = day.date + ' 09:00';
          row[12] = day.date + ' 17:30';
          row[16] = day.date + ' 18:00'; // AltX残業出
          row[17] = day.date + ' 20:00'; // AltX残業退
          row[36] = '1:00';
          row[39] = '9:30';
          row[40] = '9:30';
          row[42] = '7:30';
          row[44] = '2:00';
          break;

        case "遅刻早退":
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          row[8] = day.date + ' 09:30';
          row[10] = day.date + ' 17:00';
          row[11] = day.date + ' 09:30';
          row[12] = day.date + ' 17:00';
          row[36] = '1:00';
          row[39] = '6:30';
          row[40] = '6:30';
          row[42] = '6:30';
          row[49] = '0:30';
          row[50] = '0:30';
          break;

        case "長時間残業":
          // 1日5時間残業（月100h相当ペース）
          setNormalWork(row, day.date, 300);
          row[58] = '5:00'; // 36協定用累計（仮）
          break;

        case "完全未入力":
          // 何も入力なし（平日なのに）
          break;

        case "申請のみ":
          // 申請のみで打刻なし
          row[7] = '残業終了,900-1730/1200-1300/7.75/5';
          break;
      }

      row[60] = '違反テスト: ' + pattern.type;
    }

    rows.push(row.map(escapeCSV).join(','));
  });
});

// ========================================
// 36協定テスト（9999101〜9999107）
// ========================================

const overtimeTargets = [
  { id: 9999101, name: "協定35h 太郎", targetHours: 35 },
  { id: 9999102, name: "協定45h 次郎", targetHours: 46 },
  { id: 9999103, name: "協定55h 三郎", targetHours: 56 },
  { id: 9999104, name: "協定65h 四郎", targetHours: 66 },
  { id: 9999105, name: "協定70h 五郎", targetHours: 71 },
  { id: 9999106, name: "協定80h 六郎", targetHours: 82 },
  { id: 9999107, name: "協定100h 七郎", targetHours: 102 },
];

const workdays = calendar.filter(d => d.calendar === '平日' && d.date < '2026-01-11');

overtimeTargets.forEach(target => {
  const daysCount = workdays.length;
  const dailyOvertimeMinutes = Math.round((target.targetHours * 60) / daysCount);
  let cumulativeOvertimeMinutes = 0;

  calendar.forEach(day => {
    const row = createEmptyRow();
    setBasicInfo(row, target.id, target.name, '13D99999', day.date, day.dow, day.calendar);

    const isWorkday = day.calendar === '平日' && day.date < '2026-01-11';

    if (isWorkday) {
      cumulativeOvertimeMinutes += dailyOvertimeMinutes;
      setNormalWork(row, day.date, dailyOvertimeMinutes);
      row[58] = formatTime(cumulativeOvertimeMinutes);
      row[60] = '36協定テスト: 目標' + target.targetHours + 'h';
    }

    rows.push(row.map(escapeCSV).join(','));
  });
});

console.log(rows.join('\n'));
