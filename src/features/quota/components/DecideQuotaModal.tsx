import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, XCircle, AlertTriangle, User, Calendar, FileText, HardDrive, Loader2 } from 'lucide-react';
import { quotaApi } from '../api/quotaApi';
import { QuotaRequestDto } from '../types/quota.types';
import { GB_IN_BYTES, checkAvailability, bytesToGB } from '../utils/quotaAvailability';
import { StorageProviderItem } from '../../system-admin/types/systemAdmin.dto';
import { getStorageProvidersApi } from '../../system-admin/api/systemAdminQueries';

interface DecideQuotaModalProps {
  isOpen: boolean;
  request: QuotaRequestDto | null;
  onClose: () => void;
  onSuccess: (updated: QuotaRequestDto, message: string) => void;
  maxAvailableBytes?: number | null;
}

export const DecideQuotaModal: React.FC<DecideQuotaModalProps> = ({
  isOpen,
  request,
  onClose,
  onSuccess,
  maxAvailableBytes,
}) => {
  const [mode, setMode] = useState<'approve' | 'reject'>('approve');
  const [approvalType, setApprovalType] = useState<'full' | 'partial'>('full');
  const [partialGB, setPartialGB] = useState<number>(1);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [storageProviderId, setStorageProviderId] = useState<string>('');
  const [providers, setProviders] = useState<StorageProviderItem[]>([]);
  const [isLoadingProviders, setIsLoadingProviders] = useState<boolean>(false);

  const isTenantAdminRequest = request?.requesterRole === 'TenantAdmin';

  useEffect(() => {
    if (request) {
      setMode('approve');
      setApprovalType('full');
      const reqGB = Math.max(1, Math.round(request.requestedAdditionalBytes / GB_IN_BYTES));
      setPartialGB(reqGB > 1 ? Math.floor(reqGB / 2) : 1);
      setRejectionReason('');
      setErrorMessage(null);
      setStorageProviderId('');
      setProviders([]);

      if (request.requesterRole === 'TenantAdmin') {
        setIsLoadingProviders(true);
        getStorageProvidersApi()
          .then((data) => setProviders(data))
          .catch((err) => console.error('Failed to load providers:', err))
          .finally(() => setIsLoadingProviders(false));
      }
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const requestedGB = parseFloat((request.requestedAdditionalBytes / GB_IN_BYTES).toFixed(2));
  const currentGB = parseFloat((request.currentQuotaBytes / GB_IN_BYTES).toFixed(2));

  const handleApprove = async () => {
    setErrorMessage(null);
    let bytesToApprove = request.requestedAdditionalBytes;

    if (approvalType === 'partial') {
      if (!partialGB || partialGB <= 0) {
        setErrorMessage('Dung lượng duyệt phải lớn hơn 0 GB.');
        return;
      }
      if (partialGB > requestedGB) {
        setErrorMessage(`Dung lượng duyệt một phần không được vượt quá mức yêu cầu (${requestedGB} GB).`);
        return;
      }
      bytesToApprove = Math.round(partialGB * GB_IN_BYTES);
    }

    const availability = checkAvailability(bytesToApprove, maxAvailableBytes);
    if (!availability.ok) {
      setErrorMessage(availability.message!);
      return;
    }

    if (isTenantAdminRequest && !storageProviderId) {
      setErrorMessage('Vui lòng chọn tài khoản lưu trữ để phân bổ quota.');
      return;
    }

    try {
      setIsLoading(true);
      const payload: { approvedAdditionalBytes: number; storageProviderId?: string } = {
        approvedAdditionalBytes: bytesToApprove,
      };
      if (isTenantAdminRequest && storageProviderId) {
        payload.storageProviderId = storageProviderId;
      }
      const updated = await quotaApi.decideRequest(request.id, payload);
      const isFull = bytesToApprove >= request.requestedAdditionalBytes;
      onSuccess(
        updated,
        isFull
          ? `Đã duyệt đủ +${requestedGB} GB cho ${request.requesterName}.`
          : `Đã duyệt một phần +${partialGB} GB cho ${request.requesterName}.`
      );
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi duyệt quota:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Không thể phê duyệt yêu cầu. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleReject = async () => {
    setErrorMessage(null);
    if (!rejectionReason.trim()) {
      setErrorMessage('Bắt buộc phải nhập lý do từ chối yêu cầu.');
      return;
    }

    try {
      setIsLoading(true);
      const updated = await quotaApi.rejectRequest(request.id, rejectionReason.trim());
      onSuccess(updated, `Đã từ chối yêu cầu tăng quota của ${request.requesterName}.`);
      onClose();
    } catch (err: any) {
      console.error('Lỗi khi từ chối quota:', err);
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        'Không thể từ chối yêu cầu. Vui lòng thử lại sau.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="decide-modal-title"
        className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 id="decide-modal-title" className="font-bold text-slate-900 text-base">
              Xử lý yêu cầu tăng Quota
            </h3>
            <p className="text-xs text-slate-500">
              Yêu cầu từ nhân viên <span className="font-semibold text-slate-700">{request.requesterName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Thông báo lỗi nếu có */}
        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2.5 text-xs text-rose-700">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Thẻ tóm tắt thông tin yêu cầu */}
        <div className="mt-4 p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-slate-400" /> Người gửi:
            </span>
            <span className="font-semibold text-slate-800">
              {request.requesterName} ({request.requesterEmail})
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-slate-400" /> Dung lượng hiện tại:
            </span>
            <span className="font-semibold text-slate-700">{currentGB} GB</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <HardDrive className="w-3.5 h-3.5 text-blue-500" /> Muốn xin thêm:
            </span>
            <span className="font-bold text-blue-600">+{requestedGB} GB</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-500 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" /> Thời hạn:
            </span>
            <span className="font-medium text-slate-700">
              {request.isTemporary ? (
                <span className="text-amber-700 font-semibold">
                  Tạm thời đến {request.expiresAt ? new Date(request.expiresAt).toLocaleDateString('vi-VN') : 'N/A'}
                </span>
              ) : (
                'Vĩnh viễn'
              )}
            </span>
          </div>

          <div className="pt-2 border-t border-slate-200/60">
            <span className="text-slate-500 block mb-1 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-slate-400" /> Lý do:
            </span>
            <p className="text-slate-700 italic bg-white p-2 rounded-lg border border-slate-200/60">
              "{request.reason}"
            </p>
          </div>
        </div>

        {/* Tab chọn hành động: Duyệt hay Từ chối */}
        <div className="mt-4 flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            type="button"
            onClick={() => setMode('approve')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'approve'
                ? 'bg-white text-emerald-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span>Phê duyệt</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('reject')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mode === 'reject'
                ? 'bg-white text-rose-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <XCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>Từ chối</span>
          </button>
        </div>

        {/* Form phê duyệt */}
        {mode === 'approve' && (
          <div className="mt-4 space-y-3 animate-in fade-in duration-150">
            {/* Provider selector — only for TenantAdmin requests */}
            {isTenantAdminRequest && (
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-700">
                  Tài khoản lưu trữ <span className="text-rose-500">*</span>
                </label>
                {isLoadingProviders ? (
                  <div className="flex items-center gap-2 p-3 text-xs text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                    <span>Đang tải danh sách tài khoản lưu trữ...</span>
                  </div>
                ) : providers.length === 0 ? (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs">
                    Không tìm thấy tài khoản lưu trữ nào. Vui lòng kết nối Storage Provider trước.
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {providers.map((p) => {
                      const isSelected = p.id === storageProviderId;
                      return (
                        <div
                          key={p.id}
                          onClick={() => { setStorageProviderId(p.id); setErrorMessage(null); }}
                          className={`flex items-center justify-between p-3 rounded-xl border-2 cursor-pointer transition-all ${
                            isSelected
                              ? 'border-indigo-600 bg-indigo-50/40 shadow-xs'
                              : 'border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                              <HardDrive className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">{p.name}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{p.type}</div>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <span className="text-slate-400 text-[11px] block">Tổng</span>
                            <span className="font-mono font-semibold text-slate-700">{p.capacity}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            <div className="space-y-2">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="approvalType"
                  checked={approvalType === 'full'}
                  onChange={() => setApprovalType('full')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-800 block">
                    Duyệt đủ 100% (+{requestedGB} GB)
                  </span>
                  <span className="text-slate-500">
                    Cấp toàn bộ mức dung lượng nhân viên đã yêu cầu
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-2 p-2.5 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors">
                <input
                  type="radio"
                  name="approvalType"
                  checked={approvalType === 'partial'}
                  onChange={() => setApprovalType('partial')}
                  className="text-blue-600 focus:ring-blue-500 mt-1"
                />
                <div className="text-xs flex-1">
                  <span className="font-semibold text-slate-800 block">
                    Duyệt một phần (Tùy chỉnh số GB)
                  </span>
                  <span className="text-slate-500 block mb-2">
                    Chỉ cấp một phần dung lượng nếu kho lưu trữ có hạn
                  </span>

                  {approvalType === 'partial' && (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="number"
                        min={1}
                        max={requestedGB}
                        step={1}
                        value={partialGB || ''}
                        onChange={(e) => setPartialGB(Math.max(1, parseInt(e.target.value) || 0))}
                        className="w-32 px-2.5 py-1 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-800"
                      />
                      <span className="text-xs text-slate-500">GB (Tối đa {requestedGB} GB)</span>
                    </div>
                  )}
                </div>
              </label>
            </div>
          </div>
        )}

        {/* Form từ chối */}
        {mode === 'reject' && (
          <div className="mt-4 space-y-2 animate-in fade-in duration-150">
            <label className="block text-xs font-semibold text-slate-700">
              Lý do từ chối <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập lý do từ chối (ví dụ: Dung lượng phòng ban hiện tại đã đạt ngưỡng tối đa, vui lòng dọn dẹp tài liệu cũ...)"
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-transparent resize-none"
            />
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2.5 pt-4 mt-5 border-t border-slate-100">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl hover:bg-slate-100 transition-colors"
          >
            Đóng
          </button>

          {mode === 'approve' ? (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleApprove}
              className="px-5 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? (
                <span>Đang xử lý...</span>
              ) : (
                <span>Xác nhận Duyệt ({approvalType === 'full' ? `+${requestedGB} GB` : `+${partialGB} GB`})</span>
              )}
            </button>
          ) : (
            <button
              type="button"
              disabled={isLoading || !rejectionReason.trim()}
              onClick={handleReject}
              className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-xs transition-colors disabled:opacity-50 flex items-center gap-1.5"
            >
              {isLoading ? <span>Đang xử lý...</span> : <span>Xác nhận Từ chối</span>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
