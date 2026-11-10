import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  Building2,
  Crown,
  HardDrive,
  Users,
  Mail,
  Phone,
  UserPlus,
  Loader2,
  RefreshCw,
  AlertCircle,
  Search,
  ArrowRightLeft
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { DepartmentDetail, DepartmentMember } from '@/features/tenants/types';
import { getDepartmentDetail } from '@/features/tenants/api/tenantQueries';
import { InterimManagementPanel, DepartmentExpiringFilesTable } from '../components';
import { TransferEmployeeDepartmentModal } from '@/features/tenants/components/TransferEmployeeDepartmentModal';

interface TenantDepartmentDetailViewProps {
  tenantId?: string;
  departmentId: string;
  onBack: () => void;
  onCreateUser?: () => void;
}

export const TenantDepartmentDetailView: React.FC<TenantDepartmentDetailViewProps> = ({
  tenantId: tenantIdProp,
  departmentId,
  onBack,
  onCreateUser,
}) => {
  const { user } = useAuth();
  const tenantId = tenantIdProp || user?.tenantId || '';

  const [detail, setDetail] = useState<DepartmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  const [transferTarget, setTransferTarget] = useState<DepartmentMember | null>(null);
  const [memberSearch, setMemberSearch] = useState<string>('');

  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const loadDetail = useCallback(async () => {
    if (!tenantId || !departmentId) return;
    setIsLoading(true);
    setError(null);
    try {
      const data = await getDepartmentDetail(tenantId, departmentId);
      if (data) {
        setDetail(data);
      } else {
        setError('Không tìm thấy thông tin phòng ban.');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Lỗi khi nạp thông tin chi tiết phòng ban.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, departmentId]);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const filteredEmployees = useMemo(() => {
    if (!detail?.employees) return [];
    if (!memberSearch.trim()) return detail.employees;
    const q = memberSearch.toLowerCase();
    return detail.employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.phoneNumber && e.phoneNumber.toLowerCase().includes(q))
    );
  }, [detail?.employees, memberSearch]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-blue-600" />
        <span className="text-sm font-semibold">Đang nạp chi tiết phòng ban...</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center max-w-md mx-auto my-10 space-y-4 shadow-2xs">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900">Không thể tải thông tin phòng ban</h3>
          <p className="text-xs text-slate-500 mt-1">{error || 'Phòng ban không tồn tại hoặc đã bị xóa.'}</p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-full text-xs font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </button>
      </div>
    );
  }

  const quotaBytes = detail.quotaBytes || 0;
  const usedBytes = detail.usedBytes || 0;
  const quotaGB = (quotaBytes / (1024 ** 3)).toFixed(1);
  const usedGB = (usedBytes / (1024 ** 3)).toFixed(1);
  const usagePct = quotaBytes > 0 ? Math.min(100, Math.round((usedBytes / quotaBytes) * 100)) : 0;

  return (
    <div className="space-y-5 mt-4 animate-in fade-in duration-150">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold shadow-2xs animate-in fade-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : toast.type === 'error'
              ? 'bg-rose-50 text-rose-800 border-rose-200'
              : 'bg-blue-50 text-blue-800 border-blue-200'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">
            ✕
          </button>
        </div>
      )}

      {/* 1. Header bar (Google Drive Style) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={onBack}
              className="w-9 h-9 rounded-full border border-slate-200/80 hover:bg-slate-50 flex items-center justify-center text-slate-600 transition-colors cursor-pointer shrink-0 shadow-2xs"
              title="Quay lại danh sách phòng ban"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold text-slate-900 truncate">{detail.name}</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                  {detail.code}
                </span>
                {detail.isVacant && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200/60">
                    Khuyết Trưởng phòng
                  </span>
                )}
              </div>
              {detail.description && (
                <p className="text-xs text-slate-500 mt-0.5 truncate">{detail.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
            <button
              onClick={loadDetail}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-slate-200/80 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer shadow-2xs"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Làm mới</span>
            </button>
            {onCreateUser && (
              <button
                onClick={onCreateUser}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[2.5]" />
                <span>Thêm nhân viên</span>
              </button>
            )}
          </div>
        </div>

        {/* 3 Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5 pt-5 border-t border-slate-100">
          {/* Card 1: Hạn mức lưu trữ */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <HardDrive className="w-3.5 h-3.5 text-blue-600" />
                <span>Dung lượng phòng ban</span>
              </span>
              <span className="text-xs font-bold text-slate-700">{usagePct}%</span>
            </div>
            <div className="flex items-baseline justify-between text-xs">
              <span className="text-slate-500">Đã dùng:</span>
              <span className="text-sm font-bold text-slate-900 font-mono">
                {usedGB} GB <span className="text-slate-400 font-normal">/ {quotaGB} GB</span>
              </span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-300 rounded-full ${
                  usagePct >= 90 ? 'bg-rose-500' : usagePct >= 75 ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${Math.max(3, usagePct)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Trưởng phòng */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5">
                <Crown className={`w-3.5 h-3.5 ${detail.lead ? 'text-amber-500' : 'text-slate-400'}`} />
                <span>Trưởng phòng (Lead)</span>
              </span>
              {detail.lead ? (
                <span
                  className={`px-2 py-0.2 rounded-full text-[10px] font-semibold ${
                    detail.lead.isActive
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                      : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                  }`}
                >
                  {detail.lead.isActive ? 'Đang hoạt động' : 'Chờ kích hoạt'}
                </span>
              ) : (
                <span className="px-2 py-0.2 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200/60">
                  Chưa có Lead
                </span>
              )}
            </div>
            {detail.lead ? (
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-slate-900 truncate">{detail.lead.fullName}</div>
                <div className="text-[11px] text-slate-500 font-mono truncate flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate">{detail.lead.email}</span>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic pt-1">
                Phòng ban đang khuyết vị trí quản trị.
              </div>
            )}
          </div>

          {/* Card 3: Tổng nhân sự */}
          <div className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-1 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
              <Users className="w-3.5 h-3.5 text-blue-600" />
              <span>Tổng nhân sự phòng ban</span>
            </div>
            <div>
              <div className="text-2xl font-bold text-slate-900">
                {detail.employees.length + (detail.lead ? 1 : 0)}
              </div>
              <p className="text-[11px] text-slate-500">
                {detail.employees.length} nhân viên • {detail.lead ? 1 : 0} Trưởng phòng
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Bảng danh sách nhân viên phòng ban (Có ô tìm kiếm Google Drive Style) */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Danh sách Nhân sự ({detail.employees.length})
            </h3>
            <p className="text-xs text-slate-500">
              Nhân viên trực thuộc phòng ban. Dung lượng cá nhân được bảo vệ theo chính sách quyền riêng tư.
            </p>
          </div>

          {/* Ô tìm kiếm nhân viên dạng viên thuốc */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              placeholder="Tìm theo tên, email..."
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200/80 rounded-full text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>
        </div>

        {detail.employees.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
            Phòng chưa có nhân viên nào. Bấm &quot;Thêm nhân viên&quot; ở trên để bắt đầu thêm nhân sự.
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="py-10 text-center text-xs text-slate-400">
            Không tìm thấy nhân viên nào khớp với từ khóa &quot;{memberSearch}&quot;.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold text-[11px]">
                  <th className="py-2.5 px-3 text-center w-12">STT</th>
                  <th className="py-2.5 px-3">Họ và Tên</th>
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Số điện thoại</th>
                  <th className="py-2.5 px-3 text-center">Trạng thái</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredEmployees.map((emp, idx) => (
                  <tr key={emp.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{emp.fullName}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{emp.email}</td>
                    <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500">
                      {emp.phoneNumber || '—'}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          emp.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
                        }`}
                      >
                        {emp.isActive ? 'Đang hoạt động' : 'Chờ kích hoạt'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => setTransferTarget(emp)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-blue-700 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors cursor-pointer"
                        title="Chuyển nhân sự sang phòng ban khác"
                      >
                        <ArrowRightLeft className="w-3 h-3" />
                        <span>Đổi phòng</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Danh sách tệp tin sắp hết hạn của phòng ban */}
      <DepartmentExpiringFilesTable
        tenantId={tenantId}
        departmentId={detail.id}
        departmentName={detail.name}
        onShowToast={(message, type) => showToast(type, message)}
        onQuotaChanged={loadDetail}
      />

      {/* Khu vực "Đang tạm quản lý" khi phòng khuyết Trưởng phòng */}
      {detail.isVacant && (
        <InterimManagementPanel
          department={detail}
          onRefresh={loadDetail}
          onShowToast={showToast}
        />
      )}

      {/* Modal đổi phòng cho nhân viên */}
      {transferTarget && (
        <TransferEmployeeDepartmentModal
          tenantId={tenantId}
          userId={transferTarget.id}
          userName={transferTarget.fullName}
          currentDepartmentId={departmentId}
          onClose={() => setTransferTarget(null)}
          onSuccess={() => {
            setTransferTarget(null);
            loadDetail();
          }}
        />
      )}
    </div>
  );
};
