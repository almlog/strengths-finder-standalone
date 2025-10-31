// src/components/strengths/DepartmentAnalysis.tsx
import React, { useMemo } from 'react';
import { Building, AlertCircle } from 'lucide-react';
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
import { useManagerMode } from '../../hooks/useManagerMode';
import ProfitabilityDashboard from './ProfitabilityDashboard';
import { SimulationService } from '../../services/SimulationService';

const DepartmentAnalysis: React.FC = () => {
  const { members, analyzeDepartment, analysisResult, loading, error, selectedDepartment } = useStrengths();
  const isManagerMode = useManagerMode();

  // 部署コードの一覧を取得し、番号順でソート
  const departments = ['all', ...[...new Set(members.map(m => m.department))].sort()];

  // 部署のメンバーを取得（useMemoはトップレベルで呼ぶ必要がある）
  const departmentMembers = useMemo(() => {
    return selectedDepartment === 'all'
      ? members
      : members.filter(m => m.department === selectedDepartment);
  }, [selectedDepartment, members]);

  // チーム特性ナラティブを計算（useMemoはトップレベルで呼ぶ必要がある）
  const teamNarrative = useMemo(() => {
    return SimulationService.calculateTeamNarrative(departmentMembers);
  }, [departmentMembers]);

  const handleDepartmentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    analyzeDepartment(e.target.value);
  };

  // 選択されていない場合はプレースホルダーを表示
  if (!analysisResult && !loading) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
        <Building className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
        <p>部署コードを選択して分析を実行してください</p>
        <div className="mt-4 w-64">
          <select
            className="w-full border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded p-2"
            value={selectedDepartment}
            onChange={handleDepartmentChange}
          >
            <option value="all">すべての部署コード</option>
            {departments.filter(d => d !== 'all').map(dept => (
              <option key={dept} value={dept}>{dept}</option>
            ))}
          </select>
          <button
            className="mt-2 w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-800"
            onClick={() => analyzeDepartment(selectedDepartment)}
          >
            分析実行
          </button>
        </div>
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

  return (
    <div className="space-y-6">
      {/* 部署コード選択と見出し */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold dark:text-gray-100">
          {selectedDepartment === 'all' ? 'すべての部署コード' : `部署コード: ${selectedDepartment}`} の分析
        </h3>
        <select
          className="border dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded p-1 text-sm"
          value={selectedDepartment}
          onChange={handleDepartmentChange}
        >
          <option value="all">すべての部署コード</option>
          {departments.filter(d => d !== 'all').map(dept => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {/* Manager mode: Profitability Dashboard (利益率分析) */}
      {isManagerMode && <ProfitabilityDashboard members={departmentMembers} />}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. 円グラフ: グループ分布 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="text-md font-semibold mb-3 dark:text-gray-100">1. 強みグループ分布（円グラフ）</h4>
          <div style={{ width: '100%', height: 450 }}>
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

        {/* 2. 棒グラフ: 上位の強み */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="text-md font-semibold mb-3 dark:text-gray-100">2. 頻出資質TOP10（棒グラフ）</h4>
          <div style={{ width: '100%', height: 450 }}>
            <ResponsiveContainer>
              <BarChart
                data={strengthFrequencyData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
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

        {/* 3. チーム特性ナラティブ（分析コメント） */}
        {teamNarrative && (
          <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg shadow p-4 overflow-y-auto" style={{ maxHeight: '450px' }}>
            <h4 className="text-md font-semibold mb-3 dark:text-gray-100">3. 分析結果コメント</h4>

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

      {/* 部署コードの代表的な強み（すべての資質） */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h4 className="text-md font-semibold mb-3 dark:text-gray-100">部署コードの代表的な強み</h4>
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
    </div>
  );
};

export default DepartmentAnalysis;
