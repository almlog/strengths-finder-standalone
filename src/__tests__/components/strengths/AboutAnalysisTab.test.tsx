/**
 * AboutAnalysisTab Test
 * TDD RED Phase: システム説明タブのテスト
 *
 * テスト対象:
 * - タブタイトルが「このシステムについて」であること
 * - 2つのメインセクション（StrengthsFinder / 勤怠分析）が存在すること
 * - 楽楽勤怠マニュアルの主要コンテンツが表示されること
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import AboutAnalysisTab from '../../../components/strengths/AboutAnalysisTab';

describe('AboutAnalysisTab', () => {
  describe('ヘッダー表示', () => {
    it('should display main title "このシステムについて"', () => {
      render(<AboutAnalysisTab />);
      expect(screen.getByText('このシステムについて')).toBeInTheDocument();
    });

    it('should display subtitle mentioning both features', () => {
      render(<AboutAnalysisTab />);
      // StrengthsFinder × MBTI と 勤怠分析 の両方に言及
      expect(screen.getByText(/メンバープロファイル分析/)).toBeInTheDocument();
    });
  });

  describe('StrengthsFinderセクション', () => {
    it('should display StrengthsFinder section header', () => {
      render(<AboutAnalysisTab />);
      expect(screen.getByText('StrengthsFinder × MBTI 統合分析')).toBeInTheDocument();
    });

    it('should display synergy score explanation', () => {
      render(<AboutAnalysisTab />);
      expect(screen.getByText('相性スコアの見方')).toBeInTheDocument();
    });

    it('should display team fit explanation', () => {
      render(<AboutAnalysisTab />);
      expect(screen.getByText('チーム適合度の見方')).toBeInTheDocument();
    });

    it('should display leadership explanation', () => {
      render(<AboutAnalysisTab />);
      expect(screen.getByText('リーダーシップ潜在力の見方')).toBeInTheDocument();
    });
  });

  describe('勤怠分析マニュアルセクション', () => {
    it('should display attendance analysis section header', () => {
      render(<AboutAnalysisTab />);
      expect(screen.getByText('楽楽勤怠データ分析')).toBeInTheDocument();
    });

    it('should display data deadline information', () => {
      render(<AboutAnalysisTab />);
      // 締め切り情報: 翌月第1営業日の13:00まで
      expect(screen.getByText(/翌月第1営業日.*13:00/)).toBeInTheDocument();
    });

    it('should display status definitions', () => {
      render(<AboutAnalysisTab />);
      // 申請ステータスの説明
      expect(screen.getByText(/申請ステータス/)).toBeInTheDocument();
    });

    it('should display overtime calculation rules', () => {
      render(<AboutAnalysisTab />);
      // 残業計算ルール
      expect(screen.getByText(/残業.*判定ロジック/)).toBeInTheDocument();
    });

    it('should display break time rules section', () => {
      render(<AboutAnalysisTab />);
      // 休憩時間セクションのタイトルが存在すること
      expect(screen.getByText(/休憩時間の計算ルール/)).toBeInTheDocument();
    });

    it('should display 36-agreement section title', () => {
      render(<AboutAnalysisTab />);
      // 36協定セクションのタイトルが存在すること（内容はアコーディオン内）
      expect(screen.getByText(/36協定.*コンプライアンス/)).toBeInTheDocument();
    });
  });

  describe('重要な注意事項', () => {
    it('should display important notes section', () => {
      render(<AboutAnalysisTab />);
      expect(screen.getByText('重要な注意事項')).toBeInTheDocument();
    });
  });
});
