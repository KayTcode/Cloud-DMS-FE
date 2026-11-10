/**
 * Pure core of the direct-link download flow — zero imports, so it can be
 * loaded standalone under Node's `vm` with fakes for everything (see
 * tests/link-download.mjs), the same convention used by other pure
 * modules in this feature (e.g. src/services/upload/large/uploadRouting.ts).
 *
 * `linkDownload.ts` is the thin real-world wrapper: it supplies the actual
 * `createDownloadLink` (src/services/upload/large/largeUploadApi.ts) and the
 * actual `document`.
 *
 * Error codes recognized from a backend/`ApiCodeError`-shaped error (duck
 * typed via `.code`, so this file never needs to import `ApiCodeError`):
 *  - `UNSCANNED_ACK_REQUIRED`: ask `opts.confirmUnscanned()`; on yes, retry
 *    with `acknowledgeUnscanned = true`.
 *  - `UNSCANNED_DOWNLOAD_DISABLED`: the tenant disabled downloading
 *    unscanned files. Thrown as a plain `Error` with a fixed message.
 *  - `TOO_MANY_DOWNLOADS`: per-user concurrent-download rate limit. Thrown
 *    as a plain `Error` with a fixed message.
 *  - `USE_PACKAGE_DOWNLOAD` (and anything unrecognized): rethrown AS-IS,
 *    unchanged, so callers (driveApi.downloadFile et al.) can catch it and
 *    fall back to the legacy zip-package download path.
 */

export const UNSCANNED_DOWNLOAD_DISABLED_MESSAGE =
  'Tổ chức của bạn không cho phép tải tệp chưa được quét virus.';

export const TOO_MANY_DOWNLOADS_MESSAGE =
  'Bạn đang tải quá nhiều tệp cùng lúc, vui lòng thử lại sau.';

export interface MinimalAnchor {
  href: string;
  click: () => void;
  remove: () => void;
}

export interface MinimalDocument {
  createElement: (tag: string) => MinimalAnchor;
  body: { appendChild: (node: MinimalAnchor) => void };
}

export interface DownloadLinkLike {
  url: string;
}

export interface DownloadViaLinkDeps {
  createDownloadLink: (fileId: string, acknowledgeUnscanned: boolean) => Promise<DownloadLinkLike>;
  document: MinimalDocument;
  /**
   * API's own base origin (same `VITE_API_BASE_URL` used by `axiosClient.ts`).
   * Needed because the backend can return a RELATIVE url (e.g.
   * `/api/files/{id}/download?ticket=...`) for a "proxied" download — the
   * frontend's own origin differs from the API's, so a bare relative href
   * on the anchor would resolve against the SPA's origin and download the
   * app shell instead of the file (Fix 9).
   */
  apiBaseUrl: string;
}

/**
 * Resolves a backend-returned download url against the API's own origin
 * when it is relative (starts with `/`). An already-absolute url (e.g. a
 * direct S3/provider link) is left untouched.
 */
export function resolveDownloadUrl(url: string, apiBaseUrl: string): string {
  if (!url.startsWith('/')) return url;
  // If apiBaseUrl is not an absolute URL (e.g. '/api'), the backend and
  // frontend share the same origin via a reverse proxy (Kong). The URL is
  // already correct as-is — return it unchanged so it resolves against the
  // browser's current origin.
  let parsed: URL;
  try {
    parsed = new URL(apiBaseUrl);
  } catch {
    return url;
  }
  // Use the API base's ORIGIN only (not its full path, e.g. `.../api`) so a
  // relative url that already includes its own `/api/...` prefix doesn't
  // get doubled up.
  return `${parsed.origin}${url}`;
}

export interface DownloadViaLinkOptions {
  confirmUnscanned: () => Promise<boolean>;
}

function codeOf(error: unknown): string | undefined {
  return (error as any)?.code;
}

export async function downloadViaLinkCore(
  fileId: string,
  opts: DownloadViaLinkOptions,
  deps: DownloadViaLinkDeps
): Promise<void> {
  let result: DownloadLinkLike;

  try {
    result = await deps.createDownloadLink(fileId, false);
  } catch (err) {
    const code = codeOf(err);

    if (code === 'UNSCANNED_ACK_REQUIRED') {
      const confirmed = await opts.confirmUnscanned();
      if (!confirmed) return;

      try {
        result = await deps.createDownloadLink(fileId, true);
      } catch (ackErr) {
        const ackCode = codeOf(ackErr);
        if (ackCode === 'UNSCANNED_DOWNLOAD_DISABLED') {
          throw new Error(UNSCANNED_DOWNLOAD_DISABLED_MESSAGE);
        }
        if (ackCode === 'TOO_MANY_DOWNLOADS') {
          throw new Error(TOO_MANY_DOWNLOADS_MESSAGE);
        }
        // Includes USE_PACKAGE_DOWNLOAD and anything unrecognized.
        throw ackErr;
      }
    } else if (code === 'UNSCANNED_DOWNLOAD_DISABLED') {
      throw new Error(UNSCANNED_DOWNLOAD_DISABLED_MESSAGE);
    } else if (code === 'TOO_MANY_DOWNLOADS') {
      throw new Error(TOO_MANY_DOWNLOADS_MESSAGE);
    } else {
      // Includes USE_PACKAGE_DOWNLOAD and anything unrecognized.
      throw err;
    }
  }

  const anchor = deps.document.createElement('a');
  anchor.href = resolveDownloadUrl(result.url, deps.apiBaseUrl);
  deps.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
}
