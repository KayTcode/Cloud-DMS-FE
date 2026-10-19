import React, { useState, useEffect } from 'react';
import { X, HardDrive, Sliders } from 'lucide-react';
import { DepartmentQuota } from '../types';

interface AdjustQuotaModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotas: DepartmentQuota[];
  selectedDeptQuota: DepartmentQuota | null;
  onSaveQuota: (deptId: string, newQuotaGB: number) => void;
}

export const AdjustQuotaModal: React.FC<AdjustQuotaModalProps> = ({
  isOpen,
  onClose,
  quotas,
  selectedDeptQuota,
  onSaveQuota,
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState(
    selectedDeptQuota ? selectedDeptQuota.id : quotas[0]?.id || ''
  );
  const [newQuota, setNewQuota] = useState<number>(350);

  useEffect(() => {
    if (selectedDeptQuota) {
      setSelectedDeptId(selectedDeptQuota.id);
      setNewQuota(selectedDeptQuota.allocatedQuotaGB);
    } else if (quotas.length > 0) {
      const target = quotas.find((q) => q.id === selectedDeptId) || quotas[0];
      if (target) {
        setNewQuota(target.allocatedQuotaGB);
      }
    }
  }, [selectedDeptQuota, isOpen, quotas, selectedDeptId]);

  if (!isOpen) return null;

  const currentDept = quotas.find((q) => q.id === selectedDeptId) || quotas[0];

  const handleDeptChange = (id: string) => {
    setSelectedDeptId(id);
    const dept = quotas.find((q) => q.id === id);
    if (dept) {
      setNewQuota(dept.allocatedQuotaGB);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentDept) {
      onSaveQuota(currentDept.id, newQuota);
    }
    onClose();
  };

  const calcNewAvailable = currentDept ? newQuota - currentDept.usedSpaceGB : 0;
  const calcNewUsageRate = currentDept ? Math.round((currentDept.usedSpaceGB / newQuota) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <Sliders className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Điều chỉnh hạn mức lưu trữ</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Chọn phòng ban
            </label>
            <select
              value={selectedDeptId}
              onChange={(e) => handleDeptChange(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500"
            >
              {quotas.map((q) => (
                <option key={q.id} value={q.id}>
                  {q.departmentName} (Hiện tại: {q.allocatedQuotaGB} GB · Đang dùng: {q.usedSpaceGB} GB)
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Hạn mức cấp phát mới (GB)
              </label>
              <span className="text-sm font-bold text-blue-600">{newQuota} GB</span>
            </div>
            <input
              type="range"
              min={Math.max(currentDept?.usedSpaceGB || 20, 20)}
              max={1000}
              step={10}
              value={newQuota}
              onChange={(e) => setNewQuota(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[11px] text-slate-400 mt-1">
              <span>Đã dùng: {currentDept?.usedSpaceGB} GB</span>
              <span>Khuyến nghị: 500 GB</span>
              <span>Tối đa: 1,000 GB</span>
            </div>
          </div>

          {/* Simulation overview */}
          <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-500">Dung lượng khả dụng dự kiến:</span>
              <strong className="text-slate-800 font-mono">{calcNewAvailable} GB</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Tỷ lệ chiếm dụng mới:</span>
              <strong className={`font-mono ${calcNewUsageRate > 85 ? 'text-rose-600' : 'text-emerald-600'}`}>
                {calcNewUsageRate}%
              </strong>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              Lưu thay đổi
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
