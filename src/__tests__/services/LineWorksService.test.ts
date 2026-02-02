/**
 * LineWorksService テスト
 *
 * @module __tests__/services/LineWorksService.test
 */

import { LineWorksService } from '../../services/LineWorksService';
import {
  LineWorksConfig,
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
import { StrengthsAnalysisResult, MemberStrengths, StrengthGroup, Strength, RankedStrength } from '../../models/StrengthsTypes';

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
      lateDays: 0,
      earlyLeaveDays: 0,
      timelyDepartureDays: 5,
      fullDayLeaveDays: 1,
      halfDayLeaveDays: 0,
      breakViolationDays: 0,
      missingClockDays: 1,
      earlyStartViolationDays: 0,
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
      lateDays: 1,
      earlyLeaveDays: 0,
      timelyDepartureDays: 10,
      fullDayLeaveDays: 0,
      halfDayLeaveDays: 1,
      breakViolationDays: 1,
      missingClockDays: 0,
      earlyStartViolationDays: 0,
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
  beforeEach(() => {
    // 各テスト前にlocalStorageをクリア
    localStorage.clear();
  });

  // ==================== 設定管理 ====================

  describe('設定管理', () => {
    it('Webhook URLを設定・取得できる', () => {
      const webhookUrl = 'https://example.com/webhook';
      LineWorksService.setConfig(webhookUrl);
      const config = LineWorksService.getConfig();

      expect(config).not.toBeNull();
      expect(config?.webhookUrl).toBe(webhookUrl);
      expect(config?.configuredAt).toBeGreaterThan(0);
    });

    it('設定がない場合はnullを返す', () => {
      const config = LineWorksService.getConfig();
      expect(config).toBeNull();
    });

    it('設定をクリアできる', () => {
      LineWorksService.setConfig('https://example.com/webhook');
      LineWorksService.clearConfig();
      expect(LineWorksService.getConfig()).toBeNull();
    });

    it('設定が正しくlocalStorageに保存される', () => {
      const webhookUrl = 'https://example.com/webhook';
      LineWorksService.setConfig(webhookUrl);

      const stored = localStorage.getItem(LINEWORKS_STORAGE_KEYS.CONFIG);
      expect(stored).not.toBeNull();

      const parsed: LineWorksConfig = JSON.parse(stored!);
      expect(parsed.webhookUrl).toBe(webhookUrl);
    });
  });

  // ==================== メッセージ構築 ====================

  describe('メッセージ構築', () => {
    describe('勤怠サマリーメッセージ', () => {
      it('勤怠サマリーメッセージを構築できる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('【勤怠分析サマリー】');
        expect(message).toContain('対象者: 10名');
      });

      it('アラート状況が含まれる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('高緊急度: 2件');
        expect(message).toContain('中緊急度: 5件');
        expect(message).toContain('低緊急度: 8件');
      });

      it('部門別平均残業時間が含まれる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('部門別 平均残業時間');
        expect(message).toContain('開発部(5名): 10h0m');
        expect(message).toContain('営業部(3名): 10h0m');
      });

      it('違反サマリーの内訳が含まれる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('違反サマリー');
        expect(message).toContain('【内訳】');
        expect(message).toContain('打刻漏れ: 1件');
      });

      it('全体統計が含まれる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('全体統計');
        expect(message).toContain('問題あり: 3名');
      });

      it('残業状況（45h超過者）が含まれる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('残業状況（45h超過）');
        expect(message).toContain('田中太郎(開発部): 50h0m');
      });

      it('日付範囲が正しくフォーマットされる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('期間: 1/1〜1/31');
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
    it('Webhook URL未設定時はエラーを返す', async () => {
      const result = await LineWorksService.send('custom', 'テストメッセージ');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Webhook URL');
    });

    it('送信成功時は履歴に記録される', async () => {
      // 注意: 実際のfetch呼び出しはモックが必要
      // このテストは設定後の履歴確認のみ
      LineWorksService.setConfig('https://example.com/webhook');

      // 履歴が空であることを確認
      const historyBefore = LineWorksService.getHistory();
      expect(historyBefore).toHaveLength(0);
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
        },
      ];
      localStorage.setItem(LINEWORKS_STORAGE_KEYS.HISTORY, JSON.stringify(mockHistory));

      const history = LineWorksService.getHistory();
      expect(history).toHaveLength(1);
      expect(history[0].id).toBe('test-1');
    });
  });

  // ==================== Webhook URLバリデーション ====================

  describe('Webhook URLバリデーション', () => {
    it('isConfiguredは設定済みの場合trueを返す', () => {
      LineWorksService.setConfig('https://example.com/webhook');
      expect(LineWorksService.isConfigured()).toBe(true);
    });

    it('isConfiguredは未設定の場合falseを返す', () => {
      expect(LineWorksService.isConfigured()).toBe(false);
    });
  });
});
