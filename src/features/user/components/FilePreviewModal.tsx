import React from 'react';
import {
  X,
  Download,
  Share2,
  Star,
  Trash2,
  FileText,
  Calendar,
  HardDrive,
  User,
  Building,
  Tag,
  Copy,
  Check,
} from 'lucide-react';
import { DriveItem } from '../types';

interface FilePreviewModalProps {
  file: DriveItem | null;
  onClose: () => void;
  onToggleStar: (id: string) => void;
  onDelete: (id: string) => void;
  onDownload: (item: DriveItem) => void;
  onShare: (item: DriveItem) => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({
  file,
  onClose,
  onToggleStar,
  onDelete,
  onDownload,
  onShare,
}) => {
  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate">{file.name}</h3>
              <p className="text-[11px] text-slate-400">
                {file.sizeFormatted} · Cập nhật: {file.updatedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleStar(file.id)}
              className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                file.starred
                  ? 'border-amber-200 bg-amber-50 text-amber-500'
                  : 'border-slate-200 text-slate-400 hover:text-amber-500'
              }`}
              title="Gắn dấu sao"
            >
              <Star className={`w-4 h-4 ${file.starred ? 'fill-amber-400' : ''}`} />
            </button>
            <button
              onClick={() => onShare(file)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Chia sẻ liên kết"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDownload(file)}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
              title="Tải về máy"
            >
              <Download className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                onDelete(file.id);
                onClose();
              }}
              className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Xóa tệp"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="h-5 w-px bg-slate-200 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* File Preview Content Display */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 flex flex-col items-center justify-center min-h-[220px]">
            {file.previewUrl ? (
              <img
                src={file.previewUrl}
                alt={file.name}
                className="max-h-64 object-contain rounded-lg shadow-sm"
              />
            ) : file.contentSnippet ? (
              <div className="w-full bg-slate-900 text-slate-100 font-mono text-xs p-4 rounded-lg overflow-x-auto whitespace-pre leading-relaxed">
                {file.contentSnippet}
              </div>
            ) : (
              <div className="text-center space-y-2">
                <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">
                  Xem trước không khả dụng cho định dạng .{file.extension || 'file'}
                </p>
                <button
                  onClick={() => onDownload(file)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                >
                  Tải xuống để xem toàn bộ
                </button>
              </div>
            )}
          </div>

          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <User className="w-3.5 h-3.5" />
                <span>Chủ sở hữu</span>
              </div>
              <div className="font-semibold text-slate-800 truncate">{file.owner.name}</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <HardDrive className="w-3.5 h-3.5" />
                <span>Kích thước</span>
              </div>
              <div className="font-semibold text-slate-800">{file.sizeFormatted}</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Building className="w-3.5 h-3.5" />
                <span>Phòng ban</span>
              </div>
              <div className="font-semibold text-slate-800">{file.department || 'Chung'}</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <div className="flex items-center gap-1.5 text-slate-400 mb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>Thời gian tạo</span>
              </div>
              <div className="font-semibold text-slate-800">{file.createdAt}</div>
            </div>
          </div>

          {/* Tags */}
          {file.tags && file.tags.length > 0 && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>Thẻ phân loại (Tags):</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {file.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2.5 py-1 bg-blue-50 text-blue-700 text-[11px] font-medium rounded-md border border-blue-100"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
