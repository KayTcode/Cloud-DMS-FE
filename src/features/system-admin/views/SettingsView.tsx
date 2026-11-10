import React, { useState } from 'react';
import { Shield, Database, Save, Check } from 'lucide-react';

interface SettingsViewProps {
  onAddToast?: (type: 'success' | 'warning' | 'info' | 'error', message: string) => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ onAddToast }) => {
  const [enforce2FA, setEnforce2FA] = useState(true);
  const [autoBackup, setAutoBackup] = useState(true);
  const [retentionDays, setRetentionDays] = useState(90);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    if (onAddToast) {
      onAddToast('success', 'Đã lưu cấu hình tham số hệ thống thành công!');
    }
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-150">
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
          Cài Đặt & Tham Số Hệ Thống
        </h2>
        <p className="text-xs text-slate-500 mt-1">
          Thiết lập chính sách an ninh đăng nhập, bảo vệ dữ liệu và các quy chuẩn lưu trữ toàn cục
        </p>
      </div>

      <div className="p-6 bg-white border border-slate-200/80 rounded-2xl shadow-2xs space-y-6">
        {/* Chính sách An ninh & Xác thực */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            <span>Tiêu Chuẩn An Toàn & Xác Thực (2FA)</span>
          </h3>
          <div className="mt-3 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={enforce2FA}
                onChange={(e) => setEnforce2FA(e.target.checked)}
                className="mt-1 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Bắt buộc Xác thực Hai yếu tố (2FA / MFA)
                </span>
                <span className="text-xs text-slate-500">
                  Yêu cầu mã TOTP Authenticator hoặc khóa bảo mật phần cứng cho toàn bộ Quản trị viên Doanh nghiệp
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="border-t border-slate-100" />

        {/* Chính sách Sao lưu & Lưu trữ lạnh */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Database className="w-4 h-4 text-amber-600" />
            <span>Chính Sách Sao Lưu & Lưu Trữ Dài Hạn</span>
          </h3>
          <div className="mt-3 space-y-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={autoBackup}
                onChange={(e) => setAutoBackup(e.target.checked)}
                className="mt-1 rounded-sm border-slate-300 text-blue-600 focus:ring-blue-500/20 cursor-pointer"
              />
              <div>
                <span className="text-xs font-semibold text-slate-800 block">
                  Tự động chụp bản sao lưu định kỳ hàng ngày (Daily Snapshots)
                </span>
                <span className="text-xs text-slate-500">
                  Mã hóa và nhân bản trạng thái CSDL sang kho lưu trữ đám mây thứ cấp để phòng chống sự cố
                </span>
              </div>
            </label>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Thời hạn lưu trữ Nhật ký Kiểm toán (Số ngày)
              </label>
              <input
                type="number"
                value={retentionDays}
                onChange={(e) => setRetentionDays(Number(e.target.value))}
                className="w-48 px-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white font-mono"
              />
            </div>
          </div>
        </div>

        {/* Footer Save Button */}
        <div className="border-t border-slate-100 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <span className="text-[11px] text-slate-400">
            Phiên bản hiện tại: CloudDMS-Core v4.8.2-prod (Đồng bộ Clean Architecture)
          </span>
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-full shadow-xs transition-colors cursor-pointer self-end sm:self-auto"
          >
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            <span>{saved ? 'Đã lưu cấu hình' : 'Lưu thay đổi'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
