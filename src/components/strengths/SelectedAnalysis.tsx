// src/components/strengths/SelectedAnalysis.tsx
import React, { useMemo } from 'react';
import { CheckSquare, AlertCircle, Users } from 'lucide-react';
import { useStrengths } from '../../contexts/StrengthsContext';
import StrengthsService, { GROUP_LABELS, GROUP_COLORS } from '../../services/StrengthsService';
import { StrengthGroup } from '../../models/StrengthsTypes';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  analyzeTeamPersonalities,
  PERSONALITY_TYPES_DATA,
  getRoleGroupColor,
  RoleGroup,
} from '../../services/Personality16Service';
import { useManagerMode } from '../../hooks/useManagerMode';
import FinancialDashboard from './FinancialDashboard';
import ProfitabilityDashboard from './ProfitabilityDashboard';
import { SimulationService } from '../../services/SimulationService';

// Variant colors for consistent theming
const VARIANT_COLORS = {
  A: '#10B981', // Green - Assertive
  T: '#3B82F6', // Blue - Turbulent
} as const;

const SelectedAnalysis: React.FC = () => {
  const {
    members,
    selectedMemberIds,
    analyzeSelected,
    analysisResult,
    loading,
    error,
    toggleMemberSelection
  } = useStrengths();
  const isManagerMode = useManagerMode();

  // 選択メンバーの情報
  const selectedMembers = members.filter(m => selectedMemberIds.includes(m.id));

  // チーム特性ナラティブを計算
  const teamNarrative = useMemo(() => {
    return SimulationService.calculateTeamNarrative(selectedMembers);
  }, [selectedMembers]);

  // 選択されていない場合はプレースホルダーを表示
  if (selectedMemberIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
        <CheckSquare className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
        <p>左のメンバーリストからチェックボックスで分析したいメンバーを選択してください</p>
      </div>
    );
  }
  
  if (!analysisResult && !loading) {
    return (
      <div className="space-y-4 p-4">
        <h3 className="text-lg font-semibold dark:text-gray-100">選択したメンバー ({selectedMemberIds.length}名)</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedMembers.map(member => (
            <div
              key={member.id}
              className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full flex items-center"
            >
              <span>{member.name}</span>
              <button
                className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                onClick={() => toggleMemberSelection(member.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
          onClick={analyzeSelected}
        >
          分析実行
        </button>
      </div>
    );
  }
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">分析中...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex items-center justify-center p-8 text-red-500">
        <AlertCircle className="w-6 h-6 mr-2" />
        <p>{error}</p>
      </div>
    );
  }
  
  if (!analysisResult) {
    return null;
  }

  // グループ分布データを作成
  const groupDistributionData = Object.entries(analysisResult.groupDistribution).map(([group, count]) => ({
    name: GROUP_LABELS[group as StrengthGroup],
    value: count,
    fill: GROUP_COLORS[group as StrengthGroup]
  }));
  
  // 強み頻度データを作成
  const strengthFrequencyData = Object.entries(analysisResult.strengthsFrequency)
    .filter(([_, count]) => count > 0)
    .map(([id, count]) => {
      const strength = StrengthsService.getStrengthById(parseInt(id));
      const members = analysisResult.strengthsMembers[parseInt(id)] || [];
      return {
        name: strength?.name || `ID: ${id}`,
        value: count,
        group: strength?.group || StrengthGroup.EXECUTING,
        fill: strength ? GROUP_COLORS[strength.group] : '#ccc',
        members: members
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // 上位10個のみ表示

  // 16Personalities analysis for selected members
  const personalityAnalysis = analyzeTeamPersonalities(selectedMembers);
  const hasPersonalityData = personalityAnalysis.totalMembers > 0;

  // Prepare personality type data (only types with members)
  const personalityTypeData = Object.entries(personalityAnalysis.typeDistribution)
    .filter(([_, count]) => count > 0)
    .map(([typeId, count]) => {
      const personality = PERSONALITY_TYPES_DATA.find(p => p.id === parseInt(typeId));
      const members = personalityAnalysis.typeMembers[parseInt(typeId)] || [];
      return {
        id: parseInt(typeId),
        code: personality?.code || '',
        name: personality?.name || '',
        count,
        color: personality?.colorLight || '#999',
        members,
        roleName: personality?.roleName || '',
      };
    })
    .sort((a, b) => b.count - a.count);

  // Prepare role distribution data
  const roleDistributionData = Object.entries(personalityAnalysis.roleDistribution)
    .filter(([_, count]) => count > 0)
    .map(([role, count]) => {
      const roleGroup = role as RoleGroup;
      const roleNameMap: { [key in RoleGroup]: string } = {
        analyst: '分析家',
        diplomat: '外交官',
        sentinel: '番人',
        explorer: '探検家',
      };
      const members = personalityAnalysis.roleMembers[roleGroup] || [];
      return {
        role: roleNameMap[roleGroup],
        count,
        percentage: ((count / personalityAnalysis.totalMembers) * 100).toFixed(1),
        color: getRoleGroupColor(roleGroup, false),
        members,
      };
    });

  // Prepare variant distribution data
  const variantDistributionData = [
    {
      variant: '自己主張型 (A)',
      count: personalityAnalysis.variantDistribution.A,
      percentage: personalityAnalysis.totalMembers > 0
        ? ((personalityAnalysis.variantDistribution.A / personalityAnalysis.totalMembers) * 100).toFixed(1)
        : '0',
      color: VARIANT_COLORS.A,
      members: personalityAnalysis.variantMembers.A,
    },
    {
      variant: '慎重型 (T)',
      count: personalityAnalysis.variantDistribution.T,
      percentage: personalityAnalysis.totalMembers > 0
        ? ((personalityAnalysis.variantDistribution.T / personalityAnalysis.totalMembers) * 100).toFixed(1)
        : '0',
      color: VARIANT_COLORS.T,
      members: personalityAnalysis.variantMembers.T,
    },
    {
      variant: '未設定',
      count: personalityAnalysis.variantDistribution.unset,
      percentage: personalityAnalysis.totalMembers > 0
        ? ((personalityAnalysis.variantDistribution.unset / personalityAnalysis.totalMembers) * 100).toFixed(1)
        : '0',
      color: '#9CA3AF', // Gray
      members: personalityAnalysis.variantMembers.unset,
    },
  ].filter(item => item.count > 0);

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold flex items-center dark:text-gray-100">
          <Users className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          選択メンバーの分析 ({selectedMemberIds.length}名)
        </h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedMembers.map(member => (
            <div
              key={member.id}
              className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full flex items-center text-sm"
            >
              <span>{member.name}</span>
              <button
                className="ml-2 text-blue-600 dark:text-blue-300 hover:text-blue-800 dark:hover:text-blue-100"
                onClick={() => toggleMemberSelection(member.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            onClick={analyzeSelected}
          >
            再分析
          </button>
        </div>
      </div>

      {/* Manager mode: Financial Dashboard (売上分析) */}
      {isManagerMode && <FinancialDashboard members={selectedMembers} />}

      {/* Manager mode: Profitability Dashboard (利益率分析) */}
      {isManagerMode && <ProfitabilityDashboard members={selectedMembers} />}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* グループ分布 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="text-md font-semibold mb-3 dark:text-gray-100">強みグループ分布</h4>
          <div style={{ width: '100%', height: 500 }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={groupDistributionData}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }: any) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  dataKey="value"
                >
                  {groupDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`${value}個`, '強みの数']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 上位の強み */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="text-md font-semibold mb-3 dark:text-gray-100">上位の強み</h4>
          <div style={{ width: '100%', height: 500 }}>
            <ResponsiveContainer>
              <BarChart
                data={strengthFrequencyData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 80, bottom: 5 }}
              >
                <XAxis type="number" domain={[0, 'dataMax']} />
                <YAxis type="category" dataKey="name" />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-white dark:bg-gray-700 p-3 border dark:border-gray-600 rounded shadow-lg">
                          <p className="font-medium dark:text-gray-100">{data.name}</p>
                          <p className="text-blue-600 dark:text-blue-400">{`${data.value}人`}</p>
                          {data.members && data.members.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium dark:text-gray-100">所持メンバー:</p>
                              <ul className="list-disc pl-5 mt-1">
                                {data.members.map((member: string, index: number) => (
                                  <li key={index} className="text-sm dark:text-gray-300">{member}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="value" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* チーム特性ナラティブ（分析コメント） */}
        {teamNarrative && (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow p-4 overflow-y-auto" style={{ maxHeight: '450px' }}>
            <h4 className="text-md font-semibold mb-3 dark:text-gray-100">分析結果コメント</h4>

            {/* タイトル */}
            <div className="mb-3">
              <h5 className="text-lg font-bold text-blue-800 dark:text-blue-300">
                {teamNarrative.title}
              </h5>
            </div>

            {/* サマリー */}
            <div className="mb-4">
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {teamNarrative.summary}
              </p>
            </div>

            {/* 頻出資質TOP5 */}
            <div className="mb-4">
              <h6 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                頻出資質TOP5
              </h6>
              <div className="flex flex-wrap gap-2">
                {teamNarrative.topStrengths.slice(0, 5).map(s => (
                  <span
                    key={s.strengthId}
                    className="px-2 py-1 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 rounded text-xs font-medium"
                    title={`${s.frequency}人が保有 (${s.percentage.toFixed(0)}%)`}
                  >
                    {s.name}
                  </span>
                ))}
              </div>
            </div>

            {/* チームの可能性 */}
            <div>
              <h6 className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-2">
                このチームの可能性
              </h6>
              <ul className="text-xs text-gray-700 dark:text-gray-300 space-y-2">
                {teamNarrative.possibilities.map((poss, idx) => (
                  <li key={idx} className="flex items-start">
                    <span className="text-blue-500 mr-2">▸</span>
                    <span>{poss}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* チームの代表的な強み（すべての資質） */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h4 className="text-md font-semibold mb-3 dark:text-gray-100">
          {selectedMembers.length <= 3
            ? `${selectedMembers.map(m => m.name).join('・')} の代表的な強み`
            : `${selectedMembers.slice(0, 3).map(m => m.name).join('・')} 他${selectedMembers.length - 3}名 の代表的な強み`
          }
        </h4>
        <div className="space-y-3">
          {Object.entries(analysisResult.strengthsFrequency)
            .filter(([_, count]) => count > 0)
            .map(([id, count]) => {
              const strengthId = parseInt(id);
              const strength = StrengthsService.getStrengthById(strengthId);
              const members = analysisResult.strengthsMembers[strengthId] || [];
              
              if (!strength || members.length === 0) return null;
              
              return (
                <div
                  key={strengthId}
                  className="flex items-start border-l-4 p-3 rounded-r-lg bg-gray-50 dark:bg-gray-700 relative group"
                  style={{ borderLeftColor: GROUP_COLORS[strength.group] }}
                >
                  <div className="font-bold text-xl text-gray-400 dark:text-gray-500 mr-3">{count}人</div>
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <h5 className="font-medium dark:text-gray-100">{strength.name}</h5>
                      <span className="text-xs ml-2 bg-gray-200 dark:bg-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                        {GROUP_LABELS[strength.group]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{strength.description}</p>
                  </div>

                  {/* 所有者名のツールチップ */}
                  <div className="absolute invisible group-hover:visible bg-white dark:bg-gray-600 p-3 border dark:border-gray-500 rounded shadow-lg right-0 z-10 w-64">
                    <p className="font-medium dark:text-gray-100">所持メンバー:</p>
                    <ul className="list-disc pl-5 mt-1">
                      {members.map((member: string, index: number) => (
                        <li key={index} className="text-sm dark:text-gray-300">{member}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })
            .sort((a, b) => {
              // nullチェック
              if (!a) return 1;
              if (!b) return -1;
              
              // count値でソート（降順）
              const countA = a.props.children[0].props.children;
              const countB = b.props.children[0].props.children;
              return parseInt(countB) - parseInt(countA);
            })}
        </div>
      </div>

      {/* 16Personalities Analysis Section */}
      {hasPersonalityData && (
        <>
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
            <h3 className="text-xl font-bold dark:text-gray-100">16Personalities 分析</h3>
            <p className="text-gray-600 dark:text-gray-400">性格タイプデータを持つメンバー数: {personalityAnalysis.totalMembers}人</p>
          </div>

          {/* Role and Variant Distribution Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Role Distribution */}
            {roleDistributionData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h4 className="text-lg font-semibold mb-4 dark:text-gray-100">役割グループ分布</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={roleDistributionData}
                      dataKey="count"
                      nameKey="role"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ role, percentage }) => `${role} ${percentage}%`}
                    >
                      {roleDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-gray-800 p-3 border dark:border-gray-600 rounded shadow-lg">
                              <p className="font-bold dark:text-gray-100">{data.role}</p>
                              <p className="dark:text-gray-300">人数: {data.count}人</p>
                              <p className="dark:text-gray-300">割合: {data.percentage}%</p>
                              {data.members && data.members.length > 0 && (
                                <div className="mt-2">
                                  <p className="font-medium dark:text-gray-100">所持メンバー:</p>
                                  <ul className="list-disc pl-5 mt-1">
                                    {data.members.map((member: string, index: number) => (
                                      <li key={index} className="text-sm dark:text-gray-300">{member}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Variant Distribution */}
            {variantDistributionData.length > 0 && (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h4 className="text-lg font-semibold mb-4 dark:text-gray-100">アイデンティティ分布</h4>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={variantDistributionData}
                      dataKey="count"
                      nameKey="variant"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ variant, percentage }) => `${variant} ${percentage}%`}
                    >
                      {variantDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div className="bg-white dark:bg-gray-800 p-3 border dark:border-gray-600 rounded shadow-lg">
                              <p className="font-bold dark:text-gray-100">{data.variant}</p>
                              <p className="dark:text-gray-300">人数: {data.count}人</p>
                              <p className="dark:text-gray-300">割合: {data.percentage}%</p>
                              {data.members && data.members.length > 0 && (
                                <div className="mt-2">
                                  <p className="font-medium dark:text-gray-100">所持メンバー:</p>
                                  <ul className="list-disc pl-5 mt-1">
                                    {data.members.map((member: string, index: number) => (
                                      <li key={index} className="text-sm dark:text-gray-300">{member}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Personality Type Cards */}
          {personalityTypeData.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <h4 className="text-lg font-semibold mb-4 dark:text-gray-100">性格タイプ分布</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {personalityTypeData.map((type) => (
                  <div
                    key={type.code}
                    className="border dark:border-gray-600 rounded p-3 relative group"
                    style={{
                      borderLeftColor: type.color,
                      borderLeftWidth: '4px',
                    }}
                  >
                    <div className="font-bold text-lg dark:text-gray-100">{type.code}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">{type.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">{type.roleName}</div>
                    <div className="text-2xl font-bold mt-2 dark:text-gray-100">{type.count}人</div>

                    {/* Member tooltip */}
                    {type.members && type.members.length > 0 && (
                      <div className="absolute invisible group-hover:visible bg-white dark:bg-gray-600 p-3 border dark:border-gray-500 rounded shadow-lg right-0 top-0 z-10 w-64">
                        <p className="font-medium dark:text-gray-100">所持メンバー:</p>
                        <ul className="list-disc pl-5 mt-1">
                          {type.members.map((member: string, index: number) => (
                            <li key={index} className="text-sm dark:text-gray-300">{member}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

    </div>
  );
};

export default SelectedAnalysis;
