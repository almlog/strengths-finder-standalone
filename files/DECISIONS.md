# Decisions

## D-001: LINE WORKS 設定マイグレーション戦略

**日付**: 2026-02-12
**ステータス**: 採用

### コンテキスト

LINE WORKSの複数Webhook対応にあたり、既存の単一Webhook設定（`webhookUrl`）から新しい配列形式（`webhooks[]`）への移行が必要。

### 決定

**自動マイグレーション方式を採用**

```typescript
// 旧形式
interface LineWorksConfigLegacy {
  webhookUrl: string;
  configuredAt: number;
}

// 新形式
interface LineWorksConfig {
  webhooks: LineWorksWebhookEntry[];
  defaultWebhookId?: string;
  configuredAt: number;
}
```

### 理由

1. **ユーザー体験**: 手動での再設定が不要
2. **データ保全**: 既存の設定を失わない
3. **透過性**: ユーザーは変更を意識せずに新機能を利用可能

### 実装詳細

- `LineWorksService.migrateConfig()` で旧形式を検出
- 旧形式の場合、自動的に新形式に変換してLocalStorageに保存
- ルーム名は「メインルーム」をデフォルト設定
- マイグレーション済みデータはデフォルトWebhookとして設定

### 影響

- 既存ユーザー: 透過的に新機能を利用可能
- 新規ユーザー: 最初から複数Webhook形式でスタート

---

## D-002: Claude Code MCP サーバー選定

**日付**: 2026-02-12
**ステータス**: 採用

### コンテキスト

Claude Codeの拡張機能としてMCPサーバーを導入する際、どのサーバーを有効化するか検討。

### 決定

| サーバー | 状態 | 理由 |
|---------|------|------|
| context7 | 常時有効 | ライブラリドキュメント参照でコンテキスト消費が軽微 |
| playwright | デフォルト無効 | E2Eテスト時のみ有効化（コンテキスト消費が大きい） |

### 設定

```json
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"],
      "disabled": true
    },
    "context7": {
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"]
    }
  }
}
```

### 理由

- context7: 開発中のライブラリ調査で頻繁に使用、軽量
- playwright: E2Eテストは頻度が低く、有効化時のコンテキスト消費が課題

---

## テンプレート

```markdown
## D-XXX: [タイトル]

**日付**: YYYY-MM-DD
**ステータス**: 検討中 / 採用 / 却下 / 廃止

### コンテキスト
[決定が必要になった背景]

### 決定
[何を決定したか]

### 理由
[なぜその決定をしたか]

### 影響
[この決定による影響]
```
