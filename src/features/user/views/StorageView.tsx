import React, { useState, useEffect } from 'react';
import { HardDrive, AlertTriangle, ShieldCheck, Database, RefreshCw, FolderLock } from 'lucide-react';
import { userApi, formatBytes } from '../api/driveApi';
import { PersonalStorageQuotaDto } from '../types';

interface StorageViewProps {
  personalQuota?: PersonalStorageQuotaDto | null;
  onRefresh?: () => void;
}

export const StorageView: React.FC<StorageViewProps> = ({ personalQuota: initialQuota, onRefresh }) => {
  const [quota, setQuota] = useState<PersonalStorageQuotaDto | null>(initialQuota || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialQuota);
  const [error, setError] = useState<string | null>(null);

  const fetchQuota = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await userApi.getMyQuota();
      setQuota(data);
    } catch (err: any) {
      console.error('Lỗi tải thông tin Quota:', err);
      setError(err?.response?.data?.message || err?.message || 'Không thể tải thông tin dung lượng cá nhân.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialQuota) {
      fetchQuota();
    } else {
      setQuota(initialQuota);
    }
  }, [initialQuota]);

  const handleManualRefresh = () => {
    fetchQuota();
    if (onRefresh) onRefresh();
  };

  // Tính toán chỉ số hiển thị (hỗ trợ linh hoạt cả camelCase và PascalCase từ backend)
  const quotaBytes = (quota as any)?.quotaBytes ?? (quota as any)?.QuotaBytes ?? 0;
  const usedBytes = (quota as any)?.usedBytes ?? (quota as any)?.UsedBytes ?? 0;
  const availableBytes = (quota as any)?.availableBytes ?? (quota as any)?.AvailableBytes ?? Math.max(0, quotaBytes - usedBytes);
  const usagePercent = (quota as any)?.usagePercent ?? (quota as any)?.UsagePercent ?? (quotaBytes > 0 ? Math.round((usedBytes / quotaBytes) * 100) : 0);
  const departmentName = quota?.departmentName || (quota as any)?.DepartmentName;

  // Xác định cấp độ cảnh báo
  const isCritical = usagePercent >= 95;
  const isWarning = usagePercent >= 80 && usagePercent < 95;

  const getStatusColor = () => {
    if (isCritical) return { bg: 'bg-rose-500', text: 'text-rose-600', ring: 'ring-rose-200', border: 'border-rose-200', lightBg: 'bg-rose-50' };
    if (isWarning) return { bg: 'bg-amber-500', text: 'text-amber-600', ring: 'ring-amber-200', border: 'border-amber-200', lightBg: 'bg-amber-50' };
    return { bg: 'bg-blue-600', text: 'text-blue-600', ring: 'ring-blue-100', border: 'border-blue-200', lightBg: 'bg-blue-50' };
  };

  const statusColor = getStatusColor();

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Hạn Mức Dung Lượng Cá Nhân</h2>
            {departmentName && (
              <span className="text-xs font-semibold px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md border border-slate-200">
                Phòng ban: {departmentName}
              </span>
            )}
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Theo dõi dung lượng lưu trữ tài liệu cá nhân đã được phân bổ trên hệ thống Cloud DMS
          </p>
        </div>

        <button
          onClick={handleManualRefresh}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* Alert Error Nếu có */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={fetchQuota} className="font-bold underline cursor-pointer ml-3">
            Thử lại
          </button>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Card 1: Tổng hạn mức được cấp */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Hạn mức được cấp</p>
            <Database className="w-4 h-4 text-slate-400" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {isLoading ? 'Đang tải...' : formatBytes(quotaBytes)}
          </p>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Được phân bổ bởi Quản trị phòng ban</span>
          </p>
        </div>

        {/* Card 2: Đã sử dụng */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Đã sử dụng</p>
            <HardDrive className={`w-4 h-4 ${statusColor.text}`} />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {isLoading ? 'Đang tải...' : formatBytes(usedBytes)}
          </p>
          <p className={`text-xs font-semibold mt-2 ${statusColor.text}`}>
            {usagePercent}% hạn mức đã dùng
          </p>
        </div>

        {/* Card 3: Còn khả dụng */}
        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Còn khả dụng</p>
            <FolderLock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {isLoading ? 'Đang tải...' : formatBytes(availableBytes)}
          </p>
          <p className="text-xs text-slate-400 mt-2">
            Không gian còn lại để lưu trữ tệp mới
          </p>
        </div>
      </div>

      {/* Chi tiết thanh trạng thái dung lượng & cảnh báo */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-800">Tiến độ lưu trữ</span>
            <span className={`text-sm font-bold ${statusColor.text}`}>{usagePercent}%</span>
          </div>

          {/* Progress bar */}
          <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ease-out ${statusColor.bg}`}
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>

          <div className="flex justify-between text-xs text-slate-500 mt-2">
            <span>0 Bytes</span>
            <span>{formatBytes(quotaBytes / 2)} (50%)</span>
            <span>{formatBytes(quotaBytes)}</span>
          </div>
        </div>

        {/* Cảnh báo nếu chạm ngưỡng */}
        {isCritical && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Cảnh báo nghiêm trọng: Dung lượng gần cạn kiệt!</p>
              <p className="mt-1">
                Tài khoản của bạn đã sử dụng {usagePercent}% hạn mức ({formatBytes(usedBytes)} / {formatBytes(quotaBytes)}). 
                Khi dung lượng chạm 100%, bạn sẽ không thể tải thêm tệp tin mới. Vui lòng dọn dẹp các tệp tin trong Thùng rác hoặc liên hệ Trưởng phòng ban để nâng hạn mức.
              </p>
            </div>
          </div>
        )}

        {isWarning && (
          <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Lưu ý: Dung lượng lưu trữ sắp đầy ({usagePercent}%)</p>
              <p className="mt-1">
                Bạn đã sử dụng trên 80% hạn mức dung lượng được cấp. Hãy kiểm tra các tệp tin không còn sử dụng để tối ưu hóa không gian lưu trữ.
              </p>
            </div>
          </div>
        )}

        {/* Thông tin chính sách lưu trữ */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-slate-600">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="font-semibold text-slate-800">Quy định lưu trữ tệp:</p>
            <p className="mt-1 text-slate-500 leading-relaxed">
              Hệ thống quét virus ClamAV tự động và tính toán mã băm SHA-256 trên mọi tệp tải lên. Các tệp đã chuyển vào Thùng rác vẫn chiếm dụng dung lượng cho tới khi được Xóa vĩnh viễn.
            </p>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <p className="font-semibold text-slate-800">Hỗ trợ xin cấp thêm dung lượng:</p>
            <p className="mt-1 text-slate-500 leading-relaxed">
              Nếu công việc phát sinh nhu cầu lưu trữ tệp lớn vượt quá hạn mức hiện tại, vui lòng liên hệ Trưởng phòng ban ({departmentName || 'Department Admin'}) để được cấp phát thêm Quota.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
