# SPEC: 遅延情報ティッカー・履歴モーダル機能

## 概要

交通情報タブに遅延情報をリアルタイムで表示するティッカーと、直近の遅延履歴を確認できるモーダルを追加する。

## 目的

- ユーザーが一目で遅延状況を把握できるようにする
- 直近3-6時間の遅延履歴を確認できるようにする
- ハイブリッド勤務における出社/リモート判断を支援する

## 機能要件

### FR-1: 遅延情報ティッカー

#### FR-1.1: 表示位置
- ヘッダー部分（「交通情報」タイトルと「全画面」ボタンの間）に配置
- 横スクロール（マーキー）形式で遅延情報を流す

#### FR-1.2: 表示内容
- 遅延が発生している路線の情報を表示
- フォーマット: 「○○線 △△の影響で約XX分遅れ」
- 複数の遅延がある場合は順次表示
- 遅延がない場合: 「現在、主要路線は平常運転です」

#### FR-1.3: 更新頻度
- 初回ロード時に取得
- 以降5分間隔で自動更新
- 手動更新ボタンは不要（モーダル内に設置）

#### FR-1.4: インタラクション
- ティッカーをクリックすると遅延履歴モーダルを開く
- ホバー時にマーキーを一時停止

### FR-2: 遅延履歴モーダル

#### FR-2.1: 表示内容
- 直近3-6時間の遅延情報をタイムライン形式で表示
- 各エントリに以下を含む:
  - 発生時刻
  - 路線名
  - 遅延理由（取得可能な場合）
  - 遅延時間（取得可能な場合）
  - ステータス（遅延中/復旧）

#### FR-2.2: フィルタリング
- 路線グループでフィルタ可能（JR/私鉄/地下鉄）
- 現在遅延中のみ表示するトグル

#### FR-2.3: 更新機能
- 「更新」ボタンで最新情報を取得
- 最終更新時刻を表示

### FR-3: データソース

#### FR-3.1: ODPT API
- エンドポイント: `https://api.odpt.org/api/v4/odpt:TrainInformation`
- 認証: ODPTトークン（既存の環境変数を使用）

#### FR-3.2: 対象路線（優先度順）
1. JR東日本（中央線、山手線、総武線など）
2. 東京メトロ全線
3. 都営地下鉄全線
4. 主要私鉄（東急、小田急、京王、西武、東武）

#### FR-3.3: データ保持
- LocalStorageに直近6時間分の履歴を保存
- 古いデータは自動削除

## 非機能要件

### NFR-1: パフォーマンス
- API呼び出しは5分に1回に制限（レートリミット対策）
- ティッカーのアニメーションはCSS transform使用（GPU最適化）

### NFR-2: エラーハンドリング
- API取得失敗時はキャッシュデータを表示
- 完全にデータがない場合は「情報取得中...」を表示
- ネットワークエラー時はリトライ（最大3回）

### NFR-3: アクセシビリティ
- マーキーはprefers-reduced-motionを尊重
- スクリーンリーダー対応（aria-live）

## 技術設計

### ファイル構成
```
src/
├── services/
│   └── TrainDelayService.ts        # API呼び出し・データ管理
├── components/
│   └── traffic/
│       ├── TrafficInfoPage.tsx     # 既存（統合）
│       ├── DelayTicker.tsx         # ティッカーコンポーネント
│       └── DelayHistoryModal.tsx   # 履歴モーダル
└── types/
    └── trainDelay.ts               # 型定義
```

### 型定義

```typescript
// 遅延情報の型
interface TrainDelayInfo {
  id: string;                    // 一意識別子
  railway: string;               // 路線ID (odpt.Railway:JR-East.ChuoRapid)
  railwayName: string;           // 路線名 (中央線快速)
  operator: string;              // 事業者ID
  operatorName: string;          // 事業者名 (JR東日本)
  status: 'delayed' | 'suspended' | 'normal' | 'unknown';
  delayMinutes?: number;         // 遅延時間（分）
  cause?: string;                // 遅延原因
  informationText: string;       // 運行情報テキスト
  fetchedAt: string;             // 取得時刻 (ISO8601)
}

// 履歴エントリの型
interface DelayHistoryEntry extends TrainDelayInfo {
  recordedAt: string;            // 記録時刻
}

// サービスの状態
interface DelayServiceState {
  currentDelays: TrainDelayInfo[];
  history: DelayHistoryEntry[];
  lastUpdated: string | null;
  isLoading: boolean;
  error: string | null;
}
```

### API レスポンス例

```json
{
  "@context": "http://vocab.odpt.org/context_odpt.jsonld",
  "@id": "urn:ucode:_00001C000000000000010000030FD7E5",
  "@type": "odpt:TrainInformation",
  "dc:date": "2024-01-28T09:00:00+09:00",
  "odpt:operator": "odpt.Operator:TokyoMetro",
  "odpt:railway": "odpt.Railway:TokyoMetro.Ginza",
  "odpt:trainInformationStatus": "odpt.TrainInformationStatus:Normal",
  "odpt:trainInformationText": "現在、平常どおり運転しています。"
}
```

### 事業者・路線マッピング

```typescript
const OPERATORS = {
  'odpt.Operator:JR-East': 'JR東日本',
  'odpt.Operator:TokyoMetro': '東京メトロ',
  'odpt.Operator:Toei': '都営地下鉄',
  'odpt.Operator:Tokyu': '東急',
  'odpt.Operator:Odakyu': '小田急',
  'odpt.Operator:Keio': '京王',
  'odpt.Operator:Seibu': '西武',
  'odpt.Operator:Tobu': '東武',
};

const PRIORITY_RAILWAYS = [
  'odpt.Railway:JR-East.ChuoRapid',      // 中央線快速
  'odpt.Railway:JR-East.Yamanote',        // 山手線
  'odpt.Railway:JR-East.SobuRapid',       // 総武線快速
  'odpt.Railway:TokyoMetro.Marunouchi',   // 丸ノ内線
  'odpt.Railway:TokyoMetro.Ginza',        // 銀座線
  // ... etc
];
```

## テスト計画

### ユニットテスト

#### TrainDelayService
- [ ] fetchDelayInfo: 正常時にデータを取得できる
- [ ] fetchDelayInfo: APIエラー時にキャッシュを返す
- [ ] parseDelayStatus: 遅延/通常/運休を正しく判定
- [ ] filterByOperator: 事業者でフィルタできる
- [ ] getDelayHistory: 指定時間分の履歴を取得できる
- [ ] saveToLocalStorage: 履歴を保存できる
- [ ] pruneOldHistory: 古い履歴を削除できる

#### DelayTicker
- [ ] 遅延がある場合に遅延情報を表示
- [ ] 遅延がない場合に「平常運転」を表示
- [ ] クリックでモーダルを開く
- [ ] ホバーでアニメーション一時停止

#### DelayHistoryModal
- [ ] 履歴一覧を表示
- [ ] フィルタが機能する
- [ ] 更新ボタンが機能する
- [ ] 閉じるボタンが機能する

## UI モックアップ

### ティッカー（通常時）
```
┌──────────────────────────────────────────────────────────────┐
│ 🚃 交通情報  │ ◀ 中央線 人身事故の影響で約15分遅れ ▶ │ [全画面] │
└──────────────────────────────────────────────────────────────┘
```

### ティッカー（平常時）
```
┌──────────────────────────────────────────────────────────────┐
│ 🚃 交通情報  │ ✓ 主要路線は平常運転です              │ [全画面] │
└──────────────────────────────────────────────────────────────┘
```

### モーダル
```
┌─────────────────────────────────────────────┐
│ 遅延情報履歴                           [×] │
├─────────────────────────────────────────────┤
│ フィルタ: [全て▼] [遅延中のみ □]           │
│ 最終更新: 09:15  [🔄 更新]                 │
├─────────────────────────────────────────────┤
│ ⚠️ 09:10 中央線                            │
│    人身事故の影響で約15分遅れ              │
│                                             │
│ ✓ 09:05 山手線                             │
│    運転再開（9:00頃復旧）                  │
│                                             │
│ ⚠️ 08:30 総武線                            │
│    信号トラブルの影響で約5分遅れ           │
│                                             │
│ ... (スクロール)                           │
└─────────────────────────────────────────────┘
```

## 実装フェーズ

### Phase 1: データ層
1. 型定義 (`types/trainDelay.ts`)
2. TrainDelayService実装
3. ユニットテスト

### Phase 2: UI層
1. DelayTickerコンポーネント
2. DelayHistoryModalコンポーネント
3. TrafficInfoPage統合

### Phase 3: 統合・調整
1. 開発環境テスト
2. エラーハンドリング調整
3. パフォーマンス最適化

## 参考資料

- [ODPT API仕様](https://developer.odpt.org/)
- [公共交通オープンデータセンター](https://ckan.odpt.org/)
- [Mini Tokyo 3D](https://minitokyo3d.com/)
