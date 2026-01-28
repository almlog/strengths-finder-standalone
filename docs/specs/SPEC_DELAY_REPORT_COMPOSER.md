# SPEC: 遅延報告メッセージ作成機能

## 概要

遅延発生時に業務連絡用メッセージを作成し、LINEWORKSなどにコピー＆ペーストで共有する機能。

## 目的

- 遅延発生時の連絡作業を効率化する
- 現在地と遅延情報を自動入力し、入力の手間を削減する
- 統一されたフォーマットで分かりやすい報告を実現する

## メッセージテンプレート

```
おはようございます。
"○○線××"の影響で遅延が発生しています。
その影響で現場到着が○○分遅れる見込みです。
現在▼▼です。
```

### 入力項目

| 項目 | 入力方法 | 詳細 |
|------|----------|------|
| 路線名・遅延理由 | 自動入力 | 遅延情報から選択 |
| 遅延見込み時間 | ユーザー入力 | 必須（1〜180分） |
| 現在地（駅名） | 自動検出 + 手動選択 | GPS → 最寄り駅 or ドロップダウン |

## 機能要件

### FR-1: 遅延情報選択

#### FR-1.1: 遅延情報のドロップダウン表示
- 現在遅延中の路線をドロップダウンで表示
- 表示フォーマット: 「路線名 - 遅延理由（約XX分遅れ）」
- 遅延がない場合はドロップダウンを無効化

#### FR-1.2: 自動選択
- 遅延が1件のみの場合は自動で選択
- 複数の場合はユーザーに選択を促す

### FR-2: 遅延見込み時間入力

#### FR-2.1: 数値入力フィールド
- 入力範囲: 1〜180分
- 必須項目（未入力ではコピー不可）
- インクリメント/デクリメントボタン付き

#### FR-2.2: バリデーション
- 数値以外の入力を防止
- 範囲外の値はエラー表示

### FR-3: 現在地（駅名）入力

#### FR-3.1: GPS位置情報取得
- 「現在地から検出」ボタンでGeolocation APIを使用
- 取得した座標から最寄り駅を計算（Haversine公式）
- 最寄り3駅をドロップダウンで表示（距離付き）

#### FR-3.2: 手動選択
- GPS不許可時はドロップダウンで駅を選択可能
- 路線でフィルタリング可能
- 検索機能付き

#### FR-3.3: 位置情報状態表示
- idle: 初期状態
- requesting: 取得中（スピナー表示）
- success: 取得成功（最寄り駅表示）
- denied: 権限拒否（手動選択を促す）
- unavailable: 位置情報利用不可
- timeout: タイムアウト
- error: その他のエラー

### FR-4: メッセージプレビュー

#### FR-4.1: リアルタイムプレビュー
- 入力内容に応じてプレビューを即時更新
- 必須項目が未入力の場合はプレースホルダー表示

#### FR-4.2: コピー機能
- 「メッセージをコピー」ボタンでクリップボードにコピー
- コピー成功時にトースト通知
- 必須項目未入力時はボタン無効化

### FR-5: UI配置

#### FR-5.1: DelayHistoryModal内に配置
- 「現在の遅延サマリー」セクションの直後に配置
- 遅延発生時のみ表示
- 折りたたみ可能（デフォルト展開）

## 非機能要件

### NFR-1: パフォーマンス
- 駅データはLocalStorageにキャッシュ（24時間有効）
- 距離計算はWeb Workerで非同期実行（オプション）

### NFR-2: データソース
- ODPT API `odpt:Station` エンドポイントから駅座標取得
- 対象事業者: JR東日本、東京メトロ、都営地下鉄、主要私鉄（12社43路線）

### NFR-3: エラーハンドリング
- 位置情報取得失敗時は手動入力にフォールバック
- 駅データ取得失敗時はキャッシュを使用
- ネットワークエラー時は適切なメッセージを表示

### NFR-4: アクセシビリティ
- キーボード操作対応
- スクリーンリーダー対応（aria-label）
- 高コントラストモード対応

### NFR-5: レスポンシブ
- モバイル端末でも使いやすいUI
- タッチ操作に対応したボタンサイズ

## 技術設計

### ファイル構成

```
src/
├── types/
│   └── station.ts                        # 駅関連の型定義
├── services/
│   ├── StationDataService.ts             # 駅座標データ管理
│   ├── NearestStationService.ts          # 最寄り駅検出（Haversine公式）
│   └── __tests__/
│       ├── StationDataService.test.ts
│       └── NearestStationService.test.ts
├── hooks/
│   └── useGeolocation.ts                 # 位置情報取得フック
└── components/traffic/
    ├── DelayHistoryModal.tsx             # 統合先（既存）
    └── DelayReportComposer.tsx           # メッセージ作成UI
```

### 型定義

```typescript
// src/types/station.ts

/**
 * 座標情報
 */
export interface GeoCoordinate {
  latitude: number;
  longitude: number;
}

/**
 * 駅情報
 */
export interface StationInfo {
  /** 駅ID */
  id: string;
  /** 駅名 */
  name: string;
  /** 路線ID */
  railway: string;
  /** 路線名 */
  railwayName: string;
  /** 事業者ID */
  operator: string;
  /** 座標 */
  coordinate: GeoCoordinate;
}

/**
 * 最寄り駅検出結果
 */
export interface NearestStationResult {
  /** 駅情報 */
  station: StationInfo;
  /** 距離（メートル） */
  distance: number;
}

/**
 * 位置情報取得ステータス
 */
export type GeolocationStatus =
  | 'idle'        // 初期状態
  | 'requesting'  // 取得中
  | 'success'     // 取得成功
  | 'denied'      // 権限拒否
  | 'unavailable' // 位置情報利用不可
  | 'timeout'     // タイムアウト
  | 'error';      // その他のエラー

/**
 * 駅データキャッシュ
 */
export interface StationDataCache {
  /** 駅データ */
  stations: StationInfo[];
  /** キャッシュ作成時刻 */
  cachedAt: string;
}

/**
 * LocalStorage キー
 */
export const STATION_DATA_STORAGE_KEY = 'station-data-cache';

/**
 * キャッシュ有効期限（24時間）
 */
export const STATION_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
```

### サービス設計

#### StationDataService

```typescript
class StationDataService {
  /**
   * ODPT APIから駅データを取得
   */
  async fetchStations(): Promise<StationInfo[]>;

  /**
   * キャッシュから駅データを取得
   */
  loadFromCache(): StationInfo[] | null;

  /**
   * キャッシュに駅データを保存
   */
  saveToCache(stations: StationInfo[]): void;

  /**
   * キャッシュが有効かどうかを確認
   */
  isCacheValid(): boolean;

  /**
   * 路線IDで駅をフィルタ
   */
  filterByRailway(railwayId: string): StationInfo[];

  /**
   * 事業者でフィルタ
   */
  filterByOperator(operatorId: string): StationInfo[];
}
```

#### NearestStationService

```typescript
class NearestStationService {
  /**
   * Haversine公式で2点間の距離を計算（メートル）
   */
  static calculateDistance(
    coord1: GeoCoordinate,
    coord2: GeoCoordinate
  ): number;

  /**
   * 最寄り駅を検出
   */
  findNearest(
    coordinate: GeoCoordinate,
    stations: StationInfo[]
  ): NearestStationResult | null;

  /**
   * 最寄りN駅を取得
   */
  findNearestN(
    coordinate: GeoCoordinate,
    stations: StationInfo[],
    n: number
  ): NearestStationResult[];
}
```

### フック設計

#### useGeolocation

```typescript
interface UseGeolocationReturn {
  /** 現在の座標 */
  coordinate: GeoCoordinate | null;
  /** ステータス */
  status: GeolocationStatus;
  /** エラーメッセージ */
  error: string | null;
  /** 位置情報を取得 */
  requestLocation: () => void;
}

function useGeolocation(): UseGeolocationReturn;
```

### コンポーネント設計

#### DelayReportComposer

```typescript
interface DelayReportComposerProps {
  /** 現在の遅延情報リスト */
  currentDelays: TrainDelayInfo[];
  /** ODPTトークン */
  token: string;
}
```

## UI モックアップ

```
┌─────────────────────────────────────────┐
│ ⚠️ 遅延報告メッセージ作成               │
├─────────────────────────────────────────┤
│ 遅延情報                                │
│ [中央線快速 - 人身事故で約15分遅れ ▼]  │
│                                         │
│ 遅延見込み時間（分）*                   │
│ 🕐 [ 20 ] 分                            │
│                                         │
│ 現在地（駅）                            │
│ [📍 現在地から検出]                     │
│ [水道橋（中央・総武線）- 150m      ▼]  │
│                                         │
│ ── メッセージプレビュー ──             │
│ ┌─────────────────────────────────────┐│
│ │おはようございます。                 ││
│ │"中央線快速 人身事故で約15分遅れ"   ││
│ │の影響で遅延が発生しています。      ││
│ │その影響で現場到着が20分遅れる      ││
│ │見込みです。                        ││
│ │現在水道橋です。                    ││
│ └─────────────────────────────────────┘│
│                                         │
│ [      📋 メッセージをコピー      ]    │
│                                         │
│ ※LINEWORKSなどに貼り付けてください    │
└─────────────────────────────────────────┘
```

## テスト計画

### StationDataService（10件）

1. ✅ fetchStations: API取得成功時にStationInfo[]を返す
2. ✅ fetchStations: 座標を正しくパースする
3. ✅ fetchStations: 対象事業者のみをフィルタする
4. ✅ fetchStations: APIエラー時にキャッシュを返す
5. ✅ fetchStations: キャッシュもない場合は空配列を返す
6. ✅ loadFromCache: LocalStorageから読み込む
7. ✅ saveToCache: LocalStorageに保存する
8. ✅ isCacheValid: 24時間以内ならtrue
9. ✅ isCacheValid: 24時間超過ならfalse
10. ✅ filterByRailway: 路線IDでフィルタできる

### NearestStationService（7件）

1. ✅ calculateDistance: 東京-新宿間の距離が約6.5kmになる
2. ✅ calculateDistance: 同一座標の場合は0mを返す
3. ✅ findNearest: 最寄り駅を正しく検出する
4. ✅ findNearest: 駅がない場合はnullを返す
5. ✅ findNearestN: 上位N件を返す
6. ✅ findNearestN: 距離順にソートされている
7. ✅ findNearestN: 駅数がN未満でも正しく動作する

### DelayReportComposer（UIテスト）

1. ✅ 遅延情報がドロップダウンに表示される
2. ✅ 遅延見込み時間の入力が反映される
3. ✅ 位置情報ボタンが機能する
4. ✅ メッセージプレビューが更新される
5. ✅ 必須項目未入力時はコピーボタンが無効
6. ✅ コピーボタンでクリップボードにコピーされる
7. ✅ ダークモードで正しく表示される

## 実装フェーズ

### Phase 1: SPEC文書作成
- [x] このドキュメント作成

### Phase 2: 型定義
- [x] `src/types/station.ts` 作成

### Phase 3: StationDataService（TDD）
- [x] テストを先に作成（RED）
- [x] 実装してテストを通す（GREEN）

### Phase 4: NearestStationService（TDD）
- [x] テストを先に作成（RED）
- [x] 実装してテストを通す（GREEN）

### Phase 5: useGeolocation フック
- [x] フック実装

### Phase 6: DelayReportComposer コンポーネント
- [x] UI実装

### Phase 7: DelayHistoryModal統合
- [x] 統合・動作確認

## 検証方法

```bash
# 1. テスト実行
npm test -- --testPathPattern="StationDataService|NearestStationService"

# 2. TypeScriptエラーチェック
npx tsc --noEmit

# 3. 開発サーバーで動作確認
npm start
# → 交通情報タブ → ティッカークリック
# → 「現在地から検出」→ 位置情報許可
# → 遅延見込み入力 → コピーボタン

# 4. ビルド確認
npm run build
```

## 完了条件

- [ ] SPEC文書作成
- [ ] StationDataService テスト10件PASS
- [ ] NearestStationService テスト7件PASS
- [ ] 位置情報から最寄り駅が自動検出される
- [ ] 位置情報拒否時もドロップダウンで駅選択可能
- [ ] 必須項目未入力時はコピーボタン無効
- [ ] メッセージがクリップボードにコピーされる
- [ ] ダークモードで正しく表示される
- [ ] ビルド成功

---

*作成日: 2026-01-28*
*機能: 遅延報告メッセージ作成*
