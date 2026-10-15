import React, { useState, useEffect, useCallback } from 'react';
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
  Eye,
  RefreshCw,
  AlertCircle,
  Clock,
  Layers,
} from 'lucide-react';
import { DriveItem, FileTextItem, FileTextResult, PreviewResult } from '../types';
import { driveApi } from '../api/driveApi';

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
  const [activeTab, setActiveTab] = useState<'preview' | 'text'>('preview');

  // Preview state
  const [previewResult, setPreviewResult] = useState<PreviewResult | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewPollingCount, setPreviewPollingCount] = useState(0);

  // Extracted text state
  const [textResult, setTextResult] = useState<FileTextResult | null>(null);
  const [textItems, setTextItems] = useState<FileTextItem[]>([]);
  const [isLoadingText, setIsLoadingText] = useState(false);
  const [isLoadingMoreText, setIsLoadingMoreText] = useState(false);
  const [copiedText, setCopiedText] = useState(false);

  // Load preview data
  const loadPreview = useCallback(async (fileId: string) => {
    try {
      setIsLoadingPreview(true);
      const res = await driveApi.getFilePreview(fileId);
      setPreviewResult(res);

      // If pending, poll again after 2.5s up to 3 times
      if (res.status === 'pending' && previewPollingCount < 3) {
        setTimeout(() => {
          setPreviewPollingCount((prev) => prev + 1);
        }, 2500);
      }
    } catch (err) {
      setPreviewResult({
        status: 'unavailable',
        documentVersion: 0,
        reason: 'Không thể kết nối đến dịch vụ xem trước.',
      });
    } finally {
      setIsLoadingPreview(false);
    }
  }, [previewPollingCount]);

  // Load extracted text data
  const loadText = useCallback(async (fileId: string, cursor?: string | null) => {
    try {
      if (cursor) {
        setIsLoadingMoreText(true);
      } else {
        setIsLoadingText(true);
      }

      const res = await driveApi.getFileText(fileId, 20, cursor);
      setTextResult(res);
      if (cursor) {
        setTextItems((prev) => [...prev, ...(res.items || [])]);
      } else {
        setTextItems(res.items || []);
      }
    } catch (err) {
      setTextResult({
        status: 'unavailable',
        documentVersion: 0,
        items: [],
        reason: 'Không thể tải nội dung văn bản.',
      });
    } finally {
      setIsLoadingText(false);
      setIsLoadingMoreText(false);
    }
  }, []);

  // When file changes, reset and load
  useEffect(() => {
    if (file) {
      setPreviewResult(null);
      setTextResult(null);
      setTextItems([]);
      setPreviewPollingCount(0);
      setActiveTab('preview');

      loadPreview(file.id);
    }
  }, [file?.id]);

  // When tab switches to text, load text if not yet loaded
  useEffect(() => {
    if (activeTab === 'text' && file && !textResult) {
      loadText(file.id);
    }
  }, [activeTab, file?.id, textResult, loadText]);

  // Handle copy text
  const handleCopyAllText = () => {
    if (!textItems.length) return;
    const allText = textItems.map((item) => item.text).join('\n\n');
    navigator.clipboard.writeText(allText);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2500);
  };

  if (!file) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-4xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 shadow-xs border border-blue-100">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-slate-900 truncate" title={file.name}>
                {file.name}
              </h3>
              <p className="text-[11px] text-slate-400">
                {file.sizeFormatted} · Cập nhật: {file.updatedAt}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!file.trashed && (
              <>
                <button
                  onClick={() => onToggleStar(file.id)}
                  className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                    file.starred
                      ? 'border-amber-200 bg-amber-50 text-amber-500'
                      : 'border-slate-200 text-slate-400 hover:text-amber-500 hover:bg-amber-50/50'
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
              </>
            )}
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
              title={file.trashed ? 'Xóa tệp' : 'Chuyển vào thùng rác'}
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <div className="h-5 w-px bg-slate-200 mx-1" />
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Đóng (Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Toggle Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 pb-2 border-b border-slate-100 bg-slate-50/60 shrink-0">
          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'preview'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Xem trước trực quan</span>
            {previewResult?.status === 'ready' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('text')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'text'
                ? 'bg-white text-blue-700 shadow-xs border border-slate-200/90'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Nội dung văn bản (Trích xuất)</span>
            {textItems.length > 0 && (
              <span className="px-1.5 py-0.2 bg-blue-100 text-blue-700 rounded-full text-[10px]">
                {textItems.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: VISUAL PREVIEW */}
          {activeTab === 'preview' && (
            <div className="bg-slate-50/80 border border-slate-200/90 rounded-2xl p-6 min-h-[340px] flex flex-col items-center justify-center relative overflow-hidden">
              {isLoadingPreview && !previewResult?.previewUrl ? (
                <div className="text-center space-y-3 py-10">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-700">
                    Đang nạp bản xem trước an toàn...
                  </p>
                </div>
              ) : previewResult?.status === 'ready' && previewResult.previewUrl ? (
                <div className="w-full flex flex-col items-center">
                  {['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(file.extension?.toLowerCase() || '') ? (
                    <img
                      src={previewResult.previewUrl}
                      alt={file.name}
                      className="max-h-[480px] w-auto max-w-full object-contain rounded-xl shadow-md border border-slate-200/60"
                    />
                  ) : (
                    <iframe
                      src={previewResult.previewUrl}
                      title={file.name}
                      className="w-full h-[520px] rounded-xl border border-slate-200 bg-white shadow-xs"
                    />
                  )}
                  <p className="text-[11px] text-slate-400 mt-3">
                    Được bảo vệ bởi cơ chế Presigned Read Access an toàn.
                  </p>
                </div>
              ) : previewResult?.status === 'pending' ? (
                <div className="text-center space-y-3 max-w-sm py-8">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-xs">
                    <Clock className="w-6 h-6 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">Bản xem trước đang được xử lý</h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Hệ thống đang chuyển đổi tài liệu ngầm theo kiến trúc sandbox an toàn. Vui lòng thử lại sau vài giây hoặc xem tab bóc tách văn bản.
                    </p>
                  </div>
                  <button
                    onClick={() => loadPreview(file.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Làm mới trạng thái</span>
                  </button>
                </div>
              ) : previewResult?.status === 'unsupported' ? (
                <div className="text-center space-y-3 max-w-md py-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">
                      Định dạng .{file.extension || 'file'} chưa hỗ trợ xem trực quan
                    </h4>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Bạn có thể chuyển sang tab <b>"Nội dung văn bản (Trích xuất)"</b> để đọc văn bản bóc tách, hoặc tải tệp tin về máy.
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => setActiveTab('text')}
                      className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer transition-colors"
                    >
                      Xem văn bản trích xuất
                    </button>
                    <button
                      onClick={() => onDownload(file)}
                      className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer transition-colors"
                    >
                      Tải xuống tệp gốc
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3 max-w-md py-8">
                  <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-800">Xem trước chưa sẵn sàng</h4>
                    <p className="text-xs text-slate-500 mt-1">
                      {previewResult?.reason || 'Chưa thể tạo bản xem trước trực quan cho tệp tin này.'}
                    </p>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <button
                      onClick={() => loadPreview(file.id)}
                      className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Thử lại</span>
                    </button>
                    <button
                      onClick={() => onDownload(file)}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                    >
                      Tải xuống
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EXTRACTED TEXT (GET-TEXT) */}
          {activeTab === 'text' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Các phân đoạn văn bản đã trích xuất
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Nội dung plain text được hệ thống OCR & Text Extraction bóc tách tự động.
                  </p>
                </div>
                {textItems.length > 0 && (
                  <button
                    onClick={handleCopyAllText}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã sao chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Sao chép toàn bộ</span>
                      </>
                    )}
                  </button>
                )}
              </div>

              {isLoadingText ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-12 text-center space-y-3">
                  <RefreshCw className="w-7 h-7 text-blue-600 animate-spin mx-auto" />
                  <p className="text-xs font-semibold text-slate-600">
                    Đang nạp nội dung trích xuất từ server...
                  </p>
                </div>
              ) : textResult?.status === 'pending' ? (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-8 text-center space-y-2">
                  <Clock className="w-8 h-8 text-amber-600 animate-pulse mx-auto" />
                  <h5 className="text-xs font-bold text-amber-900">Văn bản đang trong tiến trình bóc tách</h5>
                  <p className="text-[11px] text-amber-700 max-w-sm mx-auto">
                    Hệ thống đang thực hiện bóc tách chỉ mục văn bản. Vui lòng quay lại sau vài giây.
                  </p>
                  <button
                    onClick={() => loadText(file.id)}
                    className="mt-2 px-3 py-1 bg-white border border-amber-300 text-amber-800 text-xs font-medium rounded-md shadow-2xs"
                  >
                    Thử lại
                  </button>
                </div>
              ) : textItems.length === 0 ? (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-8 text-center space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <h5 className="text-xs font-bold text-slate-800">Không tìm thấy nội dung văn bản</h5>
                  <p className="text-[11px] text-slate-500">
                    Tệp tin này chưa có nội dung văn bản trích xuất hoặc là tệp nhị phân không chứa text.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {textItems.map((chunk, idx) => (
                    <div
                      key={idx}
                      className="bg-white border border-slate-200/90 rounded-xl p-4 shadow-2xs space-y-2 hover:border-blue-200 transition-colors"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                          Đoạn #{chunk.ordinal + 1}
                        </span>
                        {chunk.location && <span>Vị trí: {chunk.location}</span>}
                      </div>
                      <div className="text-xs text-slate-800 font-mono leading-relaxed whitespace-pre-wrap bg-slate-50/60 p-3 rounded-lg border border-slate-100">
                        {chunk.text}
                      </div>
                    </div>
                  ))}

                  {/* Load More Chunks via Cursor */}
                  {textResult?.nextCursor && (
                    <div className="pt-2 text-center">
                      <button
                        onClick={() => loadText(file.id, textResult.nextCursor)}
                        disabled={isLoadingMoreText}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-lg border border-blue-200 shadow-2xs transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                      >
                        {isLoadingMoreText && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                        <span>Tải tiếp các đoạn văn bản sau</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Metadata Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
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
                <span>Thẻ phân loại:</span>
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
