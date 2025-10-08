// src/components/strengths/MemberForm.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStrengths } from '../../contexts/StrengthsContext';
import { MemberStrengths, Position } from '../../models/StrengthsTypes';
import { STRENGTHS_DATA } from '../../services/StrengthsService';

interface MemberFormProps {
  memberId: string | null; // null: 新規追加, string: 編集
  onClose: () => void;
}

const MemberForm: React.FC<MemberFormProps> = ({ memberId, onClose }) => {
  const { members, addOrUpdateMember, customPositions, addCustomPosition } = useStrengths();
  const [id, setId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [position, setPosition] = useState<Position | string | undefined>(undefined);
  const [customPositionName, setCustomPositionName] = useState<string>('');
  const [isCustomPosition, setIsCustomPosition] = useState<boolean>(false);
  const [selectedStrengths, setSelectedStrengths] = useState<{ id: number; score: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 編集モードの場合は既存データを取得
  useEffect(() => {
    if (memberId) {
      const member = members.find(m => m.id === memberId);
      if (member) {
        setId(member.id);
        setName(member.name);
        setDepartment(member.department);
        setPosition(member.position);
        setSelectedStrengths([...member.strengths]);

        // カスタム役職かどうかを判定
        if (member.position && !Object.values(Position).includes(member.position as Position)) {
          setIsCustomPosition(false); // カスタム役職でも標準モードで表示（選択肢に含まれる）
        }
      }
    }
  }, [memberId, members]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // 入力検証
    if (!id.trim()) {
      setError('社員番号を入力してください');
      return;
    }
    
    if (!name.trim()) {
      setError('名前を入力してください');
      return;
    }
    
    if (!department.trim()) {
      setError('部署コードを入力してください');
      return;
    }
    
    if (selectedStrengths.length !== 5) {
      setError('5つの強みを選択してください');
      return;
    }
    
    // 新規追加時に同じIDが既に存在するかチェック
    if (!memberId && members.some(m => m.id === id.trim())) {
      setError('この社員番号は既に使用されています');
      return;
    }
    
    // メンバーの保存
    const member: MemberStrengths = {
      id,
      name: name.trim(),
      department: department.trim(),
      position,
      strengths: selectedStrengths
    };
    
    addOrUpdateMember(member);
    onClose();
  };

  // src/components/strengths/MemberForm.tsx の toggleStrength メソッドを修正
  const toggleStrength = (strengthId: number) => {
    setSelectedStrengths(prev => {
      // 既に選択されているか確認
      const existingIndex = prev.findIndex(rs => rs.id === strengthId);
      
      if (existingIndex >= 0) {
        // 選択されている場合は削除
        return prev.filter(rs => rs.id !== strengthId);
      } else {
        // 5つまでしか選択できない
        if (prev.length >= 5) {
          return prev;
        }
        // 新しい強みを追加（スコアは選択順に基づいて設定、1が最強）
        return [...prev, { id: strengthId, score: prev.length + 1 }];
      }
    });
  };

  // 既存の部署リストを取得
  const existingDepartments = [...new Set(members.map(m => m.department))];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-semibold dark:text-gray-100">
            {memberId ? 'メンバー情報の編集' : 'メンバーの追加'}
          </h3>
          <button onClick={onClose} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                社員番号 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={id}
                onChange={(e) => setId(e.target.value)}
                className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                placeholder="社員番号を入力"
                required
                disabled={!!memberId} // 編集時は変更不可
              />
              {!memberId && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  社員番号は一度設定すると変更できません
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                名前 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                placeholder="氏名を入力"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                部署コード <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                  placeholder="部署コードを入力"
                  list="departments"
                  required
                />
                <datalist id="departments">
                  {existingDepartments.map(dept => (
                    <option key={dept} value={dept} />
                  ))}
                </datalist>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                役職
              </label>

              {/* 役職タイプの選択 */}
              <div className="mb-2">
                <label className="inline-flex items-center mr-4">
                  <input
                    type="radio"
                    checked={!isCustomPosition}
                    onChange={() => {
                      setIsCustomPosition(false);
                      setCustomPositionName('');
                    }}
                    className="mr-2"
                  />
                  <span className="text-sm dark:text-gray-300">標準役職</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    checked={isCustomPosition}
                    onChange={() => setIsCustomPosition(true)}
                    className="mr-2"
                  />
                  <span className="text-sm dark:text-gray-300">カスタム役職</span>
                </label>
              </div>

              {!isCustomPosition ? (
                <div className="relative">
                  <select
                    value={position || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPosition(value ? value as Position : undefined);
                    }}
                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                  >
                    <option value="">一般社員</option>
                    <option value={Position.GL}>グループリーダー (GL)</option>
                    <option value={Position.DEPUTY_MANAGER}>副課長</option>
                    <option value={Position.MANAGER}>課長</option>
                    <option value={Position.DIRECTOR}>部長</option>
                    <option value={Position.CONTRACT}>契約社員</option>
                    <option value={Position.BP}>BP</option>
                    {customPositions.map(cp => (
                      <option key={cp.id} value={cp.id}>{cp.displayName}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <input
                    type="text"
                    value={customPositionName}
                    onChange={(e) => setCustomPositionName(e.target.value)}
                    placeholder="役職名を入力（例: 副事業部長）"
                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2 mb-2"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      if (customPositionName.trim()) {
                        const customId = `CUSTOM_${Date.now()}`;
                        const newCustomPosition = {
                          id: customId,
                          name: customPositionName.trim(),
                          displayName: customPositionName.trim(),
                          color: '#9E9E9E',  // グレー（デフォルト）
                          icon: 'crown' as const  // 王冠（デフォルト）
                        };
                        addCustomPosition(newCustomPosition);
                        setPosition(customId);
                        setIsCustomPosition(false);
                        setCustomPositionName('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-green-600 dark:bg-green-700 text-white rounded hover:bg-green-700 dark:hover:bg-green-800 text-sm"
                  >
                    カスタム役職を追加
                  </button>
                </div>
              )}

              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                役職に応じて表示アイコンが変わります
              </p>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              強み（5つ選択）: {selectedStrengths.length}/5
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {STRENGTHS_DATA.map(strength => {
                const selectedStrength = selectedStrengths.find(rs => rs.id === strength.id);
                const isSelected = !!selectedStrength;
                return (
                  <div
                    key={strength.id}
                    className={`border rounded p-2 cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-blue-100 dark:bg-blue-900 border-blue-400 dark:border-blue-600 text-blue-800 dark:text-blue-200'
                        : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
                    } ${selectedStrengths.length >= 5 && !isSelected ? 'opacity-50' : ''}`}
                    onClick={() => toggleStrength(strength.id)}
                  >
                    <div className="flex justify-between items-center">
                      <div className="text-sm font-medium">{strength.name}</div>
                      {isSelected && (
                        <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                          {selectedStrength.score}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 選択された強みの順位調整 */}
          {selectedStrengths.length > 0 && (
            <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                強みの順位調整
            </label>
            <div className="space-y-2">
                {[...selectedStrengths]
                .sort((a, b) => a.score - b.score) // スコアの小さい順（1が最強）
                .map(rankedStrength => {
                    const strength = STRENGTHS_DATA.find(s => s.id === rankedStrength.id);
                    if (!strength) return null;

                    return (
                    <div key={strength.id} className="flex items-center bg-gray-50 dark:bg-gray-700 p-2 rounded">
                        <div className="bg-blue-600 dark:bg-blue-700 text-white rounded-full w-6 h-6 flex items-center justify-center mr-2">
                        {rankedStrength.score}
                        </div>
                        <div className="flex-1 dark:text-gray-100">{strength.name}</div>
                        <div className="flex space-x-1">
                        <button
                            type="button"
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-600 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                            disabled={rankedStrength.score <= 1} // 1が最小値（最強）
                            onClick={() => {
                            setSelectedStrengths(prev => {
                                // 現在のスコアを持つ強みを見つける
                                const currentScoreIndex = prev.findIndex(rs => rs.score === rankedStrength.score - 1);
                                
                                // スコアの入れ替え
                                if (currentScoreIndex >= 0) {
                                const newStrengths = [...prev];
                                const thisIndex = prev.findIndex(rs => rs.id === rankedStrength.id);
                                
                                newStrengths[thisIndex] = {
                                    ...newStrengths[thisIndex],
                                    score: newStrengths[thisIndex].score - 1
                                };
                                
                                newStrengths[currentScoreIndex] = {
                                    ...newStrengths[currentScoreIndex],
                                    score: newStrengths[currentScoreIndex].score + 1
                                };
                                
                                return newStrengths;
                                }
                                
                                return prev;
                            });
                            }}
                        >
                            ↑
                        </button>
                        <button
                            type="button"
                            className="px-2 py-1 bg-gray-200 dark:bg-gray-600 dark:text-gray-100 rounded hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50"
                            disabled={rankedStrength.score >= 5} // 5が最大値（最弱）
                            onClick={() => {
                            setSelectedStrengths(prev => {
                                // 現在のスコアを持つ強みを見つける
                        const currentScoreIndex = prev.findIndex(rs => rs.score === rankedStrength.score + 1);
                        
                        // スコアの入れ替え
                        if (currentScoreIndex >= 0) {
                          const newStrengths = [...prev];
                          const thisIndex = prev.findIndex(rs => rs.id === rankedStrength.id);
                          
                          newStrengths[thisIndex] = {
                            ...newStrengths[thisIndex],
                            score: newStrengths[thisIndex].score + 1
                          };
                          
                          newStrengths[currentScoreIndex] = {
                            ...newStrengths[currentScoreIndex],
                            score: newStrengths[currentScoreIndex].score - 1
                          };
                                  
                                  return newStrengths;
                                }
                                
                                return prev;
                              });
                            }}
                          >
                            ↓
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border dark:border-gray-600 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              キャンセル
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-800"
            >
              保存
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MemberForm;
