import React, { useEffect, useState } from 'react';
import { Folder, Download, ChevronRight, RefreshCw } from 'lucide-react';
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

  return <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-3" aria-label="Thư mục được chia sẻ">
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-semibold text-slate-900">Thư mục được chia sẻ</h2>
      <button type="button" onClick={() => setRevision(value => value + 1)} disabled={loading}
        aria-label="Làm mới thư mục" className="p-2 rounded hover:bg-slate-100 disabled:opacity-50">
        <RefreshCw className="w-4 h-4" />
      </button>
    </div>
    <nav className="flex flex-wrap items-center gap-2 text-sm" aria-label="Đường dẫn thư mục chia sẻ">
      <button type="button" className="text-blue-600 hover:underline" onClick={() => navigate([])}>Được chia sẻ với tôi</button>
      {path.map((node, index) => <React.Fragment key={node.id}>
        <ChevronRight className="w-3 h-3" />
        <button type="button" className="text-blue-600 hover:underline" onClick={() => navigate(path.slice(0, index + 1))}>{node.name}</button>
      </React.Fragment>)}
    </nav>
    {loading ? <p role="status" className="text-sm text-slate-500">Đang tải thư mục…</p>
      : error ? <p role="alert" className="text-sm text-red-600">{error}</p>
        : <>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {data?.folders.map(folder => <button type="button" key={folder.id}
              onClick={() => navigate([...path, folder])}
              className="flex items-center gap-3 p-3 border rounded-lg hover:bg-blue-50 text-left">
              <Folder className="w-5 h-5 text-amber-500 shrink-0" /><span className="break-all">{folder.name}</span>
            </button>)}
          </div>
          {folderId && data?.files.items.map(file => <div key={file.id} className="flex items-center justify-between gap-3 border-b py-2">
            <button type="button" className="text-sm text-blue-700 hover:underline text-left break-all" onClick={() => onOpenFile(file)}>{file.name}</button>
            <button type="button" className="p-2 hover:bg-slate-100 rounded" aria-label={`Tải xuống ${file.name}`} onClick={() => onDownloadFile(file)}>
              <Download className="w-4 h-4" />
            </button>
          </div>)}
          {!data?.folders.length && (!folderId || !data?.files.items.length)
            && <p className="text-sm text-slate-500">{folderId ? 'Thư mục trống.' : 'Chưa có thư mục được chia sẻ.'}</p>}
          {pages > 1 && <div className="flex items-center justify-end gap-3 text-sm">
            <button type="button" disabled={page <= 1} onClick={() => setPage(value => value - 1)} className="disabled:opacity-40">Trang trước</button>
            <span>{page} / {pages}</span>
            <button type="button" disabled={page >= pages} onClick={() => setPage(value => value + 1)} className="disabled:opacity-40">Trang sau</button>
          </div>}
        </>}
  </section>;
};
