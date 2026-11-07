/**
 * Real-world wrapper around `linkDownloadCore.ts` (pure logic, no imports)
 * — supplies the actual `createDownloadLink` API call and the actual
 * `document`. See `linkDownloadCore.ts` for the full behavior description.
 */
import { createDownloadLink } from '@/services/upload/large/largeUploadApi';
import {
  downloadViaLinkCore,
  DownloadViaLinkOptions,
  UNSCANNED_DOWNLOAD_DISABLED_MESSAGE,
  TOO_MANY_DOWNLOADS_MESSAGE,
} from './linkDownloadCore';

export { UNSCANNED_DOWNLOAD_DISABLED_MESSAGE, TOO_MANY_DOWNLOADS_MESSAGE };

export async function downloadViaLink(fileId: string, opts: DownloadViaLinkOptions): Promise<void> {
  return downloadViaLinkCore(fileId, opts, {
    createDownloadLink,
    document: document as unknown as import('./linkDownloadCore').MinimalDocument,
  });
}
