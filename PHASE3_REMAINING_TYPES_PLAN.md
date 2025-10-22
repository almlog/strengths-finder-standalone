# Phase 3: 残り10タイプの実装計画（TDD前提）

## 📊 実装状況

### ✅ 実装済み（6タイプ）
1. **INTJ** (建築家) - アナリスト
2. **ENFP** (運動家) - 外交官
3. **ENTJ** (指揮官) - アナリスト
4. **INFJ** (提唱者) - 外交官
5. **ENFJ** (主人公) - 外交官
6. **INTP** (論理学者) - アナリスト

### ⏳ 未実装（10タイプ）

#### 外交官グループ（1タイプ）
7. **INFP** (仲介者) - 理想主義で共感力が高い

#### アナリストグループ（1タイプ）
8. **ENTP** (討論者) - 知的で議論好き

#### 番人グループ（4タイプ）
9. **ISTJ** (管理者) - 実務的で責任感が強い
10. **ISFJ** (擁護者) - 献身的で思いやりがある
11. **ESTJ** (幹部) - 優れた管理者で組織的
12. **ESFJ** (領事官) - 社交的で協力的

#### 探検家グループ（4タイプ）
13. **ISTP** (巨匠) - 大胆で実践的な実験者
14. **ISFP** (冒険家) - 柔軟で魅力的な芸術家
15. **ESTP** (起業家) - エネルギッシュで賢い
16. **ESFP** (エンターテイナー) - 自発的で熱狂的

---

## 🎯 TDD実装計画

### 原則
1. **テストファースト**: データ作成前に必ずバリデーションテストを確認
2. **1タイプずつ**: TDDサイクルを各タイプで実施
3. **継続的検証**: 各タイプ追加後に全テスト実行

### 実装順序（優先度順）

#### Phase 3-1: 外交官・アナリスト完成（2タイプ）
1. **INFP** (仲介者) - 外交官グループ完成
2. **ENTP** (討論者) - アナリストグループ完成

**理由**: 既存の外交官・アナリストグループのパターンを参考にできる

#### Phase 3-2: 番人グループ（4タイプ）
3. **ISTJ** (管理者)
4. **ISFJ** (擁護者)
5. **ESTJ** (幹部)
6. **ESFJ** (領事官)

**理由**: 現実的・実務的な特性を持つグループをまとめて実装

#### Phase 3-3: 探検家グループ（4タイプ）
7. **ISTP** (巨匠)
8. **ISFP** (冒険家)
9. **ESTP** (起業家)
10. **ESFP** (エンターテイナー)

**理由**: 柔軟性・行動力を持つグループをまとめて実装

---

## 📝 各タイプの TDDサイクル

### RED Phase
```bash
# テストを実行（新タイプはまだ未実装なので一部テスト失敗）
npm test -- --testPathPattern=MBTIProfileValidation --no-coverage --watchAll=false
```

### GREEN Phase（実装）
1. `PersonalityAnalysisEngine.ts` の `loadSampleProfiles()` に新タイプを追加
2. MBTIProfile を定義：
   - type, name, description
   - characteristics (6項目)
   - motivation (4項目)
   - teamDynamics (4項目)
   - strengthsSynergy (3配列) ← StrengthsServiceのIDを使用
   - mbtiCompatibility (3配列)
   - careerPaths (3配列)
3. `this.profiles.set()` で登録
4. テスト実行して合格確認

### REFACTOR Phase
1. コメントの改善
2. データの一貫性確認
3. compatibilityの双方向性確認（推奨）

---

## ✅ 1タイプ実装のチェックリスト

### データ作成
- [ ] MBTIProfile の全フィールド定義
- [ ] strengthsSynergy の全IDが StrengthsService に存在
- [ ] mbtiCompatibility の全タイプが有効なMBTIType
- [ ] 自分自身がcompatibilityリストに含まれていない
- [ ] 重複IDや重複タイプがない

### テスト
- [ ] バリデーションテスト実行
- [ ] 新タイプの18テストが合格
- [ ] 既存タイプのテストも引き続き合格
- [ ] 未実装タイプ数が1減っている

### コミット
- [ ] コメント・ドキュメント更新
- [ ] Git commit（1タイプごと）
- [ ] テスト結果を記録

---

## 📊 進捗管理

実装完了時の更新箇所：
1. `MBTIProfileValidation.test.ts` の `implementedTypes` 配列
2. `PersonalityAnalysisEngine.ts` のコメント（実装済みタイプ数）
3. このドキュメントの実装状況

---

## 🎓 学んだこと

### TDDの価値
- テストがないと、実装タイプ数すら把握できていなかった
- バリデーションテストにより、データの整合性を自動検証
- 既存コード（StrengthsService）との統合性を保証

### 次回への改善
- 最初からテストファーストで実装すべきだった
- データ作成時に手動確認ではなく自動テストを信頼
- 1タイプずつコミットして履歴を明確に

---

## 🚀 次のアクション

Phase 3-1 として、INFPとENTPの実装から開始することを推奨します。

```bash
# 実装開始前
npm test -- --testPathPattern=MBTIProfileValidation --no-coverage --watchAll=false

# INFP実装後
npm test -- --testPathPattern=MBTIProfileValidation --no-coverage --watchAll=false

# ENTP実装後
npm test -- --testPathPattern=MBTIProfileValidation --no-coverage --watchAll=false
```
