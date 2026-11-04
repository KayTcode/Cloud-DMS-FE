import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  RefreshCw,
  AlertTriangle,
  FileText,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { documentApi } from '../api/documentApi';
import { formatBytes } from '@/features/user/api/driveApi';

interface ReplaceDocumentFileModalProps {
  fileId: string | null;
  currentFileName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const ReplaceDocumentFileModal: React.FC<ReplaceDocumentFileModalProps> = ({
  fileId,
  currentFileName,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen || !fileId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Vui lòng chọn tệp mới để thay thế.');
      return;
    }

    setIsSubmitting(true);
    setUploadPercent(0);
    setErrorMessage('');

    try {
      await documentApi.replaceFile(
        {
          fileId,
          newFile: selectedFile,
        },
        (percent) => setUploadPercent(percent)
      );

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Đã có lỗi xảy ra khi thay thế tệp.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/20">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Thay Thế Tệp Vật Lý</h3>
              <p className="text-xs text-slate-500">Cập nhật nội dung tệp mà không làm mất siêu dữ liệu</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
              {errorMessage}
            </div>
          )}

          {/* Cảnh báo xóa file cũ trên S3 và bảo toàn metadata */}
          <div className="p-4 rounded-xl bg-amber-50/80 border border-amber-200 space-y-2 text-amber-900 text-xs leading-relaxed">
            <div className="flex items-center gap-2 font-bold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Chính sách Zero-Waste Storage:</span>
            </div>
            <p>
              • Tệp cũ (<span className="font-semibold">{currentFileName || 'Hiện tại'}</span>) trên Cloud S3 sẽ bị{' '}
              <span className="font-bold text-rose-700">xóa vĩnh viễn ngay lập tức</span> để hoàn trả Quota dung
              lượng cho bạn.
            </p>
            <p className="flex items-center gap-1.5 text-emerald-800 font-semibold pt-1">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              Toàn bộ Siêu dữ liệu (Tiêu đề, Tác giả, Ngày phát hành, Từ khóa...) được giữ nguyên 100%!
            </p>
          </div>

          {/* Chọn File mới */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Chọn tệp mới thay thế
            </label>
            {!selectedFile ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 hover:border-amber-400 hover:bg-slate-50/60 rounded-xl p-6 text-center cursor-pointer transition-all duration-200"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setSelectedFile(e.target.files[0]);
                      setErrorMessage('');
                    }
                  }}
                />
                <div className="w-10 h-10 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-2">
                  <Upload className="w-5 h-5" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Nhấn để chọn tệp mới từ máy tính của bạn
                </p>
                <p className="text-xs text-slate-400 mt-1">Dung lượng sẽ được tự động bù trừ vào Quota</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-semibold text-slate-900 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-slate-500">{formatBytes(selectedFile.size)}</p>
                  </div>
                </div>
                {!isSubmitting && (
                  <button
                    type="button"
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Progress Bar khi tải lên */}
          {isSubmitting && (
            <div className="space-y-1.5 pt-2">
              <div className="flex justify-between text-xs text-slate-600">
                <span>Đang tải tệp mới và dọn dẹp tệp cũ...</span>
                <span className="font-bold text-amber-600">{uploadPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-xl cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-xl shadow-md shadow-amber-500/20 transition-all cursor-pointer"
            >
              {isSubmitting ? 'Đang thay thế...' : 'Xác nhận thay thế'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

