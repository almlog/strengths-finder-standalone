/**
 * DelayTicker テスト
 * 取得失敗の可視化（失敗を「平常運転」と誤表示しない）
 * @module __tests__/components/traffic/DelayTicker.test
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';

// TrainDelayService のモック
const mockService = {
  fetchDelayInfo: jest.fn(),
  getCurrentDelays: jest.fn(),
  getTickerText: jest.fn(),
  getLastUpdated: jest.fn(),
  getLastError: jest.fn(),
};
jest.mock('../../../services/TrainDelayService', () => ({
  getTrainDelayService: () => mockService,
}));

import DelayTicker from '../../../components/traffic/DelayTicker';

describe('DelayTicker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockService.fetchDelayInfo.mockResolvedValue([]);
    mockService.getCurrentDelays.mockReturnValue([]);
    mockService.getTickerText.mockReturnValue('主要路線は平常運転です');
    mockService.getLastUpdated.mockReturnValue(new Date());
    mockService.getLastError.mockReturnValue(null);
  });

  it('取得成功・遅延なしの場合は平常運転を表示する', async () => {
    render(<DelayTicker token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('主要路線は平常運転です')).toBeInTheDocument();
    });
    expect(screen.queryByText(/取得に失敗/)).not.toBeInTheDocument();
  });

  it('取得失敗の場合は「取得失敗」を表示し平常運転とは表示しない', async () => {
    mockService.getLastError.mockReturnValue('unavailable');

    render(<DelayTicker token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('遅延情報の取得に失敗しました')).toBeInTheDocument();
    });
    expect(screen.queryByText('主要路線は平常運転です')).not.toBeInTheDocument();
  });

  it('取得失敗後に成功したら通常表示に戻る', async () => {
    mockService.getLastError.mockReturnValueOnce('unavailable');

    render(<DelayTicker token="test-token" />);

    await waitFor(() => {
      expect(screen.getByText('遅延情報の取得に失敗しました')).toBeInTheDocument();
    });

    // 再取得（成功）: getLastErrorはbeforeEachのnullに戻っている
    const refresh = screen.getByTitle(/^更新/);
    refresh.click();

    await waitFor(() => {
      expect(screen.getByText('主要路線は平常運転です')).toBeInTheDocument();
    });
  });
});
