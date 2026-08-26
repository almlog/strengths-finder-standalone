/**
 * Cloud Functions経由で外部運行情報を取得するプロキシクライアント
 *
 * 無料公開CORSプロキシ（allorigins.win等）はダウンが頻発するため、
 * 自前のCloud Function（fetchTrainInfo）を経由して取得する。
 * @module services/TrainInfoProxy
 */

import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebase';

/** 取得可能なソース名（Cloud Function側の許可リストと対応） */
export type TrainInfoSource = 'yahooTraininfo';

interface FetchTrainInfoResponse {
  content: string;
  fetchedAt: string;
}

/**
 * 指定ソースのコンテンツ（HTML等）をCloud Function経由で取得する
 * @throws Cloud Functionエラー、またはレスポンス形式不正時
 */
export async function fetchTrainInfoContent(source: TrainInfoSource): Promise<string> {
  const callable = httpsCallable<{ source: TrainInfoSource }, FetchTrainInfoResponse>(
    functions,
    'fetchTrainInfo'
  );
  const result = await callable({ source });

  if (!result.data || typeof result.data.content !== 'string') {
    throw new Error('[TrainInfoProxy] Invalid response: content is missing');
  }

  return result.data.content;
}
