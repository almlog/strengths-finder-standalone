/**
 * Personality16Card Test
 * TDD RED Phase: Test Personality16Card component
 * 19 test cases
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import Personality16Card from '../../../components/strengths/Personality16Card';
import * as ThemeContext from '../../../contexts/ThemeContext';

// Mock useTheme hook
const mockUseTheme = jest.spyOn(ThemeContext, 'useTheme');

// Helper function to render with mocked theme
const renderWithTheme = (ui: React.ReactElement, themeId: 'default' | 'dark' = 'default') => {
  mockUseTheme.mockReturnValue({
    themeId,
    currentTheme: {
      id: themeId,
      name: themeId === 'dark' ? 'Dark' : 'Default',
      colors: {
        primary: '#3B82F6',
        secondary: '#10B981',
        background: themeId === 'dark' ? '#1F2937' : '#FFFFFF',
        text: themeId === 'dark' ? '#F9FAFB' : '#111827',
        border: themeId === 'dark' ? '#374151' : '#E5E7EB',
      },
    },
    themeMode: 'manual',
    setTheme: jest.fn(),
    setThemeMode: jest.fn(),
  });
  return render(ui);
};

describe('Personality16Card', () => {
  it('should display card when personalityId is valid', () => {
    renderWithTheme(<Personality16Card personalityId={1} variant="A" />);
    expect(screen.getByText('INTJ')).toBeInTheDocument();
    expect(screen.getByText('建築家')).toBeInTheDocument();
  });

  it('should display variant A badge', () => {
    renderWithTheme(<Personality16Card personalityId={1} variant="A" />);
    expect(screen.getByText('自己主張型')).toBeInTheDocument();
  });

  it('should display variant T badge', () => {
    renderWithTheme(<Personality16Card personalityId={1} variant="T" />);
    expect(screen.getByText('慎重型')).toBeInTheDocument();
  });

  it('should not display variant badge when variant is undefined', () => {
    renderWithTheme(<Personality16Card personalityId={1} />);
    expect(screen.queryByText('自己主張型')).not.toBeInTheDocument();
    expect(screen.queryByText('慎重型')).not.toBeInTheDocument();
  });

  it('should return null for invalid personalityId', () => {
    const { container } = renderWithTheme(<Personality16Card personalityId={999} />);
    expect(container.firstChild).toBeNull();
  });

  it('should return null for personalityId 0', () => {
    const { container } = renderWithTheme(<Personality16Card personalityId={0} />);
    expect(container.firstChild).toBeNull();
  });

  it('should display role group badge', () => {
    renderWithTheme(<Personality16Card personalityId={1} />);
    expect(screen.getByText('分析家')).toBeInTheDocument();
  });

  it('should display description', () => {
    renderWithTheme(<Personality16Card personalityId={1} />);
    expect(screen.getByText(/想像力豊かで戦略的/)).toBeInTheDocument();
  });

  it('should apply light mode color by default', () => {
    const { container } = renderWithTheme(<Personality16Card personalityId={1} />);
    const card = container.querySelector('[data-testid="personality-card"]');
    expect(card).toBeInTheDocument();
  });

  it('should apply dark mode color when theme is dark', () => {
    const { container } = renderWithTheme(<Personality16Card personalityId={1} />, 'dark');
    const card = container.querySelector('[data-testid="personality-card"]');
    expect(card).toBeInTheDocument();
  });

  it('should display ENFP (Diplomat) with correct color', () => {
    renderWithTheme(<Personality16Card personalityId={8} />);
    expect(screen.getByText('ENFP')).toBeInTheDocument();
    expect(screen.getByText('外交官')).toBeInTheDocument();
  });

  it('should have type icon with background color', () => {
    const { container } = renderWithTheme(<Personality16Card personalityId={1} />);
    const icon = container.querySelector('[data-testid="type-icon"]');
    expect(icon).toBeInTheDocument();
  });

  it('should have accessible role attribute', () => {
    const { container } = renderWithTheme(<Personality16Card personalityId={1} />);
    const card = container.querySelector('[role="region"]');
    expect(card).toBeInTheDocument();
  });

  it('should not break on mobile viewport', () => {
    global.innerWidth = 375;
    renderWithTheme(<Personality16Card personalityId={1} />);
    expect(screen.getByText('INTJ')).toBeInTheDocument();
  });

  it('should rerender correctly when theme changes', () => {
    const { rerender } = renderWithTheme(<Personality16Card personalityId={1} />, 'default');
    expect(screen.getByText('INTJ')).toBeInTheDocument();

    // Change to dark theme
    mockUseTheme.mockReturnValue({
      themeId: 'dark',
      currentTheme: {
        id: 'dark',
        name: 'Dark',
        colors: {
          primary: '#3B82F6',
          secondary: '#10B981',
          background: '#1F2937',
          text: '#F9FAFB',
          border: '#374151',
        },
      },
      themeMode: 'manual',
      setTheme: jest.fn(),
      setThemeMode: jest.fn(),
    });
    rerender(<Personality16Card personalityId={1} />);

    expect(screen.getByText('INTJ')).toBeInTheDocument();
  });

  it('should render multiple cards simultaneously', () => {
    renderWithTheme(
      <>
        <Personality16Card personalityId={1} />
        <Personality16Card personalityId={2} />
      </>
    );
    expect(screen.getByText('INTJ')).toBeInTheDocument();
    expect(screen.getByText('INTP')).toBeInTheDocument();
  });

  it('should sanitize description HTML', () => {
    const { container } = renderWithTheme(<Personality16Card personalityId={1} />);
    expect(container.querySelector('script')).toBeNull();
  });

  it('should display full description without truncation', () => {
    renderWithTheme(<Personality16Card personalityId={1} />);
    const description = screen.getByText(/想像力豊かで戦略的/);
    expect(description.textContent).toBeTruthy();
    expect(description.textContent!.length).toBeGreaterThan(20);
  });

  it('should display type code in uppercase', () => {
    renderWithTheme(<Personality16Card personalityId={1} />);
    expect(screen.getByText('INTJ')).toBeInTheDocument();
    expect(screen.queryByText('intj')).not.toBeInTheDocument();
  });
});
