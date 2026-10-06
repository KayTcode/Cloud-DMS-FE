import React, { useState, useEffect } from 'react';
import { 
  X, 
  Cloud, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  HardDrive, 
  FolderPlus, 
  ShieldCheck,
  Upload,
  FileCode,
  LogIn
} from 'lucide-react';
import { 
  testStorageProviderConnectionApi, 
  connectStorageProviderApi, 
  exchangeOneDriveCodeApi 
} from '../api/systemAdminCommands';

interface ConnectProviderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
}

export const ConnectProviderModal: React.FC<ConnectProviderModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [providerType, setProviderType] = useState<1 | 2>(1); // 1 = GoogleDrive, 2 = OneDrive
  const [name, setName] = useState('Google Drive Primary');
  
  // Google Drive state
  const [googleJson, setGoogleJson] = useState('');
  
  // OneDrive state
  const [oneDriveInputMode, setOneDriveInputMode] = useState<'form' | 'json'>('form');
  const [oneDriveJson, setOneDriveJson] = useState('');
  const [msClientId, setMsClientId] = useState('ab0480c3-e7aa-4c38-9b84-0591470ead08');
  const [msTenantId, setMsTenantId] = useState('common');
  const [msClientSecret, setMsClientSecret] = useState('');
  const [msRefreshToken, setMsRefreshToken] = useState('');
  const [msUserEmail, setMsUserEmail] = useState('');
  const [isExchangingCode, setIsExchangingCode] = useState(false);

  // Status state
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

  // Lắng nghe sự kiện đăng nhập từ popup Microsoft
  useEffect(() => {
    if (!isOpen) return;

    const handleAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type === 'ONEDRIVE_AUTH_CODE' && event.data.code) {
        const code = event.data.code;
        const redirectUri = window.location.origin + '/oauth/onedrive/callback';

        let effectiveClientId = msClientId.trim();
        let effectiveClientSecret = msClientSecret.trim();

        if ((!effectiveClientId || !effectiveClientSecret) && oneDriveJson.trim()) {
          try {
            const parsed = JSON.parse(oneDriveJson);
            effectiveClientId = effectiveClientId || parsed.client_id || parsed.clientId || '';
            effectiveClientSecret = effectiveClientSecret || parsed.client_secret || parsed.clientSecret || '';
          } catch {
            // ignore
          }
        }

        setIsExchangingCode(true);
        setIsTesting(true);
        setTestResult(null);

        try {
          const res = await exchangeOneDriveCodeApi({
            clientId: effectiveClientId,
            clientSecret: effectiveClientSecret,
            code,
            redirectUri,
          });

          if (res.success) {
            if (res.refreshToken) setMsRefreshToken(res.refreshToken);
            if (res.configJson) setOneDriveJson(res.configJson);
            setMsTenantId('common');
            if (name === 'Google Drive Primary' || !name.trim()) {
              setName('Microsoft OneDrive');
            }

            const totalGB = res.totalCapacityBytes ? Math.round(res.totalCapacityBytes / (1024 * 1024 * 1024)) : 0;
            const usedGB = res.usedCapacityBytes ? Math.round(res.usedCapacityBytes / (1024 * 1024 * 1024)) : 0;
            const availableGB = res.availableCapacityBytes ? Math.round(res.availableCapacityBytes / (1024 * 1024 * 1024)) : 0;

            setTestResult({
              success: true,
              message: 'Đăng nhập Microsoft thành công! Đã tự động kết nối và lấy hạn mức OneDrive.',
              totalGB,
              usedGB,
              availableGB,
              latencyMs: res.latencyMs || 45,
            });
          } else {
            setTestResult({
              success: false,
              message: res.message || 'Lỗi khi xác thực mã với Microsoft.',
            });
          }
        } catch (err: any) {
          setTestResult({
            success: false,
            message: err?.response?.data?.message || err?.message || 'Lỗi khi gửi mã xác thực lên máy chủ.',
          });
        } finally {
          setIsExchangingCode(false);
          setIsTesting(false);
        }
      } else if (event.data?.type === 'ONEDRIVE_AUTH_ERROR') {
        setTestResult({
          success: false,
          message: `Đăng nhập Microsoft thất bại: ${event.data.error || 'Bị từ chối'}`,
        });
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [isOpen, msClientId, msClientSecret, oneDriveJson, name]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        if (providerType === 1) {
          setGoogleJson(content);
        } else {
          setOneDriveJson(content);
        }
        setTestResult(null);
      };
      reader.readAsText(file);
    }
  };

  const getEffectiveConfigJson = (): string => {
    if (providerType === 1) {
      return googleJson.trim();
    } else {
      if (oneDriveInputMode === 'json') {
        return oneDriveJson.trim();
      }

      // Với tài khoản có Refresh Token cá nhân (MSA token), tenant_id luôn bắt buộc là 'common'
      const isMsa = msRefreshToken.startsWith('M.') || msRefreshToken.includes('MsaArtifacts');
      const tenantToUse = isMsa ? 'common' : (msTenantId.trim() || 'common');

      return JSON.stringify({
        client_id: msClientId.trim(),
        client_secret: msClientSecret.trim(),
        refresh_token: msRefreshToken.trim() || undefined,
        tenant_id: tenantToUse,
        userEmail: msUserEmail.trim() || undefined,
      }, null, 2);
    }
  };

  const handleMicrosoftLogin = () => {
    let effectiveClientId = msClientId.trim();
    let effectiveClientSecret = msClientSecret.trim();

    if ((!effectiveClientId || !effectiveClientSecret) && oneDriveJson.trim()) {
      try {
        const parsed = JSON.parse(oneDriveJson);
        effectiveClientId = effectiveClientId || parsed.client_id || parsed.clientId || '';
        effectiveClientSecret = effectiveClientSecret || parsed.client_secret || parsed.clientSecret || '';
      } catch {
        // ignore
      }
    }

    if (!effectiveClientId) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập Application (Client) ID trước khi bấm Đăng nhập Microsoft.',
      });
      return;
    }

    if (!effectiveClientSecret) {
      setTestResult({
        success: false,
        message: 'Vui lòng nhập Client Secret (tạo trong Azure Entra ID > Certificates & secrets) trước khi bấm Đăng nhập Microsoft.',
      });
      return;
    }

    const redirectUri = window.location.origin + '/oauth/onedrive/callback';
    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${encodeURIComponent(
      effectiveClientId
    )}&response_type=code&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_mode=query&scope=${encodeURIComponent(
      'offline_access Files.ReadWrite User.Read'
    )}&prompt=consent`;

    const width = 600;
    const height = 700;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    window.open(
      authUrl,
      'MicrosoftOneDriveAuth',
      `width=${width},height=${height},left=${left},top=${top},status=no,resizable=yes`
    );
  };

  const handleTestConnection = async () => {
    const configJson = getEffectiveConfigJson();
    if (!configJson || 
        (providerType === 1 && !googleJson.trim()) || 
        (providerType === 2 && oneDriveInputMode === 'json' && !oneDriveJson.trim()) ||
        (providerType === 2 && oneDriveInputMode === 'form' && (!msClientId.trim() || !msClientSecret.trim()))) {
      setTestResult({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ thông tin xác thực hoặc dán chuỗi JSON hợp lệ.',
      });
      return;
    }

    if (providerType === 2 && oneDriveInputMode === 'form' && !msRefreshToken.trim() && !msUserEmail.trim()) {
      setTestResult({
        success: false,
        message: 'Bạn chưa có Refresh Token. Đối với tài khoản cá nhân, vui lòng bấm nút màu xanh "Đăng nhập Microsoft" ở khung phía trên để hệ thống tự động cấp quyền và đo dung lượng.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const res = await testStorageProviderConnectionApi({
        type: providerType,
        configJson,
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
        latencyMs: res.latencyMs || 45,
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
    const configJson = getEffectiveConfigJson();
    if (!configJson) return;

    setIsSaving(true);
    try {
      await connectStorageProviderApi({
        name,
        type: providerType,
        configJson,
      });
      onSuccess(`Đã kết nối thành công kho lưu trữ ${name}!`);
      onClose();
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.response?.data?.message || err.message || 'Lỗi khi lưu kết nối Cloud Provider.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Kết Nối Cloud Storage Provider
              </h3>
              <p className="text-xs text-slate-500">
                Tích hợp Google Drive hoặc Microsoft OneDrive vào hệ thống Cloud Pool
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSave} className="p-6 space-y-5">
          {/* Provider Selection Tabs */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              1. Chọn Nhà Cung Cấp Đám Mây
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => {
                  setProviderType(1);
                  setName('Google Drive Primary');
                  setTestResult(null);
                }}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  providerType === 1
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-2xs">
                  <HardDrive className={`w-5 h-5 ${providerType === 1 ? 'text-blue-600' : 'text-slate-500'}`} />
                </div>
                <div>
                  <div className="text-sm font-bold">Google Drive</div>
                  <div className="text-[11px] text-slate-500">Service Account / OAuth2</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setProviderType(2);
                  setName('OneDrive Enterprise');
                  setTestResult(null);
                }}
                className={`flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all cursor-pointer ${
                  providerType === 2
                    ? 'border-blue-600 bg-blue-50/50 text-blue-900 shadow-xs'
                    : 'border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center border border-slate-100 shadow-2xs">
                  <Cloud className={`w-5 h-5 ${providerType === 2 ? 'text-blue-600' : 'text-slate-500'}`} />
                </div>
                <div>
                  <div className="text-sm font-bold">Microsoft OneDrive</div>
                  <div className="text-[11px] text-slate-500">Microsoft Graph API</div>
                </div>
              </button>
            </div>
          </div>

          {/* Provider Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tên gợi nhớ của Kho lưu trữ
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Google Drive - Pool Khoa CNTT"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
            />
          </div>

          {/* Type-Specific Configuration */}
          {providerType === 1 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Credentials JSON (Google Cloud Console)
                </label>
                <label className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Tải lên file JSON</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
              <textarea
                rows={5}
                required
                value={googleJson}
                onChange={(e) => {
                  setGoogleJson(e.target.value);
                  setTestResult(null);
                }}
                placeholder='Dán nội dung file credentials.json hoặc OAuth2 JSON tại đây...'
                className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
              />
              <p className="text-[11px] text-slate-400">
                Tip: Hệ thống sẽ tự động khởi tạo thư mục gốc <code className="text-slate-600">/CloudDMS_Root</code> và mã hóa an toàn bằng AES-256.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* 1-Click Connect with Microsoft Box */}
              <div className="p-3.5 bg-gradient-to-r from-blue-50/90 via-indigo-50/50 to-sky-50 border border-blue-200/80 rounded-xl shadow-xs">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900">Đăng nhập 1-Click với Microsoft</span>
                      <span className="text-[10px] bg-blue-600 text-white font-semibold px-2 py-0.5 rounded-full">Khuyên Dùng</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-tight">
                      Mở cửa sổ ủy quyền để tự động nhận Refresh Token và đo dung lượng OneDrive cá nhân.
                    </p>
                    <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px] text-slate-500">
                      <span className="font-medium text-slate-600">Redirect URI cần thêm vào Azure:</span>
                      <code className="bg-white px-2 py-0.5 rounded-md border border-blue-200 text-blue-700 font-mono text-[11px] font-semibold select-all">
                        {typeof window !== 'undefined' ? `${window.location.origin}/oauth/onedrive/callback` : 'http://localhost:3000/oauth/onedrive/callback'}
                      </code>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleMicrosoftLogin}
                    disabled={isExchangingCode || isTesting}
                    className="inline-flex items-center gap-2 px-3.5 py-2 bg-[#0078d4] hover:bg-[#006cbd] active:bg-[#005a9e] text-white rounded-lg text-xs font-semibold shadow-sm transition-all disabled:opacity-50 shrink-0 cursor-pointer mt-0.5"
                  >
                    {isExchangingCode ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <svg className="w-3.5 h-3.5" viewBox="0 0 21 21">
                        <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
                        <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
                        <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
                        <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
                      </svg>
                    )}
                    <span>{isExchangingCode ? 'Đang xác thực...' : 'Đăng nhập Microsoft'}</span>
                  </button>
                </div>
              </div>

              {/* Chế độ nhập liệu OneDrive: Form hoặc JSON */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setOneDriveInputMode('form')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      oneDriveInputMode === 'form'
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Nhập từng trường
                  </button>
                  <button
                    type="button"
                    onClick={() => setOneDriveInputMode('json')}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-colors ${
                      oneDriveInputMode === 'json'
                        ? 'bg-blue-100 text-blue-800'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    Dán JSON cấu hình
                  </button>
                </div>

                {oneDriveInputMode === 'json' && (
                  <label className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Tải file JSON</span>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </label>
                )}
              </div>

              {oneDriveInputMode === 'json' ? (
                <div>
                  <textarea
                    rows={6}
                    required
                    value={oneDriveJson}
                    onChange={(e) => {
                      setOneDriveJson(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder={`{\n  "client_id": "...",\n  "client_secret": "...",\n  "refresh_token": "...",\n  "tenant_id": "common"\n}`}
                    className="w-full font-mono text-xs p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Tip: Dán JSON chứa các trường <code className="text-slate-600">client_id</code>, <code className="text-slate-600">client_secret</code>, <code className="text-slate-600">refresh_token</code> (tùy chọn <code className="text-slate-600">tenant_id</code>).
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="col-span-1">
                    <label className="block font-semibold text-slate-700 mb-1">Application (Client) ID *</label>
                    <input
                      type="text"
                      required
                      value={msClientId}
                      onChange={(e) => setMsClientId(e.target.value)}
                      placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block font-semibold text-slate-700 mb-1">Directory (Tenant) ID</label>
                    <input
                      type="text"
                      value={msTenantId}
                      onChange={(e) => setMsTenantId(e.target.value)}
                      placeholder="common (mặc định) hoặc tenant GUID"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">Client Secret *</label>
                    <input
                      type="password"
                      required
                      value={msClientSecret}
                      onChange={(e) => setMsClientSecret(e.target.value)}
                      placeholder="Khóa bí mật client secret từ Azure Entra ID"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div className="col-span-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="block font-semibold text-slate-700">Refresh Token (Khuyên Dùng Cho Tài Khoản Cá Nhân/OAuth2)</label>
                      <span className="text-[10px] text-emerald-600 font-medium bg-emerald-50 px-1.5 py-0.5 rounded">Tự động nhận diện OneDrive</span>
                    </div>
                    <input
                      type="text"
                      value={msRefreshToken}
                      onChange={(e) => setMsRefreshToken(e.target.value)}
                      placeholder="Dán refresh_token từ OAuth2 consent tại đây (nếu có)..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block font-semibold text-slate-700 mb-1">User Principal Name (Tùy chọn - chỉ dùng khi không có Refresh Token)</label>
                    <input
                      type="email"
                      value={msUserEmail}
                      onChange={(e) => setMsUserEmail(e.target.value)}
                      placeholder="admin@yourtenant.onmicrosoft.com"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Test Connection Banner */}
          {testResult && (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="text-xs space-y-1">
                <div className="font-bold">{testResult.message}</div>
                {testResult.success && (
                  <div className="text-emerald-700 space-x-3">
                    <span>Tổng dung lượng: <strong>{testResult.totalGB} GB</strong></span>
                    <span>•</span>
                    <span>Đã dùng: <strong>{testResult.usedGB} GB</strong></span>
                    <span>•</span>
                    <span>Khả dụng: <strong>{testResult.availableGB} GB</strong></span>
                    <span>•</span>
                    <span>Độ trễ: <strong>{testResult.latencyMs}ms</strong></span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={isTesting || isSaving}
              className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              {isTesting ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              )}
              <span>{isTesting ? 'Đang kiểm tra...' : 'Kiểm tra kết nối'}</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="submit"
                disabled={isSaving || isTesting}
                className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FolderPlus className="w-4 h-4" />}
                <span>{isSaving ? 'Đang lưu...' : 'Lưu & Kích Hoạt'}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
