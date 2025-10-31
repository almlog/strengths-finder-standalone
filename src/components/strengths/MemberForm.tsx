// src/components/strengths/MemberForm.tsx
import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { useStrengths } from '../../contexts/StrengthsContext';
import { MemberStrengths, Position } from '../../models/StrengthsTypes';
import { STRENGTHS_DATA } from '../../services/StrengthsService';
import { getAllPersonalities } from '../../services/Personality16Service';
import { useManagerMode } from '../../hooks/useManagerMode';
import { useStageMasters } from '../../hooks/useStageMasters';
import { useMemberRates } from '../../hooks/useMemberRates';
import { FinancialService } from '../../services/FinancialService';

interface MemberFormProps {
  memberId: string | null; // null: 新規追加, string: 編集
  onClose: () => void;
}

const MemberForm: React.FC<MemberFormProps> = ({ memberId, onClose }) => {
  const { members, addOrUpdateMember, customPositions, addCustomPosition } = useStrengths();
  const isManagerMode = useManagerMode();
  const { stageMasters } = useStageMasters();
  const { getMemberRate, getContractRate, setMemberRate, deleteMemberRate } = useMemberRates();
  const [id, setId] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [department, setDepartment] = useState<string>('');
  const [position, setPosition] = useState<Position | string | undefined>(Position.GENERAL); // デフォルト値を設定
  const [customPositionName, setCustomPositionName] = useState<string>('');
  const [isCustomPosition, setIsCustomPosition] = useState<boolean>(false);
  const [selectedStrengths, setSelectedStrengths] = useState<{ id: number; score: number }[]>([]);
  const [error, setError] = useState<string | null>(null);

  // 16Personalities state
  const [personalityId, setPersonalityId] = useState<number | undefined>(undefined);
  const [personalityVariant, setPersonalityVariant] = useState<'A' | 'T' | undefined>(undefined);

  // Manager mode state (v2.0)
  const [rateType, setRateType] = useState<'monthly' | 'hourly' | 'contract' | undefined>(undefined);
  const [rate, setRate] = useState<number | undefined>(undefined);
  const [hours, setHours] = useState<number | undefined>(undefined);

  // Contract rate state (v3.1 - for CONTRACT/BP only)
  const [contractRateType, setContractRateType] = useState<'monthly' | 'hourly' | undefined>(undefined);
  const [contractRate, setContractRate] = useState<number | undefined>(undefined);
  const [contractHours, setContractHours] = useState<number | undefined>(undefined);

  // Manager mode state (v3.0 - Stage Master) - デフォルト値なし（既存メンバーから読み込み時のみ設定）
  const [stageId, setStageId] = useState<string | undefined>(undefined);

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

        // 16Personalities data
        setPersonalityId(member.personalityId);
        setPersonalityVariant(member.personalityVariant);

        // Manager mode data (v2.0)
        // 単価情報は別管理から取得
        const memberRate = getMemberRate(member.id);
        if (memberRate) {
          setRateType(memberRate.rateType);
          setRate(memberRate.rate);
          setHours(memberRate.hours);
        }

        // Contract rate data (v3.1)
        const contractRateData = getContractRate(member.id);
        if (contractRateData) {
          setContractRateType(contractRateData.rateType);
          setContractRate(contractRateData.rate);
          setContractHours(contractRateData.hours);
        }

        // Manager mode data (v3.0 - Stage Master)
        setStageId(member.stageId);

        // カスタム役職かどうかを判定
        if (member.position && !Object.values(Position).includes(member.position as Position)) {
          setIsCustomPosition(false); // カスタム役職でも標準モードで表示（選択肢に含まれる）
        }
      }
    }
  }, [memberId, members, getMemberRate]);

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
      strengths: selectedStrengths,
      personalityId,
      personalityVariant,
      // Manager mode fields (v3.1 - Stage Master)
      stageId
    };

    addOrUpdateMember(member);

    // 単価情報を別管理に保存 (v3.1: contractRateも含む)
    if (rateType && rate && (rateType === 'monthly' || rateType === 'hourly')) {
      // 契約単価も一緒に保存
      const contractRateData = (contractRateType && contractRate) ? {
        rateType: contractRateType,
        rate: contractRate,
        hours: contractRateType === 'hourly' ? contractHours : undefined
      } : undefined;

      setMemberRate(id, {
        rateType,
        rate,
        hours: rateType === 'hourly' ? hours : undefined
      }, contractRateData);
    } else {
      // 単価情報が未入力の場合は削除
      deleteMemberRate(id);
    }

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
        // 新しい強みを追加（使用されていない最小のスコアを割り当て）
        const usedScores = prev.map(s => s.score);
        let nextScore = 1;
        while (usedScores.includes(nextScore) && nextScore <= 5) {
          nextScore++;
        }
        return [...prev, { id: strengthId, score: nextScore }];
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

          {/* Stage Master selection (v3.0) */}
          {isManagerMode && (
            <div className="mb-6 border-t dark:border-gray-600 pt-6">
                <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  ステージマスタ（原価計算用）
                </h5>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    ステージ
                  </label>
                  <select
                    value={stageId || ''}
                    onChange={(e) => {
                      const value = e.target.value;
                      setStageId(value || undefined);
                    }}
                    className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                  >
                    <option value="">未設定</option>
                    {stageMasters.map(stage => (
                      <option key={stage.id} value={stage.id}>
                        {stage.name} ({stage.type === 'employee' ? '社員' : 'BP'})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    メンバーのステージを選択（原価計算に使用されます）
                  </p>
                </div>

                {/* 単価入力セクション */}
                <div className="mt-6 pt-6 border-t dark:border-gray-600">
                  <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    売上単価（請求単価）
                  </h6>

                  {/* 単価タイプ選択 */}
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      単価タイプ
                    </label>
                    <select
                      value={rateType || ''}
                      onChange={(e) => {
                        const value = e.target.value;
                        setRateType(value ? value as 'monthly' | 'hourly' : undefined);
                      }}
                      className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                    >
                      <option value="">未設定</option>
                      <option value="monthly">月額</option>
                      <option value="hourly">時給</option>
                    </select>
                  </div>

                  {/* 月額単価入力 */}
                  {rateType === 'monthly' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        月額単価（円）
                      </label>
                      <input
                        type="number"
                        value={rate || ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          setRate(value ? Number(value) : undefined);
                        }}
                        placeholder="例: 800000"
                        className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                      />
                    </div>
                  )}

                  {/* 時給単価入力 */}
                  {rateType === 'hourly' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          時給（円）
                        </label>
                        <input
                          type="number"
                          value={rate || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setRate(value ? Number(value) : undefined);
                          }}
                          placeholder="例: 5000"
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          月間稼働時間
                        </label>
                        <input
                          type="number"
                          value={hours || 160}
                          onChange={(e) => {
                            const value = e.target.value;
                            setHours(value ? Number(value) : 160);
                          }}
                          placeholder="160"
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          デフォルト: 160時間/月
                        </p>
                      </div>
                    </div>
                  )}
                </div>

                {/* 契約単価入力セクション (v3.1 - CONTRACT/BPのみ) */}
                {(() => {
                  const selectedStage = stageMasters.find(s => s.id === stageId);
                  const isContractOrBp = selectedStage?.employmentType === 'contract' || selectedStage?.employmentType === 'bp';

                  if (!isContractOrBp) return null;

                  return (
                    <div className="mt-6 pt-6 border-t dark:border-gray-600">
                      <h6 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                        契約単価（支払額・原価）
                      </h6>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                        ⚠️ 契約社員・BPの場合、契約単価（支払額）を入力してください。利益計算に使用されます。
                      </p>

                      {/* 契約単価タイプ選択 */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          契約単価タイプ
                        </label>
                        <select
                          value={contractRateType || ''}
                          onChange={(e) => {
                            const value = e.target.value;
                            setContractRateType(value ? value as 'monthly' | 'hourly' : undefined);
                          }}
                          className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                        >
                          <option value="">未設定</option>
                          <option value="monthly">月額</option>
                          <option value="hourly">時給</option>
                        </select>
                      </div>

                      {/* 月額契約単価入力 */}
                      {contractRateType === 'monthly' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            月額契約単価（円）
                          </label>
                          <input
                            type="number"
                            value={contractRate || ''}
                            onChange={(e) => {
                              const value = e.target.value;
                              setContractRate(value ? Number(value) : undefined);
                            }}
                            placeholder="例: 600000"
                            className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                          />
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            契約社員・BPに支払う月額契約金額
                          </p>
                        </div>
                      )}

                      {/* 時給契約単価入力 */}
                      {contractRateType === 'hourly' && (
                        <div className="space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              契約時給（円）
                            </label>
                            <input
                              type="number"
                              value={contractRate || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                setContractRate(value ? Number(value) : undefined);
                              }}
                              placeholder="例: 4000"
                              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              契約社員・BPに支払う時給
                            </p>
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                              月間稼働時間
                            </label>
                            <input
                              type="number"
                              value={contractHours || 160}
                              onChange={(e) => {
                                const value = e.target.value;
                                setContractHours(value ? Number(value) : 160);
                              }}
                              placeholder="160"
                              className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                            />
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                              デフォルト: 160時間/月
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* Cost preview */}
                {stageId && rate && (() => {
                  const selectedStage = stageMasters.find(s => s.id === stageId);
                  if (!selectedStage) return null;

                  const monthlyRevenue = rateType === 'hourly'
                    ? rate * (hours || 160)
                    : rate;

                  let cost = 0;
                  let costBreakdown = '';

                  // v3.1: CONTRACT/BPの場合は契約単価を使用
                  const isContractOrBp = selectedStage.employmentType === 'contract' || selectedStage.employmentType === 'bp';

                  if (isContractOrBp && contractRate && contractRateType) {
                    // CONTRACT/BP: 契約単価 + 固定経費 + (契約単価 × 社内経費率)
                    const contractAmount = contractRateType === 'hourly'
                      ? contractRate * (contractHours || 160)
                      : contractRate;
                    const fixedExpense = selectedStage.fixedExpense || 0;
                    const contractExpenseRate = selectedStage.contractExpenseRate || 0;
                    const contractExpense = contractAmount * contractExpenseRate;
                    cost = contractAmount + fixedExpense + contractExpense;
                    costBreakdown = `契約単価 ${FinancialService.formatCurrency(contractAmount)} + 固定経費 ${FinancialService.formatCurrency(fixedExpense)} + 社内経費 ${FinancialService.formatCurrency(contractExpense)} (${(contractExpenseRate * 100).toFixed(0)}%)`;
                  } else if (selectedStage.employmentType === 'regular' || selectedStage.type === 'employee') {
                    // 正社員: 給与 + 給与経費率
                    const salary = selectedStage.averageSalary || 0;
                    const expenseRate = selectedStage.salaryExpenseRate ?? selectedStage.expenseRate ?? 0;
                    const expense = salary * expenseRate;
                    cost = salary + expense;
                    costBreakdown = `給与 ${FinancialService.formatCurrency(salary)} + 経費 ${FinancialService.formatCurrency(expense)} (${(expenseRate * 100).toFixed(0)}%)`;
                  } else {
                    // 旧形式のBP: 売上 × 経費率（v3.0互換）
                    const expenseRate = selectedStage.expenseRate ?? 0;
                    cost = monthlyRevenue * expenseRate;
                    costBreakdown = `売上 ${FinancialService.formatCurrency(monthlyRevenue)} × ${(expenseRate * 100).toFixed(0)}%`;
                  }

                  const profit = monthlyRevenue - cost;
                  const profitMargin = monthlyRevenue > 0 ? (profit / monthlyRevenue) * 100 : -100;

                  return (
                    <div className="mt-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded p-4 space-y-2">
                      <h6 className="text-sm font-semibold text-green-800 dark:text-green-300">
                        💰 原価・利益プレビュー
                      </h6>
                      <div className="text-sm space-y-1">
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">売上（月額）:</span> {FinancialService.formatCurrency(monthlyRevenue)}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">原価:</span> {FinancialService.formatCurrency(cost)}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 ml-4">
                          └ {costBreakdown}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 font-semibold">
                          <span className="font-medium">利益:</span> {FinancialService.formatCurrency(profit)}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300">
                          <span className="font-medium">利益率:</span> {profitMargin.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  );
                })()}
            </div>
          )}

          {/* 16Personalities section */}
          <div className="mb-6 border-t dark:border-gray-600 pt-6">
            <h4 className="text-md font-semibold text-gray-700 dark:text-gray-300 mb-4">
              16Personalities（任意）
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  性格タイプ
                </label>
                <select
                  value={personalityId || ''}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value) {
                      setPersonalityId(parseInt(value));
                    } else {
                      setPersonalityId(undefined);
                      setPersonalityVariant(undefined); // Clear variant when clearing type
                    }
                  }}
                  className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 rounded p-2"
                >
                  <option value="">未設定</option>
                  {getAllPersonalities().map(personality => (
                    <option key={personality.id} value={personality.id}>
                      {personality.code} - {personality.name}（{personality.roleName}）
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  16種類の性格タイプから選択
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  アイデンティティ
                </label>
                <div className="flex items-center space-x-4 mt-2">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="variant"
                      value=""
                      checked={!personalityVariant}
                      onChange={() => setPersonalityVariant(undefined)}
                      disabled={!personalityId}
                      className="mr-2"
                    />
                    <span className="text-sm dark:text-gray-300">未設定</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="variant"
                      value="A"
                      checked={personalityVariant === 'A'}
                      onChange={() => setPersonalityVariant('A')}
                      disabled={!personalityId}
                      className="mr-2"
                    />
                    <span className="text-sm dark:text-gray-300">A - 自己主張型</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="variant"
                      value="T"
                      checked={personalityVariant === 'T'}
                      onChange={() => setPersonalityVariant('T')}
                      disabled={!personalityId}
                      className="mr-2"
                    />
                    <span className="text-sm dark:text-gray-300">T - 慎重型</span>
                  </label>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {!personalityId ? 'まず性格タイプを選択してください' : '自己主張型（Assertive）または慎重型（Turbulent）'}
                </p>
              </div>
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
