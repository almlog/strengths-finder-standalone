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
