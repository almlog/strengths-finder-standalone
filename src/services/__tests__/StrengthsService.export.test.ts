/**
 * StrengthsService エクスポート/インポート機能のテスト
 *
 * @module services/__tests__/StrengthsService.export.test
 * @description 単価情報の除外機能に特化したテスト
 */

import StrengthsService from '../StrengthsService';
import { MemberStrengths } from '../../models/StrengthsTypes';

describe('StrengthsService - エクスポート/インポート（単価除外）', () => {
  beforeEach(() => {
    // 各テストの前にLocalStorageをクリア
    localStorage.clear();
  });

  afterEach(() => {
    // 各テストの後にもクリーンアップ
    localStorage.clear();
  });

  describe('exportMembers - メンバーデータのエクスポート', () => {
    test('memberRateフィールドを持つメンバーをエクスポートしても、JSONにmemberRateが含まれない', () => {
      // memberRateを持つメンバーを追加
      const memberWithRate: any = {
        id: 'member-1',
        name: '山田太郎',
        department: '開発部',
        memberRate: { rateType: 'monthly', rate: 800000 }, // 単価情報
        strengths: [
          { id: 1, score: 5 },
          { id: 2, score: 4 },
          { id: 3, score: 3 },
          { id: 4, score: 2 },
          { id: 5, score: 1 }
        ]
      };

      // LocalStorageに保存（memberRateを含む）
      localStorage.setItem('strengths_members', JSON.stringify([memberWithRate]));

      // エクスポート
      const json = StrengthsService.exportMembers();
      const data = JSON.parse(json);

      // メンバーデータにmemberRateが含まれていないことを確認
      expect(data.members).toHaveLength(1);
      expect(data.members[0].id).toBe('member-1');
      expect(data.members[0].name).toBe('山田太郎');
      expect(data.members[0].memberRate).toBeUndefined();
    });

    test('複数メンバーの場合も全てのmemberRateが除外される', () => {
      const members: any[] = [
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },
          strengths: [{ id: 1, score: 5 }, { id: 2, score: 4 }, { id: 3, score: 3 }, { id: 4, score: 2 }, { id: 5, score: 1 }]
        },
        {
          id: 'member-2',
          name: '佐藤花子',
          department: '営業部',
          memberRate: { rateType: 'hourly', rate: 5000, hours: 160 },
          strengths: [{ id: 6, score: 5 }, { id: 7, score: 4 }, { id: 8, score: 3 }, { id: 9, score: 2 }, { id: 10, score: 1 }]
        }
      ];

      localStorage.setItem('strengths_members', JSON.stringify(members));

      const json = StrengthsService.exportMembers();
      const data = JSON.parse(json);

      expect(data.members).toHaveLength(2);
      expect(data.members[0].memberRate).toBeUndefined();
      expect(data.members[1].memberRate).toBeUndefined();
    });

    test('memberRateを持たないメンバーは影響を受けない', () => {
      const memberWithoutRate: MemberStrengths = {
        id: 'member-1',
        name: '山田太郎',
        department: '開発部',
        strengths: [
          { id: 1, score: 5 },
          { id: 2, score: 4 },
          { id: 3, score: 3 },
          { id: 4, score: 2 },
          { id: 5, score: 1 }
        ]
      };

      localStorage.setItem('strengths_members', JSON.stringify([memberWithoutRate]));

      const json = StrengthsService.exportMembers();
      const data = JSON.parse(json);

      expect(data.members).toHaveLength(1);
      expect(data.members[0].id).toBe('member-1');
      expect(data.members[0].name).toBe('山田太郎');
      expect(data.members[0].strengths).toHaveLength(5);
    });

    test('他のフィールド（stageId, positionId等）は保持される', () => {
      const member: any = {
        id: 'member-1',
        name: '山田太郎',
        department: '開発部',
        position: 'manager',
        positionId: 'MG',
        stageId: 'S3',
        memberRate: { rateType: 'monthly', rate: 800000 },
        strengths: [{ id: 1, score: 5 }, { id: 2, score: 4 }, { id: 3, score: 3 }, { id: 4, score: 2 }, { id: 5, score: 1 }]
      };

      localStorage.setItem('strengths_members', JSON.stringify([member]));

      const json = StrengthsService.exportMembers();
      const data = JSON.parse(json);

      expect(data.members[0].id).toBe('member-1');
      expect(data.members[0].name).toBe('山田太郎');
      expect(data.members[0].department).toBe('開発部');
      expect(data.members[0].position).toBe('manager');
      expect(data.members[0].positionId).toBe('MG');
      expect(data.members[0].stageId).toBe('S3');
      expect(data.members[0].memberRate).toBeUndefined(); // 単価のみ除外
    });

    test('_commentに単価情報が含まれないことの説明が追加されている', () => {
      const member: any = {
        id: 'member-1',
        name: '山田太郎',
        department: '開発部',
        memberRate: { rateType: 'monthly', rate: 800000 },
        strengths: [{ id: 1, score: 5 }, { id: 2, score: 4 }, { id: 3, score: 3 }, { id: 4, score: 2 }, { id: 5, score: 1 }]
      };

      localStorage.setItem('strengths_members', JSON.stringify([member]));

      const json = StrengthsService.exportMembers();
      const data = JSON.parse(json);

      expect(data._comment).toBeDefined();
      expect(Array.isArray(data._comment)).toBe(true);

      // コメントに「単価情報は含まれません」的な説明があることを確認
      const commentText = data._comment.join(' ');
      expect(commentText).toContain('単価情報');
      expect(commentText).toContain('含まれ');
    });
  });

  describe('importMembers - メンバーデータのインポート', () => {
    test('memberRateフィールドを含むJSONをインポートしても、memberRateは無視される', () => {
      const json = JSON.stringify({
        members: [
          {
            id: 'member-1',
            name: '山田太郎',
            department: '開発部',
            memberRate: { rateType: 'monthly', rate: 800000 }, // 含まれている
            strengths: [{ id: 1, score: 5 }, { id: 2, score: 4 }, { id: 3, score: 3 }, { id: 4, score: 2 }, { id: 5, score: 1 }]
          }
        ]
      });

      const { members } = StrengthsService.importMembers(json);

      expect(members).toHaveLength(1);
      expect(members[0].id).toBe('member-1');
      expect(members[0].name).toBe('山田太郎');
      expect((members[0] as any).memberRate).toBeUndefined();
    });

    test('複数メンバーの場合も全てのmemberRateが除外される', () => {
      const json = JSON.stringify({
        members: [
          {
            id: 'member-1',
            name: '山田太郎',
            department: '開発部',
            memberRate: { rateType: 'monthly', rate: 800000 },
            strengths: [{ id: 1, score: 5 }, { id: 2, score: 4 }, { id: 3, score: 3 }, { id: 4, score: 2 }, { id: 5, score: 1 }]
          },
          {
            id: 'member-2',
            name: '佐藤花子',
            department: '営業部',
            memberRate: { rateType: 'hourly', rate: 5000, hours: 160 },
            strengths: [{ id: 6, score: 5 }, { id: 7, score: 4 }, { id: 8, score: 3 }, { id: 9, score: 2 }, { id: 10, score: 1 }]
          }
        ]
      });

      const { members } = StrengthsService.importMembers(json);

      expect(members).toHaveLength(2);
      expect((members[0] as any).memberRate).toBeUndefined();
      expect((members[1] as any).memberRate).toBeUndefined();
    });

    test('memberRateを持たないメンバーは影響を受けない', () => {
      const json = JSON.stringify({
        members: [
          {
            id: 'member-1',
            name: '山田太郎',
            department: '開発部',
            strengths: [{ id: 1, score: 5 }, { id: 2, score: 4 }, { id: 3, score: 3 }, { id: 4, score: 2 }, { id: 5, score: 1 }]
          }
        ]
      });

      const { members } = StrengthsService.importMembers(json);

      expect(members).toHaveLength(1);
      expect(members[0].id).toBe('member-1');
      expect(members[0].name).toBe('山田太郎');
    });

    test('旧形式（配列のみ）のJSONでもmemberRateが除外される', () => {
      const json = JSON.stringify([
        {
          id: 'member-1',
          name: '山田太郎',
          department: '開発部',
          memberRate: { rateType: 'monthly', rate: 800000 },
          strengths: [{ id: 1, score: 5 }, { id: 2, score: 4 }, { id: 3, score: 3 }, { id: 4, score: 2 }, { id: 5, score: 1 }]
        }
      ]);

      const { members } = StrengthsService.importMembers(json);

      expect(members).toHaveLength(1);
      expect((members[0] as any).memberRate).toBeUndefined();
    });

    test('他のフィールド（stageId, positionId等）は保持される', () => {
      const json = JSON.stringify({
        members: [
          {
            id: 'member-1',
            name: '山田太郎',
            department: '開発部',
            position: 'manager',
            positionId: 'MG',
            stageId: 'S3',
            memberRate: { rateType: 'monthly', rate: 800000 },
            strengths: [{ id: 1, score: 5 }, { id: 2, score: 4 }, { id: 3, score: 3 }, { id: 4, score: 2 }, { id: 5, score: 1 }]
          }
        ]
      });

      const { members } = StrengthsService.importMembers(json);

      expect(members[0].id).toBe('member-1');
      expect(members[0].name).toBe('山田太郎');
      expect(members[0].department).toBe('開発部');
      expect((members[0] as any).position).toBe('manager');
      expect((members[0] as any).positionId).toBe('MG');
      expect((members[0] as any).stageId).toBe('S3');
      expect((members[0] as any).memberRate).toBeUndefined();
    });
  });

  describe('統合テスト - エクスポート → インポート', () => {
    test('エクスポートしたJSONを再インポートしてもmemberRateは復元されない', () => {
      // memberRateを持つメンバーを作成
      const originalMember: any = {
        id: 'member-1',
        name: '山田太郎',
        department: '開発部',
        memberRate: { rateType: 'monthly', rate: 800000 },
        strengths: [{ id: 1, score: 5 }, { id: 2, score: 4 }, { id: 3, score: 3 }, { id: 4, score: 2 }, { id: 5, score: 1 }]
      };

      localStorage.setItem('strengths_members', JSON.stringify([originalMember]));

      // エクスポート
      const json = StrengthsService.exportMembers();

      // LocalStorageをクリア
      localStorage.clear();

      // インポート
      const { members } = StrengthsService.importMembers(json);

      // memberRateは復元されない
      expect(members).toHaveLength(1);
      expect(members[0].id).toBe('member-1');
      expect(members[0].name).toBe('山田太郎');
      expect((members[0] as any).memberRate).toBeUndefined();
    });
  });
});
