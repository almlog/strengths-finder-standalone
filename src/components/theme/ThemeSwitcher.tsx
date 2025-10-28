/**
 * テーマスイッチャー
 *
 * @module ThemeSwitcher
 * @description テーマを切り替えるUIコンポーネント
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ThemeId } from '../../models/ThemeTypes';

/**
 * テーマオプション定義
 */
const THEME_OPTIONS: Array<{ id: ThemeId; name: string }> = [
  { id: 'default', name: 'デフォルト' },
  { id: 'dark', name: 'ダーク' },
  { id: 'cyberpunk', name: 'サイバー' },
  { id: 'cute', name: 'かわいい' },
];

/**
 * テーマアイコンマップ
 */
const THEME_ICONS: Record<ThemeId, string> = {
  default: '☀️',
  dark: '🌙',
  cyberpunk: '🤖',
  cute: '🌸',
} as const;

/**
 * テーマスイッチャーコンポーネント
 *
 * ドロップダウンメニューでテーマを切り替える
 * アクセシビリティ、キーボード操作、モバイル対応済み
 *
 * @returns {JSX.Element} ThemeSwitcher
 *
 * @example
 * ```tsx
 * <ThemeSwitcher />
 * ```
 */
export const ThemeSwitcher: React.FC = () => {
  const { currentTheme, themeMode, setTheme, setThemeMode } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  /**
   * メニューを閉じる
   */
  const closeMenu = useCallback((): void => {
    setIsOpen(false);
    setFocusedIndex(-1);
  }, []);

  /**
   * メニューを開く/閉じる
   */
  const toggleMenu = useCallback((): void => {
    setIsOpen((prev) => !prev);
    setFocusedIndex(-1);
  }, []);

  /**
   * 安全に関数を実行（エラーハンドリング共通化）
   */
  const safeExecute = useCallback((fn: () => void, errorMessage: string): void => {
    try {
      fn();
      closeMenu();
    } catch (error) {
      console.error(errorMessage, error);
    }
  }, [closeMenu]);

  /**
   * テーマを選択
   */
  const handleThemeSelect = useCallback((themeId: ThemeId): void => {
    safeExecute(() => setTheme(themeId), 'Failed to select theme:');
  }, [setTheme, safeExecute]);

  /**
   * Autoモードに切り替え
   */
  const handleAutoMode = useCallback((): void => {
    safeExecute(() => setThemeMode('auto'), 'Failed to set auto mode:');
  }, [setThemeMode, safeExecute]);

  /**
   * 外側クリックでメニューを閉じる
   */
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent): void => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        closeMenu();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, closeMenu]);

  /**
   * キーボード操作
   */
  const handleKeyDown = useCallback((event: React.KeyboardEvent): void => {
    if (!isOpen) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggleMenu();
      }
      return;
    }

    const maxIndex = THEME_OPTIONS.length; // +1 for auto mode

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        closeMenu();
        buttonRef.current?.focus();
        break;

      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((prev) => (prev < maxIndex ? prev + 1 : prev));
        break;

      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < THEME_OPTIONS.length) {
          handleThemeSelect(THEME_OPTIONS[focusedIndex].id);
        } else if (focusedIndex === maxIndex) {
          handleAutoMode();
        }
        break;

      default:
        break;
    }
  }, [isOpen, toggleMenu, closeMenu, focusedIndex, handleThemeSelect, handleAutoMode]);

  /**
   * テーマアイコン取得
   */
  const getThemeIcon = (): string => THEME_ICONS[currentTheme.id];

  return (
    <div ref={dropdownRef} className="relative inline-block">
      {/* トグルボタン */}
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        onKeyDown={handleKeyDown}
        aria-label={`テーマ切り替え: ${currentTheme.name}${
          themeMode === 'auto' ? ' (自動)' : ''
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
      >
        <span className="text-xl" aria-hidden="true">
          {getThemeIcon()}
        </span>
        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
          {currentTheme.name}
          {themeMode === 'auto' && (
            <span className="ml-1 text-xs text-gray-500 dark:text-gray-400">
              (自動)
            </span>
          )}
        </span>
        <svg
          className={`w-4 h-4 transition-transform ${
            isOpen ? 'transform rotate-180' : ''
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* ドロップダウンメニュー */}
      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-50"
        >
          <div className="py-1">
            {/* テーマオプション */}
            {THEME_OPTIONS.map((option, index) => (
              <button
                key={option.id}
                role="menuitemradio"
                aria-checked={currentTheme.id === option.id && themeMode === 'manual'}
                onClick={() => handleThemeSelect(option.id)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none ${
                  focusedIndex === index ? 'bg-gray-100 dark:bg-gray-700' : ''
                } ${
                  currentTheme.id === option.id && themeMode === 'manual'
                    ? 'text-blue-600 dark:text-blue-400 font-medium'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                <span className="flex items-center justify-between">
                  <span>{option.name}</span>
                  {currentTheme.id === option.id && themeMode === 'manual' && (
                    <svg
                      className="w-4 h-4"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                      aria-hidden="true"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </span>
              </button>
            ))}

            {/* 区切り線 */}
            <div className="border-t border-gray-200 dark:border-gray-700 my-1" />

            {/* Autoモードオプション */}
            <button
              role="menuitemradio"
              aria-checked={themeMode === 'auto'}
              onClick={handleAutoMode}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none ${
                focusedIndex === THEME_OPTIONS.length
                  ? 'bg-gray-100 dark:bg-gray-700'
                  : ''
              } ${
                themeMode === 'auto'
                  ? 'text-blue-600 dark:text-blue-400 font-medium'
                  : 'text-gray-700 dark:text-gray-200'
              }`}
            >
              <span className="flex items-center justify-between">
                <span>自動 (OS設定)</span>
                {themeMode === 'auto' && (
                  <svg
                    className="w-4 h-4"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
