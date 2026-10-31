export const GB_IN_BYTES = 1024 * 1024 * 1024;

export function bytesToGB(bytes?: number | null, precision: number = 2): number {
  const gb = (bytes ?? 0) / GB_IN_BYTES;
  const factor = Math.pow(10, precision);
  return Math.round(gb * factor) / factor;
}

export function gbToBytes(gb?: number | null): number {
  return Math.round((gb ?? 0) * GB_IN_BYTES);
}

export function checkAvailability(
  requestedBytes: number,
  maxAvailableBytes: number | null | undefined,
): { ok: boolean; message?: string } {
  if (maxAvailableBytes === null || maxAvailableBytes === undefined) {
    return { ok: true };
  }
  if (requestedBytes <= maxAvailableBytes) {
    return { ok: true };
  }
  return {
    ok: false,
    message: `Vượt quá hạn mức còn trống (${bytesToGB(maxAvailableBytes).toFixed(2)} GB).`,
  };
}
