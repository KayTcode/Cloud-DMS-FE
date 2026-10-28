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
import { folderApi } from '../api/folderApi';
import { driveApi } from '../api/driveApi';
import { TrashFolderItem } from '../types/folder.types';
import { DriveItem, FileType } from '../types';
import { ConfirmDialog } from '@/components/feedback/ConfirmDialog';

interface DriveTrashViewProps {
  driveKind: 'Personal' | 'DepartmentShared';
  driveOwnerId: string;
}

interface TrashDisplayItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  deletedAt: string;
  daysLeft: number;
  lockedByParent: boolean;
  fileType?: FileType;
  size?: number;
  sizeFormatted?: string;
}

const getFileIcon = (fileType?: FileType) => {
  switch (fileType) {
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

  // Confirm dialogs
  const [confirmPurgeItem, setConfirmPurgeItem] = useState<TrashDisplayItem | null>(null);
  const [confirmEmptyTrash, setConfirmEmptyTrash] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const showNotification = (message: string, type: 'success' | 'error' = 'success') => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const [folderTrash, fileTrash] = await Promise.all([
        folderApi.getTrash(driveKind, driveOwnerId),
        driveApi.getTrashFiles(1, 100),
      ]);

      const folderItems: TrashDisplayItem[] = (folderTrash as TrashFolderItem[]).map((f) => ({
        id: f.id,
        name: f.name,
        type: 'folder',
        deletedAt: f.deletedAt,
        daysLeft: f.daysLeft,
        lockedByParent: f.trashedWithFolderId !== null,
      }));

      const fileItems: TrashDisplayItem[] = fileTrash.items.map((f: DriveItem) => {
        const deletedAtRaw = (f as any).deletedAtRaw || f.deletedAt || new Date().toISOString();
        const daysLeft = Math.max(
          0,
          30 - Math.floor((Date.now() - new Date(deletedAtRaw).getTime()) / 86400000)
        );
        return {
          id: f.id,
          name: f.name,
          type: 'file',
          deletedAt: f.deletedAt || deletedAtRaw,
          daysLeft,
          lockedByParent: (f as any).trashedWithFolderId !== null && (f as any).trashedWithFolderId !== undefined,
          fileType: f.fileType,
          size: f.size,
          sizeFormatted: f.sizeFormatted,
        };
      });

      const merged = [...folderItems, ...fileItems].sort(
        (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
      );
      setItems(merged);
    } catch (e) {
      console.error('Lỗi nạp thùng rác:', e);
    } finally {
      setLoading(false);
    }
  }, [driveKind, driveOwnerId]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const handleRestore = async (item: TrashDisplayItem) => {
    try {
      if (item.type === 'folder') {
        await folderApi.restoreFolder(item.id);
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
      if (confirmPurgeItem.type === 'folder') {
        await folderApi.purgeFolder(confirmPurgeItem.id);
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
      await folderApi.emptyTrash(driveKind, driveOwnerId);
      // Also delete all individual file items
      const fileItems = items.filter((i) => i.type === 'file' && !i.lockedByParent);
      await Promise.allSettled(fileItems.map((f) => driveApi.deletePermanently(f.id)));
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-rose-800 flex items-center gap-2">
          <Trash2 className="w-5 h-5 text-rose-600" />
          Thùng rác
          {items.length > 0 && (
            <span className="text-xs font-semibold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">
              {items.length}
            </span>
          )}
        </h2>
        <button
          disabled={items.length === 0 || actionLoading}
          onClick={() => setConfirmEmptyTrash(true)}
          className="inline-flex items-center gap-2 px-4 py-2 border border-rose-300 text-rose-600 hover:bg-rose-50 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-xs font-semibold transition-colors cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
          Dọn sạch thùng rác
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center flex flex-col items-center justify-center">
          <RefreshCw className="w-8 h-8 text-rose-500 animate-spin mb-3" />
          <p className="text-sm font-semibold text-slate-700">Đang nạp thùng rác...</p>
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
        <div className="bg-white rounded-xl border border-slate-200/90 shadow-xs overflow-hidden">
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
                        {item.type === 'folder' ? (
                          <Folder className="w-5 h-5 text-amber-500 fill-amber-100 shrink-0" />
                        ) : (
                          <span className="shrink-0">{getFileIcon(item.fileType)}</span>
                        )}
                        <span className="font-semibold text-slate-800 truncate max-w-[220px]" title={item.name}>
                          {item.name}
                        </span>
                        {item.lockedByParent && (
                          <span title="Bị xoá theo thư mục cha" className="shrink-0">
                            <Lock className="w-3.5 h-3.5 text-slate-400" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {item.type === 'folder' ? 'Thư mục' : 'Tệp tin'}
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
                      {item.lockedByParent ? (
                        <span className="text-[11px] text-slate-400 italic">Bị xoá theo thư mục cha</span>
                      ) : (
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
