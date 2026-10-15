export const BYTES_PER_GB = 1024 * 1024 * 1024;

/**
 * Chuyển đổi Bytes sang GB với số chữ số thập phân chỉ định (mặc định 2)
 */
export function bytesToGB(bytes: number | null | undefined, precision: number = 2): number {
  if (!bytes || bytes <= 0) return 0;
  return Number((bytes / BYTES_PER_GB).toFixed(precision));
}

/**
 * Chuyển đổi GB sang Bytes
 */
export function gbToBytes(gb: number | null | undefined): number {
  if (!gb || gb <= 0) return 0;
  return Math.round(gb * BYTES_PER_GB);
}

/**
 * Định dạng dung lượng Byte sang chuỗi thân thiện (B, KB, MB, GB, TB)
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const val = (bytes / Math.pow(k, i)).toFixed(1);
  return `${val} ${units[i] || 'B'}`;
}
