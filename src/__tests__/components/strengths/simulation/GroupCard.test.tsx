// チームシミュレーション: グループ名リネームのテスト
// バグ: リネーム入力欄にonBlurが無く、Enterや確定ボタンを押さずに
// タブ切り替え等でフォーカスが外れると、入力内容が一切保存されずに
// 元の名前（デフォルト名）に戻ったように見えていた。

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import GroupCard from '../../../../components/strengths/simulation/GroupCard';
import { SimulationGroup, GroupStats } from '../../../../types/simulation';
import { StrengthGroup } from '../../../../models/StrengthsTypes';

const createGroup = (overrides: Partial<SimulationGroup> = {}): SimulationGroup => ({
  id: 'group-1',
  name: 'グループ1',
  memberIds: [],
  ...overrides,
});

const createStats = (): GroupStats => ({
  memberCount: 0,
  groupDistribution: {
    [StrengthGroup.EXECUTING]: 0,
    [StrengthGroup.INFLUENCING]: 0,
    [StrengthGroup.RELATIONSHIP_BUILDING]: 0,
    [StrengthGroup.STRATEGIC_THINKING]: 0,
  },
});

describe('GroupCard - グループ名リネーム', () => {
  it('Enterキーを押さずにフォーカスを外しても、入力した名前が保存される', () => {
    const onRename = jest.fn();
    render(
      <GroupCard
        group={createGroup()}
        members={[]}
        stats={createStats()}
        onRemove={() => {}}
        onRename={onRename}
      />
    );

    // 編集アイコンをクリックして編集モードに入る
    fireEvent.click(screen.getByRole('button', { name: '' })); // 編集アイコン（Edit2）

    const input = screen.getByDisplayValue('グループ1');
    fireEvent.change(input, { target: { value: 'SI1担当' } });

    // Enterや確定ボタンを押さず、フォーカスを外すだけ（タブ切り替え相当）
    fireEvent.blur(input);

    expect(onRename).toHaveBeenCalledWith('SI1担当');
  });

  it('Enterキーを押した場合は従来通り保存される', () => {
    const onRename = jest.fn();
    render(
      <GroupCard
        group={createGroup()}
        members={[]}
        stats={createStats()}
        onRemove={() => {}}
        onRename={onRename}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '' }));
    const input = screen.getByDisplayValue('グループ1');
    fireEvent.change(input, { target: { value: 'SI2担当' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRename).toHaveBeenCalledWith('SI2担当');
  });

  it('空文字にして確定しようとしても、既存の名前は失われない', () => {
    const onRename = jest.fn();
    render(
      <GroupCard
        group={createGroup()}
        members={[]}
        stats={createStats()}
        onRemove={() => {}}
        onRename={onRename}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: '' }));
    const input = screen.getByDisplayValue('グループ1');
    fireEvent.change(input, { target: { value: '   ' } });
    fireEvent.blur(input);

    expect(onRename).not.toHaveBeenCalled();
  });
});
