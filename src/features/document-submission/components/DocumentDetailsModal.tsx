import React, { useState, useEffect } from 'react';
import {
  X,
  FileText,
  Calendar,
  Tag,
  Clock,
  ShieldCheck,
  AlertTriangle,
  Download,
  Edit3,
  RefreshCw,
  HardDrive,
  Info,
  Layers,
} from 'lucide-react';
import { documentApi } from '../api/documentApi';
import { driveApi, formatBytes } from '@/features/user/api/driveApi';
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
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<'metadata' | 'fileInfo'>('metadata');

  const fetchDetails = async (id: string) => {
    setIsLoading(true);
    setError('');
    try {
      const data = await documentApi.getDocumentDetails(id);
      setDetails(data);
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
    }
  }, [isOpen, fileId]);

  if (!isOpen || !fileId) return null;

  const metadata: DocumentMetadataDto | null = details?.metadata ?? (details?.title != null ? {
    id: details.metadataId || '',
    fileEntryId: details.fileId || '',
    author: details.author || details.ownerName || '',
    title: details.title,
    otherTitle: details.otherTitle,
    releaseYear: details.issueYear || details.releaseYear || 0,
    releaseMonth: details.issueMonth ?? details.releaseMonth ?? null,
    releaseDay: details.issueDay ?? details.releaseDay ?? null,
    releaseDateFormatted: details.releaseDateFormatted || (details.issueYear ? `Năm ${details.issueYear}` : ''),
    keywords: details.keywords ?? null,
    abstract: details.abstract ?? null,
    description: details.description ?? null,
  } : null);
  const isExpiringSoon = details?.daysRemaining !== undefined && details.daysRemaining !== null && details.daysRemaining <= 7;
  const keywordsList = metadata?.keywords
    ? metadata.keywords.split(',').map((k: string) => k.trim()).filter(Boolean)
    : [];

  const handleDownload = () => {
    if (!details) return;
    driveApi.downloadFile(details.fileId, details.fileName);
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
                {metadata?.title || details?.fileName || 'Chi tiết tài liệu'}
              </h3>
              <p className="text-xs text-slate-500 truncate">{details?.fileName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
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
                className={`p-4 rounded-2xl border flex items-center justify-between ${isExpiringSoon
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
                          className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${isExpiringSoon
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
                  onClick={() => setActiveTab('metadata')}
                  className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${activeTab === 'metadata'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  Thông Tin Mô Tả
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('fileInfo')}
                  className={`pb-2.5 px-4 text-sm font-semibold border-b-2 transition-colors cursor-pointer ${activeTab === 'fileInfo'
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                    }`}
                >
                  Thông Tin Tệp Tin
                </button>
              </div>

              {/* Tab 1: Siêu Dữ Liệu */}
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

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                            Tác giả (Uploader)
                          </span>
                          <div className="flex items-center gap-1.5 mt-1 text-sm font-medium text-slate-800">
                            <ShieldCheck className="w-4 h-4 text-emerald-600" />
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
                    </>
                  ) : (
                    <div className="py-8 text-center text-slate-400">
                      <p className="text-sm">Tài liệu này chưa có bản ghi thông tin mô tả.</p>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: Thông tin tệp */}
              {activeTab === 'fileInfo' && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-sm">
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Tên tệp:</span>
                    <span className="font-semibold text-slate-900">{details.fileName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Kích thước:</span>
                    <span className="font-semibold text-slate-900">{formatBytes(details.sizeBytes)}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Định dạng (MIME):</span>
                    <span className="font-semibold text-slate-900">{details.contentType}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-200/60">
                    <span className="text-slate-500">Khu vực lưu trữ:</span>
                    <span className="font-semibold text-slate-900">{details.driveKind}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500">Ngày tải lên:</span>
                    <span className="font-semibold text-slate-900">
                      {new Date(details.uploadedAt).toLocaleString('vi-VN')}
                    </span>
                  </div>
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
                      onClick={() => onOpenReplaceModal(details.fileId, details.fileName)}
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
    </div>
  );
};

