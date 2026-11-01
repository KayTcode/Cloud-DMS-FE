import React, { useEffect, useState } from 'react';
import { ArrowLeft, Building2, HardDrive, Crown, Mail, Phone, Loader2, Users } from 'lucide-react';
import { getDepartmentDetail } from '@/features/tenants/api/tenantQueries';
import { DepartmentDetail } from '@/features/tenants/types/tenantUser.dto';

interface TenantDepartmentDetailViewProps {
  tenantId: string;
  departmentId: string;
  onBack: () => void;
}

export const TenantDepartmentDetailView: React.FC<TenantDepartmentDetailViewProps> = ({
  tenantId,
  departmentId,
  onBack,
}) => {
  const [detail, setDetail] = useState<DepartmentDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    getDepartmentDetail(tenantId, departmentId)
      .then((data) => {
        setDetail(data);
      })
      .catch((err) => {
        setError(err?.message ?? 'Không thể tải thông tin phòng ban.');
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [tenantId, departmentId]);

  const renderStorageBar = (usedBytes: number, quotaBytes: number) => {
    if (quotaBytes <= 0) return null;
    const usedGB = usedBytes / (1024 ** 3);
    const quotaGB = quotaBytes / (1024 ** 3);
    const pct = Math.min(100, Math.round((usedBytes / quotaBytes) * 100));
    return (
      <div>
        <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
          <span className="flex items-center gap-1">
            <HardDrive className="w-3.5 h-3.5" />
            <span>Dung lượng sử dụng</span>
          </span>
          <span className="tabular-nums font-medium text-slate-700">
            {usedGB.toFixed(1)} GB / {quotaGB.toFixed(1)} GB ({pct}%)
          </span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${pct >= 90 ? 'bg-rose-500' : pct >= 70 ? 'bg-amber-500' : 'bg-blue-500'}`}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 gap-2 text-slate-500">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span className="text-sm">Đang tải thông tin phòng ban...</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="py-12 text-center text-sm text-rose-600">
        <p>{error ?? 'Không tìm thấy dữ liệu phòng ban.'}</p>
        <button
          onClick={onBack}
          className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 mt-5">
      {/* Header + back */}
      <div className="flex items-center gap-3">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-indigo-600 transition-colors shadow-2xs cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Quay lại danh sách
        </button>
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-bold text-slate-900">{detail.name}</h2>
          {detail.isVacant && (
            <span className="text-[10px] font-semibold bg-amber-100 text-amber-700 border border-amber-300 px-1.5 py-0.5 rounded-full">
              Khuyết Trưởng phòng
            </span>
          )}
        </div>
      </div>

      {/* Info card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {detail.code && (
            <div>
              <div className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Mã phòng ban</div>
              <div className="text-sm font-mono font-semibold text-slate-800">{detail.code}</div>
            </div>
          )}
          {detail.description && (
            <div className={detail.code ? '' : 'sm:col-span-2'}>
              <div className="text-[11px] text-slate-400 uppercase font-semibold tracking-wide mb-0.5">Mô tả</div>
              <div className="text-sm text-slate-700">{detail.description}</div>
            </div>
          )}
        </div>

        {/* Storage bar */}
        {renderStorageBar(detail.storageUsedBytes, detail.storageQuotaBytes)}
      </div>

      {/* Lead card */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Crown className="w-4 h-4 text-amber-500" />
          <h3 className="text-sm font-bold text-slate-900">Trưởng phòng</h3>
        </div>
        {!detail.lead ? (
          <p className="text-sm text-amber-600 italic">Chưa có Trưởng phòng</p>
        ) : detail.lead.status === 'Pending' ? (
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-800">{detail.lead.name}</span>
            <span className="text-[11px] bg-amber-100 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
              Chờ kích hoạt
            </span>
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="text-sm font-semibold text-slate-800">{detail.lead.name}</div>
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <Mail className="w-3.5 h-3.5" />
              <span className="font-mono">{detail.lead.email}</span>
            </div>
            {detail.lead.phoneNumber && (
              <div className="flex items-center gap-1 text-xs text-slate-500">
                <Phone className="w-3.5 h-3.5" />
                <span>{detail.lead.phoneNumber}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Employee table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-blue-600" />
          <h3 className="text-sm font-bold text-slate-900">Nhân viên ({detail.members.length})</h3>
        </div>
        {detail.members.length === 0 ? (
          <p className="text-sm text-slate-400 italic text-center py-6">Phòng chưa có nhân viên.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left py-2 pr-4 font-semibold text-slate-500 w-1/4">Họ tên</th>
                  <th className="text-left py-2 pr-4 font-semibold text-slate-500 w-1/3">Email</th>
                  <th className="text-left py-2 pr-4 font-semibold text-slate-500 w-1/5">Số điện thoại</th>
                  <th className="text-left py-2 font-semibold text-slate-500">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {detail.members.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-2 pr-4 font-medium text-slate-800">{m.name}</td>
                    <td className="py-2 pr-4 font-mono text-slate-500 truncate max-w-[200px]">{m.email}</td>
                    <td className="py-2 pr-4 text-slate-500">{m.phoneNumber ?? '—'}</td>
                    <td className="py-2">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          m.status === 'Active'
                            ? 'bg-emerald-100 text-emerald-700'
                            : m.status === 'Pending'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {m.status === 'Active' ? 'Hoạt động' : m.status === 'Pending' ? 'Chờ kích hoạt' : m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
