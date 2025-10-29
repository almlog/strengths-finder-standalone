/**
 * useManagerMode フックのユニットテスト
 */

import { renderHook } from '@testing-library/react';
import { useManagerMode } from '../useManagerMode';

describe('useManagerMode', () => {
  // 元のURLを保存して各テスト後に復元
  const originalLocation = window.location;

  beforeEach(() => {
    // window.locationをモック可能にする
    delete (window as any).location;
    window.location = { ...originalLocation };
  });

  afterEach(() => {
    // 元のlocationを復元
    window.location = originalLocation;
  });

  it('URLパラメータに?mode=managerが含まれる場合、trueを返す', () => {
    // URLを設定
    Object.defineProperty(window, 'location', {
      value: { search: '?mode=manager' },
      writable: true,
    });

    const { result } = renderHook(() => useManagerMode());

    expect(result.current).toBe(true);
  });

  it('URLパラメータに?mode=managerが含まれない場合、falseを返す', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });

    const { result } = renderHook(() => useManagerMode());

    expect(result.current).toBe(false);
  });

  it('他のパラメータがある場合でも正しく判定する', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?foo=bar&mode=manager&baz=qux' },
      writable: true,
    });

    const { result } = renderHook(() => useManagerMode());

    expect(result.current).toBe(true);
  });

  it('mode=manager以外のmodeパラメータの場合、falseを返す', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?mode=user' },
      writable: true,
    });

    const { result } = renderHook(() => useManagerMode());

    expect(result.current).toBe(false);
  });

  it('パラメータの大文字小文字を正確に判定する', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '?mode=Manager' },
      writable: true,
    });

    const { result } = renderHook(() => useManagerMode());

    // 小文字の"manager"のみを許可
    expect(result.current).toBe(false);
  });

  it('パラメータがない空のURLの場合、falseを返す', () => {
    Object.defineProperty(window, 'location', {
      value: { search: '' },
      writable: true,
    });

    const { result } = renderHook(() => useManagerMode());

    expect(result.current).toBe(false);
  });
});
