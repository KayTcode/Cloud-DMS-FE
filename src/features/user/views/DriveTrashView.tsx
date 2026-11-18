import React, { useState, useEffect, useCallback } from 'react';
import {
  Trash2,
  Folder,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Image as ImageIcon,
  Presentation,
  RotateCcw,
  Lock,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import { driveTrashApi, DriveTrashItem } from '../api/driveTrashApi';
import { driveApi } from '../api/driveApi';
import { FileType } from '../types';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';

interface DriveTrashViewProps {
  driveKind: 'Personal' | 'DepartmentShared';
  driveOwnerId: string;
}

type TrashDisplayItem = DriveTrashItem;

/** Suy ra loại tệp từ phần mở rộng của tên: TrashItemDto không mang contentType. */
const fileTypeFromName = (name: string): FileType | undefined => {
  const ext = name.split('.').pop()?.toLowerCase();
  if (!ext) return undefined;
  if (ext === 'pdf') return 'pdf';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'sheet';
  if (['doc', 'docx'].includes(ext)) return 'docx';
  if (['ppt', 'pptx'].includes(ext)) return 'slide';
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(ext)) return 'image';
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return 'archive';
  if (['ts', 'tsx', 'js', 'jsx', 'cs', 'py', 'java', 'json', 'xml', 'sql'].includes(ext))
    return 'code';
  return undefined;
};

const getFileIcon = (name: string) => {
  switch (fileTypeFromName(name)) {
    case 'pdf':
      return <FileText className="w-5 h-5 text-red-500" />;
    case 'sheet':
      return <FileSpreadsheet className="w-5 h-5 text-emerald-600" />;
    case 'docx':
      return <FileText className="w-5 h-5 text-blue-600" />;
    case 'slide':
      return <Presentation className="w-5 h-5 text-amber-500" />;
    case 'image':
      return <ImageIcon className="w-5 h-5 text-violet-500" />;
    case 'code':
      return <FileCode className="w-5 h-5 text-slate-700" />;
    case 'archive':
      return <FileArchive className="w-5 h-5 text-amber-700" />;
    default:
      return <FileText className="w-5 h-5 text-slate-500" />;
  }
};

const DaysLeftBadge: React.FC<{ days: number }> = ({ days }) => {
  const color =
    days > 7
      ? 'bg-emerald-100 text-emerald-700'
      : days >= 3
      ? 'bg-amber-100 text-amber-700'
      : 'bg-rose-100 text-rose-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${color}`}>
      Còn {days} ngày
    </span>
  );
};

export const DriveTrashView: React.FC<DriveTrashViewProps> = ({ driveKind, driveOwnerId }) => {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<TrashDisplayItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Confirm dialogs
  const [confirmPurgeItem, setConfirmPurgeItem] = useState<TrashDisplayItem | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // GET api/drive/trash trả cả thư mục và tệp ở tầng trên cùng của thùng rác
  // cho cả ổ cá nhân và Kho chung, nên chỉ cần một request.
  const loadTrash = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const trash = await driveTrashApi.getTrash(driveKind, driveOwnerId);
      setItems(
        [...trash].sort(
          (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
        )
      );
    } catch (e: any) {
      // Không im lặng trả danh sách rỗng: thùng rác có dữ liệu sẽ trông như đang trống.
      setItems([]);
      setLoadError(e?.message || 'Không nạp được thùng rác. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  }, [driveKind, driveOwnerId]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const handleRestore = async (item: TrashDisplayItem) => {
    try {
      if (item.kind === 'folder') {
        await driveTrashApi.restoreFolder(item.id);
      } else {
        await driveApi.restoreFile(item.id);
      }
      showNotification(`Đã khôi phục "${item.name}" thành công!`, 'success');
      await loadTrash();
    } catch (e: any) {
      showNotification(e?.response?.data?.message || 'Khôi phục thất bại.', 'error');
    }
  };

  const handlePurge = async () => {
    if (!confirmPurgeItem) return;
    setActionLoading(true);
    try {
      if (confirmPurgeItem.kind === 'folder') {
        await driveTrashApi.purgeFolder(confirmPurgeItem.id);
      } else {
        await driveApi.deletePermanently(confirmPurgeItem.id);
      }
      showNotification(`Đã xoá vĩnh viễn "${confirmPurgeItem.name}".`, 'success');
      await loadTrash();
    } catch (e: any) {
      showNotification(e?.response?.data?.message || 'Xoá vĩnh viễn thất bại.', 'error');
    } finally {
      setActionLoading(false);
      setConfirmPurgeItem(null);
    }
  };

  const handleEmptyTrash = async () => {
    setActionLoading(true);
    try {
      // DELETE api/drive/trash dọn cả thư mục và tệp của ổ đĩa trong một lệnh.
      await driveTrashApi.emptyTrash(driveKind, driveOwnerId);
      showNotification('Đã dọn sạch thùng rác!', 'success');
      await loadTrash();
    } catch (e: any) {
      showNotification(e?.response?.data?.message || 'Dọn sạch thùng rác thất bại.', 'error');
    } finally {
      setActionLoading(false);
      setConfirmEmptyTrash(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Notification */}
      {notification && (
        <div
          className={`p-3 rounded-lg border text-xs font-semibold flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {notification.message}
          <button onClick={() => setNotification(null)} className="ml-4 text-slate-400 hover:text-slate-600">✕</button>
        </div>
      )}

      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Trash2 className="w-5 h-5 text-rose-500" />
            <span>Thùng rác</span>
            {items.length > 0 && (
              <span className="text-xs font-semibold bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200/60">
                {items.length} mục
              </span>
            )}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Các mục trong thùng rác sẽ tự động bị xoá vĩnh viễn sau 30 ngày.
          </p>
        </div>
        <button
          disabled={items.length === 0 || actionLoading}
          onClick={() => setConfirmEmptyTrash(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-full text-xs font-semibold transition-all cursor-pointer shadow-2xs self-start sm:self-auto"
        >
          <Trash2 className="w-4 h-4" />
          <span>Dọn sạch thùng rác</span>
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700">Đang nạp thùng rác...</p>
        </div>
      ) : loadError ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
            <AlertTriangle className="w-8 h-8 text-rose-500 stroke-[1.8]" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Không nạp được thùng rác</h3>
          <p className="text-xs text-rose-700 mt-1">{loadError}</p>
          <button
            onClick={loadTrash}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-full text-xs font-semibold cursor-pointer"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Thử lại</span>
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 flex items-center justify-center mb-4">
            <Trash2 className="w-8 h-8 text-rose-400 stroke-[1.8]" />
          </div>
          <h3 className="text-base font-bold text-slate-900">Thùng rác trống.</h3>
          <p className="text-xs text-slate-500 mt-1">Không có mục nào trong thùng rác.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[11px] bg-slate-50/50">
                  <th className="py-3.5 px-4 w-10">#</th>
                  <th className="py-3.5 px-4">Tên</th>
                  <th className="py-3.5 px-4">Loại</th>
                  <th className="py-3.5 px-4">Xoá lúc</th>
                  <th className="py-3.5 px-4">Thời hạn</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.id} className="hover:bg-slate-50/70 transition-colors group">
                    <td className="py-3 px-4 text-slate-400 font-mono">{idx + 1}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.kind === 'folder' ? (
                          <Folder className="w-5 h-5 text-amber-500 fill-amber-100 shrink-0" />
                        ) : (
                          <span className="shrink-0">{getFileIcon(item.name)}</span>
                        )}
                        <span className="font-semibold text-slate-800 truncate max-w-[220px]" title={item.name}>
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {item.kind === 'folder' ? 'Thư mục' : 'Tệp tin'}
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {item.deletedAt
                        ? (() => {
                            try {
                              return new Date(item.deletedAt).toLocaleDateString('vi-VN') +
                                ' ' +
                                new Date(item.deletedAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                            } catch {
                              return item.deletedAt;
                            }
                          })()
                        : '—'}
                    </td>
                    <td className="py-3 px-4">
                      <DaysLeftBadge days={item.daysLeft} />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {(
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleRestore(item)}
                            className="px-2.5 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Khôi phục"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                            Khôi phục
                          </button>
                          <button
                            onClick={() => setConfirmPurgeItem(item)}
                            className="px-2.5 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Xoá vĩnh viễn"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Xoá vĩnh viễn
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Confirm Purge Single */}
      <ConfirmDialog
        isOpen={confirmPurgeItem !== null}
        onClose={() => setConfirmPurgeItem(null)}
        onConfirm={handlePurge}
        title="Xoá vĩnh viễn?"
        message={`"${confirmPurgeItem?.name}" sẽ bị xoá vĩnh viễn. Thao tác này không thể hoàn tác.`}
        confirmText="Xoá vĩnh viễn"
        cancelText="Hủy"
        variant="danger"
        isLoading={actionLoading}
      />

      {/* Confirm Empty Trash */}
      <ConfirmDialog
        isOpen={confirmEmptyTrash}
        onClose={() => setConfirmEmptyTrash(false)}
        onConfirm={handleEmptyTrash}
        title="Dọn sạch thùng rác?"
        message="Dọn sạch thùng rác sẽ xoá vĩnh viễn tất cả các mục. Bạn có chắc chắn không?"
        confirmText="Dọn sạch"
        cancelText="Hủy"
        variant="danger"
        isLoading={actionLoading}
      />
    </div>
  );
};
