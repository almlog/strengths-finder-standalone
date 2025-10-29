/**
 * PositionService のユニットテスト
 */

import { PositionService } from '../PositionService';
import { PositionRate } from '../../types/financial';

describe('PositionService', () => {
  // 各テスト前にLocalStorageをクリア
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getPositionRates', () => {
    it('デフォルトの料金体系を返す（LocalStorageが空の場合）', () => {
      const rates = PositionService.getPositionRates();

      expect(rates).toHaveLength(6);
      expect(rates[0]).toEqual({
        id: 'MG',
        name: 'マネージャー',
        monthlyRate: 900000,
        color: '#8B5CF6',
      });
      expect(rates[5]).toEqual({
        id: 'ST',
        name: 'スタッフ',
        monthlyRate: 550000,
        color: '#6B7280',
      });
    });

    it('LocalStorageに保存された料金体系を返す', () => {
      const customRates: PositionRate[] = [
        { id: 'CUSTOM', name: 'カスタム', monthlyRate: 1000000, color: '#FF0000' },
      ];
      localStorage.setItem('position_rates', JSON.stringify(customRates));

      const rates = PositionService.getPositionRates();

      expect(rates).toEqual(customRates);
    });

    it('不正なJSON形式の場合はデフォルトを返す', () => {
      localStorage.setItem('position_rates', 'invalid json');

      const rates = PositionService.getPositionRates();

      expect(rates).toHaveLength(6);
    });
  });

  describe('savePositionRates', () => {
    it('料金体系をLocalStorageに保存する', () => {
      const rates: PositionRate[] = [
        { id: 'TEST', name: 'テスト', monthlyRate: 123456, color: '#00FF00' },
      ];

      PositionService.savePositionRates(rates);

      const saved = localStorage.getItem('position_rates');
      expect(saved).not.toBeNull();
      expect(JSON.parse(saved!)).toEqual(rates);
    });

    it('空配列も正常に保存できる', () => {
      PositionService.savePositionRates([]);

      const saved = localStorage.getItem('position_rates');
      expect(JSON.parse(saved!)).toEqual([]);
    });
  });

  describe('getPositionById', () => {
    it('指定したIDのポジションを返す', () => {
      const position = PositionService.getPositionById('MG');

      expect(position).toEqual({
        id: 'MG',
        name: 'マネージャー',
        monthlyRate: 900000,
        color: '#8B5CF6',
      });
    });

    it('存在しないIDの場合はundefinedを返す', () => {
      const position = PositionService.getPositionById('NONEXISTENT');

      expect(position).toBeUndefined();
    });

    it('カスタム料金体系からも検索できる', () => {
      const customRates: PositionRate[] = [
        { id: 'CUSTOM', name: 'カスタム', monthlyRate: 1000000, color: '#FF0000' },
      ];
      localStorage.setItem('position_rates', JSON.stringify(customRates));

      const position = PositionService.getPositionById('CUSTOM');

      expect(position).toEqual(customRates[0]);
    });
  });

  describe('デフォルトポジション一覧', () => {
    it('6つの標準ポジションが定義されている', () => {
      const rates = PositionService.getPositionRates();
      const ids = rates.map(r => r.id);

      expect(ids).toEqual(['MG', 'SM', 'PO', 'SL', 'SST', 'ST']);
    });

    it('全ポジションに名前、単価、色が設定されている', () => {
      const rates = PositionService.getPositionRates();

      rates.forEach(rate => {
        expect(rate.id).toBeTruthy();
        expect(rate.name).toBeTruthy();
        expect(rate.monthlyRate).toBeGreaterThan(0);
        expect(rate.color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('単価が高い順に並んでいる', () => {
      const rates = PositionService.getPositionRates();
      const monthlyRates = rates.map(r => r.monthlyRate);

      for (let i = 0; i < monthlyRates.length - 1; i++) {
        expect(monthlyRates[i]).toBeGreaterThanOrEqual(monthlyRates[i + 1]);
      }
    });
  });
});
