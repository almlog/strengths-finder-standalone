/**
 * WelcomeModal Component
 *
 * 初回ログイン時に表示される説明モーダル
 * 3ステップでシステムの概要・機能・利用開始方法を説明
 */

import React, { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  X,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  Users,
  Shuffle,
  Clock,
  Sparkles,
  UserPlus,
  KeyRound,
  LogIn,
} from 'lucide-react';
import { STORAGE_KEYS } from '../../constants/storage';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FEATURES = [
  {
    title: '個人分析',
    description: '34資質とMBTIを組み合わせた個人プロファイル分析',
    image: `${process.env.PUBLIC_URL}/images/onboarding/onboarding-personal.png`,
    Icon: BarChart3,
  },
  {
    title: 'チーム分析',
    description: '部門やメンバーを選択してチーム全体の傾向を可視化',
    image: `${process.env.PUBLIC_URL}/images/onboarding/onboarding-team.png`,
    Icon: Users,
  },
  {
    title: 'チームシミュレーション',
    description: 'メンバーを自由に組み合わせてチーム編成をシミュレーション',
    image: `${process.env.PUBLIC_URL}/images/onboarding/onboarding-simulation.png`,
    Icon: Shuffle,
  },
  {
    title: '勤怠分析',
    description: '勤怠データから働き方の傾向を分析',
    image: `${process.env.PUBLIC_URL}/images/onboarding/onboarding-attendance.png`,
    Icon: Clock,
  },
  {
    title: '資質分析',
    description: '4カテゴリに分類された資質の分布と傾向を分析',
    image: `${process.env.PUBLIC_URL}/images/onboarding/onboarding-strengths.png`,
    Icon: Sparkles,
  },
] as const;

const STEPS = [
  {
    Icon: UserPlus,
    title: 'アカウント作成',
    link: '/register',
    description: 'ログイン画面の「アカウント作成」から会社メールアドレスを登録',
  },
  {
    Icon: KeyRound,
    title: 'パスワードを設定',
    description: '届いた確認メールのリンクからパスワードを設定する',
  },
  {
    Icon: LogIn,
    title: 'ログイン後',
    description: 'ログイン後「このシステムについて」タブで詳しい使い方を確認',
  },
] as const;

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleClose = useCallback(() => {
    localStorage.setItem(STORAGE_KEYS.WELCOME_SHOWN, 'true');
    setCurrentStep(0);
    onClose();
  }, [onClose]);

  const handleOverlayClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget) {
        handleClose();
      }
    },
    [handleClose]
  );

  if (!isOpen) return null;

  const totalSteps = 3;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      data-testid="welcome-overlay"
      onClick={handleOverlayClick}
    >
      <div
        className="relative w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-xl shadow-2xl"
        data-testid="welcome-modal-content"
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          aria-label="閉じる"
          className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
        >
          <X size={20} />
        </button>

        {/* Content */}
        <div className="p-8">
          {currentStep === 0 && <StepWelcome />}
          {currentStep === 1 && <StepFeatures />}
          {currentStep === 2 && <StepGettingStarted />}
        </div>

        {/* Footer: indicators + navigation */}
        <div className="flex items-center justify-between px-8 pb-6">
          {/* Step indicators */}
          <div className="flex gap-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                data-testid={`step-indicator-${i}`}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  i === currentStep
                    ? 'bg-blue-500'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>

          {/* Navigation buttons */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="flex items-center gap-1 px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <ChevronLeft size={16} />
                戻る
              </button>
            )}
            {currentStep < totalSteps - 1 ? (
              <button
                onClick={() => setCurrentStep((s) => s + 1)}
                className="flex items-center gap-1 px-5 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                次へ
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={handleClose}
                className="px-5 py-2 text-sm bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                はじめる
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/** Step 1: ようこそ */
const StepWelcome: React.FC = () => (
  <div className="text-center py-6">
    <div className="flex justify-center mb-6">
      <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center">
        <BarChart3 size={32} className="text-blue-500" />
      </div>
    </div>
    <h2 className="text-2xl font-bold mb-3 text-gray-900 dark:text-white">
      メンバープロファイル分析ツール
    </h2>
    <p className="text-gray-600 dark:text-gray-400 leading-relaxed max-w-md mx-auto">
      StrengthsFinder（34資質）とMBTI（性格タイプ）を組み合わせた
      統合分析プラットフォームです。
      メンバーの強みを可視化し、チーム力を最大化します。
    </p>
  </div>
);

/** Step 2: できること */
const StepFeatures: React.FC = () => (
  <div>
    <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
      できること
    </h2>
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {FEATURES.map((feature) => (
        <FeatureCard key={feature.title} feature={feature} />
      ))}
    </div>
  </div>
);

const FeatureCard: React.FC<{ feature: (typeof FEATURES)[number] }> = ({
  feature,
}) => {
  const [imgError, setImgError] = useState(false);
  const { Icon } = feature;

  return (
    <div className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 transition-colors">
      {!imgError ? (
        <img
          src={feature.image}
          alt={feature.title}
          width={400}
          height={200}
          className="w-full h-36 object-contain rounded mb-2 bg-gray-100 dark:bg-gray-700"
          onError={() => setImgError(true)}
        />
      ) : (
        <div className="w-full h-36 rounded mb-2 bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
          <Icon size={32} className="text-gray-400 dark:text-gray-500" />
        </div>
      )}
      <h3 className="font-semibold text-sm text-gray-900 dark:text-white">
        {feature.title}
      </h3>
      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
        {feature.description}
      </p>
    </div>
  );
};

/** Step 3: はじめかた */
const StepGettingStarted: React.FC = () => (
  <div>
    <h2 className="text-xl font-bold mb-6 text-gray-900 dark:text-white">
      はじめかた
    </h2>
    <div className="space-y-5">
      {STEPS.map((step, i) => {
        const { Icon } = step;
        return (
          <div key={step.title} className="flex items-start gap-4">
            <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center text-blue-500 font-bold">
              {i + 1}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Icon size={16} className="text-blue-500" />
                {'link' in step && step.link ? (
                  <Link
                    to={step.link}
                    className="font-semibold text-blue-500 hover:underline"
                  >
                    {step.title}
                  </Link>
                ) : (
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {step.title}
                  </h3>
                )}
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {step.description}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

export default WelcomeModal;
