// 勤怠分析：ユーザーフィルターパネルのテスト
// SPEC: docs/specs/SPEC_USER_FILTER.md

import React from 'react';
import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import UserFilterPanel from '../../../components/attendance/UserFilterPanel';
import { AttendanceRecord } from '../../../models/AttendanceTypes';

/**
 * テスト用の勤怠レコードを作成
 */
const createMockRecord = (
  employeeId: string,
  employeeName: string,
  department: string,
  date: Date = new Date('2026-01-15')
): AttendanceRecord => ({
  employeeId,
  employeeName,
  department,
  position: '',
  date,
  dayOfWeek: '水',
  calendarType: 'weekday',
  calendarRaw: '8時～',
  applicationContent: '',
  clockIn: new Date('2026-01-15T09:00:00'),
  clockOut: new Date('2026-01-15T18:00:00'),
  originalClockIn: new Date('2026-01-15T09:00:00'),
  originalClockOut: new Date('2026-01-15T18:00:00'),
  earlyStartFlag: false,
  altxOvertimeIn: null,
  altxOvertimeOut: null,
  privateOutTime: null,
  privateReturnTime: null,
  breakTimeMinutes: 60,
  nightBreakModification: '',
  nightWorkMinutes: '',
  actualWorkHours: '8:00',
  overtimeHours: '0:00',
  lateMinutes: '',
  earlyLeaveMinutes: '',
  remarks: '',
  sheetName: 'Sheet1',
});

/**
 * テスト用のユーザー選択状態を作成
 */
const createUserSelections = (
  records: AttendanceRecord[],
  allSelected: boolean = true
): Map<string, boolean> => {
  const selections = new Map<string, boolean>();
  const uniqueEmployees = new Set(records.map(r => r.employeeId));
  uniqueEmployees.forEach(id => selections.set(id, allSelected));
  return selections;
};

describe('UserFilterPanel - ユーザー一覧表示', () => {
  const mockRecords: AttendanceRecord[] = [
    createMockRecord('001', '山田太郎', '開発部'),
    createMockRecord('002', '鈴木次郎', '開発部'),
    createMockRecord('003', '佐藤三郎', '営業部'),
    createMockRecord('001', '山田太郎', '開発部', new Date('2026-01-16')), // 同一人物の別日
  ];

  const defaultProps = {
    records: mockRecords,
    userSelections: createUserSelections(mockRecords),
    onSelectionChange: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('レコードからユニークなユーザー一覧を表示する', () => {
    render(<UserFilterPanel {...defaultProps} />);

    // 3名のユニークユーザーが表示される（001が重複しているので3名）
    expect(screen.getByText('山田太郎')).toBeInTheDocument();
    expect(screen.getByText('鈴木次郎')).toBeInTheDocument();
    expect(screen.getByText('佐藤三郎')).toBeInTheDocument();
  });

  it('従業員IDを括弧付きで表示する', () => {
    render(<UserFilterPanel {...defaultProps} />);

    expect(screen.getByText(/\(001\)/)).toBeInTheDocument();
    expect(screen.getByText(/\(002\)/)).toBeInTheDocument();
    expect(screen.getByText(/\(003\)/)).toBeInTheDocument();
  });

  it('選択数を正しく表示する', () => {
    render(<UserFilterPanel {...defaultProps} />);

    // 全員選択状態なので「選択中: 3/3名」
    const selectionCount = screen.getByTestId('selection-count');
    expect(selectionCount).toHaveTextContent('選択中:');
    expect(selectionCount).toHaveTextContent('3');
    expect(selectionCount).toHaveTextContent('/ 3名');
  });

  it('一部のみ選択時に正しい選択数を表示する', () => {
    const partialSelections = new Map<string, boolean>([
      ['001', true],
      ['002', false],
      ['003', true],
    ]);

    render(
      <UserFilterPanel
        {...defaultProps}
        userSelections={partialSelections}
      />
    );

    // 2/3名選択状態
    const selectionCount = screen.getByTestId('selection-count');
    expect(selectionCount).toHaveTextContent('選択中:');
    expect(selectionCount).toHaveTextContent('2');
    expect(selectionCount).toHaveTextContent('/ 3名');
  });
});

describe('UserFilterPanel - 部門別グルーピング', () => {
  const mockRecords: AttendanceRecord[] = [
    createMockRecord('001', '山田太郎', '開発部'),
    createMockRecord('002', '鈴木次郎', '開発部'),
    createMockRecord('003', '佐藤三郎', '営業部'),
    createMockRecord('004', '田中四郎', '営業部'),
    createMockRecord('005', '高橋五郎', ''), // 部門未設定
  ];

  const defaultProps = {
    records: mockRecords,
    userSelections: createUserSelections(mockRecords),
    onSelectionChange: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onConfirm: jest.fn(),
  };

  it('部門ごとにグルーピングして表示する', () => {
    render(<UserFilterPanel {...defaultProps} />);

    // 部門名が表示される
    expect(screen.getByText(/開発部/)).toBeInTheDocument();
    expect(screen.getByText(/営業部/)).toBeInTheDocument();
  });

  it('部門ごとの人数を表示する', () => {
    render(<UserFilterPanel {...defaultProps} />);

    // 「開発部（2名）」「営業部（2名）」の形式
    expect(screen.getByText(/開発部.*2.*名/)).toBeInTheDocument();
    expect(screen.getByText(/営業部.*2.*名/)).toBeInTheDocument();
  });

  it('部門未設定のユーザーは「未所属」グループに表示される', () => {
    render(<UserFilterPanel {...defaultProps} />);

    expect(screen.getByText(/未所属/)).toBeInTheDocument();
    expect(screen.getByText('高橋五郎')).toBeInTheDocument();
  });
});

describe('UserFilterPanel - チェックボックス操作', () => {
  const mockRecords: AttendanceRecord[] = [
    createMockRecord('001', '山田太郎', '開発部'),
    createMockRecord('002', '鈴木次郎', '開発部'),
  ];

  const defaultProps = {
    records: mockRecords,
    userSelections: createUserSelections(mockRecords),
    onSelectionChange: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('チェックボックスクリックでonSelectionChangeが呼ばれる', () => {
    render(<UserFilterPanel {...defaultProps} />);

    // 山田太郎のチェックボックスをクリック
    const checkboxes = screen.getAllByRole('checkbox');
    fireEvent.click(checkboxes[0]);

    expect(defaultProps.onSelectionChange).toHaveBeenCalledWith('001', false);
  });

  it('選択状態に応じてチェックボックスが表示される', () => {
    const partialSelections = new Map<string, boolean>([
      ['001', true],
      ['002', false],
    ]);

    render(
      <UserFilterPanel
        {...defaultProps}
        userSelections={partialSelections}
      />
    );

    const checkboxes = screen.getAllByRole('checkbox');
    expect(checkboxes[0]).toBeChecked(); // 001は選択状態
    expect(checkboxes[1]).not.toBeChecked(); // 002は非選択状態
  });
});

describe('UserFilterPanel - 全員選択/全員解除', () => {
  const mockRecords: AttendanceRecord[] = [
    createMockRecord('001', '山田太郎', '開発部'),
    createMockRecord('002', '鈴木次郎', '開発部'),
  ];

  const defaultProps = {
    records: mockRecords,
    userSelections: createUserSelections(mockRecords),
    onSelectionChange: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('全員選択ボタンクリックでonSelectAllが呼ばれる', () => {
    render(<UserFilterPanel {...defaultProps} />);

    const selectAllButton = screen.getByRole('button', { name: /全員選択/ });
    fireEvent.click(selectAllButton);

    expect(defaultProps.onSelectAll).toHaveBeenCalled();
  });

  it('全員解除ボタンクリックでonDeselectAllが呼ばれる', () => {
    render(<UserFilterPanel {...defaultProps} />);

    const deselectAllButton = screen.getByRole('button', { name: /全員解除/ });
    fireEvent.click(deselectAllButton);

    expect(defaultProps.onDeselectAll).toHaveBeenCalled();
  });
});

describe('UserFilterPanel - 確定ボタン', () => {
  const mockRecords: AttendanceRecord[] = [
    createMockRecord('001', '山田太郎', '開発部'),
    createMockRecord('002', '鈴木次郎', '開発部'),
  ];

  const defaultProps = {
    records: mockRecords,
    userSelections: createUserSelections(mockRecords),
    onSelectionChange: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onConfirm: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('確定ボタンクリックでonConfirmが呼ばれる', () => {
    render(<UserFilterPanel {...defaultProps} />);

    const confirmButton = screen.getByRole('button', { name: /分析を開始|確定/ });
    fireEvent.click(confirmButton);

    expect(defaultProps.onConfirm).toHaveBeenCalled();
  });

  it('0名選択時は確定ボタンが無効化される', () => {
    const noSelections = new Map<string, boolean>([
      ['001', false],
      ['002', false],
    ]);

    render(
      <UserFilterPanel
        {...defaultProps}
        userSelections={noSelections}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /分析を開始|確定/ });
    expect(confirmButton).toBeDisabled();
  });

  it('1名以上選択時は確定ボタンが有効化される', () => {
    const oneSelected = new Map<string, boolean>([
      ['001', true],
      ['002', false],
    ]);

    render(
      <UserFilterPanel
        {...defaultProps}
        userSelections={oneSelected}
      />
    );

    const confirmButton = screen.getByRole('button', { name: /分析を開始|確定/ });
    expect(confirmButton).not.toBeDisabled();
  });
});

describe('UserFilterPanel - キャンセルボタン', () => {
  const mockRecords: AttendanceRecord[] = [
    createMockRecord('001', '山田太郎', '開発部'),
  ];

  const defaultProps = {
    records: mockRecords,
    userSelections: createUserSelections(mockRecords),
    onSelectionChange: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onConfirm: jest.fn(),
    onCancel: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('onCancelが渡された場合、キャンセルボタンが表示される', () => {
    render(<UserFilterPanel {...defaultProps} />);

    expect(screen.getByRole('button', { name: /キャンセル/ })).toBeInTheDocument();
  });

  it('キャンセルボタンクリックでonCancelが呼ばれる', () => {
    render(<UserFilterPanel {...defaultProps} />);

    const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
    fireEvent.click(cancelButton);

    expect(defaultProps.onCancel).toHaveBeenCalled();
  });

  it('onCancelが渡されない場合、キャンセルボタンは非表示', () => {
    // onCancelを除いたpropsを作成
    const { onCancel, ...propsWithoutCancel } = defaultProps;

    render(<UserFilterPanel {...propsWithoutCancel} />);

    expect(screen.queryByRole('button', { name: /キャンセル/ })).not.toBeInTheDocument();
  });
});

describe('UserFilterPanel - アクセシビリティ', () => {
  const mockRecords: AttendanceRecord[] = [
    createMockRecord('001', '山田太郎', '開発部'),
  ];

  const defaultProps = {
    records: mockRecords,
    userSelections: createUserSelections(mockRecords),
    onSelectionChange: jest.fn(),
    onSelectAll: jest.fn(),
    onDeselectAll: jest.fn(),
    onConfirm: jest.fn(),
  };

  it('チェックボックスに適切なラベルが設定されている', () => {
    render(<UserFilterPanel {...defaultProps} />);

    const checkbox = screen.getByRole('checkbox', { name: /山田太郎/ });
    expect(checkbox).toBeInTheDocument();
  });
});
