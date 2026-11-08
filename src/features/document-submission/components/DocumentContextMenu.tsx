import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  MoreVertical,
  FileText,
  Pencil,
  RefreshCw,
  Clock,
  ExternalLink,
  Download,
  Share2,
  Star,
  Trash2,
  Info,
  ChevronRight,
} from 'lucide-react';

export interface DocumentContextMenuProps {
  file: {
    id: string;
    name: string;
    starred?: boolean;
    archiveKind?: string | null;
  };
  docModals: {
    openDetails: (fileId: string) => void;
    openEdit: (target: string | any) => void;
    openReplace: (fileId: string, fileName: string) => void;
    openExtend: (target: string | any) => void;
  };
  onOpenPreview?: () => void;
  onDownload?: () => void;
  onShare?: () => void;
  onRename?: () => void;
  onToggleStar?: () => void;
  onDelete?: () => void;
  align?: 'right' | 'left';
  className?: string;
  triggerButtonClassName?: string;
}

export const DocumentContextMenu: React.FC<DocumentContextMenuProps> = ({
  file,
  docModals,
  onOpenPreview,
  onDownload,
  onShare,
  onRename,
  onToggleStar,
  onDelete,
  align = 'right',
  className = '',
  triggerButtonClassName = '',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);

  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const infoItemRef = useRef<HTMLDivElement>(null);
  const submenuRef = useRef<HTMLDivElement>(null);
  const submenuTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [menuCoords, setMenuCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const [submenuCoords, setSubmenuCoords] = useState<{ top: number; left: number }>({
    top: 0,
    left: 0,
  });

  const calculateMenuPosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuWidth = 240;
    const estimatedHeight = 290;

    // Tính toán chiều dọc (mở xuống hay mở lên nếu sát đáy màn hình)
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpwards = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;

    let top = openUpwards ? rect.top - estimatedHeight - 4 : rect.bottom + 4;
    if (top < 8) top = 8;
    if (top + estimatedHeight > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - estimatedHeight - 8);
    }

    // Tính toán chiều ngang (căn phải hay căn trái)
    let left = align === 'right' ? rect.right - menuWidth : rect.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = window.innerWidth - menuWidth - 8;
    }
    if (left < 8) {
      left = 8;
    }

    setMenuCoords({ top, left });
  }, [align]);

  const calculateSubmenuPosition = useCallback(() => {
    if (!infoItemRef.current) return;
    const itemRect = infoItemRef.current.getBoundingClientRect();
    const submenuWidth = 224;
    const submenuHeight = 135;

    // Kiểm tra không gian bên phải menu chính
    const spaceRight = window.innerWidth - itemRect.right;
    let left: number;
    if (spaceRight >= submenuWidth + 8) {
      left = itemRect.right + 2;
    } else {
      left = Math.max(8, itemRect.left - submenuWidth - 2);
    }

    // Căn dọc với item "Thông tin về tệp"
    let top = itemRect.top - 4;
    if (top + submenuHeight > window.innerHeight - 8) {
      top = Math.max(8, window.innerHeight - submenuHeight - 8);
    }

    setSubmenuCoords({ top, left });
  }, []);

  const handleOpenMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isOpen) {
      calculateMenuPosition();
      setIsOpen(true);
      setIsSubmenuOpen(false);
    } else {
      setIsOpen(false);
      setIsSubmenuOpen(false);
    }
  };

  const handleAction = (action: () => void) => {
    action();
    setIsOpen(false);
    setIsSubmenuOpen(false);
  };

  const handleSubmenuEnter = () => {
    if (submenuTimeoutRef.current) clearTimeout(submenuTimeoutRef.current);
    calculateSubmenuPosition();
    setIsSubmenuOpen(true);
  };

  const handleSubmenuLeave = () => {
    submenuTimeoutRef.current = setTimeout(() => {
      setIsSubmenuOpen(false);
    }, 200);
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        triggerRef.current &&
        !triggerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target) &&
        submenuRef.current &&
        !submenuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsSubmenuOpen(false);
      }
    };

    const handleScrollOrResize = (e: Event) => {
      // Khi cuộn trang ngoài menu, đóng lại để tránh lệch tọa độ
      const target = e.target as Node;
      if (
        menuRef.current &&
        !menuRef.current.contains(target) &&
        submenuRef.current &&
        !submenuRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsSubmenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isOpen]);

  return (
    <div className={`relative shrink-0 ${className}`}>
      {/* Nút 3 chấm ⋮ */}
      <button
        ref={triggerRef}
        type="button"
        onClick={handleOpenMenu}
        className={
          triggerButtonClassName ||
          'p-1.5 rounded-full text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer'
        }
        title="Tùy chọn khác"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {/* Render Portal ra document.body để KHÔNG BAO GIỜ BỊ CHE bởi overflow-hidden hay z-index */}
      {isOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              top: `${menuCoords.top}px`,
              left: `${menuCoords.left}px`,
            }}
            className="w-60 bg-white rounded-xl shadow-2xl border border-slate-200/95 py-1.5 z-[9999] text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95 duration-100 select-none"
          >
            {/* 1. Mở / Xem trước */}
            {onOpenPreview && (
              <button
                type="button"
                onClick={() => handleAction(onOpenPreview)}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-100/80 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="flex-1">Mở / Xem trước</span>
              </button>
            )}

            {/* 2. Tải xuống */}
            {onDownload && (
              <button
                type="button"
                onClick={() => handleAction(onDownload)}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-100/80 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <Download className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="flex-1">Tải xuống</span>
              </button>
            )}

            {/* 3. Đổi tên (Kèm phím tắt gợi ý Ctrl+Alt+E) */}
            <button
              type="button"
              onClick={() => handleAction(onRename || (() => docModals.openEdit(file.id)))}
              className="w-full px-3.5 py-2 text-left hover:bg-slate-100/80 flex items-center justify-between transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <Pencil className="w-4 h-4 text-slate-500 shrink-0" />
                <span>Đổi tên</span>
              </div>
              <span className="text-[11px] text-slate-400 font-normal">Ctrl+Alt+E</span>
            </button>

            <div className="h-px bg-slate-100 my-1" />

            {/* 4. Chia sẻ */}
            {onShare && (
              <button
                type="button"
                onClick={() => handleAction(onShare)}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-100/80 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="flex-1">Chia sẻ</span>
              </button>
            )}

            {/* 5. Thay thế tệp mới */}
            <button
              type="button"
              onClick={() => handleAction(() => docModals.openReplace(file.id, file.name))}
              className="w-full px-3.5 py-2 text-left hover:bg-slate-100/80 flex items-center gap-3 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="flex-1">Thay thế tệp mới</span>
            </button>

            {/* 6. Gắn dấu sao */}
            {onToggleStar && (
              <button
                type="button"
                onClick={() => handleAction(onToggleStar)}
                className="w-full px-3.5 py-2 text-left hover:bg-slate-100/80 flex items-center gap-3 transition-colors cursor-pointer"
              >
                <Star
                  className={`w-4 h-4 shrink-0 ${
                    file.starred ? 'fill-amber-400 text-amber-500' : 'text-slate-400'
                  }`}
                />
                <span className="flex-1">{file.starred ? 'Bỏ gắn sao' : 'Gắn dấu sao'}</span>
              </button>
            )}

            {/* 7. Thông tin về tệp (Submenu Google Drive) */}
            <div
              ref={infoItemRef}
              className="relative"
              onMouseEnter={handleSubmenuEnter}
              onMouseLeave={handleSubmenuLeave}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  calculateSubmenuPosition();
                  setIsSubmenuOpen(!isSubmenuOpen);
                }}
                className={`w-full px-3.5 py-2 text-left flex items-center justify-between transition-colors cursor-pointer ${
                  isSubmenuOpen ? 'bg-slate-100 text-slate-900 font-semibold' : 'hover:bg-slate-100/80'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Info className="w-4 h-4 text-slate-500 shrink-0" />
                  <span>Thông tin về tệp</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </button>
            </div>

            <div className="h-px bg-slate-100 my-1" />

            {/* 8. Chuyển vào thùng rác (Chuẩn Google Drive - nhãn Delete) */}
            {onDelete && (
              <button
                type="button"
                onClick={() => handleAction(onDelete)}
                className="w-full px-3.5 py-2 text-left hover:bg-rose-50 flex items-center justify-between text-slate-700 hover:text-rose-600 transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Trash2 className="w-4 h-4 text-slate-500 group-hover:text-rose-600 shrink-0" />
                  <span>Chuyển vào thùng rác</span>
                </div>
                <span className="text-[11px] text-slate-400 group-hover:text-rose-400 font-normal">
                  Delete
                </span>
              </button>
            )}
          </div>,
          document.body
        )}

      {/* Render Submenu Portal ra document.body */}
      {isOpen &&
        isSubmenuOpen &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={submenuRef}
            onClick={(e) => e.stopPropagation()}
            onMouseEnter={handleSubmenuEnter}
            onMouseLeave={handleSubmenuLeave}
            style={{
              position: 'fixed',
              top: `${submenuCoords.top}px`,
              left: `${submenuCoords.left}px`,
            }}
            className="w-56 bg-white rounded-xl shadow-2xl border border-slate-200/95 py-1.5 z-[10000] text-xs font-medium text-slate-700 animate-in fade-in zoom-in-95 duration-100 select-none"
          >
            <button
              type="button"
              onClick={() => handleAction(() => docModals.openDetails(file.id))}
              className="w-full px-3.5 py-2 text-left hover:bg-blue-50 flex items-center gap-2.5 text-slate-700 hover:text-blue-700 font-medium transition-colors cursor-pointer"
            >
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Xem chi tiết tệp</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(() => docModals.openEdit(file.id))}
              className="w-full px-3.5 py-2 text-left hover:bg-slate-100 flex items-center gap-2.5 text-slate-700 transition-colors cursor-pointer"
            >
              <Pencil className="w-4 h-4 text-slate-500 shrink-0" />
              <span>Chỉnh sửa thông tin tệp</span>
            </button>

            <button
              type="button"
              onClick={() => handleAction(() => docModals.openExtend(file.id))}
              className="w-full px-3.5 py-2 text-left hover:bg-slate-100 flex items-center gap-2.5 text-slate-700 transition-colors cursor-pointer"
            >
              <Clock className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Thời hạn lưu trữ & Gia hạn</span>
            </button>
          </div>,
          document.body
        )}
    </div>
  );
};
