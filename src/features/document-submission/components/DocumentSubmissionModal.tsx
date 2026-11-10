import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  X,
  Upload,
  FileText,
  Lock,
  Calendar,
  Tag,
  Clock,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { documentApi } from '../api/documentApi';
import { formatBytes } from '@/features/user/api/driveApi';
import { DocumentSubmissionResultDto } from '../types/document.types';

interface DocumentSubmissionModalProps {
  isOpen: boolean;
  onClose: () => void;
  parentFolderId?: string | null;
  onSuccess?: (result: DocumentSubmissionResultDto) => void;
}

const RETENTION_OPTIONS = [
  { label: '30 ngày (Mặc định)', value: 30 },
  { label: '90 ngày (3 tháng)', value: 90 },
  { label: '180 ngày (6 tháng)', value: 180 },
  { label: '365 ngày (1 năm)', value: 365 },
  { label: 'Tùy chỉnh...', value: -1 },
];

export const DocumentSubmissionModal: React.FC<DocumentSubmissionModalProps> = ({
  isOpen,
  onClose,
  parentFolderId,
  onSuccess,
}) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState<number>(() => new Date().getFullYear());
  const [releaseMonth, setReleaseMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [releaseDay, setReleaseDay] = useState<number>(() => new Date().getDate());
  const [keywords, setKeywords] = useState('');
  const [abstract, setAbstract] = useState('');
  const [description, setDescription] = useState('');

  // Retention State
  const [retentionOption, setRetentionOption] = useState<number>(30);
  const [customDays, setCustomDays] = useState<number>(60);

  // Status & Progress State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadPercent, setUploadPercent] = useState<number>(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [dragActive, setDragActive] = useState(false);

  // Hàm xóa sạch trắng form khi nộp xong hoặc mở lại form mới
  const resetForm = useCallback(() => {
    setSelectedFile(null);
    setTitle('');
    const now = new Date();
    setReleaseYear(now.getFullYear());
    setReleaseMonth(now.getMonth() + 1);
    setReleaseDay(now.getDate());
    setKeywords('');
    setAbstract('');
    setDescription('');
    setRetentionOption(30);
    setCustomDays(60);
    setIsSubmitting(false);
    setUploadPercent(0);
    setErrorMessage('');
    setDragActive(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  // Mỗi khi mở modal (isOpen = true), tự động làm trắng form 100%
  useEffect(() => {
    if (isOpen) {
      resetForm();
    }
  }, [isOpen, resetForm]);

  const handleClose = () => {
    if (!isSubmitting) {
      resetForm();
      onClose();
    }
  };

  if (!isOpen) return null;

  const effectiveRetentionDays = retentionOption === -1 ? customDays : retentionOption;
  const estimatedExpiryDate = new Date();
  estimatedExpiryDate.setDate(estimatedExpiryDate.getDate() + effectiveRetentionDays);

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setErrorMessage('');
    if (!title.trim()) {
      // Tự động gán tên tệp (bỏ phần đuôi) làm tiêu đề ban đầu nếu chưa nhập
      const nameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
      setTitle(nameWithoutExt);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Vui lòng chọn một tệp tài liệu để nộp.');
      return;
    }
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }
    if (effectiveRetentionDays <= 0) {
      setErrorMessage('Số ngày lưu trữ phải lớn hơn 0.');
      return;
    }

    setIsSubmitting(true);
    setUploadPercent(0);
    setErrorMessage('');

    try {
      const result = await documentApi.uploadWithMetadata(
        {
          file: selectedFile,
          parentFolderId: parentFolderId || null,
          retentionDays: effectiveRetentionDays,
          title: title.trim(),
          releaseYear: releaseYear || new Date().getFullYear(),
          releaseMonth: releaseMonth || (new Date().getMonth() + 1),
          releaseDay: releaseDay || new Date().getDate(),
          keywords: keywords.trim() || null,
          abstract: abstract.trim() || null,
          description: description.trim() || null,
        },
        (percent) => setUploadPercent(percent)
      );

      resetForm();
      if (onSuccess) {
        onSuccess(result);
      }
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Đã có lỗi xảy ra trong quá trình nộp tài liệu.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Tạo Hồ Sơ Tài Liệu Mới</h3>
              <p className="text-xs text-slate-500">Tải tệp và khai báo thông tin tài liệu trong một bước duy nhất</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {errorMessage && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* 1. Khu vực chọn / kéo thả File */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              1. Tệp đính kèm <span className="text-rose-500">*</span>
            </label>
            {!selectedFile ? (
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 ${dragActive
                    ? 'border-blue-500 bg-blue-50/50'
                    : 'border-slate-300 hover:border-blue-400 hover:bg-slate-50/60'
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileChange(e.target.files[0]);
                    }
                  }}
                />
                <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-800">
                  Kéo thả tệp vào đây hoặc <span className="text-blue-600 underline">chọn từ thiết bị</span>
                </p>
                <p className="text-xs text-slate-400 mt-1">Hỗ trợ PDF, Word, Excel, Slide, Ảnh, Tệp nén v.v.</p>
              </div>
            ) : (
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
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
                    onClick={() => {
                      setSelectedFile(null);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-full transition-colors cursor-pointer"
                    title="Hủy chọn tệp"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 2. Tiêu đề tài liệu */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              2. Tiêu đề tài liệu <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nhập tiêu đề hoặc tên tài liệu rõ nghĩa..."
              disabled={isSubmitting}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
            />
          </div>

          {/* 3. Tác giả (Author Badge readonly) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                3. Tác giả (Người nộp)
              </label>
              <span className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                Xác thực danh tính tài khoản
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100/80 border border-slate-200/80 text-slate-700 text-sm">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900">{user?.fullName || 'Người dùng'}</span>
              <span className="text-xs text-slate-500">({user?.email})</span>
              <span className="ml-auto text-[11px] bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                Chỉ đọc
              </span>
            </div>
          </div>

          {/* 4. Thời điểm phát hành (Cố định tự động lấy ngày hiện tại) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                4. Thời điểm phát hành
              </label>
              <span className="text-[11px] text-blue-600 font-medium flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Tự động lấy ngày hiện tại
              </span>
            </div>
            <div className="flex items-center gap-2.5 px-3.5 py-2 rounded-xl bg-slate-100/80 border border-slate-200/80 text-slate-700 text-sm">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900">
                Ngày {String(releaseDay).padStart(2, '0')}/{String(releaseMonth).padStart(2, '0')}/{releaseYear}
              </span>
              <span className="text-xs text-slate-500">(Ghi nhận thời điểm nộp văn bản)</span>
              <span className="ml-auto text-[11px] bg-slate-200 text-slate-700 font-medium px-2 py-0.5 rounded-md">
                Chỉ đọc
              </span>
            </div>
          </div>

          {/* 5. Từ khóa (Keywords) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              5. Từ khóa tìm kiếm (Keywords)
            </label>
            <div className="relative">
              <Tag className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Nhập các từ khóa phân tách bằng dấu phẩy (vd: hợp đồng, tài chính, 2026)..."
                disabled={isSubmitting}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
          </div>

          {/* 6. Tóm tắt nội dung (Abstract) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              6. Tóm tắt nội dung (Abstract)
            </label>
            <textarea
              rows={2}
              value={abstract}
              onChange={(e) => setAbstract(e.target.value)}
              placeholder="Tóm tắt ngắn gọn nội dung cốt lõi của tài liệu..."
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* 7. Mô tả chi tiết (Description) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              7. Ghi chú / Mô tả chi tiết
            </label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ghi chú thêm về phiên bản, phòng ban liên quan hoặc lưu ý..."
              disabled={isSubmitting}
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none"
            />
          </div>

          {/* 8. Thời hạn lưu trữ (Uploader-Driven Retention) */}
          <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  8. Thời hạn lưu trữ chủ động
                </span>
              </div>
              <span className="text-xs font-medium text-blue-700">
                Hết hạn: {estimatedExpiryDate.toLocaleDateString('vi-VN')}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {RETENTION_OPTIONS.map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setRetentionOption(opt.value)}
                  className={`px-3 py-2 text-xs font-semibold rounded-full border transition-all cursor-pointer text-center ${retentionOption === opt.value
                      ? 'bg-blue-600 border-blue-600 text-white shadow-xs'
                      : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                    }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {retentionOption === -1 && (
              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-slate-600 font-medium">Nhập số ngày:</span>
                <input
                  type="number"
                  min={1}
                  max={3650}
                  value={customDays}
                  onChange={(e) => setCustomDays(Math.max(1, Number(e.target.value)))}
                  className="w-24 px-3 py-1.5 rounded-full border border-slate-300 bg-white text-sm text-slate-900 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
                />
                <span className="text-xs text-slate-500">ngày</span>
              </div>
            )}

            <p className="text-[11px] text-slate-500 leading-relaxed">
              * Hệ thống sẽ gửi thông báo nhắc trước 7 ngày khi tài liệu sắp đến hạn. Sau thời hạn lưu trữ, tệp sẽ được dọn dẹp để tự động tối ưu hóa bộ nhớ.
            </p>
          </div>

          {/* Thanh Tiến Trình Khi Đang Upload */}
          {isSubmitting && (
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span className="font-semibold flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  Đang tải lên và kiểm tra an toàn dữ liệu...
                </span>
                <span className="font-bold text-blue-600">{uploadPercent}%</span>
              </div>
              <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${uploadPercent}%` }}
                />
              </div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedFile}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed rounded-full shadow-md shadow-blue-500/20 transition-all cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Tạo hồ sơ tài liệu</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

