import React, { useState, useEffect, useCallback } from 'react';
import {
  HardDrive,
  AlertTriangle,
  ShieldCheck,
  Database,
  RefreshCw,
  FolderLock,
  PlusCircle,
  Clock,
  Ban,
  Calendar,
} from 'lucide-react';
import { userApi, formatBytes } from '../api/driveApi';
import { PersonalStorageQuotaDto } from '../types';
import {
  RequestQuotaModal,
  QuotaHistoryTable,
  quotaApi,
  QuotaRequestDto,
} from '@/features/quota';

interface StorageViewProps {
  personalQuota?: PersonalStorageQuotaDto | null;
  onRefresh?: () => void;
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

const GB_IN_BYTES = 1024 * 1024 * 1024;

export const StorageView: React.FC<StorageViewProps> = ({
  personalQuota: initialQuota,
  onRefresh,
  onShowToast,
}) => {
  const [quota, setQuota] = useState<PersonalStorageQuotaDto | null>(initialQuota || null);
  const [isLoading, setIsLoading] = useState<boolean>(!initialQuota);
  const [error, setError] = useState<string | null>(null);

  // Quota request state
  const [isRequestModalOpen, setIsRequestModalOpen] = useState<boolean>(false);
  const [pendingRequest, setPendingRequest] = useState<QuotaRequestDto | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [historyRefreshKey, setHistoryRefreshKey] = useState<number>(0);

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

  // Kiểm tra xem có yêu cầu nào của mình đang ở trạng thái Pending không
  const checkMyPendingRequest = useCallback(async () => {
    try {
      const history = await quotaApi.getHistory({ page: 1, pageSize: 10 });
      // Tìm xem có request nào pending không
      // Hoặc nếu backend có thể trả về trong lịch sử
    } catch (e) {
      // Bỏ qua nếu lỗi
    }
  }, []);

  useEffect(() => {
    if (!initialQuota) {
      fetchQuota();
    } else {
      setQuota(initialQuota);
    }
  }, [initialQuota]);

  const handleManualRefresh = () => {
    fetchQuota();
    setHistoryRefreshKey((k) => k + 1);
    if (onRefresh) onRefresh();
  };

  const handleCancelPendingRequest = async () => {
    if (!pendingRequest) return;
    try {
      setIsCancelling(true);
      await quotaApi.cancelRequest(pendingRequest.id);
      setPendingRequest(null);
      onShowToast?.('Đã hủy yêu cầu tăng dung lượng.', 'success');
      setHistoryRefreshKey((k) => k + 1);
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.message || 'Không thể hủy yêu cầu.';
      onShowToast?.(msg, 'error');
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRequestSuccess = (newReq: QuotaRequestDto) => {
    setPendingRequest(newReq);
    onShowToast?.('Đã gửi yêu cầu tăng dung lượng thành công đến người duyệt.', 'success');
    setHistoryRefreshKey((k) => k + 1);
  };

  // Tính toán chỉ số hiển thị
  const quotaBytes = (quota as any)?.quotaBytes ?? (quota as any)?.QuotaBytes ?? 0;
  const usedBytes = (quota as any)?.usedBytes ?? (quota as any)?.UsedBytes ?? 0;
  const availableBytes = (quota as any)?.availableBytes ?? (quota as any)?.AvailableBytes ?? Math.max(0, quotaBytes - usedBytes);
  const uploadableBytes: number | undefined = (quota as any)?.uploadableBytes ?? (quota as any)?.UploadableBytes;
  const uploadableDisplay = uploadableBytes !== undefined ? uploadableBytes : availableBytes;
  const usagePercent = (quota as any)?.usagePercent ?? (quota as any)?.UsagePercent ?? (quotaBytes > 0 ? Math.round((usedBytes / quotaBytes) * 100) : 0);
  const departmentName = quota?.departmentName || (quota as any)?.DepartmentName;

  // Cấp độ cảnh báo
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

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Xin thêm dung lượng</span>
          </button>

          <button
            onClick={handleManualRefresh}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Làm mới"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Banner nếu có yêu cầu Pending */}
      {pendingRequest && (
        <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-200 flex items-center justify-between gap-4 flex-wrap animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <p className="text-xs font-bold text-amber-900">
                Bạn đang có 1 yêu cầu tăng dung lượng chờ duyệt: +{(pendingRequest.requestedAdditionalBytes / GB_IN_BYTES).toFixed(1)} GB
              </p>
              <p className="text-[11px] text-amber-700 mt-0.5">
                Đang chờ người quản lý ({pendingRequest.approverName || 'Cấp trên'}) phê duyệt. Lý do: "{pendingRequest.reason}"
              </p>
            </div>
          </div>

          <button
            onClick={handleCancelPendingRequest}
            disabled={isCancelling}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
          >
            <Ban className="w-3.5 h-3.5 text-amber-600" />
            <span>{isCancelling ? 'Đang hủy...' : 'Hủy yêu cầu'}</span>
          </button>
        </div>
      )}

      {/* Alert Error Nếu có */}
      {error && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
          <button onClick={fetchQuota} className="font-bold underline cursor-pointer ml-3">
            Thử lại
          </button>
        </div>
      )}

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
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

        <div className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Còn có thể tải lên</p>
            <FolderLock className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-extrabold text-slate-900 mt-3 tracking-tight">
            {isLoading ? 'Đang tải...' : formatBytes(uploadableDisplay)}
          </p>
          {!isLoading && uploadableBytes === 0 && usedBytes >= quotaBytes && (
            <p className="text-xs text-rose-600 mt-2 font-medium">
              Đã vượt hạn mức — hãy xoá hẳn tệp (kể cả trong thùng rác) để tải lên lại.
            </p>
          )}
          {!isLoading && uploadableBytes === 0 && usedBytes < quotaBytes && (
            <p className="text-xs text-amber-600 mt-2 font-medium">
              Phòng hiện không còn chỗ trống để tải lên. Trưởng phòng đã được thông báo.
            </p>
          )}
          {!isLoading && uploadableBytes !== 0 && (
            <p className="text-xs text-slate-400 mt-2">
              Dung lượng có thể tải lên thêm
            </p>
          )}
        </div>
      </div>

      {/* Chi tiết thanh trạng thái dung lượng & cảnh báo */}
      <div className="bg-white rounded-xl p-6 border border-slate-200/90 shadow-xs space-y-6">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold text-slate-800">Tiến độ lưu trữ</span>
            <span className={`text-sm font-bold ${statusColor.text}`}>{usagePercent}%</span>
          </div>

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

        {isCritical && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3 text-rose-800 text-xs">
            <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-sm">Cảnh báo nghiêm trọng: Dung lượng gần cạn kiệt!</p>
              <p className="mt-1">
                Tài khoản của bạn đã sử dụng {usagePercent}% hạn mức ({formatBytes(usedBytes)} / {formatBytes(quotaBytes)}). 
                Khi dung lượng chạm 100%, bạn sẽ không thể tải thêm tệp tin mới. Hãy bấm nút <strong>"Xin thêm dung lượng"</strong> ở góc trên hoặc dọn dẹp các tệp tin trong Thùng rác.
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
                Bạn đã sử dụng trên 80% hạn mức dung lượng được cấp. Hãy kiểm tra các tệp tin không còn sử dụng hoặc gửi yêu cầu xin thêm dung lượng nếu cần.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Bảng Lịch sử biến động Quota */}
      <div className="mt-8">
        <QuotaHistoryTable
          key={historyRefreshKey}
          onShowToast={onShowToast}
        />
      </div>

      {/* Modal gửi yêu cầu tăng Quota */}
      <RequestQuotaModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        currentQuotaBytes={quotaBytes}
        onSuccess={handleRequestSuccess}
      />
    </div>
  );
};
