import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { defineSecret } from 'firebase-functions/params';

const lineWorksWebhookUrl = defineSecret('LINEWORKS_WEBHOOK_URL');
const lineWorksChannelId = defineSecret('LINEWORKS_CHANNEL_ID');

export const sendLineWorksMessage = onCall(
  {
    region: 'asia-northeast1',
    secrets: [lineWorksWebhookUrl, lineWorksChannelId],
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
    const channelId = lineWorksChannelId.value();
    if (!webhookUrl || !channelId) {
      throw new HttpsError('failed-precondition', 'LINE WORKS設定が未設定です');
    }

    // 4. LINE WORKS APIへプロキシ送信
    const endpoint = `${webhookUrl.replace(/\/+$/, '')}/channels/${channelId}/messages`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: { type: 'text', text } }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new HttpsError('internal', `LINE WORKS送信エラー: ${response.status} ${body}`);
    }

    return { success: true };
  }
);
