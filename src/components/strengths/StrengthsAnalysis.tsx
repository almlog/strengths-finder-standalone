// src/components/strengths/StrengthsAnalysis.tsx
import React, { useState } from 'react';
import { Search, Info } from 'lucide-react';
import { useStrengths } from '../../contexts/StrengthsContext';
import StrengthsService, { GROUP_LABELS, GROUP_COLORS, STRENGTHS_DATA } from '../../services/StrengthsService';
import { StrengthGroup, Strength } from '../../models/StrengthsTypes';
import {
  PERSONALITY_TYPES_DATA,
  getRoleGroupColor,
} from '../../services/Personality16Service';

const StrengthsAnalysis: React.FC = () => {
  const { members } = useStrengths();
  const [selectedStrengthId, setSelectedStrengthId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<StrengthGroup | 'all'>('all');
  const [selectedPersonalityId, setSelectedPersonalityId] = useState<number | null>(null);

  // 資質を持つメンバーを取得
  const getStrengthOwners = (strengthId: number) => {
    return members.filter(member => 
      member.strengths.some(s => s.id === strengthId)
    ).map(member => ({
      id: member.id,
      name: member.name,
      department: member.department,
      score: member.strengths.find(s => s.id === strengthId)?.score || 0
    }));
  };

  // 選択された資質の所有者
  const selectedStrengthOwners = selectedStrengthId 
    ? getStrengthOwners(selectedStrengthId)
    : [];

  // 選択された資質の情報
  const selectedStrength = selectedStrengthId 
    ? StrengthsService.getStrengthById(selectedStrengthId)
    : null;

  // 検索とフィルタリング
  const filteredStrengths = STRENGTHS_DATA.filter(strength => {
    const matchesSearch = searchTerm === '' || 
      strength.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      strength.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesGroup = selectedGroup === 'all' || strength.group === selectedGroup;
    
    return matchesSearch && matchesGroup;
  });

  // グループごとに資質をグループ化
  const strengthsByGroup = filteredStrengths.reduce((acc, strength) => {
    if (!acc[strength.group]) {
      acc[strength.group] = [];
    }
    acc[strength.group].push(strength);
    return acc;
  }, {} as Record<StrengthGroup, Strength[]>);

  // 16Personalities: 性格タイプを持つメンバーを取得
  const getPersonalityOwners = (personalityId: number) => {
    return members.filter(member => member.personalityId === personalityId)
      .map(member => ({
        id: member.id,
        name: member.name,
        department: member.department,
        variant: member.personalityVariant,
      }));
  };

  // 16Personalities: 役割グループの順番（色順）
  const roleGroupOrder: Array<'analyst' | 'explorer' | 'sentinel' | 'diplomat'> = [
    'analyst',   // 紫
    'explorer',  // オレンジ
    'sentinel',  // 青
    'diplomat',  // 緑
  ];

  // 16Personalities: 役割グループごとにグループ化
  const personalityTypesByRole = PERSONALITY_TYPES_DATA.reduce((acc, personality) => {
    const owners = getPersonalityOwners(personality.id);
    const typeWithOwners = {
      ...personality,
      ownerCount: owners.length,
      hasOwners: owners.length > 0,
    };

    if (!acc[personality.role]) {
      acc[personality.role] = [];
    }
    acc[personality.role].push(typeWithOwners);
    return acc;
  }, {} as Record<string, Array<typeof PERSONALITY_TYPES_DATA[0] & { ownerCount: number; hasOwners: boolean }>>);

  // 16Personalities: 選択された性格タイプの所有者
  const selectedPersonalityOwners = selectedPersonalityId
    ? getPersonalityOwners(selectedPersonalityId)
    : [];

  // 16Personalities: 選択された性格タイプの情報
  const selectedPersonality = selectedPersonalityId
    ? PERSONALITY_TYPES_DATA.find(p => p.id === selectedPersonalityId)
    : null;

  return (
    <div className="space-y-6">
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold flex items-center mb-4 dark:text-gray-100">
          <Search className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          所有者分析
        </h3>

        {/* 検索とフィルター */}
        <div className="flex flex-col md:flex-row gap-4 mb-4">
          <div className="flex-grow">
            <input
              type="text"
              placeholder="資質名や説明で検索..."
              className="w-full border dark:border-gray-600 dark:bg-gray-600 dark:text-gray-200 dark:placeholder-gray-400 rounded p-2"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div>
            <select
              className="w-full border dark:border-gray-600 dark:bg-gray-600 dark:text-gray-200 rounded p-2"
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value as StrengthGroup | 'all')}
            >
              <option value="all">すべてのグループ</option>
              {Object.entries(GROUP_LABELS).map(([group, label]) => (
                <option key={group} value={group}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 資質一覧 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="text-md font-semibold mb-3 dark:text-gray-100">資質一覧</h4>
          <div className="space-y-4">
            {Object.entries(strengthsByGroup).map(([group, strengths]) => (
              <div key={group} className="space-y-2">
                <h5 
                  className="font-medium text-sm px-2 py-1 rounded-md inline-block"
                  style={{ backgroundColor: GROUP_COLORS[group as StrengthGroup] + '30', color: GROUP_COLORS[group as StrengthGroup] }}
                >
                  {GROUP_LABELS[group as StrengthGroup]}
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {strengths.map(strength => {
                    const ownerCount = getStrengthOwners(strength.id).length;
                    return (
                      <button
                        key={strength.id}
                        className={`text-left p-3 rounded-lg border transition-colors ${
                          selectedStrengthId === strength.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:border-blue-400'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        onClick={() => setSelectedStrengthId(strength.id)}
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-medium dark:text-gray-100">{strength.name}</span>
                          <span className="text-sm bg-gray-100 dark:bg-gray-600 dark:text-gray-300 px-2 py-1 rounded">
                            {ownerCount}人
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            
            {Object.keys(strengthsByGroup).length === 0 && (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <Info className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                <p>該当する資質が見つかりません</p>
              </div>
            )}
          </div>
        </div>

        {/* 選択された資質の詳細 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="text-md font-semibold mb-3 dark:text-gray-100">資質の詳細</h4>

          {selectedStrength ? (
            <div>
              <div
                className="border-l-4 p-4 rounded-r-lg bg-gray-50 dark:bg-gray-700 mb-4"
                style={{ borderLeftColor: GROUP_COLORS[selectedStrength.group] }}
              >
                <div className="flex items-center mb-2">
                  <h5 className="font-medium text-lg dark:text-gray-100">{selectedStrength.name}</h5>
                  <span
                    className="text-xs ml-2 px-2 py-1 rounded"
                    style={{
                      backgroundColor: GROUP_COLORS[selectedStrength.group] + '30',
                      color: GROUP_COLORS[selectedStrength.group]
                    }}
                  >
                    {GROUP_LABELS[selectedStrength.group]}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{selectedStrength.description}</p>
              </div>

              <h5 className="font-medium mb-2 dark:text-gray-100">所有者一覧 ({selectedStrengthOwners.length}人)</h5>
              
              {selectedStrengthOwners.length > 0 ? (
                <div className="space-y-2">
                  {selectedStrengthOwners
                    .sort((a, b) => a.score - b.score) // スコアの低い順にソート（TOP1が一番上）
                    .map(owner => (
                      <div
                        key={owner.id}
                        className="flex justify-between items-center p-3 border dark:border-gray-600 rounded-lg"
                      >
                        <div>
                          <div className="font-medium dark:text-gray-100">{owner.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">部署: {owner.department}</div>
                        </div>
                        {owner.score > 0 && (
                          <div className="bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-full text-sm">
                            TOP {owner.score}
                          </div>
                        )}
                      </div>
                    ))
                  }
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Info className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>この資質を持つメンバーはいません</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <Info className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>左側から資質を選択してください</p>
            </div>
          )}
        </div>
      </div>

      {/* 16Personalities Section */}
      <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
        <h3 className="text-lg font-semibold flex items-center dark:text-gray-100">
          <Search className="w-5 h-5 mr-2 text-blue-600 dark:text-blue-400" />
          16Personalities
        </h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 性格タイプ一覧 - グループごとに表示 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="text-md font-semibold mb-3 dark:text-gray-100">性格タイプ一覧</h4>
          <div className="space-y-4">
            {roleGroupOrder.map((role) => {
              const types = personalityTypesByRole[role] || [];
              if (types.length === 0) return null;

              const roleNameMap = {
                analyst: '分析家',
                diplomat: '外交官',
                sentinel: '番人',
                explorer: '探検家',
              };

              return (
                <div key={role} className="space-y-2">
                  <h5
                    className="font-medium text-sm px-2 py-1 rounded-md inline-block"
                    style={{
                      backgroundColor: getRoleGroupColor(role, false) + '30',
                      color: getRoleGroupColor(role, false),
                    }}
                  >
                    {roleNameMap[role]}
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {types.map((type) => (
                      <button
                        key={type.code}
                        className={`text-left p-2 rounded-lg border transition-all ${
                          selectedPersonalityId === type.id
                            ? 'border-blue-500 bg-blue-50 dark:bg-blue-900 dark:border-blue-400'
                            : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                        style={{
                          borderLeftColor: type.colorLight,
                          borderLeftWidth: '4px',
                          opacity: type.hasOwners ? 1 : 0.3,
                        }}
                        onClick={() => setSelectedPersonalityId(type.id)}
                      >
                        <div className="font-bold text-sm dark:text-gray-100">{type.code}</div>
                        <div className="text-xs text-gray-600 dark:text-gray-400 truncate">{type.name}</div>
                        <div className="text-xs bg-gray-100 dark:bg-gray-600 dark:text-gray-300 px-1 py-0.5 rounded mt-1 text-center">
                          {type.ownerCount}人
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 選択された性格タイプの詳細 */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h4 className="text-md font-semibold mb-3 dark:text-gray-100">性格タイプの詳細</h4>

          {selectedPersonality ? (
            <div>
              <div
                className="border-l-4 p-4 rounded-r-lg bg-gray-50 dark:bg-gray-700 mb-4"
                style={{ borderLeftColor: selectedPersonality.colorLight }}
              >
                <div className="flex items-center mb-2">
                  <h5 className="font-medium text-lg dark:text-gray-100">
                    {selectedPersonality.code} - {selectedPersonality.name}
                  </h5>
                  <span
                    className="text-xs ml-2 px-2 py-1 rounded text-white"
                    style={{ backgroundColor: getRoleGroupColor(selectedPersonality.role, false) }}
                  >
                    {selectedPersonality.roleName}
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300">{selectedPersonality.description}</p>
              </div>

              <h5 className="font-medium mb-2 dark:text-gray-100">所有者一覧 ({selectedPersonalityOwners.length}人)</h5>

              {selectedPersonalityOwners.length > 0 ? (
                <div className="space-y-2">
                  {selectedPersonalityOwners.map(owner => (
                    <div
                      key={owner.id}
                      className="flex justify-between items-center p-3 border dark:border-gray-600 rounded-lg"
                    >
                      <div>
                        <div className="font-medium dark:text-gray-100">{owner.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">部署: {owner.department}</div>
                      </div>
                      {owner.variant && (
                        <div className={`px-2 py-1 rounded-full text-sm ${
                          owner.variant === 'A'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                            : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                        }`}>
                          {owner.variant === 'A' ? '自己主張型' : '慎重型'}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <Info className="w-12 h-12 mx-auto mb-2 text-gray-300 dark:text-gray-600" />
                  <p>この性格タイプを持つメンバーはいません</p>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500 dark:text-gray-400">
              <Info className="w-16 h-16 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
              <p>左側から性格タイプを選択してください</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StrengthsAnalysis;
