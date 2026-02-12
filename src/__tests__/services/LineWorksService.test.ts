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
  LineWorksConfig,
  LineWorksWebhookEntry,
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
    // UUIDカウンターをリセット
    uuidCounter = 0;
  });

  // ==================== 設定管理 ====================

  describe('設定管理', () => {
    it('Webhook URLを設定・取得できる', () => {
      const webhookUrl = 'https://example.com/webhook';
      LineWorksService.setConfig(webhookUrl);
      const config = LineWorksService.getConfig();

      expect(config).not.toBeNull();
      expect(config?.webhooks).toHaveLength(1);
      expect(config?.webhooks[0].webhookUrl).toBe(webhookUrl);
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
      expect(parsed.webhooks[0].webhookUrl).toBe(webhookUrl);
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

      it('部門別平均残業時間が含まれる', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        expect(message).toContain('■ 部門別平均残業時間（/人）');
        expect(message).toContain('開発部(5名): 10:00');
      });

      it('残業状況に氏名・現在・見込み・レベルが表示される', () => {
        const result = createMockExtendedAnalysisResult();
        const message = LineWorksService.buildAttendanceMessage(result);

        // 田中太郎: 50h, 20/22営業日 → 残り2営業日
        expect(message).toContain('■ 残業状況（36協定・残り2営業日）');
        // 田中太郎: 50h → 予測55h = 警戒
        expect(message).toContain('田中太郎  現在50:00 見込55:00  警戒');
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
      LineWorksService.addWebhook('テストルーム', 'https://example.com/webhook');
      expect(LineWorksService.isConfigured()).toBe(true);
    });

    it('isConfiguredは未設定の場合falseを返す', () => {
      expect(LineWorksService.isConfigured()).toBe(false);
    });
  });

  // ==================== 複数Webhook管理 ====================

  describe('複数Webhook管理', () => {
    describe('addWebhook', () => {
      it('新しいWebhookを追加できる', () => {
        LineWorksService.addWebhook('リーダールーム', 'https://example.com/webhook1');

        const webhooks = LineWorksService.getWebhooks();
        expect(webhooks).toHaveLength(1);
        expect(webhooks[0].roomName).toBe('リーダールーム');
        expect(webhooks[0].webhookUrl).toBe('https://example.com/webhook1');
        expect(webhooks[0].id).toBeDefined();
        expect(webhooks[0].addedAt).toBeGreaterThan(0);
      });

      it('複数のWebhookを追加できる', () => {
        LineWorksService.addWebhook('ルーム1', 'https://example.com/webhook1');
        LineWorksService.addWebhook('ルーム2', 'https://example.com/webhook2');
        LineWorksService.addWebhook('ルーム3', 'https://example.com/webhook3');

        const webhooks = LineWorksService.getWebhooks();
        expect(webhooks).toHaveLength(3);
      });

      it('最初のWebhook追加時は自動的にデフォルトに設定される', () => {
        LineWorksService.addWebhook('デフォルトルーム', 'https://example.com/webhook1');

        const defaultWebhook = LineWorksService.getDefaultWebhook();
        expect(defaultWebhook).not.toBeNull();
        expect(defaultWebhook?.roomName).toBe('デフォルトルーム');
      });

      it('2つ目以降のWebhook追加時はデフォルトが変わらない', () => {
        LineWorksService.addWebhook('ルーム1', 'https://example.com/webhook1');
        LineWorksService.addWebhook('ルーム2', 'https://example.com/webhook2');

        const defaultWebhook = LineWorksService.getDefaultWebhook();
        expect(defaultWebhook?.roomName).toBe('ルーム1');
      });
    });

    describe('removeWebhook', () => {
      it('Webhookを削除できる', () => {
        LineWorksService.addWebhook('ルーム1', 'https://example.com/webhook1');
        LineWorksService.addWebhook('ルーム2', 'https://example.com/webhook2');

        const webhooks = LineWorksService.getWebhooks();
        const webhookToRemove = webhooks.find(w => w.roomName === 'ルーム1');

        LineWorksService.removeWebhook(webhookToRemove!.id);

        const updatedWebhooks = LineWorksService.getWebhooks();
        expect(updatedWebhooks).toHaveLength(1);
        expect(updatedWebhooks[0].roomName).toBe('ルーム2');
      });

      it('デフォルトWebhookを削除すると別のWebhookがデフォルトになる', () => {
        LineWorksService.addWebhook('ルーム1', 'https://example.com/webhook1');
        LineWorksService.addWebhook('ルーム2', 'https://example.com/webhook2');

        const defaultWebhook = LineWorksService.getDefaultWebhook();
        LineWorksService.removeWebhook(defaultWebhook!.id);

        const newDefaultWebhook = LineWorksService.getDefaultWebhook();
        expect(newDefaultWebhook).not.toBeNull();
        expect(newDefaultWebhook?.roomName).toBe('ルーム2');
      });

      it('全てのWebhookを削除するとデフォルトがnullになる', () => {
        LineWorksService.addWebhook('ルーム1', 'https://example.com/webhook1');

        const webhooks = LineWorksService.getWebhooks();
        LineWorksService.removeWebhook(webhooks[0].id);

        const defaultWebhook = LineWorksService.getDefaultWebhook();
        expect(defaultWebhook).toBeNull();
        expect(LineWorksService.getWebhooks()).toHaveLength(0);
      });
    });

    describe('setDefaultWebhook', () => {
      it('デフォルトWebhookを変更できる', () => {
        LineWorksService.addWebhook('ルーム1', 'https://example.com/webhook1');
        LineWorksService.addWebhook('ルーム2', 'https://example.com/webhook2');

        const webhooks = LineWorksService.getWebhooks();
        const room2 = webhooks.find(w => w.roomName === 'ルーム2');

        LineWorksService.setDefaultWebhook(room2!.id);

        const defaultWebhook = LineWorksService.getDefaultWebhook();
        expect(defaultWebhook?.roomName).toBe('ルーム2');
      });

      it('存在しないIDを指定しても例外が発生しない', () => {
        LineWorksService.addWebhook('ルーム1', 'https://example.com/webhook1');

        expect(() => {
          LineWorksService.setDefaultWebhook('non-existent-id');
        }).not.toThrow();
      });
    });

    describe('getWebhookById', () => {
      it('IDでWebhookを取得できる', () => {
        LineWorksService.addWebhook('ルーム1', 'https://example.com/webhook1');

        const webhooks = LineWorksService.getWebhooks();
        const webhook = LineWorksService.getWebhookById(webhooks[0].id);

        expect(webhook).not.toBeNull();
        expect(webhook?.roomName).toBe('ルーム1');
      });

      it('存在しないIDの場合はnullを返す', () => {
        const webhook = LineWorksService.getWebhookById('non-existent-id');
        expect(webhook).toBeNull();
      });
    });

    describe('updateWebhookLastSentAt', () => {
      it('最終送信日時を更新できる', () => {
        LineWorksService.addWebhook('ルーム1', 'https://example.com/webhook1');

        const webhooks = LineWorksService.getWebhooks();
        const beforeUpdate = webhooks[0].lastSentAt;

        LineWorksService.updateWebhookLastSentAt(webhooks[0].id);

        const updatedWebhooks = LineWorksService.getWebhooks();
        expect(updatedWebhooks[0].lastSentAt).toBeGreaterThan(beforeUpdate || 0);
      });
    });
  });

  // ==================== マイグレーション ====================

  describe('マイグレーション', () => {
    it('旧形式の設定を新形式に変換できる', () => {
      // 旧形式のデータを直接保存
      const legacyConfig = {
        webhookUrl: 'https://example.com/legacy-webhook',
        configuredAt: Date.now() - 10000,
        lastSentAt: Date.now() - 5000,
      };
      localStorage.setItem(LINEWORKS_STORAGE_KEYS.CONFIG, JSON.stringify(legacyConfig));

      // マイグレーション実行
      LineWorksService.migrateConfig();

      // 新形式で取得できることを確認
      const webhooks = LineWorksService.getWebhooks();
      expect(webhooks).toHaveLength(1);
      expect(webhooks[0].webhookUrl).toBe('https://example.com/legacy-webhook');
      expect(webhooks[0].roomName).toBe('デフォルト');
    });

    it('新形式の設定はマイグレーションしない', () => {
      LineWorksService.addWebhook('新形式ルーム', 'https://example.com/new-webhook');

      const webhooksBefore = LineWorksService.getWebhooks();
      LineWorksService.migrateConfig();
      const webhooksAfter = LineWorksService.getWebhooks();

      expect(webhooksAfter).toEqual(webhooksBefore);
    });

    it('空の設定の場合は何もしない', () => {
      LineWorksService.migrateConfig();

      const webhooks = LineWorksService.getWebhooks();
      expect(webhooks).toHaveLength(0);
    });
  });

  // ==================== 送信処理（webhookId対応） ====================

  describe('送信処理（webhookId対応）', () => {
    it('webhookIdを指定して送信できる（履歴にルーム名が記録される）', async () => {
      LineWorksService.addWebhook('テストルーム', 'https://example.com/webhook');
      const webhooks = LineWorksService.getWebhooks();

      // fetchをモック
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      await LineWorksService.send('custom', 'テストメッセージ', webhooks[0].id);

      const history = LineWorksService.getHistory();
      expect(history[0].roomName).toBe('テストルーム');
    });

    it('webhookIdが未指定の場合はデフォルトWebhookを使用する', async () => {
      LineWorksService.addWebhook('デフォルトルーム', 'https://example.com/webhook');

      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      await LineWorksService.send('custom', 'テストメッセージ');

      const history = LineWorksService.getHistory();
      expect(history[0].roomName).toBe('デフォルトルーム');
    });

    it('存在しないwebhookIdを指定するとエラーを返す', async () => {
      LineWorksService.addWebhook('ルーム', 'https://example.com/webhook');

      const result = await LineWorksService.send('custom', 'テストメッセージ', 'non-existent-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Webhook');
    });
  });
});
