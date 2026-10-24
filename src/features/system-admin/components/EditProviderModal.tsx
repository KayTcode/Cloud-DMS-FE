import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Upload, 
  FileCode, 
  Key,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { StorageProviderItem } from '../types';
import { 
  testStorageProviderConnectionApi, 
  updateStorageProviderApi 
} from '../api/systemAdminCommands';

interface EditProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  provider: StorageProviderItem | null;
}

export const EditProviderModal: React.FC<EditProviderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  provider,
}) => {
  const [name, setName] = useState('');
  const [configJson, setConfigJson] = useState('');
  const [isTesting, setIsTesting] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    totalGB?: number;
    usedGB?: number;
    availableGB?: number;
    latencyMs?: number;
  } | null>(null);

  useEffect(() => {
    if (provider) {
      setName(provider.name);
      setConfigJson('');
      setTestResult(null);
    }
  }, [provider, isOpen]);

  if (!isOpen || !provider) return null;

  // Map provider.type string (e.g., 'GoogleDrive', 'OneDrive') to numeric type
  const getNumericType = (): number => {
    const t = provider.type?.toLowerCase() || '';
    if (t.includes('google')) return 1;
    if (t.includes('onedrive')) return 2;
    if (t.includes('s3')) return 3;
    return 0;
  };

  const providerTypeNum = getNumericType();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setConfigJson(content);
        setTestResult(null);
      };
      reader.readAsText(file);
    }
  };

  const handleTest = async () => {
    const trimmed = configJson.trim();
    if (!trimmed) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập chuỗi JSON cấu hình hoặc tải lên file credential trước khi kiểm tra.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testStorageProviderConnectionApi({
        type: providerTypeNum,
        configJson: trimmed,
      });

      const totalGB = res.totalCapacityBytes ? Math.round(res.totalCapacityBytes / (1024 * 1024 * 1024)) : 0;
      const usedGB = res.usedCapacityBytes ? Math.round(res.usedCapacityBytes / (1024 * 1024 * 1024)) : 0;
      const availableGB = res.availableCapacityBytes ? Math.round(res.availableCapacityBytes / (1024 * 1024 * 1024)) : 0;

      setTestResult({
        success: res.success,
        message: res.message,
        totalGB,
        usedGB,
        availableGB,
        latencyMs: res.latencyMs || 25,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.message || err.message || 'Kiểm tra kết nối thất bại.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = configJson.trim();
    if (!trimmed) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập cấu hình credentials mới (chứa Refresh Token hoặc Service Account JSON).',
      });
      return;
    }

    setIsSaving(true);
    try {
      await updateStorageProviderApi(provider.id, {
        name: name.trim() || provider.name,
        configJson: trimmed,
      });
      onSuccess(`Đã cập nhật cấu hình cho ${name || provider.name} thành công!`);
      onClose();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.message || err.message || 'Lỗi khi cập nhật cấu hình Provider.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-blue-100/70 text-blue-600">
              <Key className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Cập Nhật Cấu Hình Kho Lưu Trữ
              </h3>
              <p className="text-xs text-slate-500">
                Làm mới Token hoặc cập nhật Credentials cho <span className="font-semibold text-slate-700">{provider.name}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Info Banner */}
          <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl flex items-start gap-2.5 text-xs text-blue-700">
            <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <span>
              <strong>Lưu ý an toàn:</strong> Cập nhật token tại đây sẽ <strong>giữ nguyên ID</strong> của Provider. Toàn bộ file cũ và các Tenant đang sử dụng sẽ không bị mất liên kết.
            </span>
          </div>

          {/* Provider Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên kho lưu trữ
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent font-medium"
              placeholder="VD: Google Drive Primary"
              required
            />
          </div>

          {/* Credentials JSON */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">
                Credentials JSON mới (Chứa Refresh Token hoặc Service Account)
              </label>
              <label className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer border border-blue-200/60 transition-colors">
                <Upload className="w-3.5 h-3.5" />
                <span>Tải file JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </label>
            </div>

            <div className="relative">
              <textarea
                value={configJson}
                onChange={(e) => {
                  setConfigJson(e.target.value);
                  setTestResult(null);
                }}
                rows={7}
                placeholder={`{\n  "client_id": "xxx.apps.googleusercontent.com",\n  "client_secret": "GOCSPX-xxx",\n  "refresh_token": "1//04..."\n}`}
                className="w-full p-3 font-mono text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-slate-50/50"
                required
              />
              <FileCode className="w-4 h-4 text-slate-400 absolute right-3 bottom-4 pointer-events-none" />
            </div>
            <p className="text-[11px] text-slate-400">
              * Dán JSON chứa <code>refresh_token</code> mới lấy từ Google OAuth Playground hoặc toàn bộ nội dung file Service Account JSON.
            </p>
          </div>

          {/* Test Connection Button & Result */}
          <div className="pt-1 space-y-3">
            <button
              type="button"
              onClick={handleTest}
              disabled={isTesting || !configJson.trim()}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Đang kết nối thử đến Google Drive...</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Kiểm tra kết nối trước khi lưu</span>
                </>
              )}
            </button>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 animate-in fade-in duration-200 ${
                  testResult.success
                    ? 'bg-emerald-50/80 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50/80 border-rose-200 text-rose-800'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-1">
                  <p className="font-semibold">{testResult.message}</p>
                  {testResult.success && testResult.totalGB !== undefined && (
                    <div className="flex flex-wrap gap-x-4 text-[11px] text-emerald-700 font-mono pt-1">
                      <span>Tổng: <strong>{testResult.totalGB} GB</strong></span>
                      <span>Đã dùng: <strong>{testResult.usedGB} GB</strong></span>
                      <span>Khả dụng: <strong>{testResult.availableGB} GB</strong></span>
                      <span>Độ trễ: <strong>{testResult.latencyMs}ms</strong></span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Modal Footer */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 font-medium text-xs rounded-xl transition-colors cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSaving || !configJson.trim()}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Lưu Cập Nhật</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
