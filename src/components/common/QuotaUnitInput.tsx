import React from 'react';
import { AlertCircle } from 'lucide-react';
import {
  QuotaUnit,
  UNIT_BYTES,
  unitToBytes,
  bytesToUnit,
  convertBetweenUnits,
  formatQuotaAuto,
  formatQuotaWithUnit,
} from '@/utils/quotaUnitUtils';

export interface QuotaUnitInputProps {
  value: number;
  unit: QuotaUnit;
  onChange: (value: number, unit: QuotaUnit, bytes: number) => void;
  maxBytes?: number;
  minBytes?: number;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  helperText?: string;
  error?: string | null;
  className?: string;
  placeholder?: string;
  autoConvertOnUnitChange?: boolean;
}

export const QuotaUnitInput: React.FC<QuotaUnitInputProps> = ({
  value,
  unit,
  onChange,
  maxBytes,
  minBytes = 0,
  label,
  required = false,
  disabled = false,
  helperText,
  error,
  className = '',
  placeholder = 'Nhập dung lượng...',
  autoConvertOnUnitChange = true,
}) => {
  const currentBytes = unitToBytes(value, unit);
  const isOverMax = maxBytes !== undefined && maxBytes > 0 && currentBytes > maxBytes;
  const isUnderMin = minBytes > 0 && currentBytes < minBytes;
  const hasError = !!error || isOverMax || isUnderMin;

  const handleValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    const num = parseFloat(raw);
    const safeNum = isNaN(num) ? 0 : num;
    const bytes = unitToBytes(safeNum, unit);
    onChange(safeNum, unit, bytes);
  };

  const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newUnit = e.target.value as QuotaUnit;
    if (newUnit === unit) return;

    if (autoConvertOnUnitChange && value > 0) {
      const converted = convertBetweenUnits(value, unit, newUnit, newUnit === 'MB' ? 0 : 2);
      const bytes = unitToBytes(converted, newUnit);
      onChange(converted, newUnit, bytes);
    } else {
      const bytes = unitToBytes(value, newUnit);
      onChange(value, newUnit, bytes);
    }
  };

  // Quy đổi tương đương để hiển thị phụ
  let equivalentText = '';
  if (value > 0) {
    if (unit === 'MB' && value >= 100) {
      equivalentText = `≈ ${(value / 1024).toFixed(2)} GB`;
    } else if (unit === 'TB') {
      equivalentText = `≈ ${(value * 1024).toLocaleString()} GB`;
    } else if (unit === 'GB' && value >= 1024) {
      equivalentText = `≈ ${(value / 1024).toFixed(2)} TB`;
    }
  }

  return (
    <div className={`space-y-1.5 ${className}`}>
      {label && (
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-bold text-slate-700">
            {label} {required && <span className="text-rose-500">*</span>}
          </label>
          {maxBytes !== undefined && maxBytes > 0 && (
            <span className="text-[10px] text-slate-500 font-mono">
              Tối đa: <strong className="text-emerald-700">{formatQuotaWithUnit(maxBytes, unit, unit === 'MB' ? 0 : 1)}</strong>
              {unit !== 'GB' && ` (${formatQuotaAuto(maxBytes)})`}
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5">
        <div className="relative flex-1">
          <input
            type="number"
            min={0}
            step="any"
            value={value || ''}
            onChange={handleValueChange}
            disabled={disabled}
            placeholder={placeholder}
            className={`w-full text-xs border rounded-lg px-3 py-2 bg-white text-slate-900 font-mono focus:outline-none focus:ring-2 transition-all ${
              hasError
                ? 'border-rose-400 focus:ring-rose-500/20 focus:border-rose-500 text-rose-700 font-bold'
                : 'border-slate-200 focus:ring-blue-500/20 focus:border-blue-500'
            } disabled:bg-slate-100 disabled:text-slate-400`}
          />
          {equivalentText && !hasError && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono pointer-events-none">
              {equivalentText}
            </span>
          )}
        </div>

        {/* Unit Selector */}
        <div className="w-24 shrink-0">
          <select
            value={unit}
            onChange={handleUnitChange}
            disabled={disabled}
            className="w-full text-xs font-bold border border-slate-200 rounded-lg px-2.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all cursor-pointer font-mono"
          >
            <option value="MB">MB</option>
            <option value="GB">GB</option>
            <option value="TB">TB</option>
          </select>
        </div>
      </div>

      {/* Validation / Helper Text */}
      {error ? (
        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>{error}</span>
        </p>
      ) : isOverMax ? (
        <p className="text-[11px] text-rose-600 font-medium flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>
            Vượt quá dung lượng khả dụng ({formatQuotaWithUnit(maxBytes!, unit, unit === 'MB' ? 0 : 1)}
            {unit !== 'GB' && ` ~ ${formatQuotaAuto(maxBytes!)}`}). Vui lòng giảm bớt.
          </span>
        </p>
      ) : isUnderMin ? (
        <p className="text-[11px] text-amber-600 font-medium flex items-center gap-1 mt-1">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
          <span>Hạn mức tối thiểu yêu cầu là {formatQuotaWithUnit(minBytes, unit)}.</span>
        </p>
      ) : helperText ? (
        <p className="text-[11px] text-slate-400 mt-1">{helperText}</p>
      ) : null}
    </div>
  );
};
export default QuotaUnitInput;

