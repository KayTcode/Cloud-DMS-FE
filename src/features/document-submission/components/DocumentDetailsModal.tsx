import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  Tag,
  Clock,
  Download,
  Edit3,
  RefreshCw,
  HardDrive,
  Info,
  Users,
  User,
  Folder,
  Share2,
  AlertTriangle,
  Crown,
} from 'lucide-react';
import { documentApi } from '../api/documentApi';
import { driveApi, formatBytes, FileShareRecipient, detectFileType } from '@/features/user/api/driveApi';
import { DriveItem } from '@/features/user/types';
import { ShareModal } from '@/features/user/components/ShareModal';
import { DocumentDetailsDto, DocumentMetadataDto } from '../types/document.types';

interface DocumentDetailsModalProps {
  fileId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReplaceModal?: (fileId: string, currentFileName: string) => void;
  onOpenEditModal?: (details: DocumentDetailsDto) => void;
  onOpenExtendModal?: (details: DocumentDetailsDto) => void;
}

export const DocumentDetailsModal: React.FC<DocumentDetailsModalProps> = ({
  fileId,
  isOpen,
  onClose,
  onOpenReplaceModal,
  onOpenEditModal,
  onOpenExtendModal,
}) => {
  const [details, setDetails] = useState<DocumentDetailsDto | null>(null);
  const [shares, setShares] = useState<FileShareRecipient[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'details' | 'metadata'>('details');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const fetchDetails = async (id: string) => {
    setIsLoading(true);
    setError('');
    try {
      const [data, sharesData] = await Promise.all([
        documentApi.getDocumentDetails(id),
        driveApi.getFileShares(id).catch(() => [] as FileShareRecipient[]),
      ]);
      setDetails(data);
      setShares(sharesData);
    } catch (err: any) {
      setError(
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        'Không thể tải thông tin chi tiết tài liệu.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && fileId) {
      fetchDetails(fileId);
    } else {
      setDetails(null);
      setShares([]);
    }
  }, [isOpen, fileId]);

  if (!isOpen || !fileId) return null;

  const fileName = details?.name || details?.fileName || 'Chi tiết tài liệu';
  const rawMeta = details?.metadata;
  const metadata: DocumentMetadataDto | null = rawMeta ? {
    id: rawMeta.id,
    fileEntryId: rawMeta.fileEntryId,
    title: rawMeta.title,
    author: rawMeta.author,
    otherTitle: rawMeta.otherTitle,
    releaseYear: rawMeta.issueYear || rawMeta.releaseYear || 0,
    issueYear: rawMeta.issueYear || rawMeta.releaseYear || 0,
    releaseMonth: rawMeta.issueMonth ?? rawMeta.releaseMonth ?? null,
    issueMonth: rawMeta.issueMonth ?? rawMeta.releaseMonth ?? null,
    releaseDay: rawMeta.issueDay ?? rawMeta.releaseDay ?? null,
    issueDay: rawMeta.issueDay ?? rawMeta.releaseDay ?? null,
    releaseDateFormatted: (rawMeta as any).releaseDateFormatted || (rawMeta.issueYear || rawMeta.releaseYear ? `Năm ${rawMeta.issueYear || rawMeta.releaseYear}` : ''),
    keywords: rawMeta.keywords ?? null,
    abstract: rawMeta.abstract ?? null,
    description: rawMeta.description ?? null,
    createdAt: rawMeta.createdAt,
    lastModifiedAt: rawMeta.lastModifiedAt || (rawMeta as any).updatedAt || null,
  } : (details?.title != null ? {
    id: details.metadataId || '',
    fileEntryId: details.fileId || '',
    author: details.author || details.ownerName || '',
    title: details.title,
    otherTitle: details.otherTitle,
    releaseYear: details.issueYear || details.releaseYear || 0,
    issueYear: details.issueYear || details.releaseYear || 0,
    releaseMonth: details.issueMonth ?? details.releaseMonth ?? null,
    issueMonth: details.issueMonth ?? details.releaseMonth ?? null,
    releaseDay: details.issueDay ?? details.releaseDay ?? null,
    issueDay: details.issueDay ?? details.releaseDay ?? null,
    releaseDateFormatted: details.releaseDateFormatted || (details.issueYear || details.releaseYear ? `Năm ${details.issueYear || details.releaseYear}` : ''),
    keywords: details.keywords ?? null,
    abstract: details.abstract ?? null,
    description: details.description ?? null,
  } : null);

  const isExpiringSoon = details?.daysRemaining !== undefined && details.daysRemaining !== null && details.daysRemaining <= 7;
  const keywordsList = metadata?.keywords
    ? metadata.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
    : [];

  const formatFileType = (name: string, mime?: string) => {
    const { type, ext } = detectFileType(name, mime);
    const typeNames: Record<string, string> = {
      pdf: 'Tệp PDF',
      docx: 'Tài liệu văn bản (Word)',
      sheet: 'Bảng tính (Spreadsheet)',
      slide: 'Bản trình bày (Presentation)',
      image: 'Hình ảnh',
      archive: 'Tệp nén lưu trữ',
      code: 'Mã nguồn / Văn bản lập trình',
      other: 'Tệp tin',
    };
    const friendlyName = typeNames[type] || 'Tệp tin';
    return mime ? `${friendlyName} (${mime})` : `${friendlyName} (.${ext})`;
  };

  const formatDateTime = (dateString?: string | null) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '—';
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleDownload = () => {
    if (!details) return;
    driveApi.downloadFile(details.fileId, fileName);
  };

  const toDriveItem = (dto: DocumentDetailsDto): DriveItem => {
    const fName = dto.name || dto.fileName || 'Tệp không tên';
    return {
      id: dto.fileId,
      name: fName,
      type: 'file',
      size: dto.sizeBytes || 0,
      sizeFormatted: formatBytes(dto.sizeBytes || 0),
      updatedAt: dto.updatedAt || dto.createdAt || dto.uploadedAt || new Date().toISOString(),
      createdAt: dto.createdAt || dto.uploadedAt || new Date().toISOString(),
      owner: {
        name: dto.ownerName || 'Chủ sở hữu',
        email: dto.ownerEmail || '',
      },
      parentId: dto.parentFolderId || null,
      starred: false,
      trashed: false,
      sharedWith: shares.map(s => s.name || s.email),
      tags: [],
      metadata: metadata,
      scanStatus: null,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div className="truncate">
              <h3 className="text-base font-bold text-slate-900 truncate">
                {metadata?.title || fileName}
              </h3>
              <p className="text-xs text-slate-500 truncate">{fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {isLoading && (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
              <div className="w-8 h-8 border-3 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
              <p className="text-sm">Đang tải thông tin chi tiết tài liệu...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {error}
            </div>
          )}

          {!isLoading && details && (
            <>
              {/* Thẻ Cảnh Báo Vòng Đời Lưu Trữ (Retention Lifecycle) */}
              <div
                className={`p-4 rounded-2xl border flex items-center justify-between ${
                  isExpiringSoon
                    ? 'bg-amber-50/90 border-amber-200 text-amber-900'
                    : 'bg-slate-50/80 border-slate-200 text-slate-700'
                }`}
              >
                <div className="flex items-center gap-3">
                  {isExpiringSoon ? (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-blue-600 shrink-0" />
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider">
                        {isExpiringSoon ? 'Cảnh báo sắp hết hạn lưu trữ' : 'Thời hạn lưu trữ tệp'}
                      </span>
                      {details.daysRemaining !== null && details.daysRemaining !== undefined && (
                        <span
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                            isExpiringSoon
                              ? 'bg-amber-200 text-amber-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          Còn {details.daysRemaining} ngày
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Hết hạn vào:{' '}
                      <span className="font-semibold">
                        {details.expiresAt
                          ? new Date(details.expiresAt).toLocaleDateString('vi-VN')
                          : 'Vĩnh viễn'}
                      </span>
                    </p>
                  </div>
                </div>

                {onOpenExtendModal && (
                  <button
                    type="button"
                    onClick={() => onOpenExtendModal(details)}
                    className="px-3.5 py-1.5 text-xs font-semibold rounded-full bg-white border border-slate-300 hover:border-blue-500 hover:text-blue-600 shadow-2xs transition-all cursor-pointer"
                  >
                    Gia hạn lưu trữ
                  </button>
                )}
              </div>

              {/* Tabs navigation */}
              <div className="flex border-b border-slate-200">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'details'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Chi tiết tệp
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('metadata')}
                  className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${
                    activeTab === 'metadata'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Mô tả
                </button>
              </div>

              {/* Tab 1: Chi tiết tệp (Google Drive Style) */}
              {activeTab === 'details' && (
                <div className="space-y-5">
                  {/* Mục 1: Người có quyền truy cập */}
                  <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-600" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          Người có quyền truy cập
                        </h4>
                      </div>
                      <span className="text-xs text-slate-500">
                        {shares.length + 1} người
                      </span>
                    </div>

                    <div className="space-y-2.5">
                      {/* Chủ sở hữu */}
                      <div className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-slate-100 shadow-2xs">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded-full bg-amber-50 border border-amber-200 text-amber-700 flex items-center justify-center shrink-0">
                            <Crown className="w-3.5 h-3.5" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">
                              {details.ownerName || 'Chủ sở hữu'}
                            </p>
                            {details.ownerEmail && (
                              <p className="text-[11px] text-slate-500 truncate">
                                {details.ownerEmail}
                              </p>
                            )}
                          </div>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 shrink-0">
                          Chủ sở hữu
                        </span>
                      </div>

                      {/* Danh sách người được chia sẻ */}
                      {shares.map((share) => (
                        <div
                          key={share.recipientId}
                          className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-white border border-slate-100 shadow-2xs"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-7 h-7 rounded-full bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0 text-xs font-bold">
                              {share.name ? share.name.charAt(0).toUpperCase() : <User className="w-3.5 h-3.5" />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {share.name}
                              </p>
                              {share.email && (
                                <p className="text-[11px] text-slate-500 truncate">
                                  {share.email}
                                </p>
                              )}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                              share.role === 'Editor'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {share.role === 'Editor' ? 'Người chỉnh sửa' : 'Người xem'}
                          </span>
                        </div>
                      ))}

                      {shares.length === 0 && (
                        <p className="text-xs text-slate-400 italic py-1">
                          Tệp này chưa được chia sẻ với người dùng nào khác.
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsShareModalOpen(true)}
                      className="w-full mt-3 py-2 px-3 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 rounded-xl text-xs font-semibold text-blue-600 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      <span>Quản lý quyền truy cập</span>
                    </button>
                  </div>

                  {/* Mục 2: Thông tin chi tiết về tệp (Google Drive style properties) */}
                  <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/80">
                    <div className="flex items-center gap-2 pb-3 border-b border-slate-200/60 mb-3">
                      <Info className="w-4 h-4 text-blue-600" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Thông tin chi tiết về tệp
                      </h4>
                    </div>

                    <div className="divide-y divide-slate-100 text-xs">
                      {/* Loại */}
                      <div className="py-2 flex items-start justify-between gap-4">
                        <span className="text-slate-500 shrink-0 font-medium">Loại</span>
                        <span className="text-slate-900 font-semibold text-right">
                          {formatFileType(fileName, details.contentType)}
                        </span>
                      </div>

                      {/* Kích thước */}
                      <div className="py-2 flex items-start justify-between gap-4">
                        <span className="text-slate-500 shrink-0 font-medium">Kích thước</span>
                        <span className="text-slate-900 font-semibold text-right">
                          {details.originalSizeBytes && details.originalSizeBytes !== details.sizeBytes ? (
                            <>
                              <span>{formatBytes(details.originalSizeBytes)}</span>
                              <span className="text-slate-400 font-normal ml-1.5 text-[11px]">
                                (Nén: {formatBytes(details.sizeBytes)})
                              </span>
                            </>
                          ) : (
                            formatBytes(details.sizeBytes)
                          )}
                        </span>
                      </div>

                      {/* Bộ nhớ đã dùng */}
                      <div className="py-2 flex items-start justify-between gap-4">
                        <span className="text-slate-500 shrink-0 font-medium">Bộ nhớ đã dùng</span>
                        <span className="text-slate-900 font-semibold text-right">
                          {formatBytes(details.sizeBytes)}
                        </span>
                      </div>

                      {/* Địa điểm */}
                      <div className="py-2 flex items-center justify-between gap-4">
                        <span className="text-slate-500 shrink-0 font-medium">Địa điểm</span>
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-800 shadow-2xs">
                          <Folder className="w-3.5 h-3.5 text-amber-500 fill-amber-500/20" />
                          <span>
                            {details.folderName ||
                              (details.driveKind === 'DepartmentShared'
                                ? 'Kho lưu trữ phòng ban'
                                : 'My Drive')}
                          </span>
                        </div>
                      </div>

                      {/* Chủ sở hữu */}
                      <div className="py-2 flex items-start justify-between gap-4">
                        <span className="text-slate-500 shrink-0 font-medium">Chủ sở hữu</span>
                        <div className="text-right">
                          <p className="text-slate-900 font-semibold">
                            {details.ownerName || 'Chủ sở hữu'}
                          </p>
                          {details.ownerEmail && (
                            <p className="text-slate-400 text-[11px]">{details.ownerEmail}</p>
                          )}
                        </div>
                      </div>

                      {/* Lần sửa đổi gần đây nhất */}
                      <div className="py-2 flex items-start justify-between gap-4">
                        <span className="text-slate-500 shrink-0 font-medium">Lần sửa đổi gần đây nhất</span>
                        <span className="text-slate-900 font-semibold text-right">
                          {formatDateTime(
                            details.updatedAt || details.createdAt || details.uploadedAt
                          )}
                        </span>
                      </div>

                      {/* Ngày tải lên */}
                      <div className="py-2 flex items-start justify-between gap-4">
                        <span className="text-slate-500 shrink-0 font-medium">Ngày tải lên</span>
                        <span className="text-slate-900 font-semibold text-right">
                          {formatDateTime(details.createdAt || details.uploadedAt)}
                        </span>
                      </div>

                      {/* Nơi lưu trữ */}
                      <div className="py-2 flex items-center justify-between gap-4">
                        <span className="text-slate-500 shrink-0 font-medium">Nơi lưu trữ</span>
                        <div className="inline-flex items-center gap-1.5 text-slate-800 font-medium">
                          <HardDrive className="w-3.5 h-3.5 text-indigo-500" />
                          <span>
                            {details.storageProviderName || 'Hệ thống lưu trữ cục bộ'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Thông tin mô tả */}
              {activeTab === 'metadata' && (
                <div className="space-y-4">
                  {metadata ? (
                    <>
                      <div>
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                          Tiêu đề tài liệu
                        </span>
                        <p className="text-base font-bold text-slate-900 mt-0.5">{metadata.title}</p>
                      </div>

                      {metadata.otherTitle && (
                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Tiêu đề khác / Phụ đề
                          </span>
                          <p className="text-sm font-medium text-slate-800 mt-0.5">{metadata.otherTitle}</p>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Tác giả (Uploader)
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-slate-800">
                            <User className="w-4 h-4 text-blue-600" />
                            <span>{metadata.author}</span>
                          </div>
                        </div>

                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Thời điểm phát hành
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-slate-800">
                            <Calendar className="w-4 h-4 text-blue-600" />
                            <span>{metadata.releaseDateFormatted || `Năm ${metadata.releaseYear}`}</span>
                          </div>
                        </div>
                      </div>

                      {keywordsList.length > 0 && (
                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Từ khóa (Keywords)
                          </span>
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {keywordsList.map((kw: string, i: number) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-50 border border-blue-100 text-xs font-medium text-blue-700"
                              >
                                <Tag className="w-3 h-3 text-blue-500" />
                                {kw}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {metadata.abstract && (
                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Tóm tắt nội dung
                          </span>
                          <p className="text-sm text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {metadata.abstract}
                          </p>
                        </div>
                      )}

                      {metadata.description && (
                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Mô tả chi tiết / Ghi chú
                          </span>
                          <p className="text-sm text-slate-700 mt-1 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                            {metadata.description}
                          </p>
                        </div>
                      )}

                      {/* Footer ghi chú lần cập nhật cuối */}
                      {(metadata.lastModifiedAt || details.updatedAt) && (
                        <div className="pt-2 border-t border-slate-100 text-right">
                          <p className="text-[11px] text-slate-400 italic">
                            Cập nhật mô tả lần cuối:{' '}
                            {formatDateTime(metadata.lastModifiedAt || details.updatedAt)}
                          </p>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      <p className="text-sm">Tài liệu này chưa có bản ghi thông tin mô tả.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Bottom Actions Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={handleDownload}
                  className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải tệp xuống</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsShareModalOpen(true)}
                    className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-full transition-colors cursor-pointer shadow-2xs"
                  >
                    <Share2 className="w-3.5 h-3.5 text-blue-600" />
                    <span>Chia sẻ tệp</span>
                  </button>

                  {onOpenEditModal && metadata && (
                    <button
                      type="button"
                      onClick={() => onOpenEditModal(details)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-full transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      <span>Sửa thông tin tệp</span>
                    </button>
                  )}

                  {onOpenReplaceModal && (
                    <button
                      type="button"
                      onClick={() => onOpenReplaceModal(details.fileId, fileName)}
                      className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-full transition-colors cursor-pointer"
                      title="Tải tệp mới thay thế nội dung và giữ nguyên hồ sơ mô tả"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Thay thế tệp</span>
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Share Modal Integration */}
      {isShareModalOpen && details && (
        <ShareModal
          item={toDriveItem(details)}
          onClose={() => setIsShareModalOpen(false)}
          onShareSuccess={() => {
            fetchDetails(details.fileId);
          }}
          onChanged={() => {
            fetchDetails(details.fileId);
          }}
        />
      )}
    </div>
  );
};
