/**
 * LineWorksService テスト
 *
 * @module __tests__/services/LineWorksService.test
 */

// crypto.randomUUID のモック
let uuidCounter = 0;
Object.defineProperty(global, 'crypto', {
  value: {
    randomUUID: () => `test-uuid-${++uuidCounter}`,
  },
});

import { LineWorksService } from '../../services/LineWorksService';
import {
  LINEWORKS_STORAGE_KEYS,
} from '../../types/lineworks';
import {
  ExtendedAnalysisResult,
  AnalysisSummary,
  DepartmentSummary,
  AttendanceViolation,
  ViolationType,
  EmployeeMonthlySummary,
} from '../../models/AttendanceTypes';
import { StrengthsAnalysisResult, MemberStrengths, StrengthGroup, RankedStrength } from '../../models/StrengthsTypes';

// httpsCallable のモック
const mockCallable = jest.fn();
jest.mock('firebase/functions', () => ({
  httpsCallable: () => mockCallable,
}));

// firebase config のモック
jest.mock('../../config/firebase', () => ({
  functions: {},
}));

// ==================== モックデータ ====================

function createMockAnalysisSummary(): AnalysisSummary {
  return {
    totalEmployees: 10,
    employeesWithIssues: 3,
    highUrgencyCount: 2,
    mediumUrgencyCount: 5,
    lowUrgencyCount: 8,
    analysisDateRange: {
      start: new Date('2026-01-01'),
      end: new Date('2026-01-31'),
    },
    sheetNames: ['シート1', 'シート2'],
  };
}

function createMockDepartmentSummary(): DepartmentSummary[] {
  return [
    {
      department: '開発部',
      employeeCount: 5,
      totalOvertimeMinutes: 3000, // 50時間
      averageOvertimeMinutes: 600,
      totalLegalOvertimeMinutes: 2850, // 47.5時間（法定外）
      averageLegalOvertimeMinutes: 570,
      holidayWorkCount: 2,
      totalViolations: 3,
      breakViolations: 1,
      missingClockCount: 2,
    },
    {
      department: '営業部',
      employeeCount: 3,
      totalOvertimeMinutes: 1800, // 30時間
      averageOvertimeMinutes: 600,
      totalLegalOvertimeMinutes: 1650, // 27.5時間（法定外）
      averageLegalOvertimeMinutes: 550,
      holidayWorkCount: 1,
      totalViolations: 2,
      breakViolations: 0,
      missingClockCount: 2,
    },
    {
      department: '総務部',
      employeeCount: 2,
      totalOvertimeMinutes: 600, // 10時間
      averageOvertimeMinutes: 300,
      totalLegalOvertimeMinutes: 450, // 7.5時間（法定外）
      averageLegalOvertimeMinutes: 225,
      holidayWorkCount: 0,
      totalViolations: 0,
      breakViolations: 0,
      missingClockCount: 0,
    },
  ];
}

function createMockViolations(): AttendanceViolation[] {
  return [
    {
      employeeId: '001',
      employeeName: '田中太郎',
      department: '開発部',
      date: new Date('2026-01-15'),
      type: 'missing_clock' as ViolationType,
      details: '退勤時刻が未入力です',
    },
    {
      employeeId: '002',
      employeeName: '鈴木花子',
      department: '営業部',
      date: new Date('2026-01-20'),
      type: 'break_violation' as ViolationType,
      details: '休憩時間が不足しています',
      requiredBreakMinutes: 60,
      actualBreakMinutes: 45,
    },
  ];
}

function createMockEmployeeSummaries(): EmployeeMonthlySummary[] {
  return [
    {
      employeeId: '001',
      employeeName: '田中太郎',
      department: '開発部',
      sheetName: 'シート1',
      totalWorkDays: 20,
      holidayWorkDays: 1,
      totalOvertimeMinutes: 3000, // 50時間（45h超過）
      totalLegalOvertimeMinutes: 2700, // 45時間（法定外）
      lateDays: 0,
      earlyLeaveDays: 0,
      timelyDepartureDays: 5,
      fullDayLeaveDays: 1,
      halfDayLeaveDays: 0,
      breakViolationDays: 0,
      missingClockDays: 1,
      earlyStartViolationDays: 0,
      nightWorkDays: 0,
      violations: [],
      passedWeekdays: 20,
      totalWeekdaysInMonth: 22,
      applicationCounts: {} as any,
      totalWorkMinutes: 9600,
    },
    {
      employeeId: '002',
      employeeName: '鈴木花子',
      department: '営業部',
      sheetName: 'シート1',
      totalWorkDays: 20,
      holidayWorkDays: 0,
      totalOvertimeMinutes: 1800, // 30時間
      totalLegalOvertimeMinutes: 1500, // 25時間（法定外）
      lateDays: 1,
      earlyLeaveDays: 0,
      timelyDepartureDays: 10,
      fullDayLeaveDays: 0,
      halfDayLeaveDays: 1,
      breakViolationDays: 1,
      missingClockDays: 0,
      earlyStartViolationDays: 0,
      nightWorkDays: 0,
      violations: [],
      passedWeekdays: 20,
      totalWeekdaysInMonth: 22,
      applicationCounts: {} as any,
      totalWorkMinutes: 9000,
    },
  ];
}

function createMockExtendedAnalysisResult(): ExtendedAnalysisResult {
  return {
    summary: createMockAnalysisSummary(),
    employeeSummaries: createMockEmployeeSummaries(),
    departmentSummaries: createMockDepartmentSummary(),
    allViolations: createMockViolations(),
    analyzedAt: new Date('2026-01-31'),
  };
}

function createMockStrengthsAnalysisResult(): StrengthsAnalysisResult {
  return {
    groupDistribution: {
      [StrengthGroup.EXECUTING]: 5,
      [StrengthGroup.INFLUENCING]: 3,
      [StrengthGroup.RELATIONSHIP_BUILDING]: 4,
      [StrengthGroup.STRATEGIC_THINKING]: 3,
    },
    strengthsFrequency: { 1: 3, 2: 2, 3: 2, 4: 1, 5: 1 },
    strengthsMembers: {
      1: ['田中', '鈴木', '佐藤'],
      2: ['山田', '高橋'],
    },
    topStrengths: [
      { id: 1, name: '達成欲', description: '', group: StrengthGroup.EXECUTING },
      { id: 2, name: '活発性', description: '', group: StrengthGroup.INFLUENCING },
      { id: 3, name: '適応性', description: '', group: StrengthGroup.RELATIONSHIP_BUILDING },
      { id: 4, name: '分析思考', description: '', group: StrengthGroup.STRATEGIC_THINKING },
      { id: 5, name: 'アレンジ', description: '', group: StrengthGroup.EXECUTING },
    ],
  };
}

function createMockMembers(): MemberStrengths[] {
  const mockStrengths1: RankedStrength[] = [
    { id: 1, score: 5 },
    { id: 2, score: 4 },
    { id: 3, score: 3 },
    { id: 4, score: 2 },
    { id: 5, score: 1 },
  ];
  const mockStrengths2: RankedStrength[] = [
    { id: 6, score: 5 },
    { id: 7, score: 4 },
    { id: 8, score: 3 },
    { id: 9, score: 2 },
    { id: 10, score: 1 },
  ];
  return [
    {
      id: '1',
      name: '田中太郎',
      department: 'DEV',
      position: 'エンジニア',
      strengths: mockStrengths1,
    },
    {
      id: '2',
      name: '鈴木花子',
      department: 'DEV',
      position: 'デザイナー',
      strengths: mockStrengths2,
    },
  ];
}

// ==================== テスト ====================

describe('LineWorksService', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // 各テスト前にlocalStorageをクリア
    localStorage.clear();
    // UUIDカウンターをリセット
    uuidCounter = 0;
    // 環境変数をリセット
    process.env = { ...originalEnv };
    delete process.env.REACT_APP_LINEWORKS_ENABLED;
    delete process.env.REACT_APP_LINEWORKS_ROOM_NAME;
    // mockをリセット
    mockCallable.mockReset();
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  // ==================== 設定 ====================

  describe('設定', () => {
    it('isConfigured()はREACT_APP_LINEWORKS_ENABLED=trueの時trueを返す', () => {
      process.env.REACT_APP_LINEWORKS_ENABLED = 'true';
      expect(LineWorksService.isConfigured()).toBe(true);
    });

    it('isConfigured()はREACT_APP_LINEWORKS_ENABLED未設定時にfalseを返す', () => {
      delete process.env.REACT_APP_LINEWORKS_ENABLED;
      expect(LineWorksService.isConfigured()).toBe(false);
    });

    it('isConfigured()はREACT_APP_LINEWORKS_ENABLED=falseの時falseを返す', () => {
      process.env.REACT_APP_LINEWORKS_ENABLED = 'false';
      expect(LineWorksService.isConfigured()).toBe(false);
    });

    it('getRoomName()は環境変数の値を返す', () => {
      process.env.REACT_APP_LINEWORKS_ROOM_NAME = 'テストルーム';
      expect(LineWorksService.getRoomName()).toBe('テストルーム');
    });

    it('getRoomName()は環境変数未設定時にデフォルト値「SI1部」を返す', () => {
      delete process.env.REACT_APP_LINEWORKS_ROOM_NAME;
      expect(LineWorksService.getRoomName()).toBe('SI1部');
    });
  });

  // ==================== メッセージ構築 ====================

  describe('メッセージ構築', () => {
    describe('勤怠サマリーメッセージ', () => {
      it('勤怠分析サマリーを構築できる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('【勤怠分析サマリー】');
        expect(message).toContain('期間: 1/1〜1/31');
      });

      it('全体統計が含まれる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('■ 全体統計');
        expect(message).toContain('対象者: 10名');
        expect(message).toContain('問題あり: 3名');
        expect(message).toContain('総残業時間:');
      });

      it('違反サマリーが含まれる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('■ 違反サマリー');
        expect(message).toContain('高緊急度: 2名');
        expect(message).toContain('休憩違反1件');
        expect(message).toContain('中緊急度: 5名');
        expect(message).toContain('その他:');
        expect(message).toContain('打刻漏れ: 1件');
      });

      it('部門別平均残業時間に「/所属人数」が含まれる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('■ 部門別平均残業時間（/所属人数）');
        expect(message).toContain('開発部(5名): 10:00');
      });

      it('残業状況に氏名・現在・見込み・レベルが表示される（法定外残業ベース）', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        // 田中太郎: 法定外45h, 20/22営業日 → 残り2営業日
        expect(message).toContain('■ 残業状況（36協定・残り2営業日）');
        // 田中太郎: 法定外45h → 予測49:30 = 超過
        expect(message).toContain('田中太郎  現在45:00 見込49:30  超過');
      });
    });

    describe('チーム分析メッセージ', () => {
      it('チーム分析メッセージを構築できる', () => {
        const result = createMockStrengthsAnalysisResult();
        const members = createMockMembers();
        const message = LineWorksService.buildTeamAnalysisMessage(result, members);

        expect(message).toContain('【チーム分析】');
        expect(message).toContain('対象者: 2名');
      });

      it('部門名を指定した場合タイトルに含まれる', () => {
        const result = createMockStrengthsAnalysisResult();
        const members = createMockMembers();
        const message = LineWorksService.buildTeamAnalysisMessage(result, members, '開発部');

        expect(message).toContain('【開発部チーム分析】');
      });

      it('強みグループ分布が含まれる', () => {
        const result = createMockStrengthsAnalysisResult();
        const members = createMockMembers();
        const message = LineWorksService.buildTeamAnalysisMessage(result, members);

        expect(message).toContain('強みグループ分布');
        expect(message).toContain('実行力: 5');
        expect(message).toContain('影響力: 3');
      });

      it('頻出資質TOP5が含まれる', () => {
        const result = createMockStrengthsAnalysisResult();
        const members = createMockMembers();
        const message = LineWorksService.buildTeamAnalysisMessage(result, members);

        expect(message).toContain('頻出資質TOP5');
        expect(message).toContain('達成欲');
        expect(message).toContain('活発性');
      });
    });
  });

  // ==================== 送信処理 ====================

  describe('送信処理', () => {
    it('LINEWORKS_ENABLED未設定時はエラーを返す', async () => {
      delete process.env.REACT_APP_LINEWORKS_ENABLED;
      const result = await LineWorksService.send('custom', 'テストメッセージ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('無効');
    });

    it('LINEWORKS_ENABLED=falseの時はエラーを返す', async () => {
      process.env.REACT_APP_LINEWORKS_ENABLED = 'false';
      const result = await LineWorksService.send('custom', 'テストメッセージ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('無効');
    });

    it('有効時はCloud Functionを呼び出す', async () => {
      process.env.REACT_APP_LINEWORKS_ENABLED = 'true';
      mockCallable.mockResolvedValue({ data: { success: true } });

      const result = await LineWorksService.send('custom', 'テストメッセージ');

      expect(result.success).toBe(true);
      expect(mockCallable).toHaveBeenCalledWith({ text: 'テストメッセージ' });
    });

    it('開発環境ではテストマーカーが付与される', async () => {
      process.env.REACT_APP_LINEWORKS_ENABLED = 'true';
      process.env.NODE_ENV = 'development';
      mockCallable.mockResolvedValue({ data: { success: true } });

      await LineWorksService.send('custom', '本文テスト');

      const callArg = mockCallable.mock.calls[0][0];
      expect(callArg.text).toMatch(/^★★これは送信テストです★★/);
      expect(callArg.text).toMatch(/★★これは送信テストです★★$/);
      expect(callArg.text).toContain('本文テスト');
    });

    it('本番環境ではテストマーカーが付与されない', async () => {
      process.env.REACT_APP_LINEWORKS_ENABLED = 'true';
      process.env.NODE_ENV = 'production';
      mockCallable.mockResolvedValue({ data: { success: true } });

      await LineWorksService.send('custom', '本文テスト');

      const callArg = mockCallable.mock.calls[0][0];
      expect(callArg.text).toBe('本文テスト');
      expect(callArg.text).not.toContain('★★');
    });

    it('送信成功時は履歴にルーム名が記録される', async () => {
      process.env.REACT_APP_LINEWORKS_ENABLED = 'true';
      process.env.REACT_APP_LINEWORKS_ROOM_NAME = 'テストルーム';
      mockCallable.mockResolvedValue({ data: { success: true } });

      await LineWorksService.send('custom', 'テストメッセージ');

      const history = LineWorksService.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].roomName).toBe('テストルーム');
      expect(history[0].success).toBe(true);
    });

    it('ルーム名未設定時はデフォルト「SI1部」が履歴に記録される', async () => {
      process.env.REACT_APP_LINEWORKS_ENABLED = 'true';
      delete process.env.REACT_APP_LINEWORKS_ROOM_NAME;
      mockCallable.mockResolvedValue({ data: { success: true } });

      await LineWorksService.send('custom', 'テストメッセージ');

      const history = LineWorksService.getHistory();
      expect(history[0].roomName).toBe('SI1部');
    });

    it('Cloud Functionエラー時はエラーが記録される', async () => {
      process.env.REACT_APP_LINEWORKS_ENABLED = 'true';
      mockCallable.mockRejectedValue(new Error('functions/internal: LINE WORKS送信エラー'));

      const result = await LineWorksService.send('custom', 'テストメッセージ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('LINE WORKS送信エラー');

      const history = LineWorksService.getHistory();
      expect(history[0].success).toBe(false);
    });

    it('ネットワークエラー時はエラーが記録される', async () => {
      process.env.REACT_APP_LINEWORKS_ENABLED = 'true';
      mockCallable.mockRejectedValue(new Error('Network error'));

      const result = await LineWorksService.send('custom', 'テストメッセージ');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');

      const history = LineWorksService.getHistory();
      expect(history[0].success).toBe(false);
      expect(history[0].error).toBe('Network error');
    });
  });

  // ==================== 履歴管理 ====================

  describe('履歴管理', () => {
    it('履歴がない場合は空配列を返す', () => {
      const history = LineWorksService.getHistory();
      expect(history).toEqual([]);
    });

    it('履歴が正しく取得できる', () => {
      // 直接localStorageに履歴を設定
      const mockHistory = [
        {
          id: 'test-1',
          type: 'custom' as const,
          sentAt: Date.now(),
          success: true,
          messagePreview: 'テスト',
          roomName: 'SI1部',
        },
      ];
      localStorage.setItem(LINEWORKS_STORAGE_KEYS.HISTORY, JSON.stringify(mockHistory));

      const history = LineWorksService.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('test-1');
    });

    it('履歴をクリアできる', () => {
      const mockHistory = [
        {
          id: 'test-1',
          type: 'custom' as const,
          sentAt: Date.now(),
          success: true,
          messagePreview: 'テスト',
          roomName: 'SI1部',
        },
      ];
      localStorage.setItem(LINEWORKS_STORAGE_KEYS.HISTORY, JSON.stringify(mockHistory));

      LineWorksService.clearHistory();

      const history = LineWorksService.getHistory();
      expect(history).toEqual([]);
    });
  });
});
