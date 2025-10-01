// src/components/strengths/SelectedAnalysis.tsx
import React from 'react';
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
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

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

  // 選択メンバーの情報
  const selectedMembers = members.filter(m => selectedMemberIds.includes(m.id));
  
  // 選択されていない場合はプレースホルダーを表示
  if (selectedMemberIds.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500">
        <CheckSquare className="w-16 h-16 mb-4 text-gray-300" />
        <p>左のメンバーリストからチェックボックスで分析したいメンバーを選択してください</p>
      </div>
    );
  }
  
  if (!analysisResult && !loading) {
    return (
      <div className="space-y-4 p-4">
        <h3 className="text-lg font-semibold">選択したメンバー ({selectedMemberIds.length}名)</h3>
        <div className="flex flex-wrap gap-2 mb-4">
          {selectedMembers.map(member => (
            <div 
              key={member.id}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center"
            >
              <span>{member.name}</span>
              <button 
                className="ml-2 text-blue-600 hover:text-blue-800"
                onClick={() => toggleMemberSelection(member.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
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

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold flex items-center">
          <Users className="w-5 h-5 mr-2 text-blue-600" />
          選択メンバーの分析 ({selectedMemberIds.length}名)
        </h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedMembers.map(member => (
            <div 
              key={member.id}
              className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full flex items-center text-sm"
            >
              <span>{member.name}</span>
              <button 
                className="ml-2 text-blue-600 hover:text-blue-800"
                onClick={() => toggleMemberSelection(member.id)}
              >
                ×
              </button>
            </div>
          ))}
        </div>
        <div className="mt-4">
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            onClick={analyzeSelected}
          >
            再分析
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* グループ分布 */}
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-md font-semibold mb-3">強みグループ分布</h4>
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
        <div className="bg-white rounded-lg shadow p-4">
          <h4 className="text-md font-semibold mb-3">上位の強み</h4>
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
                        <div className="bg-white p-3 border rounded shadow-lg">
                          <p className="font-medium">{data.name}</p>
                          <p className="text-blue-600">{`${data.value}人`}</p>
                          {data.members && data.members.length > 0 && (
                            <div className="mt-2">
                              <p className="font-medium">所持メンバー:</p>
                              <ul className="list-disc pl-5 mt-1">
                                {data.members.map((member: string, index: number) => (
                                  <li key={index} className="text-sm">{member}</li>
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
      </div>

      {/* チームの代表的な強み（すべての資質） */}
      <div className="bg-white rounded-lg shadow p-4">
        <h4 className="text-md font-semibold mb-3">チームの代表的な強み</h4>
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
                  className="flex items-start border-l-4 p-3 rounded-r-lg bg-gray-50 relative group"
                  style={{ borderLeftColor: GROUP_COLORS[strength.group] }}
                >
                  <div className="font-bold text-xl text-gray-400 mr-3">{count}人</div>
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <h5 className="font-medium">{strength.name}</h5>
                      <span className="text-xs ml-2 bg-gray-200 px-2 py-1 rounded">
                        {GROUP_LABELS[strength.group]}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{strength.description}</p>
                  </div>
                  
                  {/* 所有者名のツールチップ */}
                  <div className="absolute invisible group-hover:visible bg-white p-3 border rounded shadow-lg right-0 z-10 w-64">
                    <p className="font-medium">所持メンバー:</p>
                    <ul className="list-disc pl-5 mt-1">
                      {members.map((member: string, index: number) => (
                        <li key={index} className="text-sm">{member}</li>
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

export default SelectedAnalysis;
