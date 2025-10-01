// src/services/StrengthsService.ts
import { Strength, StrengthGroup, MemberStrengths, StrengthsAnalysisResult, RankedStrength } from '../models/StrengthsTypes';

// 34の資質データ
export const STRENGTHS_DATA: Strength[] = [
  // 実行力（EXECUTING）
  { id: 1, name: "達成欲", description: "目標を達成するために懸命に働き、生産性を重視する資質", group: StrengthGroup.EXECUTING },
  { id: 2, name: "公平性", description: "すべての人を平等に扱い、ルールを公平に適用する資質", group: StrengthGroup.EXECUTING },
  { id: 3, name: "回復志向", description: "問題を特定し解決することで物事を本来あるべき姿に戻すことができる資質", group: StrengthGroup.EXECUTING },
  { id: 4, name: "アレンジ", description: "既存のやり方だけではなく、効率的に成果を生み出すために考えを巡らせることができる資質", group: StrengthGroup.EXECUTING },
  { id: 5, name: "慎重さ", description: "リスクを評価し、慎重に判断を下す資質", group: StrengthGroup.EXECUTING },
  { id: 6, name: "責任感", description: "約束したことを必ず実行し、信頼される資質", group: StrengthGroup.EXECUTING },
  { id: 7, name: "信念", description: "「世の中ややり方はこうあるべきだ」という価値観や倫理観、道徳観を信じる資質", group: StrengthGroup.EXECUTING },
  { id: 8, name: "規律性", description: "構造と秩序を作り出し、計画に従って効率的に行動する資質", group: StrengthGroup.EXECUTING },
  { id: 9, name: "目標志向", description: "決められた目標に向けて工夫をしながら突き進む資質", group: StrengthGroup.EXECUTING },

  // 影響力（INFLUENCING）
  { id: 10, name: "活発性", description: "不確定な将来に不安を覚えるよりも、アイデアを行動に移し、物事を始める資質", group: StrengthGroup.INFLUENCING },
  { id: 11, name: "競争性", description: "他者と競い合い、常に一番・一位を目指すことができる資質", group: StrengthGroup.INFLUENCING },
  { id: 12, name: "自我", description: "自分の能力と判断に自信を持つ資質", group: StrengthGroup.INFLUENCING },
  { id: 13, name: "指令性", description: "自分がやるべきことに関して対立を恐れず、何事も自分で選択して決める資質", group: StrengthGroup.INFLUENCING },
  { id: 14, name: "最上志向", description: "何事にもより良くなるように改善・向上を目指す資質", group: StrengthGroup.INFLUENCING },
  { id: 15, name: "社交性", description: "人との新たな出会いを求めて、次々とさまざまな人とつながっていく資質", group: StrengthGroup.INFLUENCING },
  { id: 16, name: "コミュニケーション", description: "自分の考えや感情を言葉で表現し、他者と対話で納得させる影響力を持つ資質", group: StrengthGroup.INFLUENCING },
  { id: 17, name: "自己確信", description: "自分の人生や自分が関わる物事をうまく進行することに自信があることを指す資質", group: StrengthGroup.INFLUENCING },

  // 人間関係構築力（RELATIONSHIP BUILDING）
  { id: 18, name: "適応性", description: "「未来は常に変わるもの」という感覚を持っており、柔軟に対応する資質", group: StrengthGroup.RELATIONSHIP_BUILDING },
  { id: 19, name: "共感性", description: "他者の感情や視点を自分事のように理解する資質", group: StrengthGroup.RELATIONSHIP_BUILDING },
  { id: 20, name: "個別化", description: "一人ひとりの個性や違いに目を向けて、資質や才能を見抜くことができる資質", group: StrengthGroup.RELATIONSHIP_BUILDING },
  { id: 21, name: "ポジティブ", description: "楽観的で、周囲にエネルギーを与える資質", group: StrengthGroup.RELATIONSHIP_BUILDING },
  { id: 22, name: "調和性", description: "対立を避け、コンセンサスを求める資質", group: StrengthGroup.RELATIONSHIP_BUILDING },
  { id: 23, name: "運命思考", description: "「人も物事もすべてどこかでつながっている」という感覚であり、出会いや出来事に必然を見出す資質", group: StrengthGroup.RELATIONSHIP_BUILDING },
  { id: 24, name: "成長促進", description: "どんな人でも磨き続ければ何か光るものがあればあると信じて関わりを持つ資質", group: StrengthGroup.RELATIONSHIP_BUILDING },
  { id: 25, name: "包含", description: "すべての人を受け入れ、一人ひとりに居場所を与えられる資質", group: StrengthGroup.RELATIONSHIP_BUILDING },
  { id: 26, name: "親密性", description: "深い関係を築き、一人ひとりと深い関係性を構築する資質", group: StrengthGroup.RELATIONSHIP_BUILDING },

  // 戦略的思考力（STRATEGIC THINKING）
  { id: 27, name: "分析思考", description: "物事に筋が通っており、論理的に考えることができる資質", group: StrengthGroup.STRATEGIC_THINKING },
  { id: 28, name: "着想", description: "何かと何かを組み合わせて、新しい何かを生み出すことができる資質", group: StrengthGroup.STRATEGIC_THINKING },
  { id: 29, name: "学習欲", description: "新しい知識やスキルを習得することに喜びを見出す資質", group: StrengthGroup.STRATEGIC_THINKING },
  { id: 30, name: "原点思考", description: "過去の経験から学び、歴史的視点で物事を理解する資質", group: StrengthGroup.STRATEGIC_THINKING },
  { id: 31, name: "収集心", description: "情報や知識を集め、蓄積する資質", group: StrengthGroup.STRATEGIC_THINKING },
  { id: 32, name: "戦略性", description: "複数の選択肢を検討し、最善の道筋を見つける資質", group: StrengthGroup.STRATEGIC_THINKING },
  { id: 33, name: "未来志向", description: "未来のビジョンを描き、それに向かって行動する資質", group: StrengthGroup.STRATEGIC_THINKING },
  { id: 34, name: "内省", description: "思考し、深く考えることができ、本質を見抜くことができる資質", group: StrengthGroup.STRATEGIC_THINKING },
];

// グループ名の日本語表記
export const GROUP_LABELS = {
  [StrengthGroup.EXECUTING]: "実行力",
  [StrengthGroup.INFLUENCING]: "影響力",
  [StrengthGroup.RELATIONSHIP_BUILDING]: "人間関係構築力",
  [StrengthGroup.STRATEGIC_THINKING]: "戦略的思考力"
};

// グループ別のカラー
export const GROUP_COLORS = {
  [StrengthGroup.EXECUTING]: "#9B59B6", // 紫系
  [StrengthGroup.INFLUENCING]: "#D6813E", // オレンジ系
  [StrengthGroup.RELATIONSHIP_BUILDING]: "#4A6FDC", // 青系
  [StrengthGroup.STRATEGIC_THINKING]: "#4C9F70" // 緑系
};

class StrengthsService {
  private readonly STORAGE_KEY = 'strengths_members';

  /**
   * メンバーとその強みのリストを取得する
   */
  public getMembers(): MemberStrengths[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (!stored) return [];

    try {
      return JSON.parse(stored);
    } catch (err) {
      console.error('メンバーデータの解析に失敗しました:', err);
      return [];
    }
  }

  /**
   * メンバーを追加または更新する
   */
  public saveMember(member: MemberStrengths): MemberStrengths[] {
    const members = this.getMembers();
    const index = members.findIndex(m => m.id === member.id);

    if (index >= 0) {
      members[index] = member;
    } else {
      members.push(member);
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(members));
    return members;
  }

  /**
   * メンバーを削除する
   */
  public deleteMember(id: string): MemberStrengths[] {
    const members = this.getMembers();
    const filtered = members.filter(m => m.id !== id);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  }

  /**
   * メンバーIDから強みの詳細を取得する
   */
  public getMemberStrengths(memberId: string): Strength[] {
    const members = this.getMembers();
    const member = members.find(m => m.id === memberId);

    if (!member) return [];

    return member.strengths.map(rankedStrength =>
      STRENGTHS_DATA.find(s => s.id === rankedStrength.id) || STRENGTHS_DATA[0]
    );
  }

  /**
   * 部署コードでフィルタリングしたメンバーリストを取得
   */
  public getMembersByDepartment(department: string): MemberStrengths[] {
    const members = this.getMembers();
    if (department === 'all') return members;
    return members.filter(m => m.department === department);
  }

  /**
   * 複数メンバーの強み分析を実行
   */
  public analyzeStrengths(memberIds: string[]): StrengthsAnalysisResult {
    const members = this.getMembers();
    const targetMembers = members.filter(m => memberIds.includes(m.id));

    // グループ分布の初期化
    const groupDistribution = {
      [StrengthGroup.EXECUTING]: 0,
      [StrengthGroup.INFLUENCING]: 0,
      [StrengthGroup.RELATIONSHIP_BUILDING]: 0,
      [StrengthGroup.STRATEGIC_THINKING]: 0
    };

    // 強み出現頻度の初期化
    const strengthsFrequency: {[key: number]: number} = {};
    // 強みを持つメンバー名の初期化
    const strengthsMembers: {[key: number]: string[]} = {};
    
    STRENGTHS_DATA.forEach(s => {
      strengthsFrequency[s.id] = 0;
      strengthsMembers[s.id] = [];
    });

    // 各メンバーの強みをカウント
    targetMembers.forEach(member => {
      member.strengths.forEach(rankedStrength => {
        const strength = STRENGTHS_DATA.find(s => s.id === rankedStrength.id);
        if (strength) {
          strengthsFrequency[rankedStrength.id]++;
          strengthsMembers[rankedStrength.id].push(member.name);
          groupDistribution[strength.group]++;
        }
      });
    });

    // 上位の強みを抽出
    const topStrengthIds = Object.entries(strengthsFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)  // 上位10個の強みを抽出
      .map(entry => parseInt(entry[0]));

    const topStrengths = topStrengthIds.map(id =>
      STRENGTHS_DATA.find(s => s.id === id) || STRENGTHS_DATA[0]
    );

    return {
      groupDistribution,
      strengthsFrequency,
      strengthsMembers,
      topStrengths
    };
  }

  /**
   * 資質IDから資質情報を取得
   */
  public getStrengthById(id: number): Strength | undefined {
    return STRENGTHS_DATA.find(s => s.id === id);
  }

  /**
   * 全ての資質情報を取得
   */
  public getAllStrengths(): Strength[] {
    return [...STRENGTHS_DATA];
  }

  /**
   * グループごとの資質リストを取得
   */
  public getStrengthsByGroup(group: StrengthGroup): Strength[] {
    return STRENGTHS_DATA.filter(s => s.group === group);
  }

  /**
   * メンバーデータをJSONとしてエクスポート
   */
  public exportMembers(): string {
    const members = this.getMembers();
    return JSON.stringify(members, null, 2);
  }

  /**
   * JSONからメンバーデータをインポート
   * @param jsonData JSONデータ
   * @returns インポートされたメンバーリスト
   */
  public importMembers(jsonData: string): MemberStrengths[] {
    try {
      const members = JSON.parse(jsonData) as MemberStrengths[];
      
      // バリデーション
      if (!Array.isArray(members)) {
        throw new Error('インポートデータが配列ではありません');
      }
      
      // 各メンバーの形式を検証
      members.forEach(member => {
        if (!member.id || !member.name || !member.department || !Array.isArray(member.strengths)) {
          throw new Error('メンバーデータの形式が不正です');
        }
        
        // 強みのバリデーション
        member.strengths.forEach(strength => {
          if (typeof strength.id !== 'number' || typeof strength.score !== 'number' || 
              strength.score < 1 || strength.score > 5) {
            throw new Error('強みデータの形式が不正です');
          }
        });
      });
      
      // 既存のデータを上書き
      localStorage.setItem(this.STORAGE_KEY, jsonData);
      return members;
    } catch (error) {
      console.error('インポート中にエラーが発生しました:', error);
      throw error;
    }
  }
}

export default new StrengthsService();
