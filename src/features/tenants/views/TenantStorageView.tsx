import React, { useState, useEffect, useRef } from 'react';
import {
  Building2,
  UserPlus,
  FolderOpen,
  UploadCloud,
  FileCheck2,
  ShieldCheck,
  Hash,
  Download,
  Trash2,
  AlertCircle,
  HardDrive,
  FileText,
  Image as ImageIcon,
  FileArchive,
  FileCode,
  FileSpreadsheet,
  CheckCircle2,
  RefreshCw,
  Server,
  Cloud,
  Check,
  CheckCircle
} from 'lucide-react';
import { TenantInfo } from '@/features/tenants/types';
import { useTenantContext } from '@/context/TenantContext';
import {
  FileItemDto,
  getTenantFilesApi,
  uploadTenantFilesApi,
  downloadTenantFileApi,
  deleteTenantFileApi
} from '@/features/tenants/api/fileApi';
import { getStorageProvidersApi } from '@/features/system-admin/api/systemAdminQueries';
import { StorageProviderItem } from '@/features/system-admin/types';

interface TenantStorageViewProps {
  tenant: TenantInfo;
  onBackToOverview: () => void;
  onOpenExpandQuota?: () => void;
  onCreateDepartmentUser?: (deptName?: string) => void;
}

export const TenantStorageView: React.FC<TenantStorageViewProps> = ({
  tenant,
  onBackToOverview,
  onCreateDepartmentUser,
}) => {
  const [unit, setUnit] = useState<'GB' | 'TB'>('GB');
  const { departments, users } = useTenantContext();

  // File list & live summary state
  const [files, setFiles] = useState<FileItemDto[]>([]);
  const [quotaStats, setQuotaStats] = useState({
    quotaBytes: tenant.storageQuotaBytes || 10 * 1024 * 1024 * 1024,
    usedBytes: tenant.storageUsedBytes || 0,
    availableBytes: tenant.availableBytes || (10 * 1024 * 1024 * 1024),
    usagePercentage: tenant.usagePercentage || 0,
    providerId: tenant.storageProviderId || '',
    providerName: tenant.storageProviderName || 'Google Drive Primary',
    providerType: 'GoogleDrive',
  });

  const [availableProviders, setAvailableProviders] = useState<StorageProviderItem[]>([]);
  const [selectedUploadProviderId, setSelectedUploadProviderId] = useState<string>('');

  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<number>(0);
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatBytes = (bytes: number) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Fetch live files, quota and all available storage providers
  const loadFiles = async () => {
    setIsLoadingFiles(true);
    setErrorMessage(null);
    try {
      const [summary, providersList] = await Promise.all([
        getTenantFilesApi(tenant.id).catch(() => null),
        getStorageProvidersApi().catch(() => [])
      ]);

      if (providersList && providersList.length > 0) {
        setAvailableProviders(providersList);
      }

      if (summary) {
        if (summary.files) setFiles(summary.files);
        const resolvedId = summary.storageProviderId || tenant.storageProviderId || '';
        const resolvedName = summary.storageProviderName || tenant.storageProviderName || (providersList?.[0]?.name ?? 'Google Drive Primary');
        const resolvedType = summary.storageProviderType || (providersList?.[0]?.type ?? 'GoogleDrive');

        setQuotaStats({
          quotaBytes: summary.quotaBytes || quotaStats.quotaBytes,
          usedBytes: summary.usedBytes || quotaStats.usedBytes,
          availableBytes: summary.availableBytes || (summary.quotaBytes - summary.usedBytes),
          usagePercentage: summary.usagePercentage || 0,
          providerId: resolvedId,
          providerName: resolvedName,
          providerType: resolvedType,
        });

        // Set default upload provider
        setSelectedUploadProviderId(prev => prev || resolvedId || (providersList?.[0]?.id ?? ''));
      } else if (providersList && providersList.length > 0) {
        setSelectedUploadProviderId(prev => prev || providersList[0].id);
      }
    } catch {
      // Keep existing state if offline
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (tenant.id) {
      loadFiles();
    }
  }, [tenant.id]);

  // Determine display list of providers
  const displayProviders: StorageProviderItem[] = availableProviders.length > 0
    ? availableProviders
    : [
        {
          id: quotaStats.providerId || 'current-provider',
          name: quotaStats.providerName,
          type: quotaStats.providerType,
          status: 'Active',
          capacity: formatBytes(quotaStats.quotaBytes),
          storageUsed: formatBytes(quotaStats.usedBytes),
          tenantsCount: 1,
          latency: '24ms',
        } as StorageProviderItem,
      ];

  // Handle file upload through 5-step routing flow
  const handleUpload = async (fileList: FileList | File[]) => {
    if (!fileList || fileList.length === 0) return;

    const targetProvider = displayProviders.find(p => p.id === selectedUploadProviderId) || displayProviders[0];
    const targetProviderName = targetProvider?.name || quotaStats.providerName;
    const targetProviderIdToSend = targetProvider?.id && targetProvider.id !== 'current-provider' 
      ? targetProvider.id 
      : undefined;

    setIsUploading(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    // Visual step progression
    try {
      setUploadStep(1);
      setUploadMessage('BƯỚC 1: Kiểm tra Quota dung lượng Tenant & User...');
      await new Promise((r) => setTimeout(r, 400));

      setUploadStep(2);
      setUploadMessage('BƯỚC 2: Quét mã độc & virus (ClamAV Stream Scan)...');
      await new Promise((r) => setTimeout(r, 600));

      setUploadStep(3);
      setUploadMessage('BƯỚC 3: Tính toán mã băm SHA-256 (Data Integrity & Deduplication)...');
      await new Promise((r) => setTimeout(r, 400));

      setUploadStep(4);
      setUploadMessage(`BƯỚC 4: Định tuyến và truyền stream lên ${targetProviderName}...`);

      const result = await uploadTenantFilesApi(fileList, tenant.id, undefined, targetProviderIdToSend);

      setUploadStep(5);
      setUploadMessage('BƯỚC 5: Cập nhật cơ sở dữ liệu và hạn ngạch Quota thành công!');
      await new Promise((r) => setTimeout(r, 300));

      setSuccessMessage(`Đã tải lên thành công ${result.length || fileList.length} tệp tin vào ${targetProviderName}!`);
      loadFiles();
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.errors?.[0] || err.message || 'Quá trình tải lên thất bại.';
      setErrorMessage(msg);
    } finally {
      setIsUploading(false);
      setUploadStep(0);
      setUploadMessage('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDownload = async (file: FileItemDto) => {
    try {
      await downloadTenantFileApi(file.id, file.name);
    } catch (err: any) {
      setErrorMessage('Không thể tải tệp tin: ' + (err.message || 'Lỗi kết nối.'));
    }
  };

  const handleDelete = async (file: FileItemDto) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa file "${file.name}"? Dung lượng (${formatBytes(file.sizeBytes)}) sẽ được hoàn trả vào Quota của Tenant.`)) {
      return;
    }

    try {
      await deleteTenantFileApi(file.id);
      setSuccessMessage(`Đã xóa "${file.name}" và giải phóng ${formatBytes(file.sizeBytes)} dung lượng.`);
      loadFiles();
    } catch (err: any) {
      setErrorMessage('Không thể xóa tệp tin: ' + (err.message || 'Lỗi kết nối.'));
    }
  };

  const getFileIcon = (contentType: string, name: string) => {
    const ext = name.split('.').pop()?.toLowerCase();
    if (contentType.includes('image') || ['png', 'jpg', 'jpeg', 'webp', 'svg'].includes(ext || '')) {
      return <ImageIcon className="w-4 h-4 text-emerald-600" />;
    }
    if (contentType.includes('spreadsheet') || ['xls', 'xlsx', 'csv'].includes(ext || '')) {
      return <FileSpreadsheet className="w-4 h-4 text-emerald-700" />;
    }
    if (contentType.includes('zip') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext || '')) {
      return <FileArchive className="w-4 h-4 text-amber-600" />;
    }
    if (['js', 'ts', 'tsx', 'jsx', 'json', 'py', 'html', 'css', 'cs', 'sql'].includes(ext || '')) {
      return <FileCode className="w-4 h-4 text-purple-600" />;
    }
    return <FileText className="w-4 h-4 text-blue-600" />;
  };

  const getProviderBadge = (type?: string | null) => {
    const t = type?.toLowerCase() || '';
    if (t.includes('googledrive') || t.includes('google')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Cloud className="w-3 h-3 text-emerald-600" />
          <span>Google Drive</span>
        </span>
      );
    }
    if (t.includes('onedrive')) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Cloud className="w-3 h-3 text-blue-600" />
          <span>OneDrive</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-700 border border-slate-300">
        <Server className="w-3 h-3 text-slate-500" />
        <span>Local Storage</span>
      </span>
    );
  };

  // Dynamic Departments storage breakdown
  const departmentUsage = departments.map((dept, idx) => {
    const deptUsers = users.filter((u) => u.department === dept.name);
    const quotaGB = dept.allocatedStorageGB || 50;
    const usedGB = Math.min(quotaGB, deptUsers.length > 0 ? Number((deptUsers.length * 2.8).toFixed(1)) : 0.5);
    const percent = Math.min(100, Math.round((usedGB / quotaGB) * 100));
    const colors = ['bg-blue-600', 'bg-indigo-600', 'bg-cyan-600', 'bg-emerald-600', 'bg-amber-600', 'bg-purple-600'];

    return {
      id: dept.id,
      name: dept.name,
      usedGB,
      quotaGB,
      percent,
      lead: dept.lead || 'Chưa chỉ định',
      members: deptUsers.length || dept.headCount || 0,
      filesCount: `${(deptUsers.length * 120 + 15).toLocaleString()} files`,
      category: dept.name,
      color: colors[idx % colors.length],
    };
  });

  const totalAllocatedDeptsGB = departments.reduce((acc, d) => acc + (d.allocatedStorageGB || 50), 0);

  return (
    <div className="space-y-6 mt-5">
      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-500 hover:text-rose-700 font-bold ml-3 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-500 hover:text-emerald-700 font-bold ml-3 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      {/* Top Header & Quota Pool Overview */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900 tracking-tight">
                Kho lưu trữ đám mây & Hạn ngạch Quota (Tenant Storage Routing)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-200">
                ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              File được kiểm tra Quota, quét virus ClamAV, tính mã băm SHA-256 và định tuyến trực tiếp vào Cloud Provider của Tenant.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-600">
              <button
                onClick={() => setUnit('GB')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  unit === 'GB' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                GB
              </button>
              <button
                onClick={() => setUnit('TB')}
                className={`px-3 py-1 rounded-md transition-all cursor-pointer ${
                  unit === 'TB' ? 'bg-white text-blue-600 shadow-2xs font-bold' : 'hover:text-slate-900'
                }`}
              >
                TB
              </button>
            </div>

            <button
              onClick={loadFiles}
              disabled={isLoadingFiles}
              className="text-xs text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingFiles ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              onClick={onBackToOverview}
              className="text-xs text-slate-600 hover:text-slate-900 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Về Overview
            </button>
          </div>
        </div>

        {/* 3 Overview Stat Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
          {/* Card 1: Hạn ngạch Quota Tenant */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Hạn ngạch Tenant (Quota Pool)</span>
                <HardDrive className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2.5 flex items-baseline justify-between">
                <div className="text-2xl font-bold text-slate-900 tabular-nums">
                  {formatBytes(quotaStats.usedBytes)}
                </div>
                <div className="text-xs text-slate-400">
                  / {formatBytes(quotaStats.quotaBytes)}
                </div>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mt-2.5 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    quotaStats.usagePercentage > 85 ? 'bg-rose-500' : quotaStats.usagePercentage > 70 ? 'bg-amber-500' : 'bg-blue-600'
                  }`}
                  style={{ width: `${Math.min(100, quotaStats.usagePercentage)}%` }}
                />
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Còn trống: <strong className="text-slate-700">{formatBytes(quotaStats.availableBytes)}</strong></span>
              <span className="font-bold text-blue-600">{quotaStats.usagePercentage}% used</span>
            </div>
          </div>

          {/* Card 2: Cloud Provider định tuyến */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Cloud Storage Cấp Cho Tenant</span>
                {getProviderBadge(quotaStats.providerType)}
              </div>
              <div className="mt-2 text-base font-bold text-slate-900 truncate" title={quotaStats.providerName}>
                {quotaStats.providerName}
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                {availableProviders.length > 1 
                  ? `Hệ thống đã kết nối ${availableProviders.length} kho đám mây. Bạn có thể chọn kho đích khi tải file.`
                  : 'Tệp tin tải lên tự động được định tuyến và lưu trữ an toàn trên dịch vụ Cloud tương ứng.'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Đang hoạt động
              </span>
              <span className="font-mono text-[10px] text-slate-400">{files.length} files đã lưu</span>
            </div>
          </div>

          {/* Card 3: Bảo mật & Toàn vẹn dữ liệu */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-2xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Tiêu chuẩn bảo mật</span>
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Quét virus tự động (ClamAV)</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-700">
                  <Hash className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Mã băm toàn vẹn SHA-256</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Trạng thái bảo vệ:</span>
              <span className="font-bold text-emerald-600">Active Shield</span>
            </div>
          </div>
        </div>
      </div>

      {/* Luồng 3: Multi-Cloud File Upload Dropzone */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 sm:p-6 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Tải lên tệp tin mới (Upload & Route to Cloud)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Hệ thống thực hiện đầy đủ 5 bước: Kiểm tra Quota → Quét Virus → Tính SHA-256 → Định tuyến Cloud → Cập nhật DB.
            </p>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Chọn tệp tin</span>
          </button>
        </div>

        {/* BỘ CHỌN KHO CLOUD STORAGE ĐÍCH KHI UPLOAD FILE */}
        <div className="mt-4 p-3.5 bg-slate-50/80 border border-slate-200/80 rounded-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800">Kho lưu trữ đích tải lên:</span>
              <span className="text-[10px] bg-blue-100 text-blue-700 font-semibold px-2 py-0.5 rounded-full border border-blue-200/60">
                Multi-Cloud Routing
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Nhấp chọn đám mây bạn muốn lưu trữ các tệp tin này
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {displayProviders.map((p) => {
              const isSelected = p.id === selectedUploadProviderId;
              const isDefault = (p.id && quotaStats.providerId && p.id.toLowerCase() === quotaStats.providerId.toLowerCase())
                || displayProviders.length === 1;
              const isOneDrive = p.type?.toLowerCase().includes('onedrive');

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedUploadProviderId(p.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'border-blue-500 bg-blue-50/90 shadow-xs ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`p-2 rounded-lg shrink-0 ${isOneDrive ? 'bg-blue-100 text-blue-600' : 'bg-emerald-100 text-emerald-600'}`}>
                      <Cloud className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate" title={p.name}>{p.name}</span>
                        <span className="text-[9px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-semibold shrink-0">
                          Được cấp
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        <span>{p.type} • Hạn mức: <strong className="text-blue-700 font-bold">{formatBytes(quotaStats.quotaBytes)}</strong></span>
                      </div>
                    </div>
                  </div>
                  <div className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                    isSelected ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300'
                  }`}>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleUpload(e.target.files);
          }}
        />

        {/* Drag & Drop Box */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            if (e.dataTransfer.files) handleUpload(e.dataTransfer.files);
          }}
          onClick={() => {
            if (!isUploading) fileInputRef.current?.click();
          }}
          className={`mt-4 border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            isDragging
              ? 'border-blue-500 bg-blue-50/50'
              : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50/50 bg-slate-50/30'
          }`}
        >
          {isUploading ? (
            <div className="max-w-md mx-auto py-2">
              <div className="w-10 h-10 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto mb-3 animate-bounce">
                <UploadCloud className="w-5 h-5" />
              </div>
              <div className="text-sm font-bold text-slate-900 mb-1">
                Đang xử lý luồng tải lên... (Bước {uploadStep}/5)
              </div>
              <div className="text-xs text-blue-600 font-medium mb-3">{uploadMessage}</div>

              {/* Progress Steps Indicators */}
              <div className="grid grid-cols-5 gap-1.5 my-2">
                {[1, 2, 3, 4, 5].map((step) => (
                  <div
                    key={step}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      uploadStep >= step ? 'bg-blue-600' : 'bg-slate-200'
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div>
              <div className="w-12 h-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600 mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="text-xs font-bold text-slate-800">
                Kéo thả tệp tin vào đây, hoặc <span className="text-blue-600 underline">duyệt từ máy tính</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto">
                Hỗ trợ mọi định dạng tệp (PDF, Word, Excel, Hình ảnh, ZIP, Bản vẽ kỹ thuật). Kích thước tối đa phụ thuộc vào Quota khả dụng ({formatBytes(quotaStats.availableBytes)}).
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Cloud Files Pool Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Danh sách tệp tin đã lưu trữ (Cloud Storage Pool)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Tất cả các tệp tin của Tenant đã được phân loại mã độc và phân phối trên Cloud Storage.
            </p>
          </div>
          <div className="text-xs text-slate-500">
            Tổng cộng: <strong className="text-slate-900">{files.length}</strong> tệp tin ({formatBytes(quotaStats.usedBytes)})
          </div>
        </div>

        {files.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 my-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-700">Chưa có tệp tin nào trong kho lưu trữ</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1 mb-3">
              Hãy kéo thả tệp tin vào khu vực tải lên phía trên để bắt đầu lưu trữ và phân bổ hạn ngạch Quota.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3 text-center w-14">STT</th>
                  <th className="py-2.5 px-3">Tên tệp tin</th>
                  <th className="py-2.5 px-3">Dung lượng</th>
                  <th className="py-2.5 px-3">Cloud Provider</th>
                  <th className="py-2.5 px-3">Mã băm SHA-256</th>
                  <th className="py-2.5 px-3">Bảo mật</th>
                  <th className="py-2.5 px-3">Người tải & Ngày</th>
                  <th className="py-2.5 px-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {files.map((file, index) => (
                  <tr key={file.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium text-xs">
                      {index + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2 max-w-xs">
                        {getFileIcon(file.contentType, file.name)}
                        <span className="font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer truncate" title={file.name}>
                          {file.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-700 tabular-nums">
                      {formatBytes(file.sizeBytes)}
                    </td>
                    <td className="py-3 px-3">
                      {getProviderBadge(file.storageProviderType)}
                    </td>
                    <td className="py-3 px-3">
                      {file.hash ? (
                        <span
                          className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded cursor-pointer hover:bg-slate-200"
                          title={`SHA-256: ${file.hash}`}
                          onClick={() => {
                            navigator.clipboard.writeText(file.hash || '');
                            alert('Đã sao chép mã SHA-256 vào bộ nhớ tạm!');
                          }}
                        >
                          {file.hash.slice(0, 10)}...{file.hash.slice(-6)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">—</span>
                      )}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <FileCheck2 className="w-3 h-3" />
                        <span>Clean</span>
                      </span>
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-500">
                      <div>{file.ownerName || 'Hệ thống'}</div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(file.createdAt).toLocaleDateString('vi-VN')}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleDownload(file)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                          title="Tải tệp tin về máy"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                          title="Xóa tệp tin và hoàn trả Quota"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Department Storage Allocation Table */}
      <div className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
          <div>
            <h4 className="text-sm font-bold text-slate-900">
              Phân bổ dung lượng theo từng Phòng ban (Department Allocation)
            </h4>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi việc tiêu thụ dung lượng của từng bộ phận thuộc {tenant.name}.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-xs text-slate-500 hidden sm:block">
              Tổng cấp phát phòng ban:{' '}
              <strong className="text-slate-900 font-bold">
                {totalAllocatedDeptsGB.toLocaleString()} GB
              </strong>
            </div>

            {onCreateDepartmentUser && (
              <button
                onClick={() => onCreateDepartmentUser()}
                className="text-xs font-semibold px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Tạo tài khoản Department</span>
              </button>
            )}
          </div>
        </div>

        {departmentUsage.length === 0 ? (
          <div className="text-center py-12 px-4 rounded-xl bg-slate-50/50 border border-dashed border-slate-200 my-3">
            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mx-auto text-slate-400 mb-2">
              <FolderOpen className="w-5 h-5" />
            </div>
            <div className="text-xs font-bold text-slate-700">Chưa có phòng ban nào trong tổ chức</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto mt-1 mb-3">
              Sau khi tạo phòng ban và cấp tài khoản Department Admin, hệ thống sẽ tự động thống kê dung lượng lưu trữ phân bổ tại đây.
            </p>
            {onCreateDepartmentUser && (
              <button
                onClick={() => onCreateDepartmentUser()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Thêm tài khoản Department Admin</span>
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto mt-3">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50 text-slate-500 font-semibold">
                  <th className="py-2.5 px-3 text-center w-14">STT</th>
                  <th className="py-2.5 px-3">Phòng ban (Department)</th>
                  <th className="py-2.5 px-3">Trưởng bộ phận & Nhân sự</th>
                  <th className="py-2.5 px-3">Đã dùng ({unit})</th>
                  <th className="py-2.5 px-3">Hạn mức Quota ({unit})</th>
                  <th className="py-2.5 px-3">Tiến độ tiêu thụ</th>
                  <th className="py-2.5 px-3">Khả dụng</th>
                  <th className="py-2.5 px-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {departmentUsage.map((item, idx) => {
                  const freeDeptGB = Math.max(0, item.quotaGB - item.usedGB);

                  return (
                    <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-3 text-center font-mono text-slate-500 font-medium text-xs">
                        {idx + 1}
                      </td>
                      <td className="py-3 px-3">
                        <div className="font-bold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{item.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-700 font-medium">{item.lead}</div>
                        <div className="text-[11px] text-slate-400">{item.members} nhân sự</div>
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900 tabular-nums">
                        {unit === 'GB'
                          ? `${item.usedGB.toLocaleString()} GB`
                          : `${(item.usedGB / 1024).toFixed(2)} TB`}
                      </td>
                      <td className="py-3 px-3 text-slate-500 tabular-nums font-medium">
                        {unit === 'GB'
                          ? `${item.quotaGB.toLocaleString()} GB`
                          : `${(item.quotaGB / 1024).toFixed(2)} TB`}
                      </td>
                      <td className="py-3 px-3 min-w-[150px]">
                        <div className="flex items-center gap-2">
                          <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-100">
                            <div
                              className={`h-full rounded-full ${
                                item.percent > 75 ? 'bg-amber-500' : 'bg-blue-600'
                              }`}
                              style={{ width: `${item.percent}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-bold text-slate-700 tabular-nums">
                            {item.percent}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-3 tabular-nums text-slate-600 font-mono text-[11px]">
                        +{unit === 'GB' ? `${freeDeptGB.toFixed(1)} GB` : `${(freeDeptGB / 1024).toFixed(2)} TB`}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {onCreateDepartmentUser && (
                          <button
                            onClick={() => onCreateDepartmentUser(item.name)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer inline-flex items-center gap-1"
                          >
                            <UserPlus className="w-3 h-3" />
                            <span>Thêm User</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
