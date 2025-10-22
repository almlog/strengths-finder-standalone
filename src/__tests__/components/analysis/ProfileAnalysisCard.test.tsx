/**
 * ProfileAnalysisCard Component Tests
 *
 * Tests based on current implementation (not old Spec)
 * Current design: Simple card with all scores always shown, summary, and warnings
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileAnalysisCard from '../../../components/analysis/ProfileAnalysisCard';
import { Member } from '../../../models/PersonalityAnalysis';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { StrengthsProvider } from '../../../contexts/StrengthsContext';

// Test helper: Wrap component with ThemeProvider and StrengthsProvider
const renderWithTheme = (ui: React.ReactElement) => {
  return render(
    <ThemeProvider>
      <StrengthsProvider>
        {ui}
      </StrengthsProvider>
    </ThemeProvider>
  );
};

describe('ProfileAnalysisCard', () => {
  // ==========================================================================
  // 完全データ時の表示
  // ==========================================================================
  describe('完全データ時の表示', () => {
    const fullDataMember: Member = {
      id: 'test-full-001',
      name: 'Test User Full',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 27, score: 1 },
        { id: 34, score: 2 },
        { id: 32, score: 3 },
        { id: 29, score: 4 },
        { id: 9, score: 5 },
      ],
    };

    it('カードが表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={fullDataMember} />);
      expect(screen.getByTestId('profile-analysis-card')).toBeInTheDocument();
    });

    it('タイトル「プロファイル分析」が表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={fullDataMember} />);
      expect(screen.getByText('プロファイル分析')).toBeInTheDocument();
    });

    it('MBTI×資質パターンが表示される（統合型/バランス型/多面型）', () => {
      renderWithTheme(<ProfileAnalysisCard member={fullDataMember} />);
      expect(screen.getByText('MBTI×資質パターン')).toBeInTheDocument();
      const pattern = screen.getByTestId('synergy-pattern');
      expect(pattern).toBeInTheDocument();
      // パターンラベルは統合型/バランス型/多面型のいずれか
      expect(['統合型', 'バランス型', '多面型']).toContain(pattern.textContent);
    });

    it('チームスタイルが表示される（チーム協調型/バランス型/個人作業型）', () => {
      renderWithTheme(<ProfileAnalysisCard member={fullDataMember} />);
      expect(screen.getByText('チームスタイル')).toBeInTheDocument();
      const pattern = screen.getByTestId('team-fit-pattern');
      expect(pattern).toBeInTheDocument();
      expect(['チーム協調型', 'バランス型', '個人作業型']).toContain(pattern.textContent);
    });

    it('役割傾向が表示される（リーダー型/バランス型/専門家型）', () => {
      renderWithTheme(<ProfileAnalysisCard member={fullDataMember} />);
      expect(screen.getByText('役割傾向')).toBeInTheDocument();
      const pattern = screen.getByTestId('leadership-pattern');
      expect(pattern).toBeInTheDocument();
      expect(['リーダー型', 'バランス型', '専門家型']).toContain(pattern.textContent);
    });

    it('プロファイルサマリーが表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={fullDataMember} />);
      expect(screen.getByTestId('profile-summary')).toBeInTheDocument();
    });

    it('統合分析結果が表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={fullDataMember} />);
      expect(screen.getByText('統合分析結果')).toBeInTheDocument();
    });

    it('詳細情報セクションが表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={fullDataMember} />);

      // 詳細情報を開くボタンをクリック
      const expandButton = screen.getByText('詳細情報を見る');
      fireEvent.click(expandButton);

      // MBTI特性の強み
      expect(screen.getByText('MBTI特性の強み')).toBeInTheDocument();
      // 理想的な環境
      expect(screen.getByText('理想的な環境')).toBeInTheDocument();
      // モチベーション要因
      expect(screen.getByText('モチベーション要因')).toBeInTheDocument();
      // ストレス要因
      expect(screen.getByText('ストレス要因')).toBeInTheDocument();
      // 相性の良いMBTIタイプ
      expect(screen.getByText('相性の良いMBTIタイプ')).toBeInTheDocument();
    });

    it('相性の良いMBTIタイプが色分け表示される（自然な相性/補完的な相性）', () => {
      renderWithTheme(<ProfileAnalysisCard member={fullDataMember} />);

      // 詳細情報を開くボタンをクリック
      const expandButton = screen.getByText('詳細情報を見る');
      fireEvent.click(expandButton);

      expect(screen.getByText('自然な相性')).toBeInTheDocument();
      expect(screen.getByText('補完的な相性')).toBeInTheDocument();
    });
  });

  // ==========================================================================
  // MBTIのみ時の表示
  // ==========================================================================
  describe('MBTIのみ時の表示', () => {
    const mbtiOnlyMember: Member = {
      id: 'test-mbti-001',
      name: 'Test User MBTI Only',
      department: 'TEST',
      mbtiType: 'ENFP',
    };

    it('カードが表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={mbtiOnlyMember} />);
      expect(screen.getByTestId('profile-analysis-card')).toBeInTheDocument();
    });

    it('統合分析結果が表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={mbtiOnlyMember} />);
      expect(screen.getByText('統合分析結果')).toBeInTheDocument();
    });

    it('MBTI×資質パターンは表示されない', () => {
      renderWithTheme(<ProfileAnalysisCard member={mbtiOnlyMember} />);
      expect(screen.queryByText('MBTI×資質パターン')).not.toBeInTheDocument();
    });

    it('MBTI関連の詳細情報が表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={mbtiOnlyMember} />);

      // 詳細情報を開くボタンをクリック
      const expandButton = screen.getByText('詳細情報を見る');
      fireEvent.click(expandButton);

      // MBTI特性の強み
      expect(screen.getByText('MBTI特性の強み')).toBeInTheDocument();
      // 理想的な環境
      expect(screen.getByText('理想的な環境')).toBeInTheDocument();
      // モチベーション要因
      expect(screen.getByText('モチベーション要因')).toBeInTheDocument();
      // 相性の良いMBTIタイプ（色分けあり）
      expect(screen.getByText('相性の良いMBTIタイプ')).toBeInTheDocument();
      expect(screen.getByText('自然な相性')).toBeInTheDocument();
      expect(screen.getByText('補完的な相性')).toBeInTheDocument();
    });

    it('チームスタイルが表示される（推定値）', () => {
      renderWithTheme(<ProfileAnalysisCard member={mbtiOnlyMember} />);
      expect(screen.getByText('チームスタイル')).toBeInTheDocument();
      const pattern = screen.getByTestId('team-fit-pattern');
      expect(pattern).toBeInTheDocument();
      expect(['チーム協調型', 'バランス型', '個人作業型']).toContain(pattern.textContent);
    });

    it('役割傾向が表示される（推定値）', () => {
      renderWithTheme(<ProfileAnalysisCard member={mbtiOnlyMember} />);
      expect(screen.getByText('役割傾向')).toBeInTheDocument();
      const pattern = screen.getByTestId('leadership-pattern');
      expect(pattern).toBeInTheDocument();
      expect(['リーダー型', 'バランス型', '専門家型']).toContain(pattern.textContent);
    });
  });

  // ==========================================================================
  // 資質のみ時の表示
  // ==========================================================================
  describe('資質のみ時の表示', () => {
    const strengthsOnlyMember: Member = {
      id: 'test-strengths-001',
      name: 'Test User Strengths Only',
      department: 'TEST',
      strengths: [
        { id: 11, score: 1 },
        { id: 12, score: 2 },
        { id: 13, score: 3 },
        { id: 14, score: 4 },
        { id: 17, score: 5 },
      ],
    };

    it('カードが表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={strengthsOnlyMember} />);
      expect(screen.getByTestId('profile-analysis-card')).toBeInTheDocument();
    });

    it('統合分析結果が表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={strengthsOnlyMember} />);
      expect(screen.getByText('統合分析結果')).toBeInTheDocument();
    });

    it('MBTI×資質パターンは表示されない', () => {
      renderWithTheme(<ProfileAnalysisCard member={strengthsOnlyMember} />);
      expect(screen.queryByText('MBTI×資質パターン')).not.toBeInTheDocument();
    });

    it('資質関連の詳細情報が表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={strengthsOnlyMember} />);

      // 詳細情報を開くボタンをクリック
      const expandButton = screen.getByText('詳細情報を見る');
      fireEvent.click(expandButton);

      // 理想的な環境
      expect(screen.getByText('理想的な環境')).toBeInTheDocument();
      // モチベーション要因
      expect(screen.getByText('モチベーション要因')).toBeInTheDocument();
    });

    it('MBTI特性の強みは表示されない（MBTIデータなし）', () => {
      renderWithTheme(<ProfileAnalysisCard member={strengthsOnlyMember} />);
      expect(screen.queryByText('MBTI特性の強み')).not.toBeInTheDocument();
    });

    it('相性の良いMBTIタイプは表示されない（MBTIデータなし）', () => {
      renderWithTheme(<ProfileAnalysisCard member={strengthsOnlyMember} />);
      expect(screen.queryByText('相性の良いMBTIタイプ')).not.toBeInTheDocument();
    });

    it('チームスタイルが表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={strengthsOnlyMember} />);
      expect(screen.getByText('チームスタイル')).toBeInTheDocument();
      const pattern = screen.getByTestId('team-fit-pattern');
      expect(pattern).toBeInTheDocument();
      expect(['チーム協調型', 'バランス型', '個人作業型']).toContain(pattern.textContent);
    });

    it('役割傾向が表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={strengthsOnlyMember} />);
      expect(screen.getByText('役割傾向')).toBeInTheDocument();
      const pattern = screen.getByTestId('leadership-pattern');
      expect(pattern).toBeInTheDocument();
      expect(['リーダー型', 'バランス型', '専門家型']).toContain(pattern.textContent);
    });
  });

  // ==========================================================================
  // データなし時の表示
  // ==========================================================================
  describe('データなし時の表示', () => {
    const noDataMember: Member = {
      id: 'test-no-data-001',
      name: 'Test User No Data',
      department: 'TEST',
    };

    it('カードが非表示（nullを返す）', () => {
      const { container } = renderWithTheme(<ProfileAnalysisCard member={noDataMember} />);
      expect(container.firstChild).toBeNull();
    });
  });

  // ==========================================================================
  // スコア表示
  // ==========================================================================
  describe('スコア表示', () => {
    const member: Member = {
      id: 'test-score-001',
      name: 'Test User Score',
      department: 'TEST',
      mbtiType: 'INTJ',
      strengths: [
        { id: 27, score: 1 },
        { id: 34, score: 2 },
        { id: 32, score: 3 },
        { id: 29, score: 4 },
        { id: 9, score: 5 },
      ],
    };

    it('3つのパターンセクションがレスポンシブグリッドで表示される', () => {
      renderWithTheme(<ProfileAnalysisCard member={member} />);
      const patternSection = screen.getByText('MBTI×資質パターン').closest('.grid');
      expect(patternSection).toHaveClass('grid-cols-1');
      expect(patternSection).toHaveClass('md:grid-cols-3');
    });
  });
});
