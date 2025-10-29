/**
 * useMemberRates カスタムフック
 *
 * @module hooks/useMemberRates
 * @description メンバー単価情報を管理するReactフック
 *              MemberRateServiceのラッパーとして、React コンポーネントで単価情報を簡単に扱えるようにする
 */

import { useState, useCallback } from 'react';
import { MemberRateService } from '../services/MemberRateService';
import { MemberRate, MemberRateRecord } from '../types/financial';

/**
 * インポート戦略
 */
export type ImportStrategy = 'replace' | 'add' | 'merge';

/**
 * useMemberRates フックの戻り値
 */
export interface UseMemberRatesResult {
  /** メンバー単価情報の配列 */
  memberRates: MemberRateRecord[];

  /** 特定メンバーの単価を取得 */
  getMemberRate: (memberId: string) => MemberRate | undefined;

  /** 特定メンバーの単価を設定 */
  setMemberRate: (memberId: string, memberRate: MemberRate) => void;

  /** 特定メンバーの単価を削除 */
  deleteMemberRate: (memberId: string) => void;

  /** 単価情報を再読み込み */
  refreshRates: () => void;

  /** 単価情報をインポート */
  importRates: (json: string, strategy: ImportStrategy) => void;

  /** 単価情報をエクスポート */
  exportRates: () => string;
}

/**
 * メンバー単価情報を管理するカスタムフック
 *
 * @returns {UseMemberRatesResult} 単価情報と操作関数
 *
 * @example
 * ```typescript
 * function MyComponent() {
 *   const {
 *     memberRates,
 *     getMemberRate,
 *     setMemberRate,
 *     deleteMemberRate,
 *     refreshRates
 *   } = useMemberRates();
 *
 *   // 特定メンバーの単価を取得
 *   const rate = getMemberRate('member-1');
 *
 *   // 単価を設定
 *   const handleSetRate = () => {
 *     setMemberRate('member-1', { rateType: 'monthly', rate: 800000 });
 *   };
 *
 *   // 単価を削除
 *   const handleDeleteRate = () => {
 *     deleteMemberRate('member-1');
 *   };
 *
 *   return (
 *     <div>
 *       {memberRates.map(record => (
 *         <div key={record.memberId}>
 *           {record.memberId}: {record.memberRate.rate}
 *         </div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useMemberRates(): UseMemberRatesResult {
  // 単価情報の状態管理
  const [memberRates, setMemberRates] = useState<MemberRateRecord[]>(() => {
    return MemberRateService.getMemberRates();
  });

  /**
   * 特定メンバーの単価を取得
   */
  const getMemberRate = useCallback(
    (memberId: string): MemberRate | undefined => {
      const record = memberRates.find(r => r.memberId === memberId);
      return record?.memberRate;
    },
    [memberRates]
  );

  /**
   * 特定メンバーの単価を設定
   */
  const setMemberRate = useCallback((memberId: string, memberRate: MemberRate) => {
    MemberRateService.setMemberRate(memberId, memberRate);
    // LocalStorageから最新の状態を読み込んで反映
    setMemberRates(MemberRateService.getMemberRates());
  }, []);

  /**
   * 特定メンバーの単価を削除
   */
  const deleteMemberRate = useCallback((memberId: string) => {
    MemberRateService.deleteMemberRate(memberId);
    // LocalStorageから最新の状態を読み込んで反映
    setMemberRates(MemberRateService.getMemberRates());
  }, []);

  /**
   * 単価情報を再読み込み
   */
  const refreshRates = useCallback(() => {
    setMemberRates(MemberRateService.getMemberRates());
  }, []);

  /**
   * 単価情報をインポート
   */
  const importRates = useCallback((json: string, strategy: ImportStrategy) => {
    switch (strategy) {
      case 'replace':
        MemberRateService.importFromJsonReplace(json);
        break;
      case 'add':
        MemberRateService.importFromJsonAddOnly(json);
        break;
      case 'merge':
        MemberRateService.importFromJsonMerge(json);
        break;
    }
    // インポート後に最新の状態を反映
    setMemberRates(MemberRateService.getMemberRates());
  }, []);

  /**
   * 単価情報をエクスポート
   */
  const exportRates = useCallback((): string => {
    return MemberRateService.exportToJson();
  }, []);

  return {
    memberRates,
    getMemberRate,
    setMemberRate,
    deleteMemberRate,
    refreshRates,
    importRates,
    exportRates,
  };
}
