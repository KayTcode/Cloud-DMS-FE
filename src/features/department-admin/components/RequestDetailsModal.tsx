import React, { useState } from 'react';
import { X, Check, XCircle, HardDrive, FolderLock, Share2, AlertTriangle } from 'lucide-react';
import { QuotaRequest, DepartmentInfo } from '../types';

interface RequestDetailsModalProps {
  request: QuotaRequest | null;
  department: DepartmentInfo;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string, note?: string) => void;
  onReject: (id: string, reason?: string) => void;
}

export const RequestDetailsModal: React.FC<RequestDetailsModalProps> = ({
  request,
  department,
  isOpen,
  onClose,
  onApprove,
  onReject,
}) => {
  if (!isOpen || !request) return null;

  const [note, setNote] = useState('');
  const isQuota = request.requestType === 'quota_increase';
  const quotaDelta =
    isQuota && request.requestedQuotaGB && request.currentQuotaGB
      ? request.requestedQuotaGB - request.currentQuotaGB
      : 0;

  const availableDeptGB = department.totalAllocatedGB - department.usedSpaceGB;
  const canAfford = availableDeptGB >= quotaDelta;

  const handleApprove = () => {
    onApprove(request.id, note || 'Đã được Department Admin phê duyệt');
    onClose();
  };

  const handleReject = () => {
    onReject(request.id, note || 'Yêu cầu không được phê duyệt theo chính sách phòng');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              {isQuota ? (
                <HardDrive className="w-4 h-4" />
              ) : request.requestType === 'folder_access' ? (
                <FolderLock className="w-4 h-4" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Chi tiết yêu cầu phê duyệt</h3>
              <p className="text-xs text-slate-500 font-mono">Mã đơn: #{request.id}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 text-xs">
          {/* Requester info */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 space-y-2">
            <div className="flex justify-between">
              <span className="text-slate-500">Người gửi:</span>
              <strong className="text-slate-900">{request.memberName}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Email:</span>
              <span className="text-slate-700 font-mono">{request.memberEmail}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Vị trí:</span>
              <span className="text-slate-700">{request.memberRole}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Thời gian tạo:</span>
              <span className="text-slate-700">{request.createdAt}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-500">Trạng thái hiện tại:</span>
              <span
                className={`font-semibold px-2 py-0.5 rounded-full text-[10px] ${
                  request.status === 'pending'
                    ? 'bg-rose-50 text-rose-700 border border-rose-200'
                    : request.status === 'approved'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-slate-100 text-slate-600'
                }`}
              >
                {request.status === 'pending'
                  ? 'Chờ duyệt'
                  : request.status === 'approved'
                  ? 'Đã duyệt'
                  : 'Đã từ chối'}
              </span>
            </div>
          </div>

          {/* Request details */}
          <div className="space-y-2">
            <label className="font-semibold text-slate-700 block">Nội dung đề xuất:</label>
            {isQuota ? (
              <div className="grid grid-cols-3 gap-2 p-3 bg-blue-50/50 border border-blue-100 rounded-xl text-center">
                <div>
                  <span className="text-slate-500 text-[11px] block">Hạn mức cũ</span>
                  <strong className="text-slate-800 font-mono text-sm">{request.currentQuotaGB} GB</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Đề xuất nâng</span>
                  <strong className="text-blue-600 font-mono text-sm">{request.requestedQuotaGB} GB</strong>
                </div>
                <div>
                  <span className="text-slate-500 text-[11px] block">Tăng thêm</span>
                  <strong className="text-emerald-600 font-mono text-sm">+{quotaDelta} GB</strong>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-slate-800 break-all">
                {request.folderTarget || 'Toàn bộ thư mục dự án'}
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="font-semibold text-slate-700 block mb-1">Lý do từ nhân viên:</label>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-700 italic">
              "{request.reason}"
            </div>
          </div>

          {/* Department Quota Check Warning */}
          {isQuota && !canAfford && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-2 text-rose-700">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Dung lượng phòng không đủ để cấp phát!</strong>
                <p className="mt-0.5">
                  Phòng ban chỉ còn dư {availableDeptGB} GB, trong khi yêu cầu tăng +{quotaDelta} GB.
                </p>
              </div>
            </div>
          )}

          {/* Admin Note input if pending */}
          {request.status === 'pending' ? (
            <div>
              <label className="font-semibold text-slate-700 block mb-1">
                Ghi chú phê duyệt / Phản hồi cho nhân viên:
              </label>
              <textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Đã duyệt cấp thêm dung lượng phục vụ dự án..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 resize-none"
              />
            </div>
          ) : (
            request.adminNote && (
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Ghi chú xử lý:</label>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-slate-700">
                  {request.adminNote}
                </div>
              </div>
            )
          )}

          {/* Action buttons */}
          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              Đóng
            </button>

            {request.status === 'pending' && (
              <>
                <button
                  type="button"
                  onClick={handleReject}
                  className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold rounded-lg text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Từ chối</span>
                </button>
                <button
                  type="button"
                  disabled={isQuota && !canAfford}
                  onClick={handleApprove}
                  className={`inline-flex items-center gap-1 px-4 py-2 text-xs font-semibold rounded-lg text-white transition-colors cursor-pointer ${
                    isQuota && !canAfford
                      ? 'bg-slate-400 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 shadow-sm'
                  }`}
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Phê duyệt</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
