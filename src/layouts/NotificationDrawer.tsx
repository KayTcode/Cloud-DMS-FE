import React from 'react';
import { X, CheckCircle2, AlertCircle, Info, Loader2 } from 'lucide-react';
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

function NotificationIcon({ type }: { type: NotificationType }) {
  if (type === 'QuotaLocked') {
    return <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
  }
  if (type === 'QuotaUnlocked') {
    return <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />;
  }
  return <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />;
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
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div
        className="absolute inset-0 bg-slate-900/20 backdrop-blur-2xs"
        onClick={onClose}
      />
      <div className="absolute inset-y-0 right-0 max-w-sm w-full bg-white shadow-2xl border-l border-slate-200 flex flex-col">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Thông báo</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={onMarkAllRead}
              className="text-xs text-blue-600 hover:underline font-medium cursor-pointer"
            >
              Đánh dấu tất cả đã đọc
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {items.length === 0 && !isLoading && (
            <p className="text-sm text-slate-500 text-center py-8">Chưa có thông báo nào.</p>
          )}

          {items.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && onItemClick(n.id)}
              className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                n.isRead
                  ? 'border-slate-100 bg-slate-50/60 hover:bg-slate-50'
                  : 'border-blue-100 bg-blue-50/60 hover:bg-blue-50'
              }`}
            >
              <div className="flex items-start gap-2.5">
                <NotificationIcon type={n.type} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <div className="text-xs font-bold text-slate-900">{n.title}</div>
                    {!n.isRead && (
                      <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    )}
                  </div>
                  <div className="text-[11px] text-slate-600 mt-0.5 whitespace-pre-line break-words">
                    {n.content}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-1.5 tabular-nums font-mono">
                    {new Date(n.createdAt).toLocaleString('vi-VN')}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            </div>
          )}

          {hasMore && !isLoading && (
            <button
              onClick={onLoadMore}
              className="w-full text-xs text-blue-600 hover:underline font-medium py-2 cursor-pointer"
            >
              Xem thêm
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
