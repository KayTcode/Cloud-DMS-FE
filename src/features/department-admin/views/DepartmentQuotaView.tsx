import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Database,
  HardDrive,
  PlusCircle,
  ShieldCheck,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  Info,
  FolderOpen,
  Pencil,
} from 'lucide-react';
import { DepartmentInfo } from '../types';
import {
  PendingQuotaTable,
  QuotaHistoryTable,
  RequestQuotaModal,
} from '@/features/quota';
import { getSharedStoreQuotaApi, setSharedStoreQuotaApi } from '../api/departmentApi';
import { useDepartment } from '../context/DepartmentContext';

const formatBytesSimple = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const gb = bytes / (1024 ** 3);
  if (gb >= 1) return `${gb.toFixed(2)} GB`;
  const mb = bytes / (1024 ** 2);
  if (mb >= 1) return `${mb.toFixed(2)} MB`;
  return `${(bytes / 1024).toFixed(2)} KB`;
};

interface SharedQuotaRowProps {
  departmentId: string;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

const SharedQuotaRow: React.FC<SharedQuotaRowProps> = ({ departmentId, onShowToast }) => {
  const [sharedQuota, setSharedQuota] = useState<{ quotaBytes: number; usedBytes: number } | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [newQuotaGB, setNewQuotaGB] = useState<number>(0);
  const [isSaving, setIsSaving] = useState(false);

  const loadSharedQuota = async () => {
    try {
      const data = await getSharedStoreQuotaApi(departmentId);
      setSharedQuota(data);
    } catch {
      setSharedQuota({ quotaBytes: 0, usedBytes: 0 });
    }
  };

  useEffect(() => {
    loadSharedQuota();
  }, [departmentId]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setSharedStoreQuotaApi(departmentId, newQuotaGB * 1024 * 1024 * 1024);
      onShowToast?.('success', `Đã cập nhật hạn mức Kho chung phòng lên ${newQuotaGB} GB.`);
      setIsEditOpen(false);
      await loadSharedQuota();
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.response?.data?.message || 'Không thể cập nhật hạn mức kho chung.';
      onShowToast?.('error', msg);
    } finally {
      setIsSaving(false);
    }
  };

  const openEdit = () => {
    setNewQuotaGB(sharedQuota ? Math.round(sharedQuota.quotaBytes / (1024 ** 3)) : 0);
    setIsEditOpen(true);
  };

  if (!sharedQuota) return null;

  return (
    <>
      <div className="bg-white rounded-2xl border border-indigo-200/80 p-4 shadow-2xs">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Kho chung phòng</p>
              <p className="text-xs text-slate-500">Lưu trữ dùng chung cho toàn bộ phòng ban</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-8 text-xs">
            <div className="text-center">
              <p className="text-slate-500 mb-0.5">Hạn mức</p>
              <p className="font-bold text-slate-900">{formatBytesSimple(sharedQuota.quotaBytes)}</p>
            </div>
            <div className="text-center">
              <p className="text-slate-500 mb-0.5">Đã dùng</p>
              <p className="font-bold text-slate-900">{formatBytesSimple(sharedQuota.usedBytes)}</p>
            </div>
          </div>
          <button
            onClick={openEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Pencil className="w-3.5 h-3.5" />
            Sửa
          </button>
        </div>
      </div>

      {isEditOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <FolderOpen className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-base">Hạn mức Kho chung phòng</h3>
              </div>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 cursor-pointer">
                <span className="text-base">✕</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-700">Hạn mức mới (GB)</label>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={newQuotaGB}
                  onChange={(e) => setNewQuotaGB(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button onClick={() => setIsEditOpen(false)} disabled={isSaving} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50">Huỷ</button>
                <button onClick={handleSave} disabled={isSaving} className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-1.5">
                  {isSaving ? 'Đang lưu...' : 'Cập nhật'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

interface DepartmentQuotaViewProps {
  department: DepartmentInfo;
  availableQuotaGB: number;
  onBackToHub: () => void;
  onQuotaUpdated?: () => void;
  onShowToast?: (type: 'success' | 'error' | 'info', message: string) => void;
}

export const DepartmentQuotaView: React.FC<DepartmentQuotaViewProps> = ({
  department,
  availableQuotaGB,
  onBackToHub,
  onQuotaUpdated,
  onShowToast,
}) => {
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'pending' | 'history'>('pending');
  const { departmentId } = useDepartment();

  const percentUsed =
    department.totalAllocatedGB > 0
      ? Math.min(100, Math.round((department.usedSpaceGB / department.totalAllocatedGB) * 100))
      : 0;

  const handleRequestCreated = () => {
    setIsRequestModalOpen(false);
    onShowToast?.('success', 'Đã gửi yêu cầu tăng hạn mức phòng ban thành công!');
    onQuotaUpdated?.();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToHub}
            className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors text-slate-600 hover:text-slate-900 cursor-pointer"
            title="Quay lại Trung tâm điều khiển"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
                Quản lý Hạn mức & Phê duyệt Quota
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Department Approver
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Phê duyệt các yêu cầu tăng dung lượng của nhân viên và yêu cầu nâng tổng hạn ngạch phòng ban {department.name}
            </p>
          </div>
        </div>

        {/* Nút yêu cầu xin thêm hạn ngạch phòng ban */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsRequestModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Xin thêm dung lượng phòng ban</span>
          </button>
        </div>
      </div>

      {/* 2. Overview Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Tổng hạn mức được cấp */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Tổng hạn mức phòng ban</span>
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {department.totalAllocatedGB}{' '}
            <span className="text-xs font-semibold text-slate-500">GB</span>
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-500" />
            <span>Hạn mức từ Quản trị viên Doanh nghiệp</span>
          </div>
        </div>

        {/* Card 2: Đã sử dụng */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Đã sử dụng</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-slate-900">
            {department.usedSpaceGB}{' '}
            <span className="text-xs font-semibold text-slate-500">GB</span>
            <span className="text-xs font-semibold text-slate-400 ml-2">({percentUsed}%)</span>
          </p>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className={`h-full rounded-full ${
                percentUsed > 85 ? 'bg-rose-500' : percentUsed > 60 ? 'bg-amber-500' : 'bg-blue-600'
              }`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
        </div>

        {/* Card 3: Còn khả dụng để phân phối */}
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-2">
            <span className="font-medium">Còn khả dụng</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-extrabold text-emerald-600">
            {availableQuotaGB}{' '}
            <span className="text-xs font-semibold text-slate-500">GB</span>
          </p>
          <div className="mt-2 text-[11px] text-slate-500 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Có thể cấp phát cho nhân viên hoặc dùng chung</span>
          </div>
        </div>
      </div>

      {/* 3. Kho chung phòng row */}
      {departmentId && (
        <SharedQuotaRow departmentId={departmentId} onShowToast={onShowToast} />
      )}

      {/* 4. Sub Tabs & Content */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200">
          <button
            onClick={() => setActiveSubTab('pending')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeSubTab === 'pending'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Yêu cầu chờ phê duyệt</span>
          </button>
          <button
            onClick={() => setActiveSubTab('history')}
            className={`pb-3 px-3 text-xs font-bold transition-all relative cursor-pointer ${
              activeSubTab === 'history'
                ? 'text-purple-600 border-b-2 border-purple-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Lịch sử cấp phát Quota</span>
          </button>
        </div>

        {activeSubTab === 'pending' ? (
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <Info className="w-4 h-4 text-purple-600" />
                <span>
                  Các yêu cầu quá hạn 7 ngày sẽ tự động được leo thang lên Quản trị viên cấp cao hơn (Escalated).
                </span>
              </div>
            </div>
            <PendingQuotaTable
              onDecisionSuccess={() => {
                onShowToast?.('success', 'Đã ghi nhận quyết định phê duyệt thành công.');
                onQuotaUpdated?.();
              }}
            />
          </div>
        ) : (
          <QuotaHistoryTable />
        )}
      </div>

      {/* Request Quota Modal */}
      <RequestQuotaModal
        isOpen={isRequestModalOpen}
        onClose={() => setIsRequestModalOpen(false)}
        onSuccess={handleRequestCreated}
      />
    </div>
  );
};
