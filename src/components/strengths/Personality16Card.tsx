/**
 * Personality16Card Component
 *
 * @module components/strengths/Personality16Card
 * @description Displays a card with 16Personalities type information including
 * personality code, name, role group, description, and variant badge.
 * Supports light/dark mode theming.
 *
 * @example
 * ```tsx
 * // Display INTJ-A personality card
 * <Personality16Card personalityId={1} variant="A" />
 *
 * // Display ENFP personality without variant
 * <Personality16Card personalityId={8} />
 * ```
 */

import React from 'react';
import { getPersonalityById } from '../../services/Personality16Service';
import { useTheme } from '../../contexts/ThemeContext';

/**
 * Props for Personality16Card component
 */
interface Personality16CardProps {
  /** Personality type ID (1-16) */
  personalityId: number;
  /** Variant type: A (Assertive) or T (Turbulent) */
  variant?: 'A' | 'T';
}

/**
 * Personality16Card functional component
 *
 * @param {Personality16CardProps} props - Component props
 * @returns {JSX.Element | null} Card element or null if invalid personality ID
 */
const Personality16Card: React.FC<Personality16CardProps> = ({ personalityId, variant }) => {
  // Get current theme for color selection
  const { themeId } = useTheme();
  const isDark = themeId === 'dark';

  // Fetch personality data from service
  const personality = getPersonalityById(personalityId);

  // Return null for invalid personality ID (defensive programming)
  if (!personality) {
    return null;
  }

  // Select appropriate color based on theme
  const color = isDark ? personality.colorDark : personality.colorLight;

  // Determine variant badge text (Japanese)
  const variantText = variant === 'A' ? '自己主張型' : variant === 'T' ? '慎重型' : null;

  return (
    <div
      role="region"
      data-testid="personality-card"
      className="rounded-lg p-6"
    >
      {/* Header with type code and icon */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div
            data-testid="type-icon"
            className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: color }}
          >
            {personality.code.charAt(0)}
          </div>
          <div>
            <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {personality.code}
            </h3>
            <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
              {personality.name}
            </p>
          </div>
        </div>

        {/* Variant badge */}
        {variantText && (
          <span
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              variant === 'A'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
            }`}
          >
            {variantText}
          </span>
        )}
      </div>

      {/* Role group badge */}
      <div className="mb-4">
        <span
          className="inline-block px-3 py-1 rounded-full text-sm font-medium text-white"
          style={{ backgroundColor: color }}
        >
          {personality.roleName}
        </span>
      </div>

      {/* Description */}
      <p className={`${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
        {personality.description}
      </p>
    </div>
  );
};

export default Personality16Card;
