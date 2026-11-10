import React, { useState, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  HardDrive,
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  Clock,
} from 'lucide-react';
import { NotificationDto, NotificationType } from '@/features/notifications';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: NotificationDto[];
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onItemClick: (id: string) => void;
  onMarkAllRead: () => void;
}

function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return 'Vừa xong';
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays === 1) return 'Hôm qua';
    if (diffDays < 7) return `${diffDays} ngày trước`;

    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateString;
  }
}

function NotificationIconBadge({ type }: { type: NotificationType }) {
  switch (type) {
    case 'QuotaLocked':
      return (
        <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 border border-rose-100 flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4" />
        </div>
      );
    case 'QuotaUnlocked':
      return (
        <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-4 h-4" />
        </div>
      );
    case 'QuotaRequest':
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
          <HardDrive className="w-4 h-4" />
        </div>
      );
    case 'StorageProviderAlert':
      return (
        <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-4 h-4" />
        </div>
      );
    case 'General':
    default:
      return (
        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center shrink-0">
          <Bell className="w-4 h-4" />
        </div>
      );
  }
}

function getNotificationTag(type: NotificationType): { label: string; className: string } {
  switch (type) {
    case 'QuotaLocked':
      return { label: 'Khóa Dung Lượng', className: 'text-rose-700 bg-rose-50 border-rose-200' };
    case 'QuotaUnlocked':
      return { label: 'Mở Khóa Quota', className: 'text-emerald-700 bg-emerald-50 border-emerald-200' };
    case 'QuotaRequest':
      return { label: 'Yêu Cầu Quota', className: 'text-amber-700 bg-amber-50 border-amber-200' };
    case 'StorageProviderAlert':
      return { label: 'Cảnh Báo Lưu Trữ', className: 'text-amber-700 bg-amber-50 border-amber-200' };
    case 'General':
    default:
      return { label: 'Hệ Thống', className: 'text-blue-700 bg-blue-50 border-blue-200' };
  }
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  items,
  isLoading,
  hasMore,
  onLoadMore,
  onItemClick,
  onMarkAllRead,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const unreadCount = useMemo(() => items.filter((n) => !n.isRead).length, [items]);

  const filteredItems = useMemo(() => {
    if (filter === 'unread') {
      return items.filter((n) => !n.isRead);
    }
    return items;
  }, [items, filter]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/25 backdrop-blur-2xs transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-slate-900 text-sm">Thông báo</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-100 text-blue-700">
                {unreadCount} mới
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100/80 rounded-full transition-colors cursor-pointer"
                title="Đánh dấu tất cả đã đọc"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đã đọc</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Đóng"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Chips */}
        <div className="px-4 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            Tất cả ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('unread')}
            className={`px-3 py-1 text-xs font-semibold rounded-full transition-all cursor-pointer ${
              filter === 'unread'
                ? 'bg-blue-600 text-white shadow-2xs'
                : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
            }`}
          >
            Chưa đọc ({unreadCount})
          </button>
        </div>

        {/* List Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredItems.length === 0 && !isLoading && (
            <div className="text-center py-12 px-4">
              <div className="w-14 h-14 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mx-auto mb-3 border border-slate-100">
                <BellOff className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-700">
                {filter === 'unread' ? 'Không có thông báo chưa đọc' : 'Chưa có thông báo nào'}
              </h4>
              <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
                {filter === 'unread'
                  ? 'Bạn đã xem hết các thông báo mới.'
                  : 'Bạn đã cập nhật hết mọi tin tức và hoạt động gần đây.'}
              </p>
            </div>
          )}

          {filteredItems.map((n) => {
            const tag = getNotificationTag(n.type);

            return (
              <div
                key={n.id}
                onClick={() => !n.isRead && onItemClick(n.id)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                  n.isRead
                    ? 'border-slate-200/80 bg-white hover:bg-slate-50/80 text-slate-600'
                    : 'border-blue-200/90 bg-blue-50/30 hover:bg-blue-50/60 text-slate-900 shadow-2xs ring-1 ring-blue-100/50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <NotificationIconBadge type={n.type} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="text-xs font-bold text-slate-900 truncate">{n.title}</div>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-600 shrink-0 ring-2 ring-blue-100 animate-pulse" />
                      )}
                    </div>
                    <div className="text-[11px] text-slate-600 mt-1 whitespace-pre-line break-words leading-relaxed">
                      {n.content}
                    </div>

                    <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-100">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${tag.className}`}>
                        {tag.label}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-slate-400" />
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            </div>
          )}

          {hasMore && !isLoading && (
            <button
              onClick={onLoadMore}
              className="w-full py-2 px-4 rounded-full border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-all flex items-center justify-center gap-1.5 cursor-pointer mt-2"
            >
              <span>Xem thêm thông báo cũ hơn</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
