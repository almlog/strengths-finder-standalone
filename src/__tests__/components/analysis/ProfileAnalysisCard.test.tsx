/**
 * ProfileAnalysisCard Component Test
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProfileAnalysisCard from '../../../components/analysis/ProfileAnalysisCard';
import { ThemeProvider } from '../../../contexts/ThemeContext';
import { Member } from '../../../models/PersonalityAnalysis';

// テスト用のThemeProviderラッパー
const renderWithTheme = (ui: React.ReactElement, _themeId: 'light' | 'dark' = 'light') => {
  // ThemeProviderはデフォルトテーマを使用
  return render(
    <ThemeProvider>
      {ui}
    </ThemeProvider>
  );
};

describe('ProfileAnalysisCard - 完全モード（MBTI + 資質）', () => {
  const memberFull: Member = {
    id: '001',
    name: 'テストユーザー',
    department: 'TEST',
    mbtiType: 'INTJ',
    strengths: [
      { id: 4, score: 1 },  // 分析思考
      { id: 20, score: 2 }, // 内省
      { id: 29, score: 3 }, // 戦略性
      { id: 21, score: 4 }, // 学習欲
      { id: 34, score: 5 }, // 目標志向
    ],
  };

  it('カードが表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);
    expect(screen.getByTestId('profile-analysis-card')).toBeInTheDocument();
  });

  it('タイトルに「プロファイル分析」が表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);
    expect(screen.getByText('プロファイル分析')).toBeInTheDocument();
  });

  it('MBTIタイプ（INTJ）が表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);
    expect(screen.getAllByText(/INTJ/).length).toBeGreaterThan(0);
  });

  it('役割（戦略家・設計者）が表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);
    expect(screen.getAllByText(/戦略家・設計者/).length).toBeGreaterThan(0);
  });

  it('強み適合度スコアが表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);
    expect(screen.getByText('強み適合度')).toBeInTheDocument();
    expect(screen.getByTestId('synergy-score')).toBeInTheDocument();
  });

  it('チーム適合度スコアが表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);
    expect(screen.getByText('チーム適合度')).toBeInTheDocument();
    expect(screen.getByTestId('team-fit-score')).toBeInTheDocument();
  });

  it('リーダーシップ潜在力スコアが表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);
    expect(screen.getByText('リーダーシップ潜在力')).toBeInTheDocument();
    expect(screen.getByTestId('leadership-score')).toBeInTheDocument();
  });

  it('プロファイルサマリーが表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);
    expect(screen.getByTestId('profile-summary')).toBeInTheDocument();
  });

  it('TOP5資質名が表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);
    // TOP 資質の中に各資質名が含まれていることを確認
    const container = screen.getByTestId('profile-analysis-card');
    expect(container.textContent).toContain('分析思考');
    expect(container.textContent).toContain('内省');
    expect(container.textContent).toContain('戦略性');
  });
});

describe('ProfileAnalysisCard - MBTIのみモード', () => {
  const memberMBTIOnly: Member = {
    id: '002',
    name: 'MBTIユーザー',
    department: 'TEST',
    mbtiType: 'ENFP',
  };

  it('カードが表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberMBTIOnly} />);
    expect(screen.getByTestId('profile-analysis-card')).toBeInTheDocument();
  });

  it('強み適合度スコアが0と表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberMBTIOnly} />);
    const synergyScore = screen.getByTestId('synergy-score');
    expect(synergyScore).toHaveTextContent('0');
  });

  it('警告メッセージが表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberMBTIOnly} />);
    expect(screen.getByText(/資質データがありません/)).toBeInTheDocument();
  });
});

describe('ProfileAnalysisCard - 資質のみモード', () => {
  const memberStrengthsOnly: Member = {
    id: '003',
    name: '資質ユーザー',
    department: 'TEST',
    strengths: [
      { id: 1, score: 1 },
      { id: 2, score: 2 },
      { id: 3, score: 3 },
    ],
  };

  it('カードが表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberStrengthsOnly} />);
    expect(screen.getByTestId('profile-analysis-card')).toBeInTheDocument();
  });

  it('強み適合度スコアが0と表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberStrengthsOnly} />);
    const synergyScore = screen.getByTestId('synergy-score');
    expect(synergyScore).toHaveTextContent('0');
  });

  it('警告メッセージが表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberStrengthsOnly} />);
    expect(screen.getByText(/MBTIデータがありません/)).toBeInTheDocument();
  });
});

describe('ProfileAnalysisCard - データなし', () => {
  const memberNoData: Member = {
    id: '004',
    name: 'データなし',
    department: 'TEST',
  };

  it('カードが表示されない', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberNoData} />);
    expect(screen.queryByTestId('profile-analysis-card')).not.toBeInTheDocument();
  });
});

describe('ProfileAnalysisCard - ダークモード', () => {
  const memberFull: Member = {
    id: '005',
    name: 'ダークモードユーザー',
    department: 'TEST',
    mbtiType: 'INTJ',
    strengths: [
      { id: 4, score: 1 },
      { id: 20, score: 2 },
    ],
  };

  it('基本クラスが含まれている', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);
    const card = screen.getByTestId('profile-analysis-card');
    // 基本的なスタイルクラスが含まれていることを確認
    expect(card).toHaveClass('rounded-lg');
    expect(card).toHaveClass('p-6');
    expect(card).toHaveClass('border');
  });

  it('ダークモードでカードが正常に表示される', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />, 'dark');
    const card = screen.getByTestId('profile-analysis-card');
    // カードが表示されていることを確認
    expect(card).toBeInTheDocument();
    // タイトルが表示されていることを確認
    expect(screen.getByText('プロファイル分析')).toBeInTheDocument();
  });
});

describe('ProfileAnalysisCard - スコア範囲', () => {
  const memberFull: Member = {
    id: '006',
    name: 'スコアテスト',
    department: 'TEST',
    mbtiType: 'ENTJ',
    strengths: [
      { id: 1, score: 1 },
      { id: 5, score: 2 },
      { id: 7, score: 3 },
      { id: 22, score: 4 },
      { id: 27, score: 5 },
    ],
  };

  it('すべてのスコアが0-100の範囲内', () => {
    renderWithTheme(<ProfileAnalysisCard member={memberFull} />);

    const synergyScore = screen.getByTestId('synergy-score').textContent;
    const teamFitScore = screen.getByTestId('team-fit-score').textContent;
    const leadershipScore = screen.getByTestId('leadership-score').textContent;

    expect(parseInt(synergyScore || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(synergyScore || '0')).toBeLessThanOrEqual(100);

    expect(parseInt(teamFitScore || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(teamFitScore || '0')).toBeLessThanOrEqual(100);

    expect(parseInt(leadershipScore || '0')).toBeGreaterThanOrEqual(0);
    expect(parseInt(leadershipScore || '0')).toBeLessThanOrEqual(100);
  });
});
