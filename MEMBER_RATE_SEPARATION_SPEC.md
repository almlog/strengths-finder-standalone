# メンバー単価情報の分離管理 - 設計仕様書

**Version**: 1.0
**作成日**: 2025-10-29
**目的**: 機密情報である単価情報を一般ユーザーJSONから分離し、セキュリティを向上させる

---

## 1. 背景と問題点

### 1.1 現状の問題

**🚨 セキュリティリスク**

現在、メンバー情報のエクスポートJSONに`memberRate`（単価情報）が含まれています：

```json
{
  "members": [
    {
      "id": "member-001",
      "name": "山田太郎",
      "department": "開発部",
      "memberRate": {           // ← 機密情報が含まれる
        "rateType": "monthly",
        "rate": 800000          // ← 単価が見える
      },
      "strengths": [...]
    }
  ]
}
```

**影響範囲**:
- ✅ 一般ユーザーがJSONファイルをダウンロードできる
- ✅ JSONファイルを開くと全員の単価が見える
- ❌ 単価情報は経営機密であり、一般公開すべきではない

### 1.2 設計思想の誤り

**当初の想定**:
- 単価情報は別管理されている
- 一般ユーザーは名前・部署・資質のみ閲覧可能
- マネージャーのみが単価情報を管理

**実装の現状**:
- 単価情報がメンバー情報に含まれている
- JSONエクスポートで単価も一緒に出力される
- 機密情報の保護が不十分

---

## 2. 設計方針

### 2.1 基本原則

#### データ分離の3原則

1. **一般情報と機密情報の完全分離**
   - メンバー基本情報（名前、部署、資質） → 一般ユーザー閲覧可
   - 単価情報（売上単価） → マネージャーのみ

2. **LocalStorageキーの分離**
   - `strengths-members`: 一般情報のみ
   - `strengths-member-rates`: 単価情報のみ（マネージャー専用）

3. **JSONファイルの分離**
   - `members.json`: 一般情報のみ（全員で共有可能）
   - `member-rates.json`: 単価情報のみ（マネージャー管理）

### 2.2 セキュリティレベル

| 情報種別 | 機密度 | LocalStorage | JSONエクスポート | 閲覧権限 |
|---------|-------|--------------|----------------|---------|
| メンバー名 | 低 | `strengths-members` | members.json | 全員 |
| 部署 | 低 | `strengths-members` | members.json | 全員 |
| 資質(Top5) | 低 | `strengths-members` | members.json | 全員 |
| ポジション名 | 中 | `strengths-members` | members.json | 全員 |
| ステージID | 中 | `strengths-members` | members.json | 全員 |
| **単価情報** | **高** | **`strengths-member-rates`** | **member-rates.json** | **マネージャーのみ** |

---

## 3. データ構造の変更

### 3.1 型定義の変更

#### Before（現状）
```typescript
// src/models/StrengthsTypes.ts
export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string;
  positionId?: string;
  memberRate?: MemberRate;  // ← この行を削除
  stageId?: string;
  strengths: RankedStrength[];
  personalityId?: number;
  personalityVariant?: 'A' | 'T';
}
```

#### After（変更後）
```typescript
// src/models/StrengthsTypes.ts
export interface MemberStrengths {
  id: string;
  name: string;
  department: string;
  position?: Position | string;
  positionId?: string;
  // memberRate は削除（別管理に移行）
  stageId?: string;
  strengths: RankedStrength[];
  personalityId?: number;
  personalityVariant?: 'A' | 'T';
}
```

#### 新規追加: 単価情報管理用の型
```typescript
// src/types/financial.ts（既存ファイルに追加）

/**
 * メンバーIDと単価の対応関係
 * マネージャーモード専用データ
 */
export interface MemberRateRecord {
  memberId: string;        // メンバーID
  memberRate: MemberRate;  // 単価情報
  updatedAt?: string;      // 最終更新日時（ISO 8601形式）
}

/**
 * 単価情報のエクスポート形式
 */
export interface MemberRatesExport {
  _comment: string[];
  version: string;
  exportedAt: string;      // エクスポート日時
  rates: MemberRateRecord[];
}
```

### 3.2 LocalStorageキーの定義

```typescript
// src/constants/storage.ts（新規作成）

/**
 * LocalStorageキーの定義
 */
export const STORAGE_KEYS = {
  /** メンバー基本情報（一般ユーザー） */
  MEMBERS: 'strengths-members',

  /** カスタム役職（一般ユーザー） */
  CUSTOM_POSITIONS: 'strengths-custom-positions',

  /** 単価情報（マネージャー専用） */
  MEMBER_RATES: 'strengths-member-rates',

  /** ステージマスタ（マネージャー専用） */
  STAGE_MASTERS: 'strengths-stage-masters',
} as const;
```

---

## 4. サービス層の設計

### 4.1 MemberRateService（新規作成）

```typescript
// src/services/MemberRateService.ts（新規作成）

import { MemberRate, MemberRateRecord, MemberRatesExport } from '../types/financial';
import { STORAGE_KEYS } from '../constants/storage';

/**
 * メンバー単価情報管理サービス
 *
 * マネージャーモード専用機能
 * 単価情報をLocalStorageで別管理し、機密性を確保
 */
export class MemberRateService {
  /**
   * 全ての単価情報を取得
   */
  static getMemberRates(): MemberRateRecord[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MEMBER_RATES);
      if (!stored) return [];
      return JSON.parse(stored);
    } catch (error) {
      console.error('単価情報の読み込みに失敗:', error);
      return [];
    }
  }

  /**
   * 全ての単価情報を保存
   */
  static saveMemberRates(rates: MemberRateRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.MEMBER_RATES, JSON.stringify(rates));
    } catch (error) {
      console.error('単価情報の保存に失敗:', error);
      throw new Error('単価情報の保存に失敗しました');
    }
  }

  /**
   * 特定メンバーの単価情報を取得
   */
  static getMemberRate(memberId: string): MemberRate | undefined {
    const rates = this.getMemberRates();
    const record = rates.find(r => r.memberId === memberId);
    return record?.memberRate;
  }

  /**
   * 特定メンバーの単価情報を設定/更新
   */
  static setMemberRate(memberId: string, memberRate: MemberRate): void {
    const rates = this.getMemberRates();
    const existingIndex = rates.findIndex(r => r.memberId === memberId);

    const newRecord: MemberRateRecord = {
      memberId,
      memberRate,
      updatedAt: new Date().toISOString()
    };

    if (existingIndex >= 0) {
      // 既存レコードを更新
      rates[existingIndex] = newRecord;
    } else {
      // 新規追加
      rates.push(newRecord);
    }

    this.saveMemberRates(rates);
  }

  /**
   * 特定メンバーの単価情報を削除
   */
  static deleteMemberRate(memberId: string): void {
    const rates = this.getMemberRates();
    const filtered = rates.filter(r => r.memberId !== memberId);
    this.saveMemberRates(filtered);
  }

  /**
   * 単価情報をJSONとしてエクスポート
   */
  static exportToJson(): string {
    const rates = this.getMemberRates();

    const exportData: MemberRatesExport = {
      _comment: [
        "============================================",
        "Strengths Finder - メンバー単価情報",
        "============================================",
        "",
        "⚠️ 機密情報 - マネージャー専用",
        "",
        "このファイルには各メンバーの単価情報が含まれています。",
        "取り扱いには十分注意してください。",
        "",
        "【単価タイプ】",
        "- monthly: 月額単価（円/月）",
        "- hourly: 時給（円/時）+ 月間稼働時間",
        "",
        "【インポート方法】",
        "1. マネージャーモードでアクセス (?mode=manager)",
        "2. 「設定」→「単価情報のインポート」を選択",
        "3. このJSONファイルを選択",
        "",
        "============================================"
      ],
      version: "1.0",
      exportedAt: new Date().toISOString(),
      rates: rates
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * JSONから単価情報をインポート
   */
  static importFromJson(json: string): MemberRateRecord[] {
    try {
      const data = JSON.parse(json);

      // 新形式（MemberRatesExport）の場合
      if (data.rates && Array.isArray(data.rates)) {
        this.validateRatesArray(data.rates);
        return data.rates;
      }

      // 旧形式（MemberRateRecord[]）の場合（後方互換）
      if (Array.isArray(data)) {
        this.validateRatesArray(data);
        return data;
      }

      throw new Error('不正なJSON形式です');
    } catch (error) {
      if (error instanceof SyntaxError) {
        throw new Error('JSONのパースに失敗しました');
      }
      throw error;
    }
  }

  /**
   * 単価情報配列のバリデーション
   */
  private static validateRatesArray(rates: any[]): void {
    if (rates.length === 0) {
      throw new Error('単価情報が空です');
    }

    for (const record of rates) {
      if (!record.memberId || typeof record.memberId !== 'string') {
        throw new Error('memberIdが不正です');
      }

      if (!record.memberRate || typeof record.memberRate !== 'object') {
        throw new Error('memberRateが不正です');
      }

      const { rateType, rate } = record.memberRate;

      if (rateType !== 'monthly' && rateType !== 'hourly') {
        throw new Error(`不正なrateType: ${rateType}`);
      }

      if (typeof rate !== 'number' || rate < 0) {
        throw new Error(`不正なrate: ${rate}`);
      }

      if (rateType === 'hourly' && record.memberRate.hours !== undefined) {
        if (typeof record.memberRate.hours !== 'number' || record.memberRate.hours <= 0) {
          throw new Error(`不正なhours: ${record.memberRate.hours}`);
        }
      }
    }
  }

  /**
   * インポート時の重複情報を取得
   */
  static getImportConflictInfo(json: string): {
    existingCount: number;
    newCount: number;
    duplicateIds: string[];
  } {
    const newRates = this.importFromJson(json);
    const currentRates = this.getMemberRates();
    const currentIds = new Set(currentRates.map(r => r.memberId));

    const duplicateIds = newRates
      .filter(r => currentIds.has(r.memberId))
      .map(r => r.memberId);

    return {
      existingCount: currentRates.length,
      newCount: newRates.length,
      duplicateIds
    };
  }

  /**
   * 単価情報をインポート（完全置換）
   */
  static importFromJsonReplace(json: string): void {
    const rates = this.importFromJson(json);
    this.saveMemberRates(rates);
  }

  /**
   * 単価情報をインポート（新規のみ追加）
   */
  static importFromJsonAddOnly(json: string): void {
    const newRates = this.importFromJson(json);
    const currentRates = this.getMemberRates();
    const currentIds = new Set(currentRates.map(r => r.memberId));

    const ratesToAdd = newRates.filter(r => !currentIds.has(r.memberId));
    const mergedRates = [...currentRates, ...ratesToAdd];

    this.saveMemberRates(mergedRates);
  }

  /**
   * 単価情報をインポート（マージ・更新）
   */
  static importFromJsonMerge(json: string): void {
    const newRates = this.importFromJson(json);
    const currentRates = this.getMemberRates();

    const rateMap = new Map<string, MemberRateRecord>();

    // 既存データをマップに追加
    currentRates.forEach(rate => {
      rateMap.set(rate.memberId, rate);
    });

    // 新規データで上書き
    newRates.forEach(rate => {
      rateMap.set(rate.memberId, {
        ...rate,
        updatedAt: new Date().toISOString()
      });
    });

    const mergedRates = Array.from(rateMap.values());
    this.saveMemberRates(mergedRates);
  }

  /**
   * 単価情報を全削除
   */
  static clearAll(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.MEMBER_RATES);
    } catch (error) {
      console.error('単価情報の削除に失敗:', error);
      throw new Error('単価情報の削除に失敗しました');
    }
  }
}
```

### 4.2 StrengthsService の修正

#### exportMembers() の修正

**Before**:
```typescript
public exportMembers(): string {
  const members = this.getMembers();
  const customPositions = this.getCustomPositions();

  const exportData = {
    _comment: [...],
    customPositions: customPositions,
    members: members  // memberRateが含まれる
  };

  return JSON.stringify(exportData, null, 2);
}
```

**After**:
```typescript
public exportMembers(): string {
  const members = this.getMembers();
  const customPositions = this.getCustomPositions();

  // memberRateフィールドを除外
  const membersWithoutRates = members.map(member => {
    const { memberRate, ...memberWithoutRate } = member as any;
    return memberWithoutRate;
  });

  const exportData = {
    _comment: [
      "============================================",
      "Strengths Finder データファイル",
      "============================================",
      "",
      "このファイルにはメンバーの基本情報のみが含まれます。",
      "単価情報は含まれません（機密情報保護のため）。",
      "",
      "【含まれる情報】",
      "- メンバー名",
      "- 部署",
      "- 資質（Top 5）",
      "- ポジション",
      "- ステージID",
      "",
      "【含まれない情報】",
      "- 単価情報（マネージャー専用）",
      "",
      "============================================"
    ],
    customPositions: customPositions,
    members: membersWithoutRates  // 単価情報なし
  };

  return JSON.stringify(exportData, null, 2);
}
```

#### importMembers() の修正

**Before**:
```typescript
public importMembers(jsonData: string): { members: MemberStrengths[], customPositions?: CustomPosition[] } {
  const data = JSON.parse(jsonData);
  // memberRateも含めてインポート
  return { members, customPositions };
}
```

**After**:
```typescript
public importMembers(jsonData: string): { members: MemberStrengths[], customPositions?: CustomPosition[] } {
  const data = JSON.parse(jsonData);

  let members: MemberStrengths[];
  // ... パース処理 ...

  // memberRateフィールドを明示的に除外
  const membersWithoutRates = members.map(member => {
    const { memberRate, ...memberWithoutRate } = member as any;
    return memberWithoutRate as MemberStrengths;
  });

  return {
    members: membersWithoutRates,
    customPositions
  };
}
```

### 4.3 FinancialService の修正

#### calculateMonthlyRate() の修正

**Before**:
```typescript
static calculateMonthlyRate(member: MemberStrengths): number {
  if (!member.memberRate) return 0;

  if (member.memberRate.rateType === 'hourly') {
    const hours = member.memberRate.hours || 160;
    return member.memberRate.rate * hours;
  }

  return member.memberRate.rate;
}
```

**After**:
```typescript
static calculateMonthlyRate(
  member: MemberStrengths,
  memberRate?: MemberRate  // 外部から単価情報を受け取る
): number {
  if (!memberRate) return 0;

  if (memberRate.rateType === 'hourly') {
    const hours = memberRate.hours || 160;
    return memberRate.rate * hours;
  }

  return memberRate.rate;
}
```

#### calculateTeamFinancials() の修正

**Before**:
```typescript
static calculateTeamFinancials(members: MemberStrengths[]): TeamFinancials {
  members.forEach(member => {
    const monthlyRate = this.calculateMonthlyRate(member);
    // ...
  });
}
```

**After**:
```typescript
static calculateTeamFinancials(
  members: MemberStrengths[],
  memberRates: MemberRateRecord[]  // 単価情報を別で受け取る
): TeamFinancials {
  const rateMap = new Map(memberRates.map(r => [r.memberId, r.memberRate]));

  members.forEach(member => {
    const memberRate = rateMap.get(member.id);
    const monthlyRate = this.calculateMonthlyRate(member, memberRate);
    // ...
  });
}
```

### 4.4 ProfitabilityService の修正

同様に、`calculateMemberProfitability()` と `calculateTeamProfitability()` で単価情報を外部から受け取るように修正。

---

## 5. フロントエンド実装

### 5.1 useMemberRates フック（新規作成）

```typescript
// src/hooks/useMemberRates.ts（新規作成）

import { useState, useCallback, useEffect } from 'react';
import { MemberRate, MemberRateRecord } from '../types/financial';
import { MemberRateService } from '../services/MemberRateService';

export interface UseMemberRatesReturn {
  memberRates: MemberRateRecord[];
  getMemberRate: (memberId: string) => MemberRate | undefined;
  setMemberRate: (memberId: string, memberRate: MemberRate) => void;
  deleteMemberRate: (memberId: string) => void;
  exportToJson: () => string;
  importFromJsonReplace: (json: string) => void;
  importFromJsonAddOnly: (json: string) => void;
  importFromJsonMerge: (json: string) => void;
  getImportConflictInfo: (json: string) => {
    existingCount: number;
    newCount: number;
    duplicateIds: string[];
  };
  clearAll: () => void;
}

/**
 * メンバー単価情報管理フック
 * マネージャーモード専用
 */
export function useMemberRates(): UseMemberRatesReturn {
  const [memberRates, setMemberRates] = useState<MemberRateRecord[]>(() => {
    return MemberRateService.getMemberRates();
  });

  // LocalStorageから読み込み
  useEffect(() => {
    const rates = MemberRateService.getMemberRates();
    setMemberRates(rates);
  }, []);

  const getMemberRate = useCallback((memberId: string) => {
    return MemberRateService.getMemberRate(memberId);
  }, []);

  const setMemberRate = useCallback((memberId: string, memberRate: MemberRate) => {
    MemberRateService.setMemberRate(memberId, memberRate);
    setMemberRates(MemberRateService.getMemberRates());
  }, []);

  const deleteMemberRate = useCallback((memberId: string) => {
    MemberRateService.deleteMemberRate(memberId);
    setMemberRates(MemberRateService.getMemberRates());
  }, []);

  const exportToJson = useCallback(() => {
    return MemberRateService.exportToJson();
  }, []);

  const importFromJsonReplace = useCallback((json: string) => {
    MemberRateService.importFromJsonReplace(json);
    setMemberRates(MemberRateService.getMemberRates());
  }, []);

  const importFromJsonAddOnly = useCallback((json: string) => {
    MemberRateService.importFromJsonAddOnly(json);
    setMemberRates(MemberRateService.getMemberRates());
  }, []);

  const importFromJsonMerge = useCallback((json: string) => {
    MemberRateService.importFromJsonMerge(json);
    setMemberRates(MemberRateService.getMemberRates());
  }, []);

  const getImportConflictInfo = useCallback((json: string) => {
    return MemberRateService.getImportConflictInfo(json);
  }, []);

  const clearAll = useCallback(() => {
    MemberRateService.clearAll();
    setMemberRates([]);
  }, []);

  return {
    memberRates,
    getMemberRate,
    setMemberRate,
    deleteMemberRate,
    exportToJson,
    importFromJsonReplace,
    importFromJsonAddOnly,
    importFromJsonMerge,
    getImportConflictInfo,
    clearAll
  };
}
```

### 5.2 MemberForm の修正

```typescript
// src/components/strengths/MemberForm.tsx

import { useMemberRates } from '../../hooks/useMemberRates';

const MemberForm: React.FC<MemberFormProps> = ({ member, onSubmit }) => {
  const isManagerMode = useManagerMode();
  const { getMemberRate, setMemberRate } = useMemberRates();

  // 既存の単価情報を読み込み
  const existingRate = member ? getMemberRate(member.id) : undefined;

  const [rateType, setRateType] = useState<'monthly' | 'hourly' | undefined>(
    existingRate?.rateType
  );
  const [rate, setRate] = useState<number | undefined>(existingRate?.rate);
  const [hours, setHours] = useState<number | undefined>(existingRate?.hours);

  const handleSubmit = () => {
    // メンバー基本情報を保存（単価情報は除外）
    const memberData: MemberStrengths = {
      id,
      name,
      department,
      position,
      positionId,
      stageId,
      strengths,
      // memberRate は含めない
    };

    onSubmit(memberData);

    // 単価情報を別管理で保存
    if (isManagerMode && rateType && rate) {
      setMemberRate(id, {
        rateType,
        rate,
        hours: rateType === 'hourly' ? hours : undefined
      });
    }
  };

  // ... JSX は既存のまま
};
```

### 5.3 MembersList の修正

```typescript
// src/components/strengths/MembersList.tsx

import { useMemberRates } from '../../hooks/useMemberRates';

const MembersList: React.FC<MembersListProps> = ({ members }) => {
  const isManagerMode = useManagerMode();
  const { getMemberRate } = useMemberRates();
  const { stageMasters } = useStageMasters();

  return (
    <div>
      {members.map(member => {
        // 単価情報を取得
        const memberRate = isManagerMode ? getMemberRate(member.id) : undefined;

        // 利益率を計算
        const profitability = (isManagerMode && member.stageId && memberRate)
          ? ProfitabilityService.calculateMemberProfitability(
              member,
              memberRate,  // 外部から渡す
              stageMasters
            )
          : null;

        return (
          <div key={member.id}>
            <p>{member.name}</p>
            {profitability && (
              <p>利益率: {profitability.profitMargin.toFixed(1)}%</p>
            )}
          </div>
        );
      })}
    </div>
  );
};
```

### 5.4 ダッシュボードの修正

```typescript
// src/components/strengths/FinancialDashboard.tsx

import { useMemberRates } from '../../hooks/useMemberRates';

const FinancialDashboard: React.FC<FinancialDashboardProps> = ({ members }) => {
  const { memberRates } = useMemberRates();

  const financials = FinancialService.calculateTeamFinancials(
    members,
    memberRates  // 単価情報を渡す
  );

  // ... 表示処理
};
```

```typescript
// src/components/strengths/ProfitabilityDashboard.tsx

import { useMemberRates } from '../../hooks/useMemberRates';

const ProfitabilityDashboard: React.FC<ProfitabilityDashboardProps> = ({ members }) => {
  const { memberRates } = useMemberRates();
  const { stageMasters } = useStageMasters();

  const teamProfitability = ProfitabilityService.calculateTeamProfitability(
    members,
    memberRates,  // 単価情報を渡す
    stageMasters
  );

  // ... 表示処理
};
```

### 5.5 単価情報管理画面（新規作成）

```typescript
// src/components/strengths/MemberRateSettings.tsx（新規作成）

import React, { useState } from 'react';
import { useMemberRates } from '../../hooks/useMemberRates';
import MemberRateImportDialog from './MemberRateImportDialog';

/**
 * メンバー単価情報管理画面
 * マネージャーモード専用
 */
const MemberRateSettings: React.FC = () => {
  const {
    memberRates,
    exportToJson,
    getImportConflictInfo,
    importFromJsonReplace,
    importFromJsonAddOnly,
    importFromJsonMerge,
    clearAll
  } = useMemberRates();

  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importConflictInfo, setImportConflictInfo] = useState(null);
  const [pendingImportJson, setPendingImportJson] = useState<string | null>(null);

  // エクスポート処理
  const handleExport = () => {
    const json = exportToJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `member-rates-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  // インポート処理
  const handleImport = () => {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const json = e.target?.result as string;
            const conflictInfo = getImportConflictInfo(json);
            setImportConflictInfo(conflictInfo);
            setPendingImportJson(json);
            setShowImportDialog(true);
          } catch (error) {
            alert(`インポートエラー: ${error.message}`);
          }
        };
        reader.readAsText(file);
      }
    };
    fileInput.click();
  };

  // インポート戦略選択
  const handleImportStrategySelect = (strategy: string) => {
    if (strategy === 'cancel' || !pendingImportJson) {
      setShowImportDialog(false);
      setImportConflictInfo(null);
      setPendingImportJson(null);
      return;
    }

    try {
      switch (strategy) {
        case 'replace':
          importFromJsonReplace(pendingImportJson);
          break;
        case 'add':
          importFromJsonAddOnly(pendingImportJson);
          break;
        case 'merge':
          importFromJsonMerge(pendingImportJson);
          break;
      }

      alert('インポートが完了しました');
      setShowImportDialog(false);
      setImportConflictInfo(null);
      setPendingImportJson(null);
    } catch (error) {
      alert(`インポートエラー: ${error.message}`);
    }
  };

  return (
    <div className="p-6 bg-white rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-4">単価情報管理</h2>

      <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
        <p className="text-sm text-yellow-800">
          ⚠️ この画面はマネージャー専用です。<br />
          単価情報は機密情報として別ファイルで管理されます。
        </p>
      </div>

      <div className="flex gap-4 mb-6">
        <button
          onClick={handleExport}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          エクスポート
        </button>
        <button
          onClick={handleImport}
          className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
        >
          インポート
        </button>
        <button
          onClick={() => {
            if (window.confirm('全ての単価情報を削除しますか？')) {
              clearAll();
            }
          }}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          全削除
        </button>
      </div>

      <div>
        <h3 className="text-lg font-semibold mb-2">登録済み単価情報</h3>
        <p className="text-gray-600 mb-2">
          {memberRates.length}件の単価情報が登録されています
        </p>

        {memberRates.length > 0 && (
          <table className="w-full border">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2">メンバーID</th>
                <th className="border p-2">単価タイプ</th>
                <th className="border p-2">単価</th>
                <th className="border p-2">更新日時</th>
              </tr>
            </thead>
            <tbody>
              {memberRates.map(record => (
                <tr key={record.memberId}>
                  <td className="border p-2">{record.memberId}</td>
                  <td className="border p-2">
                    {record.memberRate.rateType === 'monthly' ? '月額' : '時給'}
                  </td>
                  <td className="border p-2">
                    {record.memberRate.rate.toLocaleString()}円
                    {record.memberRate.rateType === 'hourly' &&
                      ` × ${record.memberRate.hours || 160}h`}
                  </td>
                  <td className="border p-2">
                    {record.updatedAt
                      ? new Date(record.updatedAt).toLocaleString('ja-JP')
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showImportDialog && importConflictInfo && (
        <MemberRateImportDialog
          conflictInfo={importConflictInfo}
          onSelect={handleImportStrategySelect}
        />
      )}
    </div>
  );
};

export default MemberRateSettings;
```

---

## 6. マイグレーション計画

### 6.1 既存データの移行

既存のメンバーデータに`memberRate`が含まれている場合、自動的に分離する処理を実装：

```typescript
// src/services/MigrationService.ts（新規作成）

import { MemberStrengths } from '../models/StrengthsTypes';
import { MemberRateService } from './MemberRateService';
import { STORAGE_KEYS } from '../constants/storage';

/**
 * データ移行サービス
 */
export class MigrationService {
  /**
   * メンバーデータから単価情報を分離
   *
   * 既存のLocalStorageに保存されているメンバーデータから
   * memberRateフィールドを抽出し、別管理に移行する
   */
  static migrateMemberRatesToSeparateStorage(): void {
    try {
      // 既存のメンバーデータを取得
      const stored = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (!stored) return;

      const members = JSON.parse(stored) as any[];

      // memberRateを抽出
      const rates = members
        .filter(m => m.memberRate)
        .map(m => ({
          memberId: m.id,
          memberRate: m.memberRate,
          updatedAt: new Date().toISOString()
        }));

      // 単価情報を別管理に保存
      if (rates.length > 0) {
        MemberRateService.saveMemberRates(rates);
        console.log(`${rates.length}件の単価情報を移行しました`);
      }

      // メンバーデータからmemberRateを削除
      const membersWithoutRates = members.map(m => {
        const { memberRate, ...rest } = m;
        return rest;
      });

      localStorage.setItem(STORAGE_KEYS.MEMBERS, JSON.stringify(membersWithoutRates));
      console.log('メンバーデータから単価情報を削除しました');

    } catch (error) {
      console.error('マイグレーション失敗:', error);
    }
  }

  /**
   * マイグレーションが必要かチェック
   */
  static needsMigration(): boolean {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.MEMBERS);
      if (!stored) return false;

      const members = JSON.parse(stored) as any[];
      return members.some(m => m.memberRate !== undefined);
    } catch {
      return false;
    }
  }
}
```

### 6.2 マイグレーションの実行タイミング

```typescript
// src/App.tsx または src/contexts/StrengthsContext.tsx

import { MigrationService } from './services/MigrationService';

useEffect(() => {
  // アプリ起動時にマイグレーションチェック
  if (MigrationService.needsMigration()) {
    console.log('データ移行を実行します...');
    MigrationService.migrateMemberRatesToSeparateStorage();
  }
}, []);
```

---

## 7. テスト計画

### 7.1 ユニットテスト

```typescript
// src/services/__tests__/MemberRateService.test.ts（新規作成）

describe('MemberRateService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getMemberRates', () => {
    test('LocalStorageにデータがない場合は空配列を返す', () => {
      expect(MemberRateService.getMemberRates()).toEqual([]);
    });

    test('保存済みのデータを取得できる', () => {
      const rates = [
        { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: 800000 } }
      ];
      localStorage.setItem('strengths-member-rates', JSON.stringify(rates));

      expect(MemberRateService.getMemberRates()).toEqual(rates);
    });
  });

  describe('setMemberRate', () => {
    test('新規メンバーの単価を設定できる', () => {
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });

      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(1);
      expect(rates[0].memberId).toBe('member-1');
      expect(rates[0].memberRate.rate).toBe(800000);
    });

    test('既存メンバーの単価を更新できる', () => {
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });

      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 900000
      });

      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(1);
      expect(rates[0].memberRate.rate).toBe(900000);
    });
  });

  describe('exportToJson', () => {
    test('JSON形式でエクスポートできる', () => {
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });

      const json = MemberRateService.exportToJson();
      const data = JSON.parse(json);

      expect(data.version).toBe('1.0');
      expect(data.rates).toHaveLength(1);
      expect(data.rates[0].memberId).toBe('member-1');
    });
  });

  describe('importFromJson', () => {
    test('JSON形式でインポートできる', () => {
      const json = JSON.stringify({
        version: '1.0',
        exportedAt: new Date().toISOString(),
        rates: [
          { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: 800000 } }
        ]
      });

      const rates = MemberRateService.importFromJson(json);
      expect(rates).toHaveLength(1);
      expect(rates[0].memberId).toBe('member-1');
    });

    test('不正なJSONの場合はエラー', () => {
      expect(() => {
        MemberRateService.importFromJson('invalid json');
      }).toThrow('JSONのパースに失敗しました');
    });

    test('rateTypeが不正な場合はエラー', () => {
      const json = JSON.stringify({
        rates: [
          { memberId: 'member-1', memberRate: { rateType: 'invalid', rate: 800000 } }
        ]
      });

      expect(() => {
        MemberRateService.importFromJson(json);
      }).toThrow('不正なrateType');
    });
  });

  describe('importFromJsonMerge', () => {
    test('既存データと新規データをマージできる', () => {
      // 既存データ
      MemberRateService.setMemberRate('member-1', {
        rateType: 'monthly',
        rate: 800000
      });

      // 新規データ（member-1を更新、member-2を追加）
      const json = JSON.stringify({
        rates: [
          { memberId: 'member-1', memberRate: { rateType: 'monthly', rate: 900000 } },
          { memberId: 'member-2', memberRate: { rateType: 'hourly', rate: 5000, hours: 160 } }
        ]
      });

      MemberRateService.importFromJsonMerge(json);

      const rates = MemberRateService.getMemberRates();
      expect(rates).toHaveLength(2);

      const member1 = rates.find(r => r.memberId === 'member-1');
      expect(member1?.memberRate.rate).toBe(900000);

      const member2 = rates.find(r => r.memberId === 'member-2');
      expect(member2?.memberRate.rate).toBe(5000);
    });
  });
});
```

### 7.2 統合テスト

```typescript
// src/services/__tests__/MemberRateSeparation.integration.test.ts

describe('メンバー情報と単価情報の分離', () => {
  test('メンバーエクスポートに単価情報が含まれない', () => {
    // メンバー追加
    StrengthsService.addOrUpdateMember({
      id: 'member-1',
      name: '山田太郎',
      department: '開発部',
      strengths: [...]
    });

    // 単価情報を別管理で追加
    MemberRateService.setMemberRate('member-1', {
      rateType: 'monthly',
      rate: 800000
    });

    // メンバーエクスポート
    const memberJson = StrengthsService.exportMembers();
    const memberData = JSON.parse(memberJson);

    // 単価情報が含まれていないことを確認
    expect(memberData.members[0].memberRate).toBeUndefined();
  });

  test('メンバーインポート時に単価情報が除外される', () => {
    // 単価情報を含むJSONをインポート（旧形式）
    const json = JSON.stringify({
      members: [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },  // 含まれている
          strengths: [...]
        }
      ]
    });

    StrengthsService.importMembers(json);

    // メンバーデータに単価情報が含まれていないことを確認
    const members = StrengthsService.getMembers();
    expect((members[0] as any).memberRate).toBeUndefined();
  });

  test('単価情報は別サービスで管理される', () => {
    // メンバー追加
    StrengthsService.addOrUpdateMember({
      id: 'member-1',
      name: '山田太郎',
      department: '開発部',
      strengths: [...]
    });

    // 単価情報を追加
    MemberRateService.setMemberRate('member-1', {
      rateType: 'monthly',
      rate: 800000
    });

    // それぞれ独立して取得できる
    const members = StrengthsService.getMembers();
    const memberRate = MemberRateService.getMemberRate('member-1');

    expect(members[0].id).toBe('member-1');
    expect((members[0] as any).memberRate).toBeUndefined();
    expect(memberRate?.rate).toBe(800000);
  });
});
```

---

## 8. ロールアウト計画

### Phase 1: 準備（1-2日）
1. ✅ SPEC作成（本ドキュメント）
2. ✅ 設計レビュー
3. ⏳ タスク分解

### Phase 2: バックエンド実装（2-3日）
1. `STORAGE_KEYS` 定数定義
2. `MemberRateService` 実装
3. `MigrationService` 実装
4. `StrengthsService.exportMembers()` 修正
5. `StrengthsService.importMembers()` 修正
6. `FinancialService` 修正
7. `ProfitabilityService` 修正
8. ユニットテスト作成

### Phase 3: フロントエンド実装（2-3日）
1. `useMemberRates` フック実装
2. `MemberForm` 修正
3. `MembersList` 修正
4. `FinancialDashboard` 修正
5. `ProfitabilityDashboard` 修正
6. `MemberRateSettings` 画面実装
7. `MemberRateImportDialog` 実装

### Phase 4: マイグレーション（1日）
1. マイグレーション処理の実装
2. マイグレーションテスト
3. ロールバック手順の確認

### Phase 5: テスト（2-3日）
1. ユニットテスト実行
2. 統合テスト実行
3. 手動テスト（E2E）
4. セキュリティ確認

### Phase 6: デプロイ（1日）
1. フィーチャーブランチマージ
2. 本番環境デプロイ
3. マイグレーション実行確認
4. 動作確認

**総所要時間**: 9-13日

---

## 9. セキュリティ評価

### 9.1 改善されるセキュリティ

| 項目 | Before | After | 改善度 |
|------|--------|-------|-------|
| JSONエクスポート | 単価情報含む | 単価情報除外 | ⭐⭐⭐⭐⭐ |
| 一般ユーザー閲覧 | 単価が見える | 単価が見えない | ⭐⭐⭐⭐⭐ |
| LocalStorage分離 | 一緒に保存 | 別キーで保存 | ⭐⭐⭐⭐ |
| ファイル共有 | 注意が必要 | 安全に共有可能 | ⭐⭐⭐⭐⭐ |
| マネージャー管理 | 不明確 | 明確に分離 | ⭐⭐⭐⭐ |

### 9.2 残存するリスク

1. **LocalStorageアクセス**:
   - ブラウザのDevToolsで直接アクセス可能
   - 対策: マネージャーモードのパスワード認証（Phase 5予定）

2. **URLパラメータ認証**:
   - `?mode=manager` を知っていればアクセス可能
   - 対策: セッション認証の導入（Phase 5予定）

3. **クライアントサイド保存**:
   - すべてのデータがブラウザに保存される
   - 対策: 組織内限定使用、適切な端末管理

### 9.3 推奨セキュリティ対策

**Phase 5以降の改善計画**:
1. マネージャーモードのパスワード認証
2. 単価情報の暗号化保存
3. アクセスログの記録
4. セッションタイムアウト
5. 監査証跡の保存

---

## 10. まとめ

### 10.1 この設計のメリット

✅ **セキュリティ向上**
- 単価情報が一般ユーザーに見えなくなる
- JSONファイルを安全に共有できる
- 機密情報の漏洩リスクが大幅に低減

✅ **データ管理の明確化**
- 一般情報と機密情報が分離される
- それぞれ独立して管理できる
- バックアップ・リストアが容易

✅ **後方互換性の維持**
- マイグレーション処理で既存データを自動変換
- ユーザー操作なしで移行完了
- ロールバックも可能

✅ **拡張性**
- 将来的な認証機能追加が容易
- 暗号化への対応が可能
- 他の機密情報も同様に分離可能

### 10.2 注意点

⚠️ **マイグレーション時の注意**
- 既存データのバックアップ必須
- マイグレーション失敗時のロールバック手順を確認

⚠️ **テストの重要性**
- 全てのユニットテストをパス
- 統合テストで動作確認
- 手動テストでUXを確認

⚠️ **段階的なロールアウト**
- フィーチャーブランチで実装
- 十分なテスト後にマージ
- 問題発生時は即座にロールバック

---

## 11. 次のアクション

**直ちに実施**:
1. ✅ 本SPECのレビュー
2. ⏳ 設計の妥当性評価
3. ⏳ タスクブレークダウン
4. ⏳ 実装開始の判断

**承認後の実装順序**:
1. Phase 1: 準備・レビュー
2. Phase 2: バックエンド実装
3. Phase 3: フロントエンド実装
4. Phase 4: マイグレーション
5. Phase 5: テスト
6. Phase 6: デプロイ

---

**このSPECについてのフィードバックをお待ちしています。**
