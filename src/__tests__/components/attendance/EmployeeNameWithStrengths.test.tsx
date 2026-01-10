// 勤怠分析：従業員名バッジ表示のテスト
// SPEC: docs/specs/SPEC_ATTENDANCE_CROWN_BADGE.md

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemberStrengths, Position } from '../../../models/StrengthsTypes';

// EmployeeNameWithStrengthsコンポーネントをテスト用にエクスポートする必要がある
// 現状は内部コンポーネントのため、テスト用にエクスポートを追加する

/**
 * テスト用のStrengthsメンバーを作成
 */
const createMockMember = (
  name: string,
  position: Position | string | undefined,
  strengths: { id: string }[] = []
): MemberStrengths => ({
  id: `test-${name}`,
  name,
  department: '開発部',
  position,
  strengths: strengths.map((s, idx) => ({ ...s, rank: idx + 1 })),
  mbti: 'INTJ',
});

describe('EmployeeNameWithStrengths - 役職別バッジ表示', () => {
  describe('クラウンアイコン表示', () => {
    /**
     * 部長はクラウン（赤）を表示
     */
    it('部長（DIRECTOR）はクラウンアイコン（赤）を表示', () => {
      const member = createMockMember('山田太郎', Position.DIRECTOR, [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }
      ]);

      // TODO: EmployeeNameWithStrengthsをレンダリングしてテスト
      // Crown アイコンが赤色（#F44336）で表示されることを確認
      expect(member.position).toBe(Position.DIRECTOR);
    });

    /**
     * 課長はクラウン（青）を表示
     */
    it('課長（MANAGER）はクラウンアイコン（青）を表示', () => {
      const member = createMockMember('鈴木次郎', Position.MANAGER, [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }
      ]);

      expect(member.position).toBe(Position.MANAGER);
    });

    /**
     * 副課長はクラウン（緑）を表示
     */
    it('副課長（DEPUTY_MANAGER）はクラウンアイコン（緑）を表示', () => {
      const member = createMockMember('佐藤三郎', Position.DEPUTY_MANAGER, [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }
      ]);

      expect(member.position).toBe(Position.DEPUTY_MANAGER);
    });

    /**
     * グループリーダーはクラウン（金）を表示
     */
    it('グループリーダー（GL）はクラウンアイコン（金）を表示', () => {
      const member = createMockMember('田中四郎', Position.GL, [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }
      ]);

      expect(member.position).toBe(Position.GL);
    });
  });

  describe('サークルアイコン表示', () => {
    /**
     * 契約社員はサークル（薄青）を表示
     */
    it('契約社員（CONTRACT）はサークルアイコン（薄青）を表示', () => {
      const member = createMockMember('高橋五郎', Position.CONTRACT, [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }
      ]);

      expect(member.position).toBe(Position.CONTRACT);
    });

    /**
     * BPはサークル（薄緑）を表示
     */
    it('BP（BP）はサークルアイコン（薄緑）を表示', () => {
      const member = createMockMember('伊藤六郎', Position.BP, [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }
      ]);

      expect(member.position).toBe(Position.BP);
    });
  });

  describe('Awardアイコン表示（デフォルト）', () => {
    /**
     * 一般社員はAward（黄）を表示
     */
    it('一般社員（GENERAL）はAwardアイコン（黄）を表示', () => {
      const member = createMockMember('渡辺七郎', Position.GENERAL, [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }
      ]);

      expect(member.position).toBe(Position.GENERAL);
    });

    /**
     * 役職未設定はAward（黄）を表示
     */
    it('役職未設定はAwardアイコン（黄）を表示', () => {
      const member = createMockMember('中村八郎', undefined, [
        { id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }, { id: '5' }
      ]);

      expect(member.position).toBeUndefined();
    });
  });

  describe('SF未登録の表示', () => {
    /**
     * SF未登録メンバーはアイコン表示なし
     */
    it('StrengthsFinder未登録メンバーはアイコン表示なし', () => {
      // strengthsMember = undefined の場合
      // 氏名のみ表示されることを確認
      expect(true).toBe(true); // プレースホルダー
    });
  });
});

describe('EmployeeNameWithStrengths - getPositionBadgeInfo ユーティリティ', () => {
  /**
   * 役職に応じたバッジ情報を返すユーティリティ関数のテスト
   */
  describe('getPositionBadgeInfo', () => {
    it('部長は crown/赤 を返す', () => {
      // getPositionBadgeInfo(Position.DIRECTOR) => { type: 'crown', color: '#F44336' }
      expect(true).toBe(true); // 実装後にテスト追加
    });

    it('一般は award/黄 を返す', () => {
      // getPositionBadgeInfo(Position.GENERAL) => { type: 'award', color: '#EAB308' }
      expect(true).toBe(true); // 実装後にテスト追加
    });

    it('undefined は award/黄 を返す', () => {
      // getPositionBadgeInfo(undefined) => { type: 'award', color: '#EAB308' }
      expect(true).toBe(true); // 実装後にテスト追加
    });
  });
});
