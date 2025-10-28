// src/contexts/StrengthsContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import StrengthsService from '../services/StrengthsService';
import { MemberStrengths, StrengthsAnalysisResult, CustomPosition } from '../models/StrengthsTypes';

export interface ImportConflictData {
  existingMembers: MemberStrengths[];
  newMembers: MemberStrengths[];
  duplicateIds: string[];
  customPositions?: CustomPosition[];
}

interface StrengthsContextProps {
  members: MemberStrengths[];
  selectedMemberIds: string[];
  selectedDepartment: string;
  analysisResult: StrengthsAnalysisResult | null;
  loading: boolean;
  error: string | null;
  successMessage: string | null;
  customPositions: CustomPosition[];
  addOrUpdateMember: (member: MemberStrengths) => void;
  deleteMember: (id: string) => void;
  toggleMemberSelection: (id: string) => void;
  selectAllMembers: (memberIds: string[]) => void;
  clearAllSelections: () => void;
  setSelectedDepartment: (department: string) => void;
  analyzeSelected: () => void;
  analyzeDepartment: (department: string) => void;
  addCustomPosition: (position: CustomPosition) => void;
  getPositionInfo: (positionId: string) => { name: string; displayName: string; color: string; icon: string } | null;
  exportData: () => string;
  importData: (jsonData: string, onConflict?: (conflictData: ImportConflictData) => 'replace' | 'add' | 'merge' | 'cancel' | Promise<'replace' | 'add' | 'merge' | 'cancel'>) => Promise<void>;
  clearMessages: () => void;
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [customPositions, setCustomPositions] = useState<CustomPosition[]>([]);

  // 初期データの読み込み
  const [isInitialized, setIsInitialized] = useState(false);
  useEffect(() => {
    try {
      const loadedMembers = StrengthsService.getMembers();
      setMembers(loadedMembers);

      const loadedCustomPositions = StrengthsService.getCustomPositions();
      setCustomPositions(loadedCustomPositions);
      setIsInitialized(true);
    } catch (err) {
      setError('データの読み込みに失敗しました');
      console.error(err);
    }
  }, []);

  // メンバーデータの変更をLocalStorageに自動保存
  useEffect(() => {
    // 初期化前は保存しない（初期読み込み時の無限ループ防止）
    if (!isInitialized) return;

    try {
      localStorage.setItem('strengths-members', JSON.stringify(members));
    } catch (err) {
      console.error('LocalStorageへの保存に失敗しました:', err);
    }
  }, [members, isInitialized]);

  // カスタム役職の変更をLocalStorageに自動保存
  useEffect(() => {
    if (!isInitialized) return;

    try {
      localStorage.setItem('strengths-custom-positions', JSON.stringify(customPositions));
    } catch (err) {
      console.error('カスタム役職の保存に失敗しました:', err);
    }
  }, [customPositions, isInitialized]);

  // メンバーの追加または更新
  const addOrUpdateMember = (member: MemberStrengths) => {
    try {
      // Context内のstateを更新（LocalStorageから再読み込みしない）
      const index = members.findIndex(m => m.id === member.id);
      let updatedMembers: MemberStrengths[];

      if (index >= 0) {
        // 既存メンバーを更新
        updatedMembers = [...members];
        updatedMembers[index] = member;
      } else {
        // 新規メンバーを追加
        updatedMembers = [...members, member];
      }

      setMembers(updatedMembers);
    } catch (err) {
      setError('メンバーの保存に失敗しました');
      console.error(err);
    }
  };

  // メンバーの削除
  const deleteMember = (id: string) => {
    try {
      // Context内のstateから削除（LocalStorageから再読み込みしない）
      const updatedMembers = members.filter(m => m.id !== id);
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

  // 指定されたメンバーIDの配列を全て選択状態にする
  const selectAllMembers = (memberIds: string[]) => {
    setSelectedMemberIds(prev => {
      // 既存の選択状態に追加（重複は自動除外）
      const newIds = [...new Set([...prev, ...memberIds])];
      return newIds;
    });
  };

  // 全ての選択を解除する
  const clearAllSelections = () => {
    setSelectedMemberIds([]);
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
      // Context内のstateから直接エクスポート（LocalStorageから再読み込みしない）
      const exportData = {
        _comment: [
          "============================================",
          "Strengths Finder データファイル",
          "============================================",
          "",
          "【カスタム役職設定】",
          "- アイコンタイプ: 'crown'(王冠) または 'circle'(丸)",
          "- 色: カラーコード（例: #FF5722）",
          "",
          "【デフォルト役職の色参考】",
          "  部長: #F44336 (赤)",
          "  課長: #2196F3 (青)",
          "  一般: #4CAF50 (緑)",
          "",
          "※ customPositions配列にカスタム役職を追加できます",
          "============================================"
        ],
        customPositions: customPositions,
        members: members,
      };

      const jsonString = JSON.stringify(exportData, null, 2);
      return jsonString;
    } catch (err) {
      setError('データのエクスポートに失敗しました');
      console.error(err);
      return '';
    }
  };

  // カスタム役職の追加
  const addCustomPosition = (position: CustomPosition): void => {
    try {
      const updatedPositions = StrengthsService.saveCustomPosition(position);
      setCustomPositions(updatedPositions);
    } catch (err) {
      setError('カスタム役職の保存に失敗しました');
      console.error(err);
    }
  };

  // 役職情報の取得（デフォルト + カスタム）
  const getPositionInfo = (positionId: string) => {
    return StrengthsService.getPositionInfo(positionId);
  };

  // データのインポート
  const importData = async (
    jsonData: string,
    onConflict?: (conflictData: ImportConflictData) => 'replace' | 'add' | 'merge' | 'cancel' | Promise<'replace' | 'add' | 'merge' | 'cancel'>
  ): Promise<void> => {
    try {
      setError(null);
      setSuccessMessage(null);
      const { members: importedMembers, customPositions: importedPositions } = StrengthsService.importMembers(jsonData);

      // 重複チェック
      const existingIds = new Set(members.map(m => m.id));
      const duplicateIds = importedMembers
        .filter(m => existingIds.has(m.id))
        .map(m => m.id);

      // 既存データがない場合は、何も聞かずにインポート
      if (members.length === 0) {
        setMembers(importedMembers);
        if (importedPositions) {
          setCustomPositions(importedPositions);
        }
        setSuccessMessage(`${importedMembers.length}件のメンバーデータを正常にインポートしました`);
        return;
      }

      // 既存データがある場合は、必ずユーザーに確認
      if (!onConflict) {
        setError('既存データがあります。インポート方法を選択してください。');
        return;
      }

      // コールバックで戦略を取得（重複の有無に関わらず）
      const strategy = await onConflict({
        existingMembers: members,
        newMembers: importedMembers,
        duplicateIds,
        customPositions: importedPositions,
      });

      // 戦略に応じて処理
      switch (strategy) {
        case 'replace':
          // 全置換
          setMembers(importedMembers);
          if (importedPositions) {
            setCustomPositions(importedPositions);
          }
          setSuccessMessage(`${importedMembers.length}件のメンバーデータで既存データを置き換えました`);
          break;

        case 'add':
          // 新規のみ追加（重複を除外）
          const newMembersOnly = importedMembers.filter(m => !duplicateIds.includes(m.id));
          setMembers([...members, ...newMembersOnly]);
          if (importedPositions) {
            // カスタム役職もマージ（重複しないものだけ追加）
            const existingPositionIds = new Set(customPositions.map(p => p.id));
            const newPositionsOnly = importedPositions.filter(p => !existingPositionIds.has(p.id));
            setCustomPositions([...customPositions, ...newPositionsOnly]);
          }
          setSuccessMessage(`${newMembersOnly.length}件の新規メンバーを追加しました（重複${duplicateIds.length}件はスキップ）`);
          break;

        case 'merge':
          // マージ（重複は更新、新規は追加）
          const existingMap = new Map(members.map(m => [m.id, m]));
          importedMembers.forEach(m => {
            existingMap.set(m.id, m); // 上書きまたは追加
          });
          const mergedMembers = Array.from(existingMap.values());
          setMembers(mergedMembers);
          if (importedPositions) {
            // カスタム役職もマージ（重複は更新、新規は追加）
            const positionMap = new Map(customPositions.map(p => [p.id, p]));
            importedPositions.forEach(p => {
              positionMap.set(p.id, p);
            });
            setCustomPositions(Array.from(positionMap.values()));
          }
          const newCount = importedMembers.filter(m => !duplicateIds.includes(m.id)).length;
          setSuccessMessage(`${duplicateIds.length}件を更新、${newCount}件を新規追加しました`);
          break;

        case 'cancel':
          // キャンセル - 何もしない
          setSuccessMessage('インポートをキャンセルしました');
          break;
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`データのインポートに失敗しました: ${err.message}`);
      } else {
        setError('データのインポートに失敗しました');
      }
      console.error(err);
    }
  };

  // メッセージのクリア
  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const value = {
    members,
    selectedMemberIds,
    selectedDepartment,
    analysisResult,
    loading,
    error,
    successMessage,
    customPositions,
    addOrUpdateMember,
    deleteMember,
    toggleMemberSelection,
    selectAllMembers,
    clearAllSelections,
    setSelectedDepartment,
    analyzeSelected,
    analyzeDepartment,
    addCustomPosition,
    getPositionInfo,
    exportData,
    importData,
    clearMessages
  };

  return (
    <StrengthsContext.Provider value={value}>
      {children}
    </StrengthsContext.Provider>
  );
};
