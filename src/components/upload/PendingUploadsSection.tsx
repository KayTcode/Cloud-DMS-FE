/**
 * Mục "Upload đang dở" — hiển thị các phiên upload file lớn còn treo trên
 * server (chưa hoàn tất, chưa hết hạn), cho phép tiếp tục bằng cách chọn lại
 * file, hoặc huỷ phiên.
 */
import React, { useRef, useState } from 'react';
import { useUploadManager } from '@/services/upload/large/UploadManagerContext';
import { formatBytes } from '@/features/user/api/driveApi';
import { abortSession, type UploadSessionStatus } from '@/services/upload/large/largeUploadApi';

function earlierExpiry(session: UploadSessionStatus): string {
  const idle = session.expiresAt ? new Date(session.expiresAt).getTime() : Infinity;
  const abs = session.absoluteExpiresAt ? new Date(session.absoluteExpiresAt).getTime() : Infinity;
  const earliest = Math.min(idle, abs);
  if (!Number.isFinite(earliest)) return '--';
  return new Date(earliest).toLocaleString('vi-VN');
}

const PendingRow: React.FC<{ session: UploadSessionStatus }> = ({ session }) => {
  const { resumeWithFile, refreshPending } = useUploadManager();
  const [message, setMessage] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const percent =
    session.sizeBytes > 0 ? Math.min(100, Math.round((session.receivedBytes / session.sizeBytes) * 100)) : 0;

  const handlePickFile = () => inputRef.current?.click();

  const handleFileChosen = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setMessage(null);
    try {
      await resumeWithFile(session.sessionId, file);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Không thể tiếp tục upload');
    }
  };

  const handleCancel = async () => {
    try {
      await abortSession(session.sessionId);
    } finally {
      void refreshPending();
    }
  };

  return (
    <div style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ fontWeight: 500 }}>{session.fileName}</span>
        <span>{formatBytes(session.sizeBytes)}</span>
      </div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>
        {percent}% · Hạn chót: {earlierExpiry(session)}
      </div>
      {message && <div style={{ fontSize: 12, color: '#dc2626' }}>{message}</div>}
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        <button type="button" onClick={handlePickFile}>
          Tiếp tục (chọn lại file)
        </button>
        <button type="button" onClick={() => void handleCancel()}>
          Huỷ
        </button>
      </div>
      <input ref={inputRef} type="file" style={{ display: 'none' }} onChange={(e) => void handleFileChosen(e)} />
    </div>
  );
};

export const PendingUploadsSection: React.FC = () => {
  const { pendingRemote } = useUploadManager();
  if (pendingRemote.length === 0) return null;

  return (
    <div
      style={{
        marginBottom: 16,
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        background: '#fafafa',
      }}
    >
      <div style={{ padding: '8px 12px', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>
        Upload đang dở ({pendingRemote.length})
      </div>
      {pendingRemote.map((session) => (
        <PendingRow key={session.sessionId} session={session} />
      ))}
    </div>
  );
};
