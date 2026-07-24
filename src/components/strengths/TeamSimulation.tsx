/**
 * チームシミュレーション - メインコンポーネント
 *
 * @module components/strengths/TeamSimulation
 * @description ドラッグ&ドロップによる動的チーム編成シミュレーション
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  CollisionDetection,
  useDroppable
} from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSimulation } from '../../contexts/SimulationContext';
import { useStrengths } from '../../contexts/StrengthsContext';
import { useStageMasters } from '../../hooks/useStageMasters';
import { useMemberRates } from '../../hooks/useMemberRates';
import { SimulationService } from '../../services/SimulationService';
import { Download, Upload, CheckCircle, Plus, AlertTriangle, Users } from 'lucide-react';
import MemberCard from './simulation/MemberCard';
import GroupCard from './simulation/GroupCard';

// closestCornersは各ドロップ領域の四隅との距離だけで判定するため、
// メンバーが増えて縦に大きくなったグループ（コンテナ本体＋各メンバーカードが
// それぞれドロップ領域になる）に、実際にはポインタが重なっていない別グループへの
// ドロップまで誤って吸収されてしまうことがある。
// ポインタが実際に領域内にあるかで判定するpointerWithinを優先し、
// 領域外（ドラッグ開始直後など）ではclosestCornersにフォールバックする。
const collisionDetectionStrategy: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  if (pointerCollisions.length > 0) {
    return pointerCollisions;
  }
  return closestCorners(args);
};

const TeamSimulation: React.FC = () => {
  const { state, addGroup, removeGroup, renameGroup, moveMember, exportSimulation, importSimulation, getApplyPreview, applyToProduction } = useSimulation();
  const { members } = useStrengths();
  const { stageMasters } = useStageMasters();
  const { memberRates } = useMemberRates();

  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importWarnings, setImportWarnings] = useState<string[]>([]);
  const [selectedDepartments, setSelectedDepartments] = useState<Set<string>>(new Set()); // 選択中の部署コード（複数）
  const [showDepartmentMenu, setShowDepartmentMenu] = useState(false); // 部署フィルタメニューの表示状態
  const departmentMenuRef = useRef<HTMLDivElement>(null); // 部署フィルタメニューの参照

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

  // 全部署コードを抽出
  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    members.forEach(m => {
      if (m.department) depts.add(m.department);
    });
    return Array.from(depts).sort();
  }, [members]);

  // 未配置プールのメンバー（全体）
  const unassignedMembersAll = useMemo(() => {
    if (!state) return [];
    return state.unassignedPool.map(id => memberMap.get(id)).filter(Boolean);
  }, [state, memberMap]);

  // 未配置プールのメンバー（フィルタ適用後）
  const unassignedMembers = useMemo(() => {
    if (selectedDepartments.size === 0) {
      // 何も選択されていない場合は全員表示
      return unassignedMembersAll;
    }
    // 選択された部署のメンバーのみ表示
    return unassignedMembersAll.filter(m => m.department && selectedDepartments.has(m.department));
  }, [unassignedMembersAll, selectedDepartments]);

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

  // 部署の選択/解除をトグル
  const toggleDepartment = (dept: string) => {
    setSelectedDepartments(prev => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  // 全て選択/解除をトグル
  const toggleAllDepartments = () => {
    if (selectedDepartments.size === allDepartments.length) {
      // 全て選択されている場合は全て解除
      setSelectedDepartments(new Set());
    } else {
      // 一部または未選択の場合は全て選択
      setSelectedDepartments(new Set(allDepartments));
    }
  };

  const handleAddGroup = () => {
    const groupNumber = (state?.groups.length || 0) + 1;
    addGroup(`グループ${groupNumber}`);
  };

  // 部署フィルタメニューの外側クリックで閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (departmentMenuRef.current && !departmentMenuRef.current.contains(event.target as Node)) {
        setShowDepartmentMenu(false);
      }
    };

    if (showDepartmentMenu) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showDepartmentMenu]);

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
  }, [getApplyPreview]);

  if (!state) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
        <Users className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
        <p>チームシミュレーションを利用するには、まず「メンバー管理」タブでメンバーを登録してください</p>
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
        collisionDetection={collisionDetectionStrategy}
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
                <span className="text-sm text-gray-500">
                  ({unassignedMembers.length}/{unassignedMembersAll.length}人)
                </span>
              </h3>

              {/* 部署コードフィルタ（複数選択） */}
              <div ref={departmentMenuRef} className="mb-3 relative">
                <button
                  onClick={() => setShowDepartmentMenu(!showDepartmentMenu)}
                  className="w-full px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 dark:text-gray-100 text-left flex items-center justify-between"
                >
                  <span>
                    {selectedDepartments.size === 0
                      ? `🏢 部署フィルタ (全て: ${unassignedMembersAll.length}人)`
                      : `🏢 部署フィルタ (${selectedDepartments.size}件選択中)`
                    }
                  </span>
                  <span className="text-gray-400">{showDepartmentMenu ? '▲' : '▼'}</span>
                </button>

                {showDepartmentMenu && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg max-h-60 overflow-y-auto">
                    {/* 全て選択/解除 */}
                    <label className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer border-b dark:border-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedDepartments.size === allDepartments.length}
                        onChange={toggleAllDepartments}
                        className="mr-2"
                      />
                      <span className="text-sm font-semibold dark:text-gray-100">
                        {selectedDepartments.size === allDepartments.length ? '全て解除' : '全て選択'}
                      </span>
                    </label>

                    {/* 部署リスト */}
                    {allDepartments.map(dept => {
                      const count = unassignedMembersAll.filter(m => m.department === dept).length;
                      return (
                        <label
                          key={dept}
                          className="flex items-center px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedDepartments.has(dept)}
                            onChange={() => toggleDepartment(dept)}
                            className="mr-2"
                          />
                          <span className="text-sm dark:text-gray-100">
                            {dept} ({count}人)
                          </span>
                        </label>
                      );
                    })}

                    {/* 選択中の合計 */}
                    {selectedDepartments.size > 0 && (
                      <div className="px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border-t dark:border-gray-600 text-sm dark:text-gray-100">
                        選択中: {unassignedMembers.length}人
                      </div>
                    )}
                  </div>
                )}
              </div>

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
