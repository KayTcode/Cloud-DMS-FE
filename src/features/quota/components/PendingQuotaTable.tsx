import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  RefreshCw,
  HardDrive,
  Calendar,
  AlertTriangle,
  User,
  CheckCircle,
  XCircle,
  Inbox
} from 'lucide-react';
import { quotaApi } from '../api/quotaApi';
import { PendingQuotaRequestDto, QuotaRequestDto } from '../types/quota.types';
import { DecideQuotaModal } from './DecideQuotaModal';

interface PendingQuotaTableProps {
  onShowToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  onCountChange?: (count: number) => void;
  onDecisionSuccess?: () => void;
  onRequestTopUp?: (shortfallBytes: number) => void;
}

const GB_IN_BYTES = 1024 * 1024 * 1024;

export const PendingQuotaTable: React.FC<PendingQuotaTableProps> = ({
  onShowToast,
  onCountChange,
  onDecisionSuccess,
  onRequestTopUp,
}) => {
  const [requests, setRequests] = useState<PendingQuotaRequestDto[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [selectedRequest, setSelectedRequest] = useState<PendingQuotaRequestDto | null>(null);
  const [isDecideModalOpen, setIsDecideModalOpen] = useState<boolean>(false);

  const fetchPending = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await quotaApi.getPendingForMe();
      setRequests(data);
      onCountChange?.(data.length);
    } catch (err: any) {
      console.error('Lỗi nạp danh sách yêu cầu chờ duyệt:', err);
      onShowToast?.('Không thể nạp danh sách yêu cầu chờ duyệt.', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [onShowToast, onCountChange]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  const handleOpenDecide = (req: PendingQuotaRequestDto) => {
    setSelectedRequest(req);
    setIsDecideModalOpen(true);
  };

  const handleDecideSuccess = (_updated: QuotaRequestDto, message: string) => {
    onShowToast?.(message, 'success');
    fetchPending();
    onDecisionSuccess?.();
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
      {/* Header bar */}
      <div className="p-4 sm:p-5 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Yêu cầu Quota đang chờ duyệt</h3>
            <p className="text-xs text-slate-500">
              Có <span className="font-semibold text-amber-600">{requests.length}</span> yêu cầu cần bạn xử lý
            </p>
          </div>
        </div>

        <button
          onClick={fetchPending}
          disabled={isLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* Table list */}
      {isLoading ? (
        <div className="p-10 text-center text-xs text-slate-400">
          <div className="w-6 h-6 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mx-auto mb-2" />
          <span>Đang tải danh sách yêu cầu...</span>
        </div>
      ) : requests.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-700">Không có yêu cầu nào chờ duyệt</h4>
          <p className="text-xs text-slate-400 mt-1">
            Tất cả các yêu cầu cấp thêm dung lượng đã được xử lý xong.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-3 px-4">Người yêu cầu</th>
                <th className="py-3 px-4">Hiện tại</th>
                <th className="py-3 px-4">Xin tăng thêm</th>
                <th className="py-3 px-4">Thời hạn</th>
                <th className="py-3 px-4">Lý do</th>
                <th className="py-3 px-4">Thời gian gửi</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.map((req) => {
                const curGB = parseFloat((req.currentQuotaBytes / GB_IN_BYTES).toFixed(2));
                const addGB = parseFloat((req.requestedAdditionalBytes / GB_IN_BYTES).toFixed(2));
                const formattedDate = new Date(req.createdAt).toLocaleDateString('vi-VN', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <tr key={req.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Người yêu cầu */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                          {req.requesterName ? req.requesterName.substring(0, 2) : 'NV'}
                        </div>
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-800 block truncate">
                            {req.requesterName}
                          </span>
                          <span className="text-[11px] text-slate-400 truncate block">
                            {req.requesterEmail}
                          </span>
                          {req.requesterDepartmentName && (
                            <span className="text-[11px] text-slate-500 truncate block">
                              Phòng ban: {req.requesterDepartmentName}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Cảnh báo leo thang nếu có */}
                      {req.escalatedForOverdue && (
                        <span className="inline-flex items-center gap-1 mt-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          <AlertTriangle className="w-3 h-3 text-rose-500" />
                          Chuyển cấp trên (Quá 7 ngày)
                        </span>
                      )}
                    </td>

                    {/* Hiện tại */}
                    <td className="py-3.5 px-4 font-medium text-slate-600">
                      {curGB} GB
                    </td>

                    {/* Xin tăng thêm */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100">
                        +{addGB} GB
                      </span>
                    </td>

                    {/* Thời hạn */}
                    <td className="py-3.5 px-4">
                      {req.isTemporary ? (
                        <div className="text-amber-700 font-medium text-[11px]">
                          <span>Tạm thời</span>
                          <span className="block text-slate-400 text-[10px]">
                            Đến {req.expiresAt ? new Date(req.expiresAt).toLocaleDateString('vi-VN') : 'N/A'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-600 font-medium">Vĩnh viễn</span>
                      )}
                    </td>

                    {/* Lý do */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <p className="text-slate-700 truncate" title={req.reason}>
                        {req.reason}
                      </p>
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-4 text-slate-400 text-[11px] whitespace-nowrap">
                      {formattedDate}
                    </td>

                    {/* Thao tác */}
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleOpenDecide(req)}
                        className="px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-2xs transition-colors cursor-pointer inline-flex items-center gap-1"
                      >
                        <span>Xử lý</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal xử lý duyệt / từ chối */}
      <DecideQuotaModal
        isOpen={isDecideModalOpen}
        request={selectedRequest}
        onClose={() => {
          setIsDecideModalOpen(false);
          setSelectedRequest(null);
        }}
        onSuccess={handleDecideSuccess}
        onRequestTopUp={onRequestTopUp}
      />
    </div>
  );
};
