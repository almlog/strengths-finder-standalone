/**
 * 分析手法の説明タブ
 *
 * @module components/strengths/AboutAnalysisTab
 * @description StrengthsFinder × MBTI 統合分析の理論的背景と使い方を説明
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Heart,
  Target,
  Users,
  TrendingUp,
  Lightbulb,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';

// アコーディオンセクションのProps
interface AccordionSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}

// アコーディオンセクションコンポーネント
const AccordionSection: React.FC<AccordionSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  icon
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-4 flex items-center justify-between bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-750 transition-colors rounded-lg"
      >
        <div className="flex items-center gap-3">
          {icon && <span className="text-blue-600 dark:text-blue-400">{icon}</span>}
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {title}
          </h3>
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-500 dark:text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="px-6 py-4 bg-white dark:bg-gray-900">
          {children}
        </div>
      )}
    </div>
  );
};

// 参考文献リンクコンポーネント
interface ReferenceProps {
  title: string;
  author: string;
  year: string;
  url?: string;
}

const Reference: React.FC<ReferenceProps> = ({ title, author, year, url }) => (
  <li className="text-sm text-gray-700 dark:text-gray-300 mb-2">
    <span className="font-medium">{author}</span> ({year}). <em>{title}</em>.
    {url && (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="ml-2 text-blue-600 dark:text-blue-400 hover:underline inline-flex items-center gap-1"
      >
        詳細 <ExternalLink className="w-3 h-3" />
      </a>
    )}
  </li>
);

// スコア区分の説明テーブル
interface ScoreTableProps {
  scoreType: 'synergy' | 'teamFit' | 'leadership';
}

const ScoreTable: React.FC<ScoreTableProps> = ({ scoreType }) => {
  const scoreDefinitions = {
    synergy: [
      { range: '85+', label: '統合型', description: 'MBTIと資質が高度に整合し、相乗効果が期待できます', color: 'text-green-700 dark:text-green-400' },
      { range: '55-84', label: 'バランス型', description: '複数の資質カテゴリが混在し、柔軟性が高い状態です', color: 'text-blue-700 dark:text-blue-400' },
      { range: '0-54', label: '多面型', description: 'MBTIと資質に乖離があり、意外性や独自性を持ちます', color: 'text-purple-700 dark:text-purple-400' },
    ],
    teamFit: [
      { range: '70+', label: 'チーム協調型', description: 'Belbinチームロールで高い適性を持ちます', color: 'text-green-700 dark:text-green-400' },
      { range: '50-69', label: 'バランス型', description: '状況に応じて柔軟に対応できます', color: 'text-blue-700 dark:text-blue-400' },
      { range: '0-49', label: '独立型', description: '個人作業や専門性の発揮に適性があります', color: 'text-purple-700 dark:text-purple-400' },
    ],
    leadership: [
      { range: '70+', label: 'リーダー型', description: '変革型リーダーシップの資質を持ちます', color: 'text-green-700 dark:text-green-400' },
      { range: '50-69', label: 'バランス型', description: '状況に応じたリーダーシップを発揮できます', color: 'text-blue-700 dark:text-blue-400' },
      { range: '0-49', label: '専門家型', description: '技術的リーダーシップやエキスパートに適性があります', color: 'text-purple-700 dark:text-purple-400' },
    ],
  };

  const data = scoreDefinitions[scoreType];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 dark:border-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">スコア範囲</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">判定</th>
            <th className="px-4 py-2 text-left text-sm font-semibold text-gray-700 dark:text-gray-300">意味</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr key={idx} className="border-t border-gray-200 dark:border-gray-700">
              <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-gray-100">{row.range}</td>
              <td className={`px-4 py-2 text-sm font-semibold ${row.color}`}>{row.label}</td>
              <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/**
 * 分析手法説明タブのメインコンポーネント
 */
const AboutAnalysisTab: React.FC = () => {
  return (
    <div className="max-w-5xl mx-auto py-6">
      {/* ヘッダー */}
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center justify-center gap-3">
          <BookOpen className="w-8 h-8 text-blue-600 dark:text-blue-400" />
          このツールについて
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400">
          メンバープロファイル分析 — StrengthsFinder × MBTI 統合分析ツール
        </p>
      </div>

      {/* ツールのビジョン */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-850 rounded-lg p-6 mb-8 border border-blue-200 dark:border-gray-700">
        <div className="flex items-start gap-4">
          <Heart className="w-6 h-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-3">
              このツールに込めた想い
            </h2>
            <div className="space-y-3 text-gray-700 dark:text-gray-300">
              <p>
                「あなたの本当の強みは何ですか？」— この問いに答えるのは、意外と難しいものです。
              </p>
              <p>
                このツールは、<strong className="text-blue-600 dark:text-blue-400">StrengthsFinder（SF資質診断）</strong>を軸に、
                <strong>「何が得意か」</strong>を明らかにします。さらに、
                <strong className="text-blue-600 dark:text-blue-400">MBTI（性格タイプ）</strong>を追加することで、
                <strong>「どのように考えるか」</strong>の視点も加わり、より深い自己理解が可能になります。
              </p>
              <p>
                目指したのは、単なる診断ツールではなく、<strong>「自己理解と対話のきっかけ」</strong>となるツールです。
                スコアが高い=優れている、ではありません。多様性こそがチームの強みであり、
                すべての人に固有の輝きがあることを、このツールを通じて実感していただきたいと思っています。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ツールの概要 */}
      <AccordionSection
        title="このツールで何ができる？"
        icon={<Target className="w-5 h-5" />}
        defaultOpen={true}
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            このツールは、<strong>StrengthsFinder（SF）の診断結果を軸に</strong>、以下の5つの分析機能を提供します。
            MBTIを追加することで、さらに詳しい分析が可能です:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-4 border border-blue-200 dark:border-gray-700">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">1. 相性スコア</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                MBTIタイプとTOP5資質の整合性を評価。性格と強みがどれだけ相乗効果を発揮するかを数値化します。
              </p>
            </div>

            <div className="bg-green-50 dark:bg-gray-800 rounded-lg p-4 border border-green-200 dark:border-gray-700">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">2. チーム適合度</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                Belbinチームロール理論に基づき、内向型・外向型を等しく評価。チームへの貢献スタイルを明らかにします。
              </p>
            </div>

            <div className="bg-purple-50 dark:bg-gray-800 rounded-lg p-4 border border-purple-200 dark:border-gray-700">
              <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">3. リーダーシップ潜在力</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                変革型リーダーシップ理論に基づく評価。リーダーや専門家としての適性を示します。
              </p>
            </div>

            <div className="bg-yellow-50 dark:bg-gray-800 rounded-lg p-4 border border-yellow-200 dark:border-gray-700">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">4. チーム特性ナラティブ</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                複数メンバーの資質分布から、チームの可能性や特徴をストーリー形式で提示します。
              </p>
            </div>

            <div className="bg-red-50 dark:bg-gray-800 rounded-lg p-4 border border-red-200 dark:border-gray-700 md:col-span-2">
              <h4 className="font-semibold text-red-900 dark:text-red-300 mb-2">5. 利益率分析（マネージャーモード）</h4>
              <p className="text-sm text-gray-700 dark:text-gray-300">
                メンバーの単価・原価情報を基に、プロジェクトやチームの収益性をシミュレーションできます。
              </p>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* 各スコアの詳細説明 */}
      <AccordionSection
        title="相性スコアの見方"
        icon={<TrendingUp className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            相性スコアは、<strong>StrengthsFinderの資質カテゴリ</strong>（何が得意か）を基に、
            MBTIが登録されている場合は<strong>MBTIの認知機能</strong>（どのように考えるか）との整合性も評価します。
          </p>

          <div className="bg-gray-50 dark:bg-gray-850 rounded-lg p-4 my-4">
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">計算方法</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              TOP5資質それぞれの相性値を、重み付けして合算します:
            </p>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
              <li><strong>TOP1資質: 50%</strong> の寄与率（最も影響が大きい）</li>
              <li><strong>TOP2資質: 30%</strong> の寄与率</li>
              <li><strong>TOP3資質: 15%</strong> の寄与率</li>
              <li><strong>TOP4-5資質: 5%</strong> の寄与率</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              ※ Gallup研究により、TOP3資質だけで行動の95%が決まることが示されています
            </p>
          </div>

          <ScoreTable scoreType="synergy" />

          <div className="bg-blue-50 dark:bg-gray-850 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">例: INTJ × 分析思考</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              INTJの内向的思考（Ti）機能は、「分析思考」「戦略性」「学習欲」といった
              <strong>ANALYTICAL資質</strong>と強く整合します。この組み合わせは<strong>統合型（85+）</strong>と評価され、
              論理的思考と分析力の相乗効果が期待できます。
            </p>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="チーム適合度の見方"
        icon={<Users className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            チーム適合度は、<strong>Belbinチームロール理論</strong>に基づき、
            <strong>内向型も外向型も等しく評価</strong>する設計になっています。
          </p>

          <div className="bg-amber-50 dark:bg-gray-850 rounded-lg p-4 border-l-4 border-amber-500">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong className="text-amber-800 dark:text-amber-400">重要:</strong>
              「外向型 = チーム向き」という誤解を避けるため、このツールでは
              <strong>内向型が得意とするBelbinロール</strong>（プラント、監視評価者、完成者など）も高く評価しています。
            </p>
          </div>

          <ScoreTable scoreType="teamFit" />

          <div className="bg-green-50 dark:bg-gray-850 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">Belbinロールの例</h4>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-2">
              <li><strong>プラント（創造者）</strong>: INTP, INFP — 革新的なアイデアを生み出す（内向型）</li>
              <li><strong>監視評価者</strong>: INTJ, ISTJ — 客観的な戦略判断を行う（内向型）</li>
              <li><strong>資源探査者</strong>: ENFP, ENTP — 外部ネットワークを活用する（外向型）</li>
              <li><strong>チームワーカー</strong>: ISFJ, ESFJ — チーム内の調整役を担う（両方）</li>
            </ul>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              効果的なチームには、多様なロールが必要です。内向型・外向型の両方が不可欠です。
            </p>
          </div>
        </div>
      </AccordionSection>

      <AccordionSection
        title="リーダーシップ潜在力の見方"
        icon={<Lightbulb className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <p className="text-gray-700 dark:text-gray-300">
            リーダーシップ潜在力は、<strong>Bass の変革型リーダーシップ理論</strong>に基づき、
            4つの要素（理想的影響力、知的刺激、個別的配慮、動機づけ）を評価します。
          </p>

          <ScoreTable scoreType="leadership" />

          <div className="bg-purple-50 dark:bg-gray-850 rounded-lg p-4 mt-4">
            <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">リーダーシップ資質の例</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-gray-700 dark:text-gray-300">
              <div>
                <strong className="text-purple-800 dark:text-purple-400">INFLUENCING資質:</strong>
                <p>指令性、自我、コミュニケーション、最上志向</p>
              </div>
              <div>
                <strong className="text-purple-800 dark:text-purple-400">STRATEGIC THINKING資質:</strong>
                <p>戦略性、未来志向、着想</p>
              </div>
              <div>
                <strong className="text-purple-800 dark:text-purple-400">EXECUTING資質:</strong>
                <p>達成欲、目標志向、責任感、規律性</p>
              </div>
              <div>
                <strong className="text-purple-800 dark:text-purple-400">RELATIONSHIP BUILDING資質:</strong>
                <p>共感性、個別化、成長促進</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 dark:bg-gray-850 rounded-lg p-4 mt-4">
            <p className="text-sm text-gray-700 dark:text-gray-300">
              <strong>注意:</strong> スコアが低い場合でも、技術的リーダーシップやエキスパートとしての
              リーダーシップなど、別の形でリーダーシップを発揮できます。
            </p>
          </div>
        </div>
      </AccordionSection>

      {/* 理論的背景 */}
      <AccordionSection
        title="理論的背景"
        icon={<BookOpen className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">StrengthsFinder（SF）</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              Donald Clifton のポジティブ心理学に基づく才能診断ツールです。
              34の資質から、<strong>「何が得意か」</strong>（行動パターン）を測定します。
              このツールの<strong>主軸となる診断</strong>です。
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-2">MBTI（Myers-Briggs Type Indicator）</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">
              Carl Jung の心理学的類型論（1921）を基に、Isabel Myers と Katharine Briggs が開発した性格診断ツールです。
              <strong>「どのように考えるか」</strong>（認知スタイル）を測定し、16の性格タイプに分類します。
              SFに追加することで、<strong>より詳しい分析</strong>が可能になります。
            </p>
          </div>

          <div className="bg-indigo-50 dark:bg-gray-850 rounded-lg p-4 border-l-4 border-indigo-500">
            <h4 className="font-semibold text-indigo-900 dark:text-indigo-300 mb-2">なぜ統合するのか？</h4>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              StrengthsFinder（SF）は「行動の強み」、MBTIは「思考の向け方」を測定します。
              SFだけでも十分な分析が可能ですが、MBTIを組み合わせることで、
              <strong>性格特性と行動傾向の相乗効果</strong>をより深く可視化できます。
            </p>
          </div>
        </div>
      </AccordionSection>

      {/* 使い方のヒント */}
      <AccordionSection
        title="使い方のヒント"
        icon={<Lightbulb className="w-5 h-5" />}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-gray-850 rounded-lg p-4">
              <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">1. データの入力</h4>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li><strong>StrengthsFinder（必須）</strong>: Gallup公式で診断が必要です</li>
                <li><strong>MBTI（任意）</strong>: 16Personalitiesなどで診断できます</li>
                <li>SFだけでも分析可能。MBTIを追加するとより詳しい分析ができます</li>
              </ul>
            </div>

            <div className="bg-green-50 dark:bg-gray-850 rounded-lg p-4">
              <h4 className="font-semibold text-green-900 dark:text-green-300 mb-2">2. 分析結果の読み方</h4>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>スコアは相対的な傾向を示します</li>
                <li>詳細はスコアをホバーして確認できます</li>
                <li>プロファイルサマリーを参考にしましょう</li>
              </ul>
            </div>

            <div className="bg-purple-50 dark:bg-gray-850 rounded-lg p-4">
              <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">3. チームシミュレーション</h4>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>ドラッグ&ドロップでチームを編成</li>
                <li>各グループの相性やバランスを確認</li>
                <li>チーム特性ナラティブを活用しましょう</li>
              </ul>
            </div>

            <div className="bg-yellow-50 dark:bg-gray-850 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-900 dark:text-yellow-300 mb-2">4. マネージャーモード</h4>
              <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 list-disc list-inside">
                <li>単価・原価情報を設定できます</li>
                <li>プロジェクトの収益性をシミュレーション</li>
                <li>最適なチーム編成の検討に活用</li>
              </ul>
            </div>
          </div>
        </div>
      </AccordionSection>

      {/* 注意事項 */}
      <div className="bg-red-50 dark:bg-gray-850 rounded-lg p-6 border-l-4 border-red-500 mb-8">
        <div className="flex items-start gap-4">
          <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-300 mb-2">
              重要な注意事項
            </h3>
            <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <li>
                <strong>このツールは心理測定学的に検証済みの診断ツールではありません。</strong>
                スコアは相対的な傾向を示すものであり、絶対的な評価基準ではありません。
              </li>
              <li>
                <strong>スコアが低い = 能力が低い、ではありません。</strong>
                多様性こそがチームの強みであり、すべてのスコアが高い必要はありません。
              </li>
              <li>
                <strong>推奨される使用方法:</strong>
                自己理解のツールとして、1on1やチームビルディングの対話のきっかけとして、
                他の評価手法と併用して活用してください。
              </li>
              <li>
                <strong>強制的な配置転換の根拠としては使用しないでください。</strong>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 参考文献 */}
      <AccordionSection
        title="参考文献"
        icon={<BookOpen className="w-5 h-5" />}
      >
        <div className="space-y-6">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">MBTI関連</h4>
            <ul className="space-y-2">
              <Reference
                author="Jung, C. G."
                year="1921"
                title="Psychological Types"
                url="https://archive.org/details/psychological_types"
              />
              <Reference
                author="Myers, I. B., & Myers, P. B."
                year="1995"
                title="Gifts Differing: Understanding Personality Type"
                url="https://books.google.com/books/about/Gifts_Differing.html?id=WfR8DAAAQBAJ"
              />
              <Reference
                author="Quenk, N. L."
                year="2009"
                title="Essentials of Myers-Briggs Type Indicator Assessment"
                url="https://www.wiley.com/en-us/Essentials%2Bof%2BMyers%2BBriggs%2BType%2BIndicator%2BAssessment%252C%2B2nd%2BEdition-p-9780470343906"
              />
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">StrengthsFinder（SF）関連</h4>
            <ul className="space-y-2">
              <Reference
                author="Rath, T."
                year="2007"
                title="StrengthsFinder 2.0"
                url="https://store.gallup.com/product/strengthsfinder-20/01tPa00000QhY36IAF"
              />
              <Reference
                author="Buckingham, M., & Clifton, D. O."
                year="2001"
                title="Now, Discover Your Strengths"
                url="https://www.gallup.com/cliftonstrengths/en/286556/ndys.aspx"
              />
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">リーダーシップ関連</h4>
            <ul className="space-y-2">
              <Reference
                author="Bass, B. M."
                year="1985"
                title="Leadership and Performance Beyond Expectations"
                url="https://archive.org/details/leadershipperfor0000bass"
              />
              <Reference
                author="Northouse, P. G."
                year="2018"
                title="Leadership: Theory and Practice (8th ed.)"
                url="https://books.google.com/books/about/Leadership.html?id=HJ08DwAAQBAJ"
              />
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">チーム理論関連</h4>
            <ul className="space-y-2">
              <Reference
                author="Belbin, R. M."
                year="1981"
                title="Management Teams: Why They Succeed or Fail"
                url="https://www.taylorfrancis.com/books/mono/10.4324/9780080963594/management-teams-meredith-belbin"
              />
              <Reference
                author="Hackman, J. R."
                year="2002"
                title="Leading Teams: Setting the Stage for Great Performances"
                url="https://books.google.com/books/about/Leading_Teams.html?id=snfoCQAAQBAJ"
              />
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-gray-900 dark:text-gray-100 mb-3">ポジティブ心理学関連</h4>
            <ul className="space-y-2">
              <Reference
                author="Seligman, M. E. P., & Csikszentmihalyi, M."
                year="2000"
                title="Positive psychology: An introduction. American Psychologist, 55(1), 5-14"
                url="https://doi.org/10.1037/0003-066X.55.1.5"
              />
            </ul>
          </div>
        </div>
      </AccordionSection>

      {/* フッター */}
      <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700 text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          最終更新: 2025-11-05 | バージョン: 1.3.1
        </p>
        <p className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          MBTI® は Myers-Briggs Type Indicator の商標です。<br />
          StrengthsFinder® は Gallup, Inc. の商標です。
        </p>
      </div>
    </div>
  );
};

export default AboutAnalysisTab;
