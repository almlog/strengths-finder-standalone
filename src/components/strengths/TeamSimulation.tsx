/**
 * チームシミュレーション - メインコンポーネント
 *
 * @module components/strengths/TeamSimulation
 * @description ドラッグ&ドロップによる動的チーム編成シミュレーション
 */

import React, { useState, useMemo } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  useDroppable
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSimulation } from '../../contexts/SimulationContext';
import { useStrengths } from '../../contexts/StrengthsContext';
import { useStageMasters } from '../../hooks/useStageMasters';
import { useMemberRates } from '../../hooks/useMemberRates';
import { SimulationService } from '../../services/SimulationService';
import { Download, Upload, CheckCircle, Plus, AlertTriangle } from 'lucide-react';
import MemberCard from './simulation/MemberCard';
import GroupCard from './simulation/GroupCard';

const TeamSimulation: React.FC = () => {
  const { state, addGroup, removeGroup, renameGroup, moveMember, exportSimulation, importSimulation, getApplyPreview, applyToProduction, resetSimulation } = useSimulation();
  const { members } = useStrengths();
  const { stageMasters } = useStageMasters();
  const { memberRates } = useMemberRates();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  // メンバーマップ
  const memberMap = useMemo(() => {
    const map = new Map();
    members.forEach(m => map.set(m.id, m));
    return map;
  }, [members]);

  // 未配置プールのメンバー
  const unassignedMembers = useMemo(() => {
    if (!state) return [];
    return state.unassignedPool.map(id => memberMap.get(id)).filter(Boolean);
  }, [state, memberMap]);

  // 未配置プールのドロップゾーン
  const { setNodeRef: setUnassignedRef, isOver: isUnassignedOver } = useDroppable({
    id: 'unassigned'
  });

  // グループごとのメンバーと統計
  const groupsData = useMemo(() => {
    if (!state) return [];
    return state.groups.map(group => {
      const groupMembers = group.memberIds.map(id => memberMap.get(id)).filter(Boolean);
      const stats = SimulationService.calculateGroupStats(groupMembers, stageMasters, memberRates);
      return { group, members: groupMembers, stats };
    });
  }, [state, memberMap, stageMasters, memberRates]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragId(null);

    if (!over || !state) return;

    const memberId = active.id as string;
    let destinationId: string | 'unassigned' = over.id as string;

    // 移動元を特定
    let sourceId: string | 'unassigned' = 'unassigned';
    if (state.unassignedPool.includes(memberId)) {
      sourceId = 'unassigned';
    } else {
      const sourceGroup = state.groups.find(g => g.memberIds.includes(memberId));
      if (sourceGroup) {
        sourceId = sourceGroup.id;
      }
    }

    // over.idがメンバーIDの場合、そのメンバーが所属するグループIDに変換
    if (destinationId !== 'unassigned') {
      const isGroupId = state.groups.some(g => g.id === destinationId);
      if (!isGroupId) {
        // over.idはメンバーID → そのメンバーが所属するグループを探す
        const targetGroup = state.groups.find(g => g.memberIds.includes(destinationId));
        if (targetGroup) {
          destinationId = targetGroup.id;
        } else if (state.unassignedPool.includes(destinationId)) {
          destinationId = 'unassigned';
        }
      }
    }

    // 同じ場所へのドロップは無視
    if (sourceId === destinationId) return;

    try {
      moveMember(memberId, sourceId, destinationId);
    } catch (error) {
      console.error('Move failed:', error);
    }
  };

  const handleAddGroup = () => {
    const groupNumber = (state?.groups.length || 0) + 1;
    addGroup(`グループ${groupNumber}`);
  };

  const handleExport = () => {
    try {
      const json = exportSimulation();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `team-simulation-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert('エクスポートに失敗しました');
      console.error(error);
    }
  };

  const handleImportFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImportFile(file);
      setShowImportDialog(true);
    }
  };

  const handleImportConfirm = async () => {
    if (!importFile) return;

    try {
      const text = await importFile.text();
      const result = importSimulation(text);

      if (result.warnings.length > 0) {
        setImportWarnings(result.warnings.map(w => w.message));
      } else {
        setShowImportDialog(false);
        setImportFile(null);
        setImportWarnings([]);
      }
    } catch (error) {
      alert('インポートに失敗しました');
      console.error(error);
    }
  };

  const handleApplyClick = () => {
    setShowApplyDialog(true);
  };

  const handleApplyConfirm = () => {
    try {
      applyToProduction();
      setShowApplyDialog(false);
      alert('✅ 本番データに反映しました');
    } catch (error) {
      alert('反映に失敗しました');
      console.error(error);
    }
  };

  const preview = useMemo(() => {
    try {
      return getApplyPreview();
    } catch {
      return null;
    }
  }, [getApplyPreview, state]);

  if (!state) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // モバイル警告
  if (window.innerWidth < 768) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div>
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">
            この機能はPC環境で利用してください
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ツールバー */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold dark:text-gray-100">🧪 チームシミュレーション</h2>
          <button
            onClick={handleAddGroup}
            disabled={state.groups.length >= 10}
            className="flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            <Plus className="w-4 h-4" />
            グループ追加
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1 px-3 py-2 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm"
          >
            <Download className="w-4 h-4" />
            エクスポート
          </button>
          <label className="flex items-center gap-1 px-3 py-2 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-sm cursor-pointer">
            <Upload className="w-4 h-4" />
            インポート
            <input
              type="file"
              accept=".json"
              onChange={handleImportFileSelect}
              className="hidden"
            />
          </label>
          <button
            onClick={handleApplyClick}
            className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
          >
            <CheckCircle className="w-4 h-4" />
            本番データに反映
          </button>
        </div>
      </div>

      {/* メインコンテンツ */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-4 gap-4">
          {/* 未配置プール */}
          <div className="col-span-1">
            <div
              ref={setUnassignedRef}
              className={`bg-gray-100 dark:bg-gray-900 rounded-lg p-4 min-h-[400px] transition-colors ${
                isUnassignedOver
                  ? 'border-2 border-blue-400 dark:border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-2 border-transparent'
              }`}
            >
              <h3 className="font-semibold mb-3 dark:text-gray-100 flex items-center gap-2">
                📦 未配置プール
                <span className="text-sm text-gray-500">({unassignedMembers.length}人)</span>
              </h3>
              <SortableContext items={unassignedMembers.map(m => m.id)} strategy={verticalListSortingStrategy}>
                {unassignedMembers.map(member => (
                  <MemberCard key={member.id} member={member} />
                ))}
              </SortableContext>
            </div>
          </div>

          {/* グループエリア */}
          <div className="col-span-3">
            <div className="grid grid-cols-3 gap-4">
              {groupsData.map(({ group, members, stats }) => (
                <GroupCard
                  key={group.id}
                  group={group}
                  members={members}
                  stats={stats}
                  onRemove={() => removeGroup(group.id)}
                  onRename={(newName) => renameGroup(group.id, newName)}
                />
              ))}
            </div>
          </div>
        </div>

        <DragOverlay>
          {activeDragId ? (
            <MemberCard member={memberMap.get(activeDragId)} isDragging />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* 本番反映確認ダイアログ */}
      {showApplyDialog && preview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4 text-red-600 dark:text-red-400">
              ⚠️ 本番データを上書きします
            </h3>
            <p className="mb-4 dark:text-gray-300">
              シミュレーション結果を本番データに反映すると、すべてのメンバーの部署コードが更新されます。
              <br />
              この操作は取り消せません。
            </p>
            <div className="mb-4">
              <p className="font-medium mb-2 dark:text-gray-100">変更内容プレビュー ({preview.changeCount}件):</p>
              <div className="max-h-60 overflow-y-auto border dark:border-gray-600 rounded p-2">
                {preview.changes
                  .filter(c => c.oldDepartment !== c.newDepartment)
                  .map(change => (
                    <div key={change.memberId} className="text-sm py-1 dark:text-gray-300">
                      {change.memberName}: <span className="text-gray-500">{change.oldDepartment}</span> → <span className="text-blue-600 dark:text-blue-400">{change.newDepartment}</span>
                    </div>
                  ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowApplyDialog(false)}
                className="flex-1 px-4 py-2 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleApplyConfirm}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                反映する
              </button>
            </div>
          </div>
        </div>
      )}

      {/* インポート警告ダイアログ */}
      {showImportDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold mb-4 dark:text-gray-100">インポート確認</h3>
            {importWarnings.length > 0 ? (
              <>
                <p className="mb-2 text-yellow-600 dark:text-yellow-400">⚠️ 警告があります:</p>
                <ul className="mb-4 text-sm list-disc pl-5 dark:text-gray-300">
                  {importWarnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
                <p className="mb-4 text-sm dark:text-gray-300">それでもインポートしますか？</p>
              </>
            ) : (
              <p className="mb-4 dark:text-gray-300">インポートを実行します。現在のシミュレーション状態は上書きされます。</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowImportDialog(false);
                  setImportFile(null);
                  setImportWarnings([]);
                }}
                className="flex-1 px-4 py-2 border dark:border-gray-600 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                キャンセル
              </button>
              <button
                onClick={handleImportConfirm}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                インポート
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamSimulation;
