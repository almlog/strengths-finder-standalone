/**
 * マネージャーモード判定フック
 *
 * @module hooks/useManagerMode
 * @description URLパラメータから?mode=managerを検出してマネージャーモードを判定
 */

import { useMemo } from 'react';

/**
 * マネージャーモードの判定
 *
 * @returns {boolean} マネージャーモードが有効な場合true
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const isManagerMode = useManagerMode();
 *
 *   if (isManagerMode) {
 *     return <ManagerView />;
 *   }
 *   return <UserView />;
 * }
 * ```
 */
export function useManagerMode(): boolean {
  const isManagerMode = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('mode') === 'manager';
  }, []);

  return isManagerMode;
}
