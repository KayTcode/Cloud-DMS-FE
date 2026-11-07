/**
 * Bảng tiến trình upload file lớn, hiển thị cố định ở góc dưới màn hình.
 * Mỗi dòng ứng với một `UploadTask` của `useUploadManager()`.
 */
import React from 'react';
import { useUploadManager, type UploadTask } from '@/services/upload/large/UploadManagerContext';
import { formatBytes } from '@/features/user/api/driveApi';
import type { UploadState } from '@/services/upload/large/LargeFileUploader';

const STATE_LABELS: Record<UploadState, string> = {
  sending: 'Đang gửi',
  paused: 'Tạm dừng',
  'provider-limited': 'Tạm dừng – nhà cung cấp tạm từ chối',
  completing: 'Đang hoàn tất',
  done: 'Hoàn tất',
  error: 'Lỗi',
  cancelled: 'Đã huỷ',
};

function formatRemaining(task: UploadTask): string {
  if (task.bytesPerSecond <= 0) return '--';
  const remainingBytes = Math.max(task.size - task.uploaded, 0);
  const seconds = Math.ceil(remainingBytes / task.bytesPerSecond);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.ceil(seconds / 60);
  return `${minutes} phút`;
}

const UploadTaskRow: React.FC<{ task: UploadTask }> = ({ task }) => {
  const { pause, resume, cancel } = useUploadManager();
  const percent = task.size > 0 ? Math.min(100, Math.round((task.uploaded / task.size) * 100)) : 0;
  const canPause = task.state === 'sending';
  const canResume = task.state === 'paused' || task.state === 'provider-limited' || task.state === 'error';
  const canCancel = task.state !== 'done' && task.state !== 'cancelled';

  return (
    <div className="upload-task-row" style={{ padding: '8px 12px', borderBottom: '1px solid #e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
        <span style={{ fontWeight: 500 }}>{task.fileName}</span>
        <span>{formatBytes(task.size)}</span>
      </div>
      <div style={{ fontSize: 12, color: '#6b7280' }}>
        {percent}% · {formatBytes(task.bytesPerSecond)}/s · Còn lại: {formatRemaining(task)} ·{' '}
        {STATE_LABELS[task.state]}
      </div>
      {task.error && <div style={{ fontSize: 12, color: '#dc2626' }}>{task.error.message}</div>}
      <div style={{ height: 4, background: '#e5e7eb', borderRadius: 2, marginTop: 4 }}>
        <div
          style={{
            height: 4,
            width: `${percent}%`,
            background: task.state === 'error' ? '#dc2626' : '#2563eb',
            borderRadius: 2,
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {canPause && (
          <button type="button" onClick={() => pause(task.id)}>
            Tạm dừng
          </button>
        )}
        {canResume && (
          <button type="button" onClick={() => void resume(task.id)}>
            Tiếp tục
          </button>
        )}
        {canCancel && (
          <button type="button" onClick={() => void cancel(task.id)}>
            Huỷ
          </button>
        )}
      </div>
    </div>
  );
};

export const LargeUploadPanel: React.FC = () => {
  const { tasks } = useUploadManager();
  if (tasks.length === 0) return null;

  return (
    <div
      style={{
        position: 'fixed',
        right: 16,
        bottom: 16,
        width: 340,
        maxHeight: 400,
        overflowY: 'auto',
        background: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        zIndex: 1000,
      }}
    >
      <div style={{ padding: '8px 12px', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>
        Đang tải lên ({tasks.length})
      </div>
      {tasks.map((task) => (
        <UploadTaskRow key={task.id} task={task} />
      ))}
    </div>
  );
};
