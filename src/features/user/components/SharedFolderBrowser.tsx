import React, { useEffect, useState } from 'react';
import { Folder, Download, ChevronRight, RefreshCw, FolderOpen, Eye } from 'lucide-react';
import { driveApi } from '../api/driveApi';
import { SharedFileItem } from '../types';

interface Props {
  onOpenFile: (file: SharedFileItem) => void;
  onDownloadFile: (file: SharedFileItem) => void;
}

export const SharedFolderBrowser: React.FC<Props> = ({ onOpenFile, onDownloadFile }) => {
  const [path, setPath] = useState<{ id: string; name: string }[]>([]);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [data, setData] = useState<Awaited<ReturnType<typeof driveApi.getSharedChildren>> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const folderId = path.at(-1)?.id;
  const pageSize = 20;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    setData(null);
    driveApi.getSharedChildren(folderId, page, pageSize).then(result => {
      if (active) setData(result);
    }).catch(() => {
      if (active) setError('Không thể mở thư mục. Quyền chia sẻ có thể đã bị thu hồi.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [folderId, page, revision]);

  const navigate = (next: typeof path) => { setPath(next); setPage(1); };
  const pages = Math.max(1, Math.ceil(Math.max(data?.totalFolders ?? 0,
    folderId ? data?.files.totalCount ?? 0 : 0) / pageSize));

  const hasFolders = Boolean(data?.folders && data.folders.length > 0);
  const hasFiles = Boolean(folderId && data?.files?.items && data.files.items.length > 0);

  // Nếu ở root và không có thư mục nào được chia sẻ và không đang load -> ẩn khối hoặc hiển thị nhẹ nhàng
  if (!loading && !hasFolders && !folderId && !error) {
    return null;
  }

  return (
    <section className="space-y-3" aria-label="Thư mục được chia sẻ">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <nav className="flex flex-wrap items-center gap-1.5 text-xs" aria-label="Đường dẫn thư mục chia sẻ">
          <button
            type="button"
            className={`font-semibold transition-colors cursor-pointer ${
              path.length === 0 ? 'text-slate-800' : 'text-blue-600 hover:text-blue-700 hover:underline'
            }`}
            onClick={() => navigate([])}
          >
            Thư mục được chia sẻ
          </button>
          {path.map((node, index) => (
            <React.Fragment key={node.id}>
              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <button
                type="button"
                className={`transition-colors cursor-pointer ${
                  index === path.length - 1
                    ? 'font-bold text-slate-800'
                    : 'text-blue-600 hover:text-blue-700 hover:underline'
                }`}
                onClick={() => navigate(path.slice(0, index + 1))}
              >
                {node.name}
              </button>
            </React.Fragment>
          ))}
        </nav>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setRevision(value => value + 1)}
            disabled={loading}
            aria-label="Làm mới thư mục"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-200/80 rounded-full shadow-2xs transition-colors cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin text-blue-600' : ''}`} />
            <span>Làm mới thư mục</span>
          </button>
        </div>
      </div>

      {/* Body Content */}
      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 animate-pulse">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-12 bg-slate-100 rounded-xl border border-slate-200/60" />
          ))}
        </div>
      ) : error ? (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-600 flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => setRevision(v => v + 1)}
            className="text-xs font-semibold text-rose-700 underline hover:no-underline ml-2"
          >
            Thử lại
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Folders Grid */}
          {hasFolders && (
            <div className="grid gap-2.5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {data?.folders.map(folder => (
                <button
                  type="button"
                  key={folder.id}
                  onClick={() => navigate([...path, folder])}
                  className="group flex items-center gap-3 p-3 bg-white hover:bg-blue-50/50 border border-slate-200/80 hover:border-blue-300 rounded-xl text-left transition-all duration-150 shadow-2xs cursor-pointer"
                >
                  <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-500 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <Folder className="w-4 h-4 fill-amber-500/20" />
                  </div>
                  <span className="text-xs font-semibold text-slate-700 group-hover:text-blue-700 truncate min-w-0">
                    {folder.name}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Files Inside Active Folder */}
          {hasFiles && (
            <div className="bg-white rounded-xl border border-slate-200/80 overflow-hidden shadow-2xs divide-y divide-slate-100">
              <div className="px-3.5 py-2 bg-slate-50/80 text-[11px] font-semibold text-slate-500">
                Tệp tin trong thư mục
              </div>
              {data?.files.items.map(file => (
                <div
                  key={file.id}
                  className="flex items-center justify-between gap-3 px-3.5 py-2 hover:bg-blue-50/30 transition-colors"
                >
                  <button
                    type="button"
                    className="text-xs font-medium text-slate-700 hover:text-blue-600 hover:underline text-left truncate cursor-pointer"
                    onClick={() => onOpenFile(file)}
                  >
                    {file.name}
                  </button>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      aria-label={`Xem ${file.name}`}
                      title="Xem trước"
                      onClick={() => onOpenFile(file)}
                    >
                      <Eye className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                      aria-label={`Tải xuống ${file.name}`}
                      title="Tải xuống"
                      onClick={() => onDownloadFile(file)}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty Folder Message */}
          {!hasFolders && folderId && !hasFiles && (
            <div className="p-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-slate-200/60">
              <FolderOpen className="w-6 h-6 mx-auto mb-1.5 text-slate-300" />
              <span>Thư mục này hiện không có tài liệu.</span>
            </div>
          )}

          {/* Pagination */}
          {pages > 1 && (
            <div className="flex items-center justify-end gap-2 text-xs text-slate-500 pt-1">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(v => v - 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Trang trước
              </button>
              <span className="font-medium text-slate-700">{page} / {pages}</span>
              <button
                type="button"
                disabled={page >= pages}
                onClick={() => setPage(v => v + 1)}
                className="px-2.5 py-1 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors cursor-pointer"
              >
                Trang sau
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
