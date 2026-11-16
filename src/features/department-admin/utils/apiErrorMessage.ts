/**
 * axiosClient's interceptor rejects every failure as a plain Error, so the server's
 * own message arrives in `err.message` and never under `err.response`. Reading only
 * `err.response.data.*` therefore discards it and always shows the caller's fallback.
 */
export function apiErrorMessage(err: unknown, fallback: string): string {
  const candidate = err as
    | { response?: { data?: { detail?: unknown; message?: unknown } }; message?: unknown }
    | null
    | undefined;
  const data = candidate?.response?.data;

  for (const value of [data?.detail, data?.message, candidate?.message]) {
    if (typeof value === 'string' && value.trim().length > 0) return value;
  }

  return fallback;
}
