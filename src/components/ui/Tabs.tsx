// src/components/ui/Tabs.tsx
import React from 'react';

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
  // ReactElementではなく具体的な型としてキャスト
  const tabs = React.Children.toArray(children).filter(
    (child): child is React.ReactElement<TabProps> => 
      React.isValidElement(child) && child.type === Tab
  );

  return (
    <div className="mb-4">
      <div className="flex border-b">
        {tabs.map((tabElement, index) => (
          <button
            key={index}
            className={`px-4 py-2 font-medium ${
              activeTab === tabElement.props.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => onTabChange(tabElement.props.id)}
          >
            {tabElement.props.label}
          </button>
        ))}
      </div>
      <div className="mt-4">
        {tabs.map((tabElement) => (
          activeTab === tabElement.props.id ? tabElement : null
        ))}
      </div>
    </div>
  );
};