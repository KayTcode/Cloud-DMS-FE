import React, { useState, useEffect } from 'react';
import {
  X,
  Edit3,
  Calendar,
  Tag,
  ShieldCheck,
  AlertCircle,
  Save,
  Loader2,
} from 'lucide-react';
import { documentApi } from '../api/documentApi';
import { DocumentDetailsDto } from '../types/document.types';

interface EditDocumentMetadataModalProps {
  details: DocumentDetailsDto | null;
  fileId?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const EditDocumentMetadataModal: React.FC<EditDocumentMetadataModalProps> = ({
  details,
  fileId,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [releaseYear, setReleaseYear] = useState<number>(new Date().getFullYear());
  const [releaseMonth, setReleaseMonth] = useState<string>('');
  const [releaseDay, setReleaseDay] = useState<string>('');
  const [keywords, setKeywords] = useState('');
  const [abstract, setAbstract] = useState('');
  const [description, setDescription] = useState('');

  const [currentDetails, setCurrentDetails] = useState<DocumentDetailsDto | null>(details);
  const [isFetching, setIsFetching] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const populateForm = (data: any) => {
    const meta = data?.metadata || (data?.title ? data : null);
    if (meta) {
      setTitle(meta.title || '');
      setReleaseYear(meta.releaseYear || meta.issueYear || currentYear);
      setReleaseMonth(
        meta.releaseMonth !== undefined && meta.releaseMonth !== null && meta.releaseMonth !== ''
          ? meta.releaseMonth.toString()
          : meta.issueMonth !== undefined && meta.issueMonth !== null && meta.issueMonth !== ''
          ? meta.issueMonth.toString()
          : ''
      );
      setReleaseDay(
        meta.releaseDay !== undefined && meta.releaseDay !== null && meta.releaseDay !== ''
          ? meta.releaseDay.toString()
          : meta.issueDay !== undefined && meta.issueDay !== null && meta.issueDay !== ''
          ? meta.issueDay.toString()
          : ''
      );
      setKeywords(meta.keywords || '');
      setAbstract(meta.abstract || '');
      setDescription(meta.description || '');
      setErrorMessage('');
    } else if (data?.fileName || data?.name) {
      setTitle(data.fileName || data.name);
    }
  };

  useEffect(() => {
    if (!isOpen) {
      setCurrentDetails(null);
      setErrorMessage('');
      setIsFetching(false);
      return;
    }

    const targetFileId =
      fileId ||
      (typeof details === 'string' ? details : (details as any)?.fileId || (details as any)?.id) ||
      null;

    // Nếu đã truyền sẵn object details đầy đủ có metadata hoặc title
    if (
      typeof details === 'object' &&
      details !== null &&
      ((details as any).title || details.metadata)
    ) {
      setCurrentDetails(details);
      populateForm(details);
      return;
    }

    // Nếu chỉ có fileId hoặc details chưa đủ siêu dữ liệu, tự động fetch từ API Backend
    if (targetFileId) {
      let isMounted = true;
      setIsFetching(true);
      setErrorMessage('');

      documentApi
        .getDocumentDetails(targetFileId)
        .then((fetchedData) => {
          if (isMounted) {
            setCurrentDetails(fetchedData);
            populateForm(fetchedData);
          }
        })
        .catch((err) => {
          if (isMounted) {
            console.error('Lỗi khi tải chi tiết tài liệu để chỉnh sửa:', err);
            setErrorMessage('Không thể tải thông tin hiện tại của tài liệu.');
          }
        })
        .finally(() => {
          if (isMounted) setIsFetching(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [isOpen, details, fileId]);

  const targetFileId =
    fileId ||
    (typeof details === 'string' ? details : (details as any)?.fileId || (details as any)?.id) ||
    currentDetails?.fileId;

  if (!isOpen || !targetFileId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Vui lòng nhập tiêu đề tài liệu.');
      return;
    }
    if (!releaseYear || releaseYear < 1900 || releaseYear > currentYear + 1) {
      setErrorMessage(`Năm phát hành không hợp lệ (1900 - ${currentYear + 1}).`);
      return;
    }

    setIsSubmitting(true);
    setErrorMessage('');

    try {
      await documentApi.updateMetadata({
        fileId: targetFileId,
        title: title.trim(),
        releaseYear,
        releaseMonth: releaseMonth ? parseInt(releaseMonth, 10) : null,
        releaseDay: releaseDay ? parseInt(releaseDay, 10) : null,
        keywords: keywords.trim() || null,
        abstract: abstract.trim() || null,
        description: description.trim() || null,
      });

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (err: any) {
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
        err?.message ||
        'Đã có lỗi xảy ra khi cập nhật thông tin tài liệu.';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <Edit3 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Chỉnh Sửa Thông Tin Tài Liệu</h3>
              <p className="text-xs text-slate-500">Cập nhật thông tin mô tả cho tệp tin</p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        {isFetching ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-sm font-medium">Đang tải thông tin có sẵn của tệp...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
            {errorMessage && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-xs text-blue-900 leading-relaxed">
              * Thao tác này chỉ cập nhật thông tin mô tả và từ khóa. Tệp đính kèm và dung lượng lưu trữ của bạn được giữ nguyên không thay đổi.
            </div>

            {/* Tiêu đề */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Tiêu đề tài liệu <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                disabled={isSubmitting}
                placeholder="Nhập tiêu đề tài liệu..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Thời điểm phát hành */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Thời điểm phát hành <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Năm (*)</label>
                  <select
                    value={releaseYear}
                    onChange={(e) => setReleaseYear(Number(e.target.value))}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    {years.map((y) => (
                      <option key={y} value={y}>
                        Năm {y}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Tháng</label>
                  <select
                    value={releaseMonth}
                    onChange={(e) => setReleaseMonth(e.target.value)}
                    disabled={isSubmitting}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white"
                  >
                    <option value="">-- Không --</option>
                    {months.map((m) => (
                      <option key={m} value={m}>
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Ngày</label>
                  <select
                    value={releaseDay}
                    onChange={(e) => setReleaseDay(e.target.value)}
                    disabled={isSubmitting || !releaseMonth}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white disabled:bg-slate-100"
                  >
                    <option value="">-- Không --</option>
                    {days.map((d) => (
                      <option key={d} value={d}>
                        Ngày {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Từ khóa */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Từ khóa (Keywords)
              </label>
              <input
                type="text"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder="Cách nhau bằng dấu phẩy..."
                disabled={isSubmitting}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>

            {/* Tóm tắt */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Tóm tắt nội dung (Abstract)
              </label>
              <textarea
                rows={2}
                value={abstract}
                onChange={(e) => setAbstract(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm resize-none"
              />
            </div>

            {/* Mô tả chi tiết */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Ghi chú / Mô tả chi tiết
              </label>
              <textarea
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
                className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm resize-none"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 text-sm font-semibold text-slate-600 hover:text-slate-800 rounded-full cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-full shadow-md shadow-blue-500/20 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>{isSubmitting ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
