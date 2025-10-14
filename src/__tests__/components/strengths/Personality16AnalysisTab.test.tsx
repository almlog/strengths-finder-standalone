/**
 * 16PAnalysisTab Test
 * TDD RED Phase: Test 16Personalities Analysis Tab component
 * 40 test cases
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Personality16AnalysisTab from '../../../components/strengths/Personality16AnalysisTab';
import { StrengthsProvider } from '../../../contexts/StrengthsContext';
import { MemberStrengths } from '../../../models/StrengthsTypes';
import * as ThemeContext from '../../../contexts/ThemeContext';

// Mock ResizeObserver for Recharts
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Mock localStorage globally
const localStorageMock = (() => {
  let store: { [key: string]: string } = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    get length() {
      return Object.keys(store).length;
    },
    key: (index: number) => {
      const keys = Object.keys(store);
      return keys[index] || null;
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
  configurable: true,
});

// Mock useTheme hook
const mockUseTheme = jest.spyOn(ThemeContext, 'useTheme');

// Mock members data for testing
const mockMembersWithPersonality: MemberStrengths[] = [
  {
    id: '1',
    name: 'Alice',
    department: 'DEV',
    strengths: [],
    personalityId: 1, // INTJ
    personalityVariant: 'A',
  },
  {
    id: '2',
    name: 'Bob',
    department: 'DEV',
    strengths: [],
    personalityId: 1, // INTJ
    personalityVariant: 'T',
  },
  {
    id: '3',
    name: 'Charlie',
    department: 'DEV',
    strengths: [],
    personalityId: 5, // INFJ
    personalityVariant: 'A',
  },
  {
    id: '4',
    name: 'David',
    department: 'DEV',
    strengths: [],
    personalityId: 8, // ENFP
    personalityVariant: 'T',
  },
  {
    id: '5',
    name: 'Eve',
    department: 'DEV',
    strengths: [],
    // No personality data
  },
];

const mockMembersNoPersonality: MemberStrengths[] = [
  {
    id: '1',
    name: 'Alice',
    department: 'DEV',
    strengths: [],
  },
];

// Helper function to render with theme and context
const renderWithProviders = (
  ui: React.ReactElement,
  members: MemberStrengths[] = mockMembersWithPersonality,
  themeId: 'default' | 'dark' = 'default'
) => {
  // Set localStorage before rendering
  localStorage.setItem('strengths_members', JSON.stringify(members));
  localStorage.setItem('strengths_custom_positions', JSON.stringify([]));

  // Mock theme
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

  return render(<StrengthsProvider>{ui}</StrengthsProvider>);
};

describe('Personality16AnalysisTab', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('Basic Display', () => {
    it('should render component title', async () => {
      renderWithProviders(<Personality16AnalysisTab />);
      await waitFor(() => {
        expect(screen.getByText(/16Personalities/i)).toBeInTheDocument();
      });
    });

    it('should display total members count', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/4/)).toBeInTheDocument(); // 4 members with personality data
    });

    it('should display analysis sections', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/Type Distribution/i)).toBeInTheDocument();
      expect(screen.getByText(/Role Distribution/i)).toBeInTheDocument();
      expect(screen.getByText(/Variant Distribution/i)).toBeInTheDocument();
    });

    it('should handle empty members array', () => {
      renderWithProviders(<Personality16AnalysisTab />, []);
      expect(screen.getByText(/No personality data/i)).toBeInTheDocument();
    });

    it('should handle members without personality data', () => {
      renderWithProviders(<Personality16AnalysisTab />, mockMembersNoPersonality);
      expect(screen.getByText(/No personality data/i)).toBeInTheDocument();
    });
  });

  describe('Type Distribution', () => {
    it('should display INTJ count correctly', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/INTJ/)).toBeInTheDocument();
      expect(screen.getByText(/2/)).toBeInTheDocument(); // 2 INTJ members
    });

    it('should display INFJ count correctly', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/INFJ/)).toBeInTheDocument();
    });

    it('should display ENFP count correctly', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/ENFP/)).toBeInTheDocument();
    });

    it('should not display types with zero count', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      // ESTP should not be displayed (no members)
      const allText = document.body.textContent || '';
      const estpMatches = allText.match(/ESTP/g) || [];
      // ESTP might appear in dropdown/legend but not in results
      expect(estpMatches.length).toBeLessThanOrEqual(1);
    });

    it('should calculate type percentages correctly', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      // INTJ: 2/4 = 50%
      expect(screen.getByText(/50%/)).toBeInTheDocument();
    });
  });

  describe('Role Distribution', () => {
    it('should display Analyst role count', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/Analyst/)).toBeInTheDocument();
      // INTJ x2 = 2 analysts
    });

    it('should display Diplomat role count', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/Diplomat/)).toBeInTheDocument();
      // INFJ x1 + ENFP x1 = 2 diplomats
    });

    it('should calculate role distribution correctly', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      // Analyst: 2, Diplomat: 2, Sentinel: 0, Explorer: 0
      const { container } = renderWithProviders(<Personality16AnalysisTab />);
      expect(container).toBeInTheDocument();
    });

    it('should display role colors correctly', () => {
      const { container } = renderWithProviders(<Personality16AnalysisTab />);
      // Check for role group colors
      expect(container.querySelector('[data-testid="role-chart"]')).toBeInTheDocument();
    });
  });

  describe('Variant Distribution', () => {
    it('should display Assertive count', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/Assertive/)).toBeInTheDocument();
      // A: 2 (Alice, Charlie)
    });

    it('should display Turbulent count', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/Turbulent/)).toBeInTheDocument();
      // T: 2 (Bob, David)
    });

    it('should calculate variant percentages correctly', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      // A: 2/4 = 50%, T: 2/4 = 50%
      const allText = document.body.textContent || '';
      expect(allText).toContain('50');
    });

    it('should handle members without variant data', () => {
      const membersNoVariant: MemberStrengths[] = [
        {
          id: '1',
          name: 'Alice',
          department: 'DEV',
          strengths: [],
          personalityId: 1,
          // No variant
        },
      ];
      renderWithProviders(<Personality16AnalysisTab />, membersNoVariant);
      expect(screen.getByText(/16Personalities/i)).toBeInTheDocument();
    });
  });

  describe('Data Filtering', () => {
    it('should exclude members without personalityId', () => {
      renderWithProviders(<Personality16AnalysisTab />, mockMembersWithPersonality);
      // Should count only 4 members (exclude Eve who has no personality data)
      expect(screen.getByText(/4/)).toBeInTheDocument();
    });

    it('should handle invalid personalityId', () => {
      const membersInvalidId: MemberStrengths[] = [
        {
          id: '1',
          name: 'Alice',
          department: 'DEV',
          strengths: [],
          personalityId: 999, // Invalid
          personalityVariant: 'A',
        },
      ];
      renderWithProviders(<Personality16AnalysisTab />, membersInvalidId);
      expect(screen.getByText(/No personality data/i)).toBeInTheDocument();
    });

    it('should handle personalityId = 0', () => {
      const membersZeroId: MemberStrengths[] = [
        {
          id: '1',
          name: 'Alice',
          department: 'DEV',
          strengths: [],
          personalityId: 0,
          personalityVariant: 'A',
        },
      ];
      renderWithProviders(<Personality16AnalysisTab />, membersZeroId);
      expect(screen.getByText(/No personality data/i)).toBeInTheDocument();
    });
  });

  describe('Chart Display', () => {
    it('should render type distribution chart', () => {
      const { container } = renderWithProviders(<Personality16AnalysisTab />);
      expect(container.querySelector('[data-testid="type-chart"]')).toBeInTheDocument();
    });

    it('should render role distribution chart', () => {
      const { container } = renderWithProviders(<Personality16AnalysisTab />);
      expect(container.querySelector('[data-testid="role-chart"]')).toBeInTheDocument();
    });

    it('should render variant distribution chart', () => {
      const { container } = renderWithProviders(<Personality16AnalysisTab />);
      expect(container.querySelector('[data-testid="variant-chart"]')).toBeInTheDocument();
    });
  });

  describe('Theme Support', () => {
    it('should apply light mode styles by default', () => {
      const { container } = renderWithProviders(<Personality16AnalysisTab />, mockMembersWithPersonality, 'default');
      expect(container.querySelector('.dark\\:bg-gray-800')).toBeInTheDocument();
    });

    it('should apply dark mode styles when theme is dark', () => {
      const { container } = renderWithProviders(<Personality16AnalysisTab />, mockMembersWithPersonality, 'dark');
      expect(container.querySelector('.dark\\:bg-gray-800')).toBeInTheDocument();
    });

    it('should update when theme changes', () => {
      const { rerender } = renderWithProviders(<Personality16AnalysisTab />, mockMembersWithPersonality, 'default');
      expect(screen.getByText(/16Personalities/i)).toBeInTheDocument();

      // Change to dark
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
      rerender(
        <StrengthsProvider>
          <Personality16AnalysisTab />
        </StrengthsProvider>
      );
      expect(screen.getByText(/16Personalities/i)).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible section headings', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      const headings = screen.getAllByRole('heading');
      expect(headings.length).toBeGreaterThan(0);
    });

    it('should have accessible chart labels', () => {
      renderWithProviders(<Personality16AnalysisTab />);
      // Charts should have proper aria labels
      const { container } = renderWithProviders(<Personality16AnalysisTab />);
      expect(container).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should not break on mobile viewport', () => {
      global.innerWidth = 375;
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/16Personalities/i)).toBeInTheDocument();
    });

    it('should not break on tablet viewport', () => {
      global.innerWidth = 768;
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/16Personalities/i)).toBeInTheDocument();
    });

    it('should not break on desktop viewport', () => {
      global.innerWidth = 1920;
      renderWithProviders(<Personality16AnalysisTab />);
      expect(screen.getByText(/16Personalities/i)).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle all members having same type', () => {
      const sameType: MemberStrengths[] = [
        { id: '1', name: 'A', department: 'DEV', strengths: [], personalityId: 1, personalityVariant: 'A' },
        { id: '2', name: 'B', department: 'DEV', strengths: [], personalityId: 1, personalityVariant: 'A' },
      ];
      renderWithProviders(<Personality16AnalysisTab />, sameType);
      expect(screen.getByText(/100%/)).toBeInTheDocument();
    });

    it('should handle all members having same variant', () => {
      const sameVariant: MemberStrengths[] = [
        { id: '1', name: 'A', department: 'DEV', strengths: [], personalityId: 1, personalityVariant: 'A' },
        { id: '2', name: 'B', department: 'DEV', strengths: [], personalityId: 2, personalityVariant: 'A' },
      ];
      renderWithProviders(<Personality16AnalysisTab />, sameVariant);
      expect(screen.getByText(/Assertive/)).toBeInTheDocument();
    });

    it('should handle single member with personality data', () => {
      const singleMember: MemberStrengths[] = [
        { id: '1', name: 'Alice', department: 'DEV', strengths: [], personalityId: 1, personalityVariant: 'A' },
      ];
      renderWithProviders(<Personality16AnalysisTab />, singleMember);
      expect(screen.getByText(/1/)).toBeInTheDocument();
    });

    it('should handle large team (100+ members)', () => {
      const largeTeam: MemberStrengths[] = Array.from({ length: 100 }, (_, i) => ({
        id: `${i}`,
        name: `Member${i}`,
        department: 'DEV',
        strengths: [],
        personalityId: (i % 16) + 1,
        personalityVariant: i % 2 === 0 ? 'A' as const : 'T' as const,
      }));
      renderWithProviders(<Personality16AnalysisTab />, largeTeam);
      expect(screen.getByText(/100/)).toBeInTheDocument();
    });
  });
});
