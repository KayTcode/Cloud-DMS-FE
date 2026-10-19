import React, { useState } from 'react';
import { X, HardDrive, Layers, ArrowUpRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import { DepartmentInfo } from '../types';

interface AdjustDepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  department: DepartmentInfo;
  onRequestMoreQuota: (additionalGB: number, reason: string) => void;
  onUpdateCeiling: (newCeilingGB: number) => void;
}

export const AdjustDepartmentModal: React.FC<AdjustDepartmentModalProps> = ({
  isOpen,
  onClose,
  department,
  onRequestMoreQuota,
  onUpdateCeiling,
}) => {
  if (!isOpen) return null;

  const [activeTab, setActiveTab] = useState<'request_tenant' | 'thresholds'>('request_tenant');
  const [requestGB, setRequestGB] = useState(50);
  const [requestReason, setRequestReason] = useState('');
  const [warningThreshold, setWarningThreshold] = useState(80);
  const [criticalThreshold, setCriticalThreshold] = useState(95);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitRequest = (e: React.FormEvent) => {
    e.preventDefault();
    onRequestMoreQuota(requestGB, requestReason || 'Tăng trần dung lượng định kỳ cho dự án mới');
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">Cấu hình hạn mức lưu trữ phòng ban</h3>
              <p className="text-xs text-slate-500">Phòng: {department.name} · {department.tenantName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex border-b border-slate-100 px-5 pt-2">
          <button
            onClick={() => setActiveTab('request_tenant')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'request_tenant'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Xin cấp thêm từ Tenant Admin
          </button>
          <button
            onClick={() => setActiveTab('thresholds')}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
              activeTab === 'thresholds'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            Cấu hình ngưỡng cảnh báo
          </button>
        </div>

        {submitted ? (
          <div className="p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h4 className="font-bold text-slate-900">Đã gửi yêu cầu tới Tenant Admin</h4>
            <p className="text-xs text-slate-500">
              Yêu cầu cấp thêm +{requestGB} GB đã được chuyển tới Quản trị viên cấp cao.
            </p>
          </div>
        ) : activeTab === 'request_tenant' ? (
          <form onSubmit={handleSubmitRequest} className="p-5 space-y-4">
            {/* Status card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-2 text-xs">
              <div className="flex justify-between text-slate-600">
                <span>Hạn mức phòng hiện tại:</span>
                <span className="font-bold text-slate-900 font-mono">{department.totalAllocatedGB} GB</span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Đã sử dụng:</span>
                <span className="font-bold text-blue-600 font-mono">
                  {department.usedSpaceGB} GB ({Math.round((department.usedSpaceGB / department.totalAllocatedGB) * 100)}%)
                </span>
              </div>
              <div className="flex justify-between text-slate-600">
                <span>Hạn mức khả dụng chung công ty:</span>
                <span className="font-bold text-emerald-600 font-mono">~{department.tenantPoolLimitGB - department.totalAllocatedGB} GB</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <label className="font-semibold text-slate-700">Dung lượng xin cấp bổ sung:</label>
                <span className="font-bold text-blue-600 font-mono text-sm">+{requestGB} GB</span>
              </div>
              <input
                type="range"
                min={20}
                max={200}
                step={10}
                value={requestGB}
                onChange={(e) => setRequestGB(Number(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>+20 GB</span>
                <span>+100 GB</span>
                <span>+200 GB</span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lý do đề xuất tăng dung lượng *
              </label>
              <textarea
                rows={3}
                required
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                placeholder="VD: Phòng mở rộng thêm 4 nhân sự dự án AI, cần thêm dung lượng lưu trữ datasets và checkpoints..."
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Huỷ
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
              >
                <span>Gửi yêu cầu tới Tenant</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        ) : (
          <div className="p-5 space-y-4">
            <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-amber-900">
              <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <strong className="block font-semibold">Cơ chế cảnh báo tự động</strong>
                <span>Hệ thống sẽ gửi email cho Department Admin và nhân viên khi dung lượng vượt ngưỡng.</span>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Ngưỡng cảnh báo sớm (Warning):</span>
                  <span className="font-bold text-amber-600 font-mono">{warningThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={60}
                  max={90}
                  step={5}
                  value={warningThreshold}
                  onChange={(e) => setWarningThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-700">Ngưỡng báo động nguy cấp (Critical):</span>
                  <span className="font-bold text-rose-600 font-mono">{criticalThreshold}%</span>
                </div>
                <input
                  type="range"
                  min={85}
                  max={99}
                  step={1}
                  value={criticalThreshold}
                  onChange={(e) => setCriticalThreshold(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={() => {
                  onUpdateCeiling(warningThreshold);
                  onClose();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition-colors cursor-pointer"
              >
                Lưu cấu hình
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
