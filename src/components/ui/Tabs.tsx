// src/components/ui/Tabs.tsx
import React, { useRef, useEffect } from 'react';

// Tabコンポーネントの型定義
interface TabProps {
  children: React.ReactNode;
  id: string;
  label: React.ReactNode;
}

// TabコンポーネントをReact.ForwardRefで型定義
export const Tab: React.FC<TabProps> = ({ children }) => {
  return <div>{children}</div>;
};

// TabsコンポーネントのProps定義
interface TabsProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Tabs: React.FC<TabsProps> = ({ children, activeTab, onTabChange }) => {
  const tabsContainerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);

  // ReactElementではなく具体的な型としてキャスト
  const tabs = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<TabProps> =>
      React.isValidElement(child) && child.type === Tab
  );

  // アクティブタブが見える位置に自動スクロール
  useEffect(() => {
    if (activeTabRef.current && tabsContainerRef.current) {
      const container = tabsContainerRef.current;
      const activeButton = activeTabRef.current;

      // タブが見える位置にスクロール（中央寄せ）
      const scrollLeft = activeButton.offsetLeft - container.offsetWidth / 2 + activeButton.offsetWidth / 2;
      container.scrollTo({
        left: Math.max(0, scrollLeft),
        behavior: 'smooth'
      });
    }
  }, [activeTab]);

  return (
    <div className="mb-4">
      {/* スクロール可能なタブコンテナ */}
      <div
        ref={tabsContainerRef}
        className="flex border-b overflow-x-auto scrollbar-hide"
        style={{
          scrollbarWidth: 'none', // Firefox
          msOverflowStyle: 'none', // IE/Edge
        }}
      >
        {tabs.map((tabElement, index) => {
          const isActive = activeTab === tabElement.props.id;
          return (
            <button
              key={index}
              ref={isActive ? activeTabRef : null}
              className={`px-3 py-2 font-medium whitespace-nowrap flex-shrink-0 text-sm md:text-base md:px-4 transition-colors ${
                isActive
                  ? "text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400"
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
              onClick={() => onTabChange(tabElement.props.id)}
            >
              {tabElement.props.label}
            </button>
          );
        })}
      </div>
      <div className="mt-4">
        {tabs.map((tabElement) => (
          activeTab === tabElement.props.id ? tabElement : null
        ))}
      </div>
    </div>
  );
};

// スクロールバー非表示用のCSSクラス（Tailwindのユーティリティで対応できない場合）
// globals.cssに以下を追加することを推奨:
// .scrollbar-hide::-webkit-scrollbar { display: none; }