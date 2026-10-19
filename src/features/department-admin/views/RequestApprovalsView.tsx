import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  HardDrive,
  FolderLock,
  Share2,
  Check,
} from 'lucide-react';
import { QuotaRequest, DepartmentInfo } from '../types';

interface RequestApprovalsViewProps {
  requests: QuotaRequest[];
  department: DepartmentInfo;
  onApprove: (requestId: string, note?: string) => void;
  onReject: (requestId: string, reason?: string) => void;
  onViewDetails: (request: QuotaRequest) => void;
  searchFilter: string;
}

export const RequestApprovalsView: React.FC<RequestApprovalsViewProps> = ({
  requests,
  department,
  onApprove,
  onReject,
  onViewDetails,
  searchFilter,
}) => {
  const [activeFilter, setActiveFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;

  const filteredRequests = requests.filter((r) => {
    const matchesStatus =
      activeFilter === 'all' ? true : r.status === activeFilter;

    const matchesSearch =
      r.memberName.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.memberEmail.toLowerCase().includes(searchFilter.toLowerCase()) ||
      r.reason.toLowerCase().includes(searchFilter.toLowerCase()) ||
      (r.folderTarget && r.folderTarget.toLowerCase().includes(searchFilter.toLowerCase()));

    return matchesStatus && matchesSearch;
  });

  const availableDeptGB = department.totalAllocatedGB - department.usedSpaceGB;

  const handleConfirmReject = (id: string) => {
    onReject(id, rejectReason || 'Không phù hợp với chính sách phòng ban');
    setRejectingId(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Trung tâm phê duyệt yêu cầu
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Xử lý các đề xuất nâng hạn mức ổ đĩa, truy cập tài liệu và quyền chia sẻ của nhân viên
          </p>
        </div>

        {/* Quota Health Badge */}
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200/80 rounded-xl px-4 py-2.5 text-xs text-blue-900">
          <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
          <div>
            <span className="font-semibold">Khả dụng cấp phát phòng: </span>
            <strong className="text-blue-700 font-mono text-sm">{availableDeptGB} GB</strong>
            <span className="text-blue-500"> / {department.totalAllocatedGB} GB</span>
          </div>
        </div>
      </div>

      {/* Metric Cards Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Đang chờ duyệt
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-rose-600 tabular-nums font-mono">
              {pendingCount}
            </span>
            <span className="text-xs text-rose-600 font-medium">Cần xử lý sớm</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Đã duyệt tháng này
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
              {approvedCount}
            </span>
            <span className="text-xs text-emerald-600 font-medium">92% tỷ lệ duyệt</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Dung lượng cấp thêm
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
              +45 GB
            </span>
            <span className="text-xs text-slate-400 font-medium">30 ngày qua</span>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-slate-200/90 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
            Đã từ chối
          </div>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tabular-nums font-mono">
              {rejectedCount}
            </span>
            <span className="text-xs text-slate-400 font-medium">Vi phạm chính sách</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveFilter('pending')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-2 cursor-pointer ${
            activeFilter === 'pending'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <span>Chờ duyệt</span>
          {pendingCount > 0 && (
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeFilter === 'pending'
                  ? 'bg-white text-blue-600'
                  : 'bg-rose-500 text-white'
              }`}
            >
              {pendingCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveFilter('approved')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeFilter === 'approved'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Đã phê duyệt ({approvedCount})
        </button>

        <button
          onClick={() => setActiveFilter('rejected')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeFilter === 'rejected'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Đã từ chối ({rejectedCount})
        </button>

        <button
          onClick={() => setActiveFilter('all')}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
            activeFilter === 'all'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          Tất cả ({requests.length})
        </button>
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <div className="bg-white rounded-xl p-12 text-center border border-slate-200/90 text-slate-400">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <p className="font-semibold text-slate-700">Không có yêu cầu nào trong danh mục này</p>
            <p className="text-xs text-slate-400 mt-1">
              Các đề xuất mới từ nhân viên phòng {department.name} sẽ hiển thị tại đây khi được gửi.
            </p>
          </div>
        ) : (
          filteredRequests.map((req) => {
            const isQuota = req.requestType === 'quota_increase';
            const quotaDelta =
              isQuota && req.requestedQuotaGB && req.currentQuotaGB
                ? req.requestedQuotaGB - req.currentQuotaGB
                : 0;

            const canAfford = availableDeptGB >= quotaDelta;

            return (
              <div
                key={req.id}
                className="bg-white rounded-xl border border-slate-200/90 p-5 shadow-[0_1px_2px_rgba(0,0,0,0.03)] hover:border-slate-300 transition-colors"
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Left: User Info & Request Description */}
                  <div className="flex items-start gap-3.5 max-w-2xl">
                    <div className="w-9 h-9 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700 text-xs shrink-0 mt-0.5">
                      {req.memberName
                        .split(' ')
                        .map((n) => n[0])
                        .slice(-2)
                        .join('')}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          onClick={() => onViewDetails(req)}
                          className="font-bold text-blue-600 hover:text-blue-800 hover:underline text-sm transition-colors text-left cursor-pointer"
                          title="Bấm để xem chi tiết yêu cầu"
                        >
                          {req.memberName}
                        </button>
                        <span className="text-xs text-slate-400 font-mono">
                          ({req.memberRole})
                        </span>

                        {/* Request Type Badge */}
                        {isQuota ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200/80">
                            <HardDrive className="w-3 h-3 text-blue-600" />
                            Tăng dung lượng ổ đĩa (+{quotaDelta} GB)
                          </span>
                        ) : req.requestType === 'folder_access' ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200/80">
                            <FolderLock className="w-3 h-3 text-purple-600" />
                            Quyền truy cập thư mục
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200/80">
                            <Share2 className="w-3 h-3 text-amber-600" />
                            Chia sẻ ra ngoài
                          </span>
                        )}

                        {/* Status Badge */}
                        {req.status === 'pending' && (
                          <span className="text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full">
                            Chờ duyệt
                          </span>
                        )}
                        {req.status === 'approved' && (
                          <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Đã phê duyệt
                          </span>
                        )}
                        {req.status === 'rejected' && (
                          <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                            Đã từ chối
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-700 leading-relaxed">
                        {req.reason}
                      </p>

                      {/* Quota Comparison or Target Folder */}
                      {isQuota && (
                        <div className="flex items-center gap-3 text-xs pt-1">
                          <span className="text-slate-500 font-mono">
                            Hạn mức hiện tại: <strong className="text-slate-800">{req.currentQuotaGB} GB</strong>
                          </span>
                          <span className="text-slate-400">➔</span>
                          <span className="text-blue-700 font-mono font-semibold">
                            Hạn mức đề xuất: <strong>{req.requestedQuotaGB} GB</strong>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            (Ảnh hưởng quỹ phòng: -{quotaDelta} GB)
                          </span>
                        </div>
                      )}

                      {req.folderTarget && (
                        <div className="text-xs text-slate-600 font-mono bg-slate-50 border border-slate-200/70 px-2.5 py-1 rounded inline-block">
                          Đích: {req.folderTarget}
                        </div>
                      )}

                      {req.adminNote && (
                        <div className="text-xs bg-slate-50 p-2 rounded-lg text-slate-600 border border-slate-100 mt-2">
                          <strong className="text-slate-800">Ghi chú phản hồi: </strong>
                          {req.adminNote}
                        </div>
                      )}

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                        <Clock className="w-3 h-3" />
                        <span>Gửi lúc: {req.createdAt}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                    {req.status === 'pending' ? (
                      <>
                        {rejectingId === req.id ? (
                          <div className="flex flex-col gap-2 p-2 bg-slate-50 rounded-lg border border-slate-200">
                            <input
                              type="text"
                              placeholder="Lý do từ chối..."
                              value={rejectReason}
                              onChange={(e) => setRejectReason(e.target.value)}
                              className="text-xs px-2.5 py-1.5 border border-slate-200 rounded bg-white w-48 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                            <div className="flex items-center gap-1.5 justify-end">
                              <button
                                onClick={() => setRejectingId(null)}
                                className="px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-200 rounded cursor-pointer"
                              >
                                Huỷ
                              </button>
                              <button
                                onClick={() => handleConfirmReject(req.id)}
                                className="px-2.5 py-1 text-[11px] font-semibold bg-rose-600 text-white rounded hover:bg-rose-700 cursor-pointer"
                              >
                                Xác nhận từ chối
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            <button
                              onClick={() => setRejectingId(req.id)}
                              className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Từ chối
                            </button>

                            <button
                              onClick={() => onApprove(req.id)}
                              disabled={isQuota && !canAfford}
                              title={
                                isQuota && !canAfford
                                  ? 'Quỹ phòng ban không đủ dung lượng khả dụng!'
                                  : 'Phê duyệt yêu cầu này'
                              }
                              className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer ${
                                isQuota && !canAfford
                                  ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                              }`}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Phê duyệt</span>
                            </button>
                          </>
                        )}
                      </>
                    ) : (
                      <button
                        onClick={() => onViewDetails(req)}
                        className="px-3 py-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors cursor-pointer"
                      >
                        Xem lại nhật ký
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
