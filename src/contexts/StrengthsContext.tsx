// src/contexts/StrengthsContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import StrengthsService from '../services/StrengthsService';
import { MemberStrengths, StrengthsAnalysisResult } from '../models/StrengthsTypes';

interface StrengthsContextProps {
  members: MemberStrengths[];
  selectedMemberIds: string[];
  selectedDepartment: string;
  analysisResult: StrengthsAnalysisResult | null;
  loading: boolean;
  error: string | null;
  addOrUpdateMember: (member: MemberStrengths) => void;
  deleteMember: (id: string) => void;
  toggleMemberSelection: (id: string) => void;
  setSelectedDepartment: (department: string) => void;
  analyzeSelected: () => void;
  analyzeDepartment: (department: string) => void;
  exportData: () => string;
  importData: (jsonData: string) => void;
}

const StrengthsContext = createContext<StrengthsContextProps | undefined>(undefined);

export const useStrengths = () => {
  const context = useContext(StrengthsContext);
  if (!context) {
    throw new Error('useStrengths must be used within a StrengthsProvider');
  }
  return context;
};

interface StrengthsProviderProps {
  children: ReactNode;
}

export const StrengthsProvider: React.FC<StrengthsProviderProps> = ({ children }) => {
  const [members, setMembers] = useState<MemberStrengths[]>([]);
  const [selectedMemberIds, setSelectedMemberIds] = useState<string[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [analysisResult, setAnalysisResult] = useState<StrengthsAnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // 初期データの読み込み
  useEffect(() => {
    try {
      const loadedMembers = StrengthsService.getMembers();
      setMembers(loadedMembers);
    } catch (err) {
      setError('メンバーデータの読み込みに失敗しました');
      console.error(err);
    }
  }, []);

  // メンバーの追加または更新
  const addOrUpdateMember = (member: MemberStrengths) => {
    try {
      const updatedMembers = StrengthsService.saveMember(member);
      setMembers(updatedMembers);
    } catch (err) {
      setError('メンバーの保存に失敗しました');
      console.error(err);
    }
  };

  // メンバーの削除
  const deleteMember = (id: string) => {
    try {
      const updatedMembers = StrengthsService.deleteMember(id);
      setMembers(updatedMembers);
      setSelectedMemberIds(prev => prev.filter(memberId => memberId !== id));
    } catch (err) {
      setError('メンバーの削除に失敗しました');
      console.error(err);
    }
  };

  // メンバー選択の切り替え
  const toggleMemberSelection = (id: string) => {
    setSelectedMemberIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(memberId => memberId !== id);
      } else {
        return [...prev, id];
      }
    });
  };

  // 選択されたメンバーの分析
  const analyzeSelected = () => {
    if (selectedMemberIds.length === 0) {
      setError('分析するメンバーが選択されていません');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const result = StrengthsService.analyzeStrengths(selectedMemberIds);
      setAnalysisResult(result);
    } catch (err) {
      setError('分析中にエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 部署ごとの分析
  const analyzeDepartment = (department: string) => {
    setLoading(true);
    setError(null);

    try {
      const departmentMembers = StrengthsService.getMembersByDepartment(department);
      const memberIds = departmentMembers.map(m => m.id);
      
      if (memberIds.length === 0) {
        setError('選択された部署にメンバーがいません');
        setLoading(false);
        return;
      }

      const result = StrengthsService.analyzeStrengths(memberIds);
      setAnalysisResult(result);
      setSelectedDepartment(department);
    } catch (err) {
      setError('部署の分析中にエラーが発生しました');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // データのエクスポート
  const exportData = (): string => {
    try {
      return StrengthsService.exportMembers();
    } catch (err) {
      setError('データのエクスポートに失敗しました');
      console.error(err);
      return '';
    }
  };

  // データのインポート
  const importData = (jsonData: string): void => {
    try {
      setError(null);
      const importedMembers = StrengthsService.importMembers(jsonData);
      setMembers(importedMembers);
    } catch (err) {
      if (err instanceof Error) {
        setError(`データのインポートに失敗しました: ${err.message}`);
      } else {
        setError('データのインポートに失敗しました');
      }
      console.error(err);
    }
  };

  const value = {
    members,
    selectedMemberIds,
    selectedDepartment,
    analysisResult,
    loading,
    error,
    addOrUpdateMember,
    deleteMember,
    toggleMemberSelection,
    setSelectedDepartment,
    analyzeSelected,
    analyzeDepartment,
    exportData,
    importData
  };

  return (
    <StrengthsContext.Provider value={value}>
      {children}
    </StrengthsContext.Provider>
  );
};
