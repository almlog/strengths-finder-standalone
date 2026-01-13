// src/__tests__/models/AttendanceTypes.ViolationUrgency.test.ts
// 違反緊急度マッピングのテスト

import {
  VIOLATION_URGENCY,
  ViolationType,
  ViolationUrgencyLevel,
  AttendanceViolation,
  countHighUrgencyViolations,
  countMediumUrgencyViolations,
} from '../../models/AttendanceTypes';

describe('VIOLATION_URGENCY マッピング', () => {
  describe('高緊急度（法令違反）の分類', () => {
    const highUrgencyTypes: ViolationType[] = [
      'break_violation',
      'night_break_application_missing',
    ];

    test.each(highUrgencyTypes)('%s は高緊急度に分類される', (type) => {
      expect(VIOLATION_URGENCY[type]).toBe('high');
    });

    test('高緊急度は労働基準法違反に関連する項目のみ含む', () => {
      const highTypes = Object.entries(VIOLATION_URGENCY)
        .filter(([, level]) => level === 'high')
        .map(([type]) => type);

      expect(highTypes).toHaveLength(2);
      expect(highTypes).toContain('break_violation');
      expect(highTypes).toContain('night_break_application_missing');
    });
  });

  describe('中緊急度（届出漏れ）の分類', () => {
    const mediumUrgencyTypes: ViolationType[] = [
      'late_application_missing',
      'early_leave_application_missing',
      'early_start_application_missing',
      'time_leave_punch_missing',
    ];

    test.each(mediumUrgencyTypes)('%s は中緊急度に分類される', (type) => {
      expect(VIOLATION_URGENCY[type]).toBe('medium');
    });

    test('中緊急度は届出漏れに関連する項目のみ含む', () => {
      const mediumTypes = Object.entries(VIOLATION_URGENCY)
        .filter(([, level]) => level === 'medium')
        .map(([type]) => type);

      expect(mediumTypes).toHaveLength(4);
      expect(mediumTypes).toContain('late_application_missing');
      expect(mediumTypes).toContain('early_leave_application_missing');
      expect(mediumTypes).toContain('early_start_application_missing');
      expect(mediumTypes).toContain('time_leave_punch_missing');
    });
  });

  describe('緊急度なし（問題ありのみ）の分類', () => {
    const noneUrgencyTypes: ViolationType[] = [
      'missing_clock',
      'remarks_missing',
      'remarks_format_warning',
    ];

    test.each(noneUrgencyTypes)('%s は緊急度なしに分類される', (type) => {
      expect(VIOLATION_URGENCY[type]).toBe('none');
    });

    test('緊急度なしは月締め関連や備考関連の項目のみ含む', () => {
      const noneTypes = Object.entries(VIOLATION_URGENCY)
        .filter(([, level]) => level === 'none')
        .map(([type]) => type);

      expect(noneTypes).toHaveLength(3);
      expect(noneTypes).toContain('missing_clock');
      expect(noneTypes).toContain('remarks_missing');
      expect(noneTypes).toContain('remarks_format_warning');
    });
  });

  describe('全ViolationTypeがマッピングされている', () => {
    const allViolationTypes: ViolationType[] = [
      'missing_clock',
      'break_violation',
      'late_application_missing',
      'early_leave_application_missing',
      'early_start_application_missing',
      'time_leave_punch_missing',
      'night_break_application_missing',
      'remarks_missing',
      'remarks_format_warning',
    ];

    test('全ての違反タイプがVIOLATION_URGENCYに定義されている', () => {
      allViolationTypes.forEach(type => {
        expect(VIOLATION_URGENCY[type]).toBeDefined();
      });
    });

    test('VIOLATION_URGENCYのキー数が全違反タイプ数と一致する', () => {
      expect(Object.keys(VIOLATION_URGENCY)).toHaveLength(allViolationTypes.length);
    });
  });
});

describe('緊急度カウント関数', () => {
  // テスト用のモック違反データを生成するヘルパー
  const createViolation = (type: ViolationType): AttendanceViolation => ({
    employeeId: 'EMP001',
    employeeName: 'テスト太郎',
    department: 'テスト部',
    date: new Date('2026-01-13'),
    type,
    details: 'テスト違反',
  });

  describe('countHighUrgencyViolations', () => {
    test('高緊急度の違反のみをカウントする', () => {
      const violations: AttendanceViolation[] = [
        createViolation('break_violation'),                    // high
        createViolation('night_break_application_missing'),    // high
        createViolation('late_application_missing'),           // medium
        createViolation('missing_clock'),                      // none
      ];

      expect(countHighUrgencyViolations(violations)).toBe(2);
    });

    test('高緊急度の違反がない場合は0を返す', () => {
      const violations: AttendanceViolation[] = [
        createViolation('late_application_missing'),           // medium
        createViolation('early_leave_application_missing'),    // medium
        createViolation('missing_clock'),                      // none
      ];

      expect(countHighUrgencyViolations(violations)).toBe(0);
    });

    test('空の配列に対しては0を返す', () => {
      expect(countHighUrgencyViolations([])).toBe(0);
    });
  });

  describe('countMediumUrgencyViolations', () => {
    test('中緊急度の違反のみをカウントする', () => {
      const violations: AttendanceViolation[] = [
        createViolation('break_violation'),                    // high
        createViolation('late_application_missing'),           // medium
        createViolation('early_leave_application_missing'),    // medium
        createViolation('early_start_application_missing'),    // medium
        createViolation('time_leave_punch_missing'),           // medium
        createViolation('missing_clock'),                      // none
      ];

      expect(countMediumUrgencyViolations(violations)).toBe(4);
    });

    test('中緊急度の違反がない場合は0を返す', () => {
      const violations: AttendanceViolation[] = [
        createViolation('break_violation'),                    // high
        createViolation('night_break_application_missing'),    // high
        createViolation('missing_clock'),                      // none
      ];

      expect(countMediumUrgencyViolations(violations)).toBe(0);
    });

    test('空の配列に対しては0を返す', () => {
      expect(countMediumUrgencyViolations([])).toBe(0);
    });
  });

  describe('複合テスト: 緊急度別カウントの整合性', () => {
    test('全違反タイプを含む場合、high + medium + none = 全件数', () => {
      const allViolations: AttendanceViolation[] = [
        // high: 2件
        createViolation('break_violation'),
        createViolation('night_break_application_missing'),
        // medium: 4件
        createViolation('late_application_missing'),
        createViolation('early_leave_application_missing'),
        createViolation('early_start_application_missing'),
        createViolation('time_leave_punch_missing'),
        // none: 3件
        createViolation('missing_clock'),
        createViolation('remarks_missing'),
        createViolation('remarks_format_warning'),
      ];

      const highCount = countHighUrgencyViolations(allViolations);
      const mediumCount = countMediumUrgencyViolations(allViolations);
      const noneCount = allViolations.filter(v => VIOLATION_URGENCY[v.type] === 'none').length;

      expect(highCount).toBe(2);
      expect(mediumCount).toBe(4);
      expect(noneCount).toBe(3);
      expect(highCount + mediumCount + noneCount).toBe(allViolations.length);
    });

    test('「問題あり」は全違反、「高緊急度」「中緊急度」は一部のみ', () => {
      const violations: AttendanceViolation[] = [
        createViolation('break_violation'),           // high - 問題あり + 高緊急度
        createViolation('late_application_missing'),  // medium - 問題あり + 中緊急度
        createViolation('missing_clock'),             // none - 問題ありのみ
      ];

      const totalIssues = violations.length;  // 問題あり = 全件
      const highUrgency = countHighUrgencyViolations(violations);
      const mediumUrgency = countMediumUrgencyViolations(violations);

      expect(totalIssues).toBe(3);
      expect(highUrgency).toBe(1);
      expect(mediumUrgency).toBe(1);
      // 高緊急度 + 中緊急度 < 問題あり （打刻漏れは緊急度別にカウントしない）
      expect(highUrgency + mediumUrgency).toBeLessThan(totalIssues);
    });
  });
});
