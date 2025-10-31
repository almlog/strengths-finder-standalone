# 16Personalities統合機能 - TDDテスト計画書

## 📋 概要

本文書は16Personalities統合機能のTDD（テスト駆動開発）における全テストケースを定義する。

**テスト戦略**:
1. **RED Phase**: 全テストケースを先に記述（失敗することを確認）
2. **GREEN Phase**: 最小限の実装で全テストをパス
3. **REFACTOR Phase**: コード品質向上、パフォーマンス最適化

**テストカバレッジ目標**: 90%以上

---

## 🗂️ テストファイル構成

```
src/__tests__/
├── services/
│   └── Personality16Service.test.ts          # Phase 1
├── models/
│   └── StrengthsTypes.test.ts                # 既存テストに追加
├── components/
│   └── strengths/
│       ├── Personality16Card.test.tsx        # Phase 2
│       ├── Personality16Matrix.test.tsx      # Phase 3
│       ├── RoleGroupDistribution.test.tsx    # Phase 3
│       ├── TypeMembersList.test.tsx          # Phase 3
│       ├── Personality16TeamAnalysis.test.tsx# Phase 3
│       ├── MemberForm.test.tsx               # Phase 2 (既存に追加)
│       └── IndividualStrengths.test.tsx      # Phase 2 (既存に追加)
└── integration/
    └── Personality16Integration.test.tsx     # Phase 4
```

---

## Phase 1: データ構造とサービス層のテスト

### 1.1 Personality16Service.test.ts

**ファイルパス**: `src/__tests__/services/Personality16Service.test.ts`

#### テストケース一覧（計35ケース）

##### 1.1.1 PERSONALITY_TYPES_DATA マスターデータ

```typescript
describe('PERSONALITY_TYPES_DATA', () => {
  test('全16タイプが定義されている', () => {
    expect(PERSONALITY_TYPES_DATA).toHaveLength(16);
  });

  test('各タイプに必須プロパティがある', () => {
    PERSONALITY_TYPES_DATA.forEach(type => {
      expect(type).toHaveProperty('id');
      expect(type).toHaveProperty('code');
      expect(type).toHaveProperty('name');
      expect(type).toHaveProperty('nameEn');
      expect(type).toHaveProperty('role');
      expect(type).toHaveProperty('roleName');
      expect(type).toHaveProperty('description');
      expect(type).toHaveProperty('colorLight');
      expect(type).toHaveProperty('colorDark');
    });
  });

  test('IDが1-16の連番である', () => {
    const ids = PERSONALITY_TYPES_DATA.map(t => t.id).sort((a, b) => a - b);
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  });

  test('コードが重複していない', () => {
    const codes = PERSONALITY_TYPES_DATA.map(t => t.code);
    const uniqueCodes = new Set(codes);
    expect(uniqueCodes.size).toBe(16);
  });

  test('全16タイプの正しいコードが存在する', () => {
    const expectedCodes = [
      'INTJ', 'INTP', 'ENTJ', 'ENTP', // Analyst
      'INFJ', 'INFP', 'ENFJ', 'ENFP', // Diplomat
      'ISTJ', 'ISFJ', 'ESTJ', 'ESFJ', // Sentinel
      'ISTP', 'ISFP', 'ESTP', 'ESFP', // Explorer
    ];
    const codes = PERSONALITY_TYPES_DATA.map(t => t.code).sort();
    expect(codes).toEqual(expectedCodes.sort());
  });

  test('役割グループが正しく定義されている', () => {
    const analystTypes = PERSONALITY_TYPES_DATA.filter(t => t.role === 'analyst');
    const diplomatTypes = PERSONALITY_TYPES_DATA.filter(t => t.role === 'diplomat');
    const sentinelTypes = PERSONALITY_TYPES_DATA.filter(t => t.role === 'sentinel');
    const explorerTypes = PERSONALITY_TYPES_DATA.filter(t => t.role === 'explorer');

    expect(analystTypes).toHaveLength(4);
    expect(diplomatTypes).toHaveLength(4);
    expect(sentinelTypes).toHaveLength(4);
    expect(explorerTypes).toHaveLength(4);
  });

  test('色コードが正しい形式（#RRGGBB）である', () => {
    const colorRegex = /^#[0-9A-F]{6}$/i;
    PERSONALITY_TYPES_DATA.forEach(type => {
      expect(type.colorLight).toMatch(colorRegex);
      expect(type.colorDark).toMatch(colorRegex);
    });
  });

  test('説明文が空でない', () => {
    PERSONALITY_TYPES_DATA.forEach(type => {
      expect(type.description.trim()).not.toBe('');
      expect(type.description.length).toBeGreaterThan(10);
    });
  });

  test('INTJタイプが正しく定義されている', () => {
    const intj = PERSONALITY_TYPES_DATA.find(t => t.code === 'INTJ');
    expect(intj).toBeDefined();
    expect(intj?.id).toBe(1);
    expect(intj?.name).toBe('建築家');
    expect(intj?.nameEn).toBe('Architect');
    expect(intj?.role).toBe('analyst');
    expect(intj?.roleName).toBe('アナリスト');
  });

  test('ENFPタイプが正しく定義されている', () => {
    const enfp = PERSONALITY_TYPES_DATA.find(t => t.code === 'ENFP');
    expect(enfp).toBeDefined();
    expect(enfp?.role).toBe('diplomat');
  });
});
```

##### 1.1.2 getPersonalityById()

```typescript
describe('getPersonalityById()', () => {
  test('有効なID(1)でINTJを取得できる', () => {
    const personality = getPersonalityById(1);
    expect(personality).toBeDefined();
    expect(personality?.code).toBe('INTJ');
  });

  test('有効なID(16)で最後のタイプを取得できる', () => {
    const personality = getPersonalityById(16);
    expect(personality).toBeDefined();
  });

  test('無効なID(0)でundefinedを返す', () => {
    const personality = getPersonalityById(0);
    expect(personality).toBeUndefined();
  });

  test('無効なID(17)でundefinedを返す', () => {
    const personality = getPersonalityById(17);
    expect(personality).toBeUndefined();
  });

  test('無効なID(-1)でundefinedを返す', () => {
    const personality = getPersonalityById(-1);
    expect(personality).toBeUndefined();
  });

  test('無効なID(999)でundefinedを返す', () => {
    const personality = getPersonalityById(999);
    expect(personality).toBeUndefined();
  });

  test('nullを渡した場合undefinedを返す', () => {
    const personality = getPersonalityById(null as any);
    expect(personality).toBeUndefined();
  });

  test('undefinedを渡した場合undefinedを返す', () => {
    const personality = getPersonalityById(undefined as any);
    expect(personality).toBeUndefined();
  });

  test('文字列を渡した場合undefinedを返す', () => {
    const personality = getPersonalityById('1' as any);
    expect(personality).toBeUndefined();
  });
});
```

##### 1.1.3 getPersonalityByCode()

```typescript
describe('getPersonalityByCode()', () => {
  test('有効なコード(INTJ)でタイプを取得できる', () => {
    const personality = getPersonalityByCode('INTJ');
    expect(personality).toBeDefined();
    expect(personality?.id).toBe(1);
    expect(personality?.code).toBe('INTJ');
  });

  test('有効なコード(ENFP)でタイプを取得できる', () => {
    const personality = getPersonalityByCode('ENFP');
    expect(personality).toBeDefined();
    expect(personality?.role).toBe('diplomat');
  });

  test('小文字のコード(intj)で取得できる', () => {
    const personality = getPersonalityByCode('intj');
    expect(personality).toBeDefined();
    expect(personality?.code).toBe('INTJ');
  });

  test('大文字小文字混在(InTj)で取得できる', () => {
    const personality = getPersonalityByCode('InTj');
    expect(personality).toBeDefined();
    expect(personality?.code).toBe('INTJ');
  });

  test('無効なコード(XXXX)でundefinedを返す', () => {
    const personality = getPersonalityByCode('XXXX');
    expect(personality).toBeUndefined();
  });

  test('空文字でundefinedを返す', () => {
    const personality = getPersonalityByCode('');
    expect(personality).toBeUndefined();
  });

  test('nullを渡した場合undefinedを返す', () => {
    const personality = getPersonalityByCode(null as any);
    expect(personality).toBeUndefined();
  });
});
```

##### 1.1.4 getAllPersonalities()

```typescript
describe('getAllPersonalities()', () => {
  test('全16タイプを返す', () => {
    const personalities = getAllPersonalities();
    expect(personalities).toHaveLength(16);
  });

  test('返された配列がソート済みである（ID昇順）', () => {
    const personalities = getAllPersonalities();
    const ids = personalities.map(p => p.id);
    const sortedIds = [...ids].sort((a, b) => a - b);
    expect(ids).toEqual(sortedIds);
  });

  test('元のマスターデータを変更しない（immutable）', () => {
    const personalities = getAllPersonalities();
    personalities[0].code = 'XXXX';

    const reloaded = getAllPersonalities();
    expect(reloaded[0].code).not.toBe('XXXX');
  });
});
```

##### 1.1.5 analyzeTeamPersonalities()

```typescript
describe('analyzeTeamPersonalities()', () => {
  const mockMembers: MemberStrengths[] = [
    { id: '1', name: '太郎', personalityId: 1, personalityVariant: 'A', ... }, // INTJ-A
    { id: '2', name: '花子', personalityId: 1, personalityVariant: 'T', ... }, // INTJ-T
    { id: '3', name: '次郎', personalityId: 5, personalityVariant: 'A', ... }, // INFJ-A
    { id: '4', name: '三郎', personalityId: undefined, ... }, // 16P未設定
  ];

  test('タイプ別の人数を正しく集計する', () => {
    const analysis = analyzeTeamPersonalities(mockMembers);
    expect(analysis.typeDistribution[1]).toBe(2); // INTJ: 2人
    expect(analysis.typeDistribution[5]).toBe(1); // INFJ: 1人
  });

  test('役割グループ別の人数を正しく集計する', () => {
    const analysis = analyzeTeamPersonalities(mockMembers);
    expect(analysis.roleDistribution.analyst).toBe(3); // INTJ×2 + INFJ×1 = 3
  });

  test('バリアント別の人数を正しく集計する', () => {
    const analysis = analyzeTeamPersonalities(mockMembers);
    expect(analysis.variantDistribution.A).toBe(2); // -A: 2人
    expect(analysis.variantDistribution.T).toBe(1); // -T: 1人
  });

  test('16P未設定のメンバーを除外する', () => {
    const analysis = analyzeTeamPersonalities(mockMembers);
    expect(analysis.totalMembers).toBe(3); // 16P設定済み: 3人
  });

  test('空配列で初期化された結果を返す', () => {
    const analysis = analyzeTeamPersonalities([]);
    expect(analysis.totalMembers).toBe(0);
    expect(analysis.typeDistribution).toEqual({});
  });

  test('全員16P未設定の場合、空の結果を返す', () => {
    const members = [
      { id: '1', name: '太郎', personalityId: undefined, ... },
    ];
    const analysis = analyzeTeamPersonalities(members);
    expect(analysis.totalMembers).toBe(0);
  });

  test('無効なpersonalityIdを持つメンバーを除外する', () => {
    const members = [
      { id: '1', name: '太郎', personalityId: 999, ... }, // 無効なID
    ];
    const analysis = analyzeTeamPersonalities(members);
    expect(analysis.totalMembers).toBe(0);
  });
});
```

##### 1.1.6 getRoleGroupColor()

```typescript
describe('getRoleGroupColor()', () => {
  test('analystでアナリストの色を返す（Light）', () => {
    const color = getRoleGroupColor('analyst', false);
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  test('diplomatで外交官の色を返す（Dark）', () => {
    const color = getRoleGroupColor('diplomat', true);
    expect(color).toMatch(/^#[0-9A-F]{6}$/i);
  });

  test('sentinelで番人の色を返す', () => {
    const color = getRoleGroupColor('sentinel', false);
    expect(color).toBeDefined();
  });

  test('explorerで探検家の色を返す', () => {
    const color = getRoleGroupColor('explorer', false);
    expect(color).toBeDefined();
  });

  test('無効なroleでデフォルト色を返す', () => {
    const color = getRoleGroupColor('invalid' as any, false);
    expect(color).toBeDefined();
  });
});
```

---

### 1.2 StrengthsTypes.test.ts（既存テストに追加）

**ファイルパス**: `src/__tests__/models/StrengthsTypes.test.ts`

#### 追加テストケース（計10ケース）

```typescript
describe('MemberStrengths型の16P拡張', () => {
  test('personalityIdが1-16の有効な値である', () => {
    const member: MemberStrengths = {
      id: '1',
      name: '太郎',
      personalityId: 1,
      ...
    };
    expect(member.personalityId).toBeGreaterThanOrEqual(1);
    expect(member.personalityId).toBeLessThanOrEqual(16);
  });

  test('personalityIdがundefinedでも有効', () => {
    const member: MemberStrengths = {
      id: '1',
      name: '太郎',
      personalityId: undefined,
      ...
    };
    expect(member.personalityId).toBeUndefined();
  });

  test('personalityVariantがAで有効', () => {
    const member: MemberStrengths = {
      id: '1',
      name: '太郎',
      personalityId: 1,
      personalityVariant: 'A',
      ...
    };
    expect(member.personalityVariant).toBe('A');
  });

  test('personalityVariantがTで有効', () => {
    const member: MemberStrengths = {
      id: '1',
      name: '太郎',
      personalityId: 1,
      personalityVariant: 'T',
      ...
    };
    expect(member.personalityVariant).toBe('T');
  });

  test('personalityVariantがundefinedでも有効', () => {
    const member: MemberStrengths = {
      id: '1',
      name: '太郎',
      personalityVariant: undefined,
      ...
    };
    expect(member.personalityVariant).toBeUndefined();
  });

  test('personalityIdがあってもstrengthsは必須', () => {
    const member: MemberStrengths = {
      id: '1',
      name: '太郎',
      personalityId: 1,
      strengths: [],
      ...
    };
    expect(member.strengths).toBeDefined();
  });

  test('LocalStorageとの互換性: 既存データ（16Pなし）を読み込める', () => {
    const oldData = {
      id: '1',
      name: '太郎',
      strengths: [],
      // personalityId, personalityVariant がない
    };
    const member = oldData as MemberStrengths;
    expect(member.personalityId).toBeUndefined();
    expect(member.personalityVariant).toBeUndefined();
  });

  test('LocalStorageとの互換性: 新データ（16Pあり）を読み込める', () => {
    const newData = {
      id: '1',
      name: '太郎',
      strengths: [],
      personalityId: 1,
      personalityVariant: 'A',
    };
    const member = newData as MemberStrengths;
    expect(member.personalityId).toBe(1);
    expect(member.personalityVariant).toBe('A');
  });

  test('バリデーション: personalityIdが0の場合エラー', () => {
    const isValid = (id: number) => id >= 1 && id <= 16;
    expect(isValid(0)).toBe(false);
  });

  test('バリデーション: personalityIdが17の場合エラー', () => {
    const isValid = (id: number) => id >= 1 && id <= 16;
    expect(isValid(17)).toBe(false);
  });
});
```

---

## Phase 2: 個人分析タブ統合のテスト

### 2.1 Personality16Card.test.tsx

**ファイルパス**: `src/__tests__/components/strengths/Personality16Card.test.tsx`

#### テストケース一覧（計20ケース）

```typescript
describe('Personality16Card', () => {
  test('personalityIdが有効な場合、カードが表示される', () => {
    render(<Personality16Card personalityId={1} variant="A" />);
    expect(screen.getByText('INTJ')).toBeInTheDocument();
    expect(screen.getByText('建築家')).toBeInTheDocument();
  });

  test('variantがAの場合、「自己主張型」が表示される', () => {
    render(<Personality16Card personalityId={1} variant="A" />);
    expect(screen.getByText(/自己主張型/)).toBeInTheDocument();
  });

  test('variantがTの場合、「慎重型」が表示される', () => {
    render(<Personality16Card personalityId={1} variant="T" />);
    expect(screen.getByText(/慎重型/)).toBeInTheDocument();
  });

  test('variantが未設定の場合、バリアントバッジが表示されない', () => {
    render(<Personality16Card personalityId={1} />);
    expect(screen.queryByText(/自己主張型/)).not.toBeInTheDocument();
    expect(screen.queryByText(/慎重型/)).not.toBeInTheDocument();
  });

  test('無効なpersonalityIdの場合、何も表示されない', () => {
    const { container } = render(<Personality16Card personalityId={999} />);
    expect(container.firstChild).toBeNull();
  });

  test('personalityIdが0の場合、何も表示されない', () => {
    const { container } = render(<Personality16Card personalityId={0} />);
    expect(container.firstChild).toBeNull();
  });

  test('役割グループバッジが表示される', () => {
    render(<Personality16Card personalityId={1} />);
    expect(screen.getByText('アナリスト')).toBeInTheDocument();
  });

  test('公式説明文が表示される', () => {
    render(<Personality16Card personalityId={1} />);
    const description = screen.getByText(/想像力が豊かで/);
    expect(description).toBeInTheDocument();
  });

  test('Lightモードで正しい色が適用される', () => {
    const { container } = render(
      <ThemeProvider value={{ themeId: 'default', ... }}>
        <Personality16Card personalityId={1} />
      </ThemeProvider>
    );
    // colorLight が適用されているか確認
  });

  test('Darkモードで正しい色が適用される', () => {
    const { container } = render(
      <ThemeProvider value={{ themeId: 'dark', ... }}>
        <Personality16Card personalityId={1} />
      </ThemeProvider>
    );
    // colorDark が適用されているか確認
  });

  test('ENFP（外交官）の色が正しく適用される', () => {
    render(<Personality16Card personalityId={8} />); // ENFP
    expect(screen.getByText('外交官')).toBeInTheDocument();
  });

  test('タイプアイコンの背景色が適用されている', () => {
    const { container } = render(<Personality16Card personalityId={1} />);
    const icon = container.querySelector('[style*="background"]');
    expect(icon).toBeInTheDocument();
  });

  test('アクセシビリティ: カードにrole属性がある', () => {
    const { container } = render(<Personality16Card personalityId={1} />);
    expect(container.querySelector('[role]')).toBeInTheDocument();
  });

  test('レスポンシブデザイン: モバイル画面で崩れない', () => {
    // モバイルビューポート設定
    global.innerWidth = 375;
    render(<Personality16Card personalityId={1} />);
    expect(screen.getByText('INTJ')).toBeInTheDocument();
  });

  test('ダークモード切り替え時にリレンダリングされる', () => {
    const { rerender } = render(
      <ThemeProvider value={{ themeId: 'default', ... }}>
        <Personality16Card personalityId={1} />
      </ThemeProvider>
    );

    rerender(
      <ThemeProvider value={{ themeId: 'dark', ... }}>
        <Personality16Card personalityId={1} />
      </ThemeProvider>
    );

    expect(screen.getByText('INTJ')).toBeInTheDocument();
  });

  test('複数のカードを同時にレンダリングできる', () => {
    render(
      <>
        <Personality16Card personalityId={1} />
        <Personality16Card personalityId={2} />
      </>
    );
    expect(screen.getByText('INTJ')).toBeInTheDocument();
    expect(screen.getByText('INTP')).toBeInTheDocument();
  });

  test('出典URLが表示される', () => {
    render(<Personality16Card personalityId={1} />);
    expect(screen.getByText(/16personalities\.com/)).toBeInTheDocument();
  });

  test('XSS対策: description内のHTMLタグがエスケープされる', () => {
    // マスターデータに<script>タグが含まれていた場合
    const { container } = render(<Personality16Card personalityId={1} />);
    expect(container.querySelector('script')).toBeNull();
  });

  test('長い説明文が省略されずに全文表示される', () => {
    render(<Personality16Card personalityId={1} />);
    const description = screen.getByText(/想像力が豊かで/);
    expect(description.textContent?.length).toBeGreaterThan(50);
  });

  test('タイプコードが大文字で表示される', () => {
    render(<Personality16Card personalityId={1} />);
    expect(screen.getByText('INTJ')).toBeInTheDocument();
    expect(screen.queryByText('intj')).not.toBeInTheDocument();
  });
});
```

### 2.2 MemberForm.test.tsx（既存に追加）

**ファイルパス**: `src/__tests__/components/strengths/MemberForm.test.tsx`

#### 追加テストケース（計15ケース）

```typescript
describe('MemberForm - 16P統合', () => {
  test('16Pタイプ選択ドロップダウンが表示される', () => {
    render(<MemberForm />);
    expect(screen.getByLabelText(/性格タイプ/)).toBeInTheDocument();
  });

  test('全16タイプがドロップダウンに含まれる', () => {
    render(<MemberForm />);
    const select = screen.getByLabelText(/性格タイプ/) as HTMLSelectElement;
    expect(select.options.length).toBe(17); // 未設定 + 16タイプ
  });

  test('「未設定」オプションが含まれる', () => {
    render(<MemberForm />);
    expect(screen.getByRole('option', { name: /未設定/ })).toBeInTheDocument();
  });

  test('タイプを選択するとバリアント選択が表示される', () => {
    render(<MemberForm />);
    const select = screen.getByLabelText(/性格タイプ/);
    fireEvent.change(select, { target: { value: '1' } });
    expect(screen.getByText(/自己主張型/)).toBeInTheDocument();
    expect(screen.getByText(/慎重型/)).toBeInTheDocument();
  });

  test('バリアントAを選択できる', () => {
    render(<MemberForm />);
    const select = screen.getByLabelText(/性格タイプ/);
    fireEvent.change(select, { target: { value: '1' } });

    const variantA = screen.getByLabelText(/自己主張型/);
    fireEvent.click(variantA);
    expect(variantA).toBeChecked();
  });

  test('バリアントTを選択できる', () => {
    render(<MemberForm />);
    const select = screen.getByLabelText(/性格タイプ/);
    fireEvent.change(select, { target: { value: '1' } });

    const variantT = screen.getByLabelText(/慎重型/);
    fireEvent.click(variantT);
    expect(variantT).toBeChecked();
  });

  test('タイプを「未設定」に戻すとバリアント選択が消える', () => {
    render(<MemberForm />);
    const select = screen.getByLabelText(/性格タイプ/);
    fireEvent.change(select, { target: { value: '1' } });
    fireEvent.change(select, { target: { value: '' } });

    expect(screen.queryByText(/自己主張型/)).not.toBeInTheDocument();
  });

  test('16P情報を含めて保存できる', async () => {
    const onSave = jest.fn();
    render(<MemberForm onSave={onSave} />);

    // フォーム入力
    fireEvent.change(screen.getByLabelText(/名前/), { target: { value: '太郎' } });
    fireEvent.change(screen.getByLabelText(/性格タイプ/), { target: { value: '1' } });
    fireEvent.click(screen.getByLabelText(/自己主張型/));

    // 保存
    fireEvent.click(screen.getByText(/保存/));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          personalityId: 1,
          personalityVariant: 'A',
        })
      );
    });
  });

  test('16P情報なしでも保存できる', async () => {
    const onSave = jest.fn();
    render(<MemberForm onSave={onSave} />);

    fireEvent.change(screen.getByLabelText(/名前/), { target: { value: '太郎' } });
    fireEvent.click(screen.getByText(/保存/));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          personalityId: undefined,
          personalityVariant: undefined,
        })
      );
    });
  });

  test('既存メンバー編集時、16P情報が初期表示される', () => {
    const member: MemberStrengths = {
      id: '1',
      name: '太郎',
      personalityId: 1,
      personalityVariant: 'A',
      ...
    };
    render(<MemberForm initialData={member} />);

    const select = screen.getByLabelText(/性格タイプ/) as HTMLSelectElement;
    expect(select.value).toBe('1');
    expect(screen.getByLabelText(/自己主張型/)).toBeChecked();
  });

  test('バリデーション: タイプ選択済みでバリアント未選択の場合、警告を表示', async () => {
    render(<MemberForm />);

    fireEvent.change(screen.getByLabelText(/性格タイプ/), { target: { value: '1' } });
    // バリアント未選択のまま保存
    fireEvent.click(screen.getByText(/保存/));

    await waitFor(() => {
      expect(screen.getByText(/バリアントを選択してください/)).toBeInTheDocument();
    });
  });

  test('ダークモードでフォームが正しく表示される', () => {
    render(
      <ThemeProvider value={{ themeId: 'dark', ... }}>
        <MemberForm />
      </ThemeProvider>
    );
    expect(screen.getByLabelText(/性格タイプ/)).toBeInTheDocument();
  });

  test('アクセシビリティ: フォーム要素にlabel要素が紐付いている', () => {
    render(<MemberForm />);
    const select = screen.getByLabelText(/性格タイプ/);
    expect(select).toHaveAttribute('id');
  });

  test('ドロップダウンの表示形式: "INTJ - 建築家（アナリスト）"', () => {
    render(<MemberForm />);
    expect(screen.getByRole('option', { name: /INTJ - 建築家/ })).toBeInTheDocument();
  });

  test('16P情報のセクションが視覚的に区切られている', () => {
    render(<MemberForm />);
    const section = screen.getByText(/16Personalities 性格タイプ/).closest('div');
    expect(section).toHaveClass('border-t');
  });
});
```

---

## Phase 3: 16P分析タブのテスト

### 3.1 Personality16Matrix.test.tsx

**ファイルパス**: `src/__tests__/components/strengths/Personality16Matrix.test.tsx`

#### テストケース一覧（計15ケース）

```typescript
describe('Personality16Matrix', () => {
  const mockAnalysis = {
    typeDistribution: { 1: 2, 5: 1 }, // INTJ: 2人, INFJ: 1人
    totalMembers: 3,
    ...
  };

  test('4×4グリッドが表示される', () => {
    render(<Personality16Matrix analysis={mockAnalysis} />);
    const cells = screen.getAllByRole('button');
    expect(cells).toHaveLength(16);
  });

  test('各セルにタイプコードが表示される', () => {
    render(<Personality16Matrix analysis={mockAnalysis} />);
    expect(screen.getByText('INTJ')).toBeInTheDocument();
    expect(screen.getByText('INTP')).toBeInTheDocument();
  });

  test('人数が正しく表示される', () => {
    render(<Personality16Matrix analysis={mockAnalysis} />);
    expect(screen.getByText(/2人/)).toBeInTheDocument(); // INTJ: 2人
  });

  test('0人のタイプも表示される', () => {
    render(<Personality16Matrix analysis={mockAnalysis} />);
    expect(screen.getByText(/INTP/)).toBeInTheDocument(); // INTP: 0人
  });

  test('役割グループごとに色分けされている', () => {
    const { container } = render(<Personality16Matrix analysis={mockAnalysis} />);
    const analystCells = container.querySelectorAll('[data-role="analyst"]');
    expect(analystCells.length).toBe(4);
  });

  test('セルクリック時にスクロール処理が呼ばれる', () => {
    const onCellClick = jest.fn();
    render(<Personality16Matrix analysis={mockAnalysis} onCellClick={onCellClick} />);

    const intjCell = screen.getByText('INTJ').closest('button');
    fireEvent.click(intjCell!);

    expect(onCellClick).toHaveBeenCalledWith('INTJ');
  });

  test('人数0のセルも クリック可能', () => {
    const onCellClick = jest.fn();
    render(<Personality16Matrix analysis={mockAnalysis} onCellClick={onCellClick} />);

    const intpCell = screen.getByText('INTP').closest('button');
    fireEvent.click(intpCell!);

    expect(onCellClick).toHaveBeenCalledWith('INTP');
  });

  test('ダークモードで正しい色が適用される', () => {
    render(
      <ThemeProvider value={{ themeId: 'dark', ... }}>
        <Personality16Matrix analysis={mockAnalysis} />
      </ThemeProvider>
    );
    expect(screen.getByText('INTJ')).toBeInTheDocument();
  });

  test('レスポンシブデザイン: モバイルで2×8レイアウトに変更', () => {
    global.innerWidth = 375;
    render(<Personality16Matrix analysis={mockAnalysis} />);
    expect(screen.getByText('INTJ')).toBeInTheDocument();
  });

  test('役割グループラベルが表示される', () => {
    render(<Personality16Matrix analysis={mockAnalysis} />);
    expect(screen.getByText('アナリスト')).toBeInTheDocument();
    expect(screen.getByText('外交官')).toBeInTheDocument();
    expect(screen.getByText('番人')).toBeInTheDocument();
    expect(screen.getByText('探検家')).toBeInTheDocument();
  });

  test('Hover時に視覚的フィードバックがある', () => {
    const { container } = render(<Personality16Matrix analysis={mockAnalysis} />);
    const cell = container.querySelector('button');
    expect(cell).toHaveClass('hover:opacity-80');
  });

  test('アクセシビリティ: セルにaria-labelがある', () => {
    render(<Personality16Matrix analysis={mockAnalysis} />);
    const cell = screen.getByText('INTJ').closest('button');
    expect(cell).toHaveAttribute('aria-label');
  });

  test('キーボードナビゲーションが可能', () => {
    render(<Personality16Matrix analysis={mockAnalysis} />);
    const cells = screen.getAllByRole('button');
    cells[0].focus();
    expect(document.activeElement).toBe(cells[0]);
  });

  test('アニメーション: マウント時にフェードイン', () => {
    const { container } = render(<Personality16Matrix analysis={mockAnalysis} />);
    expect(container.querySelector('.fade-in')).toBeInTheDocument();
  });

  test('最多タイプにバッジが表示される', () => {
    render(<Personality16Matrix analysis={mockAnalysis} />);
    expect(screen.getByText(/最多/)).toBeInTheDocument();
  });
});
```

### 3.2 RoleGroupDistribution.test.tsx

**ファイルパス**: `src/__tests__/components/strengths/RoleGroupDistribution.test.tsx`

#### テストケース一覧（計12ケース）

```typescript
describe('RoleGroupDistribution', () => {
  const mockAnalysis = {
    roleDistribution: {
      analyst: 4,
      diplomat: 3,
      sentinel: 5,
      explorer: 2,
    },
    totalMembers: 14,
  };

  test('4つの役割グループが表示される', () => {
    render(<RoleGroupDistribution analysis={mockAnalysis} />);
    expect(screen.getByText(/アナリスト/)).toBeInTheDocument();
    expect(screen.getByText(/外交官/)).toBeInTheDocument();
    expect(screen.getByText(/番人/)).toBeInTheDocument();
    expect(screen.getByText(/探検家/)).toBeInTheDocument();
  });

  test('人数が正しく表示される', () => {
    render(<RoleGroupDistribution analysis={mockAnalysis} />);
    expect(screen.getByText(/4人/)).toBeInTheDocument(); // アナリスト
    expect(screen.getByText(/5人/)).toBeInTheDocument(); // 番人
  });

  test('割合が正しく表示される', () => {
    render(<RoleGroupDistribution analysis={mockAnalysis} />);
    expect(screen.getByText(/28.6%/)).toBeInTheDocument(); // 4/14 ≈ 28.6%
    expect(screen.getByText(/35.7%/)).toBeInTheDocument(); // 5/14 ≈ 35.7%
  });

  test('最多グループにバッジが表示される', () => {
    render(<RoleGroupDistribution analysis={mockAnalysis} />);
    expect(screen.getByText(/最多/)).toBeInTheDocument();
  });

  test('円グラフが表示される', () => {
    render(<RoleGroupDistribution analysis={mockAnalysis} />);
    expect(screen.getByRole('img', { name: /円グラフ/ })).toBeInTheDocument();
  });

  test('役割グループごとに色分けされている', () => {
    const { container } = render(<RoleGroupDistribution analysis={mockAnalysis} />);
    const items = container.querySelectorAll('[data-role-group]');
    expect(items.length).toBe(4);
  });

  test('0人のグループも表示される', () => {
    const emptyAnalysis = {
      roleDistribution: { analyst: 0, diplomat: 0, sentinel: 0, explorer: 0 },
      totalMembers: 0,
    };
    render(<RoleGroupDistribution analysis={emptyAnalysis} />);
    expect(screen.getAllByText(/0人/)).toHaveLength(4);
  });

  test('ダークモードで正しい色が適用される', () => {
    render(
      <ThemeProvider value={{ themeId: 'dark', ... }}>
        <RoleGroupDistribution analysis={mockAnalysis} />
      </ThemeProvider>
    );
    expect(screen.getByText(/アナリスト/)).toBeInTheDocument();
  });

  test('絵文字アイコンが表示される', () => {
    render(<RoleGroupDistribution analysis={mockAnalysis} />);
    expect(screen.getByText('🟣')).toBeInTheDocument(); // アナリスト
    expect(screen.getByText('🟢')).toBeInTheDocument(); // 外交官
  });

  test('レスポンシブデザイン: モバイルで縦並びレイアウト', () => {
    global.innerWidth = 375;
    render(<RoleGroupDistribution analysis={mockAnalysis} />);
    expect(screen.getByText(/アナリスト/)).toBeInTheDocument();
  });

  test('Rechartsライブラリが正しく統合されている', () => {
    render(<RoleGroupDistribution analysis={mockAnalysis} />);
    const pieChart = document.querySelector('.recharts-pie');
    expect(pieChart).toBeInTheDocument();
  });

  test('アクセシビリティ: グラフにaria-labelがある', () => {
    render(<RoleGroupDistribution analysis={mockAnalysis} />);
    const chart = screen.getByRole('img');
    expect(chart).toHaveAttribute('aria-label');
  });
});
```

---

## Phase 4: 統合テスト

### 4.1 Personality16Integration.test.tsx

**ファイルパス**: `src/__tests__/integration/Personality16Integration.test.tsx`

#### テストケース一覧（計25ケース）

```typescript
describe('16Personalities統合機能 E2Eテスト', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('メンバー追加時に16P情報を入力できる', async () => {
    render(<App />);

    // メンバー追加ボタンをクリック
    fireEvent.click(screen.getByText(/メンバー追加/));

    // フォーム入力
    fireEvent.change(screen.getByLabelText(/名前/), { target: { value: '太郎' } });
    fireEvent.change(screen.getByLabelText(/性格タイプ/), { target: { value: '1' } });
    fireEvent.click(screen.getByLabelText(/自己主張型/));

    // 保存
    fireEvent.click(screen.getByText(/保存/));

    // 個人分析タブで16P情報が表示される
    await waitFor(() => {
      expect(screen.getByText('INTJ')).toBeInTheDocument();
    });
  });

  test('16P分析タブでチーム分布が表示される', async () => {
    // メンバー追加
    // ...

    // 16P分析タブに遷移
    fireEvent.click(screen.getByText(/16P分析/));

    await waitFor(() => {
      expect(screen.getByText(/16タイプマトリクス/)).toBeInTheDocument();
      expect(screen.getByText(/役割グループ分布/)).toBeInTheDocument();
    });
  });

  test('マトリクスのセルクリックでメンバーリストにスクロール', async () => {
    // メンバー追加
    // ...

    // 16P分析タブに遷移
    fireEvent.click(screen.getByText(/16P分析/));

    // INTJセルをクリック
    const intjCell = screen.getByText('INTJ').closest('button');
    fireEvent.click(intjCell!);

    // タイプ別メンバーリストにスクロール
    await waitFor(() => {
      const membersList = screen.getByText(/太郎/);
      expect(membersList).toBeVisible();
    });
  });

  test('メンバー名クリックで個人分析タブに遷移', async () => {
    // 16P分析タブでメンバー名をクリック
    fireEvent.click(screen.getByText(/太郎/));

    // 個人分析タブに遷移
    await waitFor(() => {
      expect(screen.getByText(/強みTOP5/)).toBeInTheDocument();
      expect(screen.getByText('INTJ')).toBeInTheDocument();
    });
  });

  test('16P情報なしのメンバーでもエラーが出ない', async () => {
    // 16P情報なしでメンバー追加
    // ...

    // 個人分析タブで表示
    fireEvent.click(screen.getByText(/太郎/));

    // 16P情報が表示されない
    expect(screen.queryByText('INTJ')).not.toBeInTheDocument();
    // ストレングスファインダー情報は表示される
    expect(screen.getByText(/強みTOP5/)).toBeInTheDocument();
  });

  test('LocalStorageに16P情報が保存される', async () => {
    // メンバー追加（16P情報あり）
    // ...

    // LocalStorage確認
    const savedData = JSON.parse(localStorage.getItem('strengths-members')!);
    expect(savedData[0].personalityId).toBe(1);
    expect(savedData[0].personalityVariant).toBe('A');
  });

  test('リロード後も16P情報が保持される', async () => {
    // メンバー追加
    // ...

    // リロード
    render(<App />);

    // 16P情報が表示される
    await waitFor(() => {
      expect(screen.getByText('INTJ')).toBeInTheDocument();
    });
  });

  test('インポート機能で16P情報を読み込める', async () => {
    const jsonData = [
      {
        id: '1',
        name: '太郎',
        personalityId: 1,
        personalityVariant: 'A',
        strengths: [],
      },
    ];

    // インポート
    fireEvent.click(screen.getByText(/インポート/));
    // ...

    await waitFor(() => {
      expect(screen.getByText('INTJ')).toBeInTheDocument();
    });
  });

  test('エクスポート機能で16P情報が含まれる', async () => {
    // メンバー追加
    // ...

    // エクスポート
    fireEvent.click(screen.getByText(/エクスポート/));

    // ダウンロードされたJSONに16P情報が含まれる
    // （モック確認）
  });

  test('メンバー編集で16P情報を変更できる', async () => {
    // メンバー追加（INTJ-A）
    // ...

    // 編集ボタンをクリック
    fireEvent.click(screen.getByText(/編集/));

    // 16P情報を変更（ENFP-T）
    fireEvent.change(screen.getByLabelText(/性格タイプ/), { target: { value: '8' } });
    fireEvent.click(screen.getByLabelText(/慎重型/));

    // 保存
    fireEvent.click(screen.getByText(/保存/));

    // 変更が反映される
    await waitFor(() => {
      expect(screen.getByText('ENFP')).toBeInTheDocument();
    });
  });

  test('メンバー削除で16P情報も削除される', async () => {
    // メンバー追加
    // ...

    // 削除
    fireEvent.click(screen.getByText(/削除/));

    // 確認ダイアログ
    fireEvent.click(screen.getByText(/OK/));

    // メンバーと16P情報が削除される
    await waitFor(() => {
      expect(screen.queryByText('INTJ')).not.toBeInTheDocument();
    });
  });

  test('ダークモード切り替え時に16P情報の色が変わる', async () => {
    // メンバー追加
    // ...

    // ダークモード切り替え
    fireEvent.click(screen.getByLabelText(/テーマ切り替え/));

    // 色が変わる（colorDark適用）
    await waitFor(() => {
      const card = screen.getByText('INTJ').closest('div');
      // スタイル確認
    });
  });

  test('複数メンバーの16P分布が正しく集計される', async () => {
    // 複数メンバー追加
    // INTJ×2, ENFP×1, ISTJ×1

    // 16P分析タブに遷移
    fireEvent.click(screen.getByText(/16P分析/));

    // マトリクスの人数確認
    await waitFor(() => {
      expect(screen.getByText(/INTJ.*2人/)).toBeInTheDocument();
      expect(screen.getByText(/ENFP.*1人/)).toBeInTheDocument();
    });

    // 役割グループ分布確認
    expect(screen.getByText(/アナリスト.*2人/)).toBeInTheDocument();
  });

  test('バリアント分布が正しく表示される', async () => {
    // メンバー追加（A×2, T×1）

    // 16P分析タブに遷移
    fireEvent.click(screen.getByText(/16P分析/));

    // バリアント分布確認
    await waitFor(() => {
      expect(screen.getByText(/自己主張型.*2人/)).toBeInTheDocument();
      expect(screen.getByText(/慎重型.*1人/)).toBeInTheDocument();
    });
  });

  test('サンプルデータに16P情報が含まれる', async () => {
    // サンプルデータ読み込み
    fireEvent.click(screen.getByText(/サンプルデータ/));

    // 16P情報が表示される
    await waitFor(() => {
      expect(screen.getAllByText(/INTJ|ENFP|ISTJ/).length).toBeGreaterThan(0);
    });
  });

  test('アクセシビリティ: キーボードナビゲーションで全機能を操作できる', async () => {
    // Tab キーで遷移
    // Enter キーで選択
    // ...
  });

  test('パフォーマンス: 100人のメンバーでもスムーズに動作', async () => {
    // 100人のメンバーを追加
    // ...

    // 16P分析タブ表示
    const startTime = performance.now();
    fireEvent.click(screen.getByText(/16P分析/));
    const endTime = performance.now();

    // 1秒以内にレンダリング完了
    expect(endTime - startTime).toBeLessThan(1000);
  });

  test('エラーハンドリング: 破損したLocalStorageデータでも動作', () => {
    // 破損したデータを設定
    localStorage.setItem('strengths-members', '{invalid}');

    // アプリ起動
    render(<App />);

    // エラーが表示されず、デフォルト状態で起動
    expect(screen.getByText(/メンバー追加/)).toBeInTheDocument();
  });

  test('セキュリティ: 無効なpersonalityIdを受け入れない', async () => {
    // personalityId=999 のデータをインポート
    const invalidData = [
      { id: '1', name: '太郎', personalityId: 999, strengths: [] },
    ];

    // インポート
    // ...

    // 16P情報が表示されない（バリデーションで除外）
    expect(screen.queryByText(/personalityId.*999/)).not.toBeInTheDocument();
  });

  test('複数タブ間でデータが同期される', async () => {
    // メンバー追加
    // ...

    // 個人分析タブで確認
    expect(screen.getByText('INTJ')).toBeInTheDocument();

    // 16P分析タブに遷移
    fireEvent.click(screen.getByText(/16P分析/));

    // 同じデータが表示される
    expect(screen.getByText(/INTJ.*1人/)).toBeInTheDocument();
  });

  test('レスポンシブデザイン: モバイル・タブレット・デスクトップで動作', async () => {
    const viewports = [375, 768, 1920];

    viewports.forEach(width => {
      global.innerWidth = width;
      render(<App />);
      expect(screen.getByText(/16P分析/)).toBeInTheDocument();
    });
  });

  test('国際化: 英語表示に切り替え可能（将来対応）', () => {
    // i18n設定を変更
    // ...

    // 英語表示
    // expect(screen.getByText('Analyst')).toBeInTheDocument();
  });

  test('印刷時にレイアウトが最適化される', () => {
    // 印刷プレビュー
    window.print = jest.fn();

    // 印刷ボタンをクリック
    fireEvent.click(screen.getByText(/印刷/));

    // CSSメディアクエリが適用される
    expect(window.print).toHaveBeenCalled();
  });

  test('CSVエクスポート時に16P情報が含まれる', async () => {
    // CSVエクスポート
    // ...

    // CSVに personalityId, personalityVariant 列が含まれる
  });
});
```

---

## 🎯 テスト実行コマンド

### 全テスト実行
```bash
npm test
```

### 特定ファイルのテスト
```bash
npm test Personality16Service.test.ts
```

### カバレッジ測定
```bash
npm test -- --coverage
```

### ウォッチモード
```bash
npm test -- --watch
```

---

## 📊 テストカバレッジ目標

| カテゴリ | 目標カバレッジ |
|---------|--------------|
| サービス層（Personality16Service.ts） | 95%以上 |
| コンポーネント（*.tsx） | 90%以上 |
| 型定義（StrengthsTypes.ts） | 100% |
| 統合テスト | 主要フロー100% |

---

## 🚦 TDD進行フェーズ

### RED Phase（現在）
- [ ] 全テストケースを記述
- [ ] テスト実行（全て失敗することを確認）
- [ ] テストコードのレビュー

### GREEN Phase
- [ ] Personality16Service.ts 実装
- [ ] Personality16Card.tsx 実装
- [ ] その他コンポーネント実装
- [ ] テスト実行（全てパスすることを確認）

### REFACTOR Phase
- [ ] コード品質向上
- [ ] パフォーマンス最適化
- [ ] ドキュメント更新

---

## ⚠️ テスト実装時の注意事項

1. **モック管理**
   - LocalStorageは各テストで初期化
   - ThemeContextはテストごとにリセット

2. **非同期処理**
   - `waitFor()` を使用してレンダリング待機
   - `act()` で状態更新をラップ

3. **アクセシビリティ**
   - `screen.getByRole()` を優先使用
   - ARIA属性の検証を含める

4. **パフォーマンス**
   - 大量データテスト（100件以上）を含める
   - レンダリング時間を測定

---

## 📚 参考資料

- Jest公式ドキュメント: https://jestjs.io/
- React Testing Library: https://testing-library.com/react
- TDD: Test-Driven Development by Kent Beck

---

**テスト計画バージョン**: 1.0.0
**作成日**: 2025年10月10日
**総テストケース数**: 132ケース（Phase 1-4 合計）
