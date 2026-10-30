import React, { useEffect, useState } from 'react';
import { ChevronDown, ChevronRight, Download, Folder, File, X } from 'lucide-react';
import { driveApi, ArchiveMember } from '../api/driveApi';
import { DriveItem } from '../types';

export const ArchiveBrowser: React.FC<{
  file: DriveItem;
  onClose: () => void;
  onDownloadPackage: () => void;
}> = ({ file, onClose, onDownloadPackage }) => {
  const [members, setMembers] = useState<ArchiveMember[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    driveApi.getArchiveTree(file.id).then((rows) => { if (active) setMembers(rows); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Không thể đọc cấu trúc gói ZIP.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [file.id]);
  const download = async (member: ArchiveMember) => {
    setDownloading(member.id); setError('');
    try { await driveApi.downloadArchiveMember(file.id, member.id, member.name); }
    catch (err) { setError(err instanceof Error ? err.message : 'Không thể tải tệp.'); }
    finally { setDownloading(null); }
  };
  const children = new Map<string, ArchiveMember[]>();
  members.forEach((member) => children.set(member.parentPath, [...(children.get(member.parentPath) || []), member]));
  const renderChildren = (parent: string, depth: number): React.ReactNode => (
    <ul role={depth === 0 ? 'tree' : 'group'} aria-label={depth === 0 ? 'Cấu trúc gói ZIP' : undefined}>
      {(children.get(parent) || []).map((member) => (
        <li key={member.id} role="treeitem" aria-expanded={member.isDirectory ? expanded.has(member.path) : undefined}>
          <div className="flex items-center gap-2 py-2 border-b border-slate-100" style={{ paddingLeft: depth * 18 }}>
            {member.isDirectory ? <button className="flex items-center gap-2 text-sm" onClick={() => setExpanded((old) => {
              const next = new Set(old); if (next.has(member.path)) next.delete(member.path); else next.add(member.path); return next;
            })} aria-label={`${expanded.has(member.path) ? 'Thu gọn' : 'Mở'} ${member.name}`}>
              {expanded.has(member.path) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}<Folder size={17} />{member.name}
            </button> : <><File size={16} className="ml-5 shrink-0" /><span className="flex-1 text-sm break-all">{member.name}</span>
              <span className="text-xs text-slate-500">{member.sizeBytes.toLocaleString()} B</span>
              <button disabled={downloading !== null} onClick={() => void download(member)} aria-label={`Tải ${member.path}`} className="p-2 text-blue-600 disabled:opacity-40"><Download size={16} /></button></>}
          </div>
          {member.isDirectory && expanded.has(member.path) && renderChildren(member.path, depth + 1)}
        </li>
      ))}
    </ul>
  );
  return <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-5">
    <section role="dialog" aria-modal="true" aria-labelledby="archive-title" className="bg-white rounded-xl shadow-xl p-6 w-full max-w-3xl">
      <header className="flex items-center justify-between gap-3 mb-4"><h2 id="archive-title" className="font-semibold break-all">{file.name}</h2>
        <button autoFocus aria-label="Đóng cấu trúc gói ZIP" onClick={onClose}><X size={20} /></button></header>
      <p className="text-xs text-slate-500 mb-3">Duyệt cấu trúc thư mục hoặc tải từng tệp. Không có xem trước tài liệu.</p>
      {error && <p role="alert" className="text-red-600 text-sm mb-3">{error}</p>}
      <div className="max-h-[60vh] overflow-auto">{loading ? <p role="status">Đang tải cấu trúc…</p> : renderChildren('', 0)}</div>
      <footer className="flex justify-end mt-5"><button onClick={onDownloadPackage} className="bg-blue-600 text-white rounded px-4 py-2 text-sm">Tải toàn bộ gói ZIP</button></footer>
    </section>
  </div>;
};
