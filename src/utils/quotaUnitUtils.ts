export type QuotaUnit = 'MB' | 'GB' | 'TB';

export const UNIT_BYTES: Record<QuotaUnit, number> = {
  MB: 1024 * 1024,
  GB: 1024 * 1024 * 1024,
  TB: 1024 * 1024 * 1024 * 1024,
};

/**
 * Quy đổi giá trị số kèm đơn vị sang đơn vị Bytes (chuẩn nhị phân).
 */
export function unitToBytes(value: number, unit: QuotaUnit): number {
  if (isNaN(value) || value <= 0) return 0;
  return Math.round(value * UNIT_BYTES[unit]);
}

/**
 * Quy đổi từ Bytes sang đơn vị cụ thể (MB, GB, TB).
 */
export function bytesToUnit(bytes: number, targetUnit: QuotaUnit, decimals = 2): number {
  if (isNaN(bytes) || bytes <= 0) return 0;
  const val = bytes / UNIT_BYTES[targetUnit];
  const factor = 10 ** decimals;
  return Math.round(val * factor) / factor;
}

/**
 * Chuyển đổi giữa 2 đơn vị bất kỳ (ví dụ từ GB sang MB hoặc TB).
 */
export function convertBetweenUnits(value: number, fromUnit: QuotaUnit, toUnit: QuotaUnit, decimals = 2): number {
  if (fromUnit === toUnit) return value;
  if (isNaN(value) || value <= 0) return 0;
  const bytes = unitToBytes(value, fromUnit);
  return bytesToUnit(bytes, toUnit, decimals);
}

/**
 * Định dạng hiển thị dung lượng tự động chọn đơn vị phù hợp nhất (B, MB, GB, TB).
 */
export function formatQuotaAuto(bytes: number, decimals = 1): string {
  if (isNaN(bytes) || bytes <= 0) return '0 MB';
  if (bytes >= UNIT_BYTES.TB) {
    return `${(bytes / UNIT_BYTES.TB).toFixed(decimals)} TB`;
  }
  if (bytes >= UNIT_BYTES.GB) {
    return `${(bytes / UNIT_BYTES.GB).toFixed(decimals)} GB`;
  }
  return `${(bytes / UNIT_BYTES.MB).toFixed(decimals)} MB`;
}

/**
 * Định dạng hiển thị kèm đơn vị chỉ định.
 */
export function formatQuotaWithUnit(bytes: number, unit: QuotaUnit, decimals = 1): string {
  if (isNaN(bytes) || bytes <= 0) return `0 ${unit}`;
  const val = bytes / UNIT_BYTES[unit];
  return `${val.toFixed(decimals)} ${unit}`;
}

