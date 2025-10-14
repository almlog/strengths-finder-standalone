/**
 * Personality16AnalysisTab Component
 *
 * @module components/strengths/Personality16AnalysisTab
 * @description Displays team-wide 16Personalities analysis including
 * type distribution, role distribution, and variant distribution.
 * Uses Recharts for data visualization with bar and pie charts.
 *
 * Features:
 * - Type Distribution: Bar chart showing count of each personality type
 * - Role Distribution: Pie chart showing distribution across 4 role groups
 * - Variant Distribution: Pie chart showing Assertive vs Turbulent breakdown
 * - Responsive design with dark mode support
 *
 * @example
 * ```tsx
 * <Personality16AnalysisTab />
 * ```
 */

import React from 'react';
import { useStrengths } from '../../contexts/StrengthsContext';
import {
  analyzeTeamPersonalities,
  PERSONALITY_TYPES_DATA,
  getRoleGroupColor,
  RoleGroup,
} from '../../services/Personality16Service';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Users } from 'lucide-react';

// Variant colors for consistent theming
const VARIANT_COLORS = {
  A: '#10B981', // Green - Assertive
  T: '#3B82F6', // Blue - Turbulent
} as const;

/**
 * Personality16AnalysisTab functional component
 *
 * @returns {JSX.Element} Analysis tab with charts and statistics
 */
const Personality16AnalysisTab: React.FC = () => {
  const { members } = useStrengths();

  // Analyze team personalities
  const analysis = analyzeTeamPersonalities(members);

  // Check if there's any personality data
  const hasData = analysis.totalMembers > 0;

  // If no data, show message
  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-gray-500 dark:text-gray-400">
        <Users className="w-16 h-16 mb-4 text-gray-300 dark:text-gray-600" />
        <p>性格タイプデータがありません</p>
        <p className="text-sm mt-2">メンバーに16Personalitiesデータを追加すると分析が表示されます</p>
      </div>
    );
  }

  // Prepare type distribution data for chart (only types with count > 0)
  const typeChartData = Object.entries(analysis.typeDistribution)
    .filter(([_, count]) => count > 0)
    .map(([typeId, count]) => {
      const personality = PERSONALITY_TYPES_DATA.find(p => p.id === parseInt(typeId));
      const members = analysis.typeMembers[parseInt(typeId)] || [];
      return {
        code: personality?.code || '',
        name: personality?.name || '',
        count,
        percentage: ((count / analysis.totalMembers) * 100).toFixed(1),
        color: personality ? (personality.colorLight) : '#999',
        members,
      };
    })
    .sort((a, b) => b.count - a.count);

  // Prepare ALL 16 types for cards in fixed order (role-based grouping)
  const allTypeCardsData = PERSONALITY_TYPES_DATA.map(personality => {
    const count = analysis.typeDistribution[personality.id] || 0;
    const members = analysis.typeMembers[personality.id] || [];
    return {
      id: personality.id,
      code: personality.code,
      name: personality.name,
      count,
      percentage: analysis.totalMembers > 0 ? ((count / analysis.totalMembers) * 100).toFixed(1) : '0',
      color: personality.colorLight,
      members,
      hasMembers: count > 0,
    };
  });

  // Prepare role distribution data
  const roleDistributionData = Object.entries(analysis.roleDistribution)
    .filter(([_, count]) => count > 0)
    .map(([role, count]) => {
      const roleGroup = role as RoleGroup;
      const roleNameMap: { [key in RoleGroup]: string } = {
        analyst: '分析家',
        diplomat: '外交官',
        sentinel: '番人',
        explorer: '探検家',
      };
      const members = analysis.roleMembers[roleGroup] || [];
      return {
        role: roleNameMap[roleGroup],
        count,
        percentage: ((count / analysis.totalMembers) * 100).toFixed(1),
        color: getRoleGroupColor(roleGroup, false),
        members,
      };
    });

  // Prepare variant distribution data
  const variantDistributionData = [
    {
      variant: '自己主張型 (A)',
      count: analysis.variantDistribution.A,
      percentage: ((analysis.variantDistribution.A / analysis.totalMembers) * 100).toFixed(1),
      color: VARIANT_COLORS.A,
      members: analysis.variantMembers.A,
    },
    {
      variant: '慎重型 (T)',
      count: analysis.variantDistribution.T,
      percentage: ((analysis.variantDistribution.T / analysis.totalMembers) * 100).toFixed(1),
      color: VARIANT_COLORS.T,
      members: analysis.variantMembers.T,
    },
    {
      variant: '未設定',
      count: analysis.variantDistribution.unset,
      percentage: ((analysis.variantDistribution.unset / analysis.totalMembers) * 100).toFixed(1),
      color: '#9CA3AF', // Gray
      members: analysis.variantMembers.unset,
    },
  ].filter(item => item.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-xl font-bold dark:text-gray-100">16Personalities チーム分析</h3>
        <p className="text-gray-600 dark:text-gray-400">性格タイプデータを持つメンバー数: {analysis.totalMembers}人</p>
      </div>

      {/* Type Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h4 className="text-lg font-semibold mb-4 dark:text-gray-100">性格タイプ分布</h4>
        <div data-testid="type-chart">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={typeChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="code" />
              <YAxis />
              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-gray-800 p-3 border dark:border-gray-600 rounded shadow-lg">
                        <p className="font-bold dark:text-gray-100">{data.code} - {data.name}</p>
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
              <Bar dataKey="count" fill="#8884d8">
                {typeChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Type cards - 全16タイプを固定順で表示（4×4グリッド） */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {allTypeCardsData.map((type) => (
            <div
              key={type.code}
              className="border dark:border-gray-600 rounded p-3 relative group transition-opacity"
              style={{
                borderLeftColor: type.color,
                borderLeftWidth: '4px',
                opacity: type.hasMembers ? 1 : 0.3
              }}
            >
              <div className="font-bold text-lg dark:text-gray-100">{type.code}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400">{type.name}</div>
              <div className="text-2xl font-bold mt-2 dark:text-gray-100">{type.count}人</div>

              {/* 所有者名のツールチップ */}
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

      {/* Role Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h4 className="text-lg font-semibold mb-4 dark:text-gray-100">役割グループ分布</h4>
        <div data-testid="role-chart">
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

        {/* Role cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {roleDistributionData.map((role) => (
            <div
              key={role.role}
              className="border dark:border-gray-600 rounded p-3 relative group"
              style={{ borderLeftColor: role.color, borderLeftWidth: '4px' }}
            >
              <div className="font-bold text-lg dark:text-gray-100">{role.role}</div>
              <div className="text-2xl font-bold mt-2 dark:text-gray-100">{role.count}人</div>

              {/* 所有者名のツールチップ */}
              {role.members && role.members.length > 0 && (
                <div className="absolute invisible group-hover:visible bg-white dark:bg-gray-600 p-3 border dark:border-gray-500 rounded shadow-lg right-0 top-0 z-10 w-64">
                  <p className="font-medium dark:text-gray-100">所持メンバー:</p>
                  <ul className="list-disc pl-5 mt-1">
                    {role.members.map((member: string, index: number) => (
                      <li key={index} className="text-sm dark:text-gray-300">{member}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Variant Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
        <h4 className="text-lg font-semibold mb-4 dark:text-gray-100">アイデンティティ分布</h4>
        <div data-testid="variant-chart">
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

        {/* Variant cards */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          {variantDistributionData.map((variant) => (
            <div
              key={variant.variant}
              className="border dark:border-gray-600 rounded p-3 relative group"
              style={{ borderLeftColor: variant.color, borderLeftWidth: '4px' }}
            >
              <div className="font-bold text-lg dark:text-gray-100">{variant.variant}</div>
              <div className="text-2xl font-bold mt-2 dark:text-gray-100">{variant.count}人</div>

              {/* 所有者名のツールチップ */}
              {variant.members && variant.members.length > 0 && (
                <div className="absolute invisible group-hover:visible bg-white dark:bg-gray-600 p-3 border dark:border-gray-500 rounded shadow-lg right-0 top-0 z-10 w-64">
                  <p className="font-medium dark:text-gray-100">所持メンバー:</p>
                  <ul className="list-disc pl-5 mt-1">
                    {variant.members.map((member: string, index: number) => (
                      <li key={index} className="text-sm dark:text-gray-300">{member}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Personality16AnalysisTab;
