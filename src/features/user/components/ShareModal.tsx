import React, { useEffect, useRef, useState } from 'react';
import { X, Share2 } from 'lucide-react';
import { DriveItem } from '../types';
import { driveApi, FileShareRecipient } from '../api/driveApi';
import { useAuth } from '@/context/AuthContext';
import { ShareRecipientPicker, normalizeRecipientEmail, recipientInputError } from './ShareRecipientPicker';

interface ShareModalProps {
  item: DriveItem | null;
  onClose: () => void;
  onShareSuccess: (message: string) => void;
  onChanged?: () => void;
}

const errorMessage = (error: unknown): string => {
  const response = (error as any)?.response?.data;
  return response?.error || response?.errors?.[0] || (error instanceof Error ? error.message : '') || 'Không thể cập nhật chia sẻ. Vui lòng thử lại.';
};

export const ShareModal: React.FC<ShareModalProps> = ({ item, onClose, onShareSuccess, onChanged }) => {
  const { user } = useAuth();
  const sharingExcluded = user?.role?.toLowerCase() === 'tenantadmin';
  const [email, setEmail] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const [recipientErrors, setRecipientErrors] = useState<Record<string, string>>({});
  const [role, setRole] = useState<'Viewer' | 'Editor'>('Viewer');
  const [recipients, setRecipients] = useState<FileShareRecipient[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const currentFile = useRef(item?.id);
  const generation = useRef(0);
  const operationBusy = useRef(false);
  currentFile.current = item?.id;

  useEffect(() => {
    let cancelled = false;
    generation.current++;
    operationBusy.current = false;
    setEmail('');
    setSelected([]);
    setRecipientErrors({});
    setRole('Viewer');
    setRecipients([]);
    setError('');
    setLoadError('');
    setLoading(true);
    setBusy(false);
    if (sharingExcluded) {
      setLoadError('TenantAdmin không được tham gia chia sẻ tài liệu.');
      setLoading(false);
      return () => { cancelled = true; generation.current++; };
    }
    if (item) {
      driveApi.getFileShares(item.id).then((data) => {
        if (!cancelled) setRecipients(data);
      }).catch((err) => {
        if (!cancelled) setLoadError(errorMessage(err));
      }).finally(() => {
        if (!cancelled) setLoading(false);
      });
    }
    return () => { cancelled = true; generation.current++; };
  }, [item?.id, sharingExcluded]);

  if (!item) return null;

  const mutate = async (action: () => Promise<unknown>, message: string) => {
    if (operationBusy.current || sharingExcluded) return;
    const fileId = item.id;
    const version = generation.current;
    const isCurrent = () => generation.current === version && currentFile.current === fileId;
    operationBusy.current = true;
    setBusy(true);
    setError('');
    try {
      await action();
      if (!isCurrent()) return;
      onChanged?.();
      onShareSuccess(message);
      try {
        const data = await driveApi.getFileShares(fileId);
        if (isCurrent()) {
          setRecipients(data);
          setLoadError('');
        }
      } catch {
        if (isCurrent()) setLoadError('Đã lưu thay đổi nhưng chưa thể tải lại danh sách. Hãy mở lại cửa sổ chia sẻ.');
      }
    } catch (err) {
      if (isCurrent()) setError(errorMessage(err));
    } finally {
      if (isCurrent()) { setBusy(false); operationBusy.current = false; }
    }
  };

  const shareSelected = async () => {
    if (operationBusy.current || sharingExcluded || loading || loadError) return;
    const emails = [...selected];
    if (email.trim()) {
      const message = recipientInputError(email, emails, recipients.map(recipient => recipient.email));
      if (message) { setError(message); return; }
      emails.push(normalizeRecipientEmail(email));
    }
    if (!emails.length) return;
    const fileId = item.id, version = generation.current;
    const isCurrent = () => generation.current === version && currentFile.current === fileId;
    operationBusy.current = true;
    setBusy(true); setError(''); setRecipientErrors({}); setSelected(emails); setEmail('');
    const failures: Record<string, string> = {};
    let succeeded = 0;
    try {
      for (const recipient of emails) {
        if (!isCurrent()) return;
        try { await driveApi.shareFile(fileId, recipient, role); succeeded++; }
        catch (err) { failures[recipient] = errorMessage(err); }
      }
      if (!isCurrent()) return;
      setSelected(Object.keys(failures)); setRecipientErrors(failures);
      if (succeeded) {
        onChanged?.();
        onShareSuccess(`Đã chia sẻ tài liệu cho ${succeeded}/${emails.length} người nhận.`);
        try {
          const data = await driveApi.getFileShares(fileId);
          if (isCurrent()) { setRecipients(data); setLoadError(''); }
        } catch {
          if (isCurrent()) setLoadError('Đã lưu thay đổi nhưng chưa thể tải lại danh sách. Hãy mở lại cửa sổ chia sẻ.');
        }
      }
    } finally {
      if (isCurrent()) { setBusy(false); operationBusy.current = false; }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div role="dialog" aria-modal="true" aria-labelledby="share-title" onKeyDown={(event) => {
        if (event.key === 'Escape' && !busy) onClose();
        if (event.key === 'Tab') {
          const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)'));
          const first = controls[0];
          const last = controls[controls.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }
      }} className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Share2 className="w-5 h-5 text-blue-600" />
            <div>
              <h3 id="share-title" className="font-bold text-slate-900">Chia sẻ tài liệu</h3>
              <p className="text-xs text-slate-500 truncate max-w-xs">{item.name}</p>
            </div>
          </div>
          <button autoFocus disabled={busy} aria-label="Đóng cửa sổ chia sẻ" onClick={onClose}><X className="w-5 h-5" /></button>
        </div>
        <p className="mt-4 text-xs text-slate-500">Chỉ chia sẻ với tài khoản trong cùng tổ chức. Người nhận sẽ thấy tài liệu trong mục “Được chia sẻ”.</p>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        {loadError && <p role="alert" className="mt-3 text-sm text-red-600">{loadError}</p>}
        <form className="mt-4 space-y-3" onSubmit={(event) => {
          event.preventDefault();
          void shareSelected();
        }}>
          <ShareRecipientPicker key={item.id} fileId={item.id} value={email} onValueChange={setEmail}
            selected={selected} onSelectedChange={emails => {
              setSelected(emails); setError('');
              setRecipientErrors(previous => Object.fromEntries(Object.entries(previous).filter(([email]) => emails.includes(email))));
            }} existing={recipients.map(recipient => recipient.email)} disabled={busy || loading || !!loadError || sharingExcluded}
            recipientErrors={recipientErrors} />
          <div className="flex gap-2">
            <select aria-label="Quyền người nhận" disabled={busy} value={role} onChange={(e) => setRole(e.target.value as 'Viewer' | 'Editor')} className="border rounded-lg px-3 py-2 text-sm">
              <option value="Viewer">Xem</option>
              <option value="Editor">Chỉnh sửa</option>
            </select>
            <button type="submit" disabled={busy || loading || !!loadError || sharingExcluded || (!selected.length && !email.trim())} className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm disabled:opacity-50">{busy ? 'Đang lưu…' : 'Chia sẻ'}</button>
          </div>
        </form>
        <div className="mt-5 border-t pt-4" aria-busy={loading || busy}>
          <h4 className="text-xs font-semibold mb-3">Người đang được chia sẻ trực tiếp</h4>
          {loading ? <p role="status" className="text-sm text-slate-500">Đang tải…</p> : !loadError && recipients.length === 0 ? <p className="text-sm text-slate-500">Chưa chia sẻ với ai.</p> : null}
          <ul className="space-y-3 max-h-60 overflow-auto">
            {recipients.map((recipient) => (
              <li key={recipient.recipientId} className="flex flex-wrap items-center gap-2 text-xs">
                <span className="flex-1 min-w-0 break-all" title={recipient.email}>{recipient.email}</span>
                <select aria-label={`Quyền của ${recipient.email}`} disabled={busy || !!loadError} value={recipient.role} onChange={(event) => {
                  const nextRole = event.target.value;
                  void mutate(() => driveApi.shareFile(item.id, recipient.email, nextRole, recipient.expiresAt), 'Đã cập nhật quyền chia sẻ.');
                }} className="border rounded px-2 py-1">
                  <option value="Viewer">Xem</option><option value="Editor">Chỉnh sửa</option>
                </select>
                <button type="button" aria-label={`Thu hồi chia sẻ với ${recipient.email}`} disabled={busy || !!loadError} onClick={() => void mutate(() => driveApi.revokeShare(item.id, recipient.recipientId), 'Đã thu hồi quyền chia sẻ.')} className="text-red-600 disabled:opacity-50">Thu hồi</button>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex justify-end mt-5 border-t pt-3"><button disabled={busy} onClick={onClose} className="text-sm px-4 py-2 rounded hover:bg-slate-100">Đóng</button></div>
      </div>
    </div>
  );
};
