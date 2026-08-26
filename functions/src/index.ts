import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const lineWorksWebhookUrl = defineSecret('LINEWORKS_WEBHOOK_URL');

export const sendLineWorksMessage = onCall(
  {
    region: 'asia-northeast1',
    secrets: [lineWorksWebhookUrl],
  },
  async (request) => {
    // 1. Firebase Auth検証
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '認証が必要です');
    }

    // 2. 入力バリデーション
    const { text } = request.data;
    if (!text || typeof text !== 'string') {
      throw new HttpsError('invalid-argument', 'テキストが必要です');
    }

    // 3. シークレット取得
    const webhookUrl = lineWorksWebhookUrl.value();
    if (!webhookUrl) {
      throw new HttpsError('failed-precondition', 'LINE WORKS Webhook URLが未設定です');
    }

    // 4. Incoming Webhookに直接POST
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: { text } }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new HttpsError('internal', `LINE WORKS送信エラー: ${response.status} ${body}`);
    }

    return { success: true };
  }
);

/**
 * 外部運行情報の取得プロキシ
 *
 * ブラウザのCORS制約を回避するため、許可リストにあるソースのみを
 * サーバー側で取得して返す。任意URLは受け付けない（オープンプロキシ化の防止）。
 */
const TRAIN_INFO_SOURCES: Record<string, string> = {
  yahooTraininfo: 'https://transit.yahoo.co.jp/traininfo/area/4/',
};

const FETCH_TIMEOUT_MS = 10_000;

export const fetchTrainInfo = onCall(
  {
    region: 'asia-northeast1',
  },
  async (request) => {
    // 1. Firebase Auth検証
    if (!request.auth) {
      throw new HttpsError('unauthenticated', '認証が必要です');
    }

    // 2. 入力バリデーション（許可リスト方式）
    const { source } = request.data;
    if (typeof source !== 'string' || !TRAIN_INFO_SOURCES[source]) {
      throw new HttpsError('invalid-argument', `不明なソースです: ${source}`);
    }

    // 3. タイムアウト付きで取得
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(TRAIN_INFO_SOURCES[source], {
        signal: controller.signal,
        headers: { Accept: 'text/html,application/xml' },
      });

      if (!response.ok) {
        throw new HttpsError('unavailable', `取得エラー: HTTP ${response.status}`);
      }

      const content = await response.text();
      return { content, fetchedAt: new Date().toISOString() };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      throw new HttpsError('unavailable', `取得エラー: ${message}`);
    } finally {
      clearTimeout(timer);
    }
  }
);
