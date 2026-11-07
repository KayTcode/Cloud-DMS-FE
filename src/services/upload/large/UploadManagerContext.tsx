/**
 * Context quản lý toàn cục các phiên upload file lớn: giữ danh sách
 * `UploadTask`, khởi tạo/điều khiển `LargeFileUploader` qua `createTransport`,
 * đồng bộ với `resumeStore` (IndexedDB) để có thể tiếp tục sau khi tải lại
 * trang, và dùng `withSessionLock` để tránh hai tab cùng đẩy dữ liệu vào một
 * phiên.
 *
 * Đây là lớp nối dây (wiring) — logic nghiệp vụ test được đã nằm ở F3
 * (`LargeFileUploader`, `createTransport`) và F4 (`resumeStore`,
 * `resumeMatch`, `tabLock`).
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  LargeFileUploader,
  type UploadEvent,
  type UploadState,
} from '@/services/upload/large/LargeFileUploader';
import { createTransport } from '@/services/upload/large/createTransport';
import {
  beginLargeSession,
  getSession,
  listPendingSessions,
  resumeSession,
  type LargeSession,
  type UploadSessionStatus,
} from '@/services/upload/large/largeUploadApi';
import { saveSession, getSession as getSavedSession, removeSession } from '@/services/upload/large/resumeStore';
import { fingerprintFile, matchesSaved } from '@/services/upload/large/resumeMatch';
import { withSessionLock } from '@/services/upload/large/tabLock';

export interface UploadTarget {
  folderId: string | null;
  drive?: 'personal' | 'shared';
  departmentId?: string;
  replaceFileId?: string;
}

export interface UploadTask {
  id: string;
  fileName: string;
  size: number;
  uploaded: number;
  bytesPerSecond: number;
  state: UploadState;
  error?: { code: string; message: string };
}

export interface UploadManagerContextValue {
  tasks: UploadTask[];
  enqueueLarge(file: File, target: UploadTarget): Promise<string>;
  pause(id: string): void;
  resume(id: string): Promise<void>;
  cancel(id: string): Promise<void>;
  resumeWithFile(sessionId: string, file: File): Promise<void>;
  pendingRemote: UploadSessionStatus[];
  refreshPending(): Promise<void>;
  onFileCompleted(cb: (fileId: string, target: UploadTarget) => void): () => void;
}

const UploadManagerContext = createContext<UploadManagerContextValue | null>(null);

const BEFORE_UNLOAD_MESSAGE =
  'Vẫn còn tệp đang được tải lên. Nếu rời trang bây giờ, quá trình tải lên sẽ bị gián đoạn.';

const LOCKED_ELSEWHERE_MESSAGE = 'Tệp này đang được upload ở một tab khác.';
const WRONG_FILE_MESSAGE = 'Đây không phải file đang upload dở';

async function sha256Hex(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const digest = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function newId(): string {
  return typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `id-${Date.now()}-${Math.random()}`;
}

interface InternalEntry {
  uploader: LargeFileUploader;
  sessionId: string;
  file: File;
  target: UploadTarget;
  fileId?: string;
  lastSampleAt: number;
  lastUploaded: number;
}

export const UploadManagerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [pendingRemote, setPendingRemote] = useState<UploadSessionStatus[]>([]);
  const entriesRef = useRef<Map<string, InternalEntry>>(new Map());
  const completedCbsRef = useRef<Set<(fileId: string, target: UploadTarget) => void>>(new Set());

  const updateTask = useCallback((id: string, patch: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  }, []);

  const refreshPending = useCallback(async () => {
    try {
      const list = await listPendingSessions();
      setPendingRemote(list);
    } catch {
      // degrade silently; UI simply shows no pending sessions
    }
  }, []);

  useEffect(() => {
    void refreshPending();
  }, [refreshPending]);

  // beforeunload khi có task đang gửi/đang hoàn tất.
  useEffect(() => {
    const hasActive = tasks.some((t) => t.state === 'sending' || t.state === 'completing');
    if (!hasActive) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = BEFORE_UNLOAD_MESSAGE;
      return BEFORE_UNLOAD_MESSAGE;
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [tasks]);

  const handleEvent = useCallback(
    (id: string, sessionId: string) =>
      (e: UploadEvent) => {
        const entry = entriesRef.current.get(id);
        if (e.type === 'progress') {
          let bytesPerSecond = 0;
          if (entry) {
            const now = Date.now();
            const dt = now - entry.lastSampleAt;
            const db = e.uploaded - entry.lastUploaded;
            if (dt > 0 && db >= 0) {
              bytesPerSecond = Math.round((db / dt) * 1000);
            }
            entry.lastSampleAt = now;
            entry.lastUploaded = e.uploaded;
          }
          updateTask(id, { uploaded: e.uploaded, bytesPerSecond });
        } else {
          updateTask(id, { state: e.state, error: e.error });
          if (e.state === 'done') {
            void removeSession(sessionId);
            const target = entry?.target;
            const fileId = entry?.fileId;
            if (target && fileId) {
              completedCbsRef.current.forEach((cb) => cb(fileId, target));
            }
            void refreshPending();
          }
          if (e.state === 'cancelled') {
            void removeSession(sessionId);
            void refreshPending();
          }
        }
      },
    [updateTask, refreshPending]
  );

  const enqueueLarge = useCallback(
    async (file: File, target: UploadTarget): Promise<string> => {
      const id = newId();
      const idempotencyKey = newId();

      setTasks((prev) => [
        ...prev,
        { id, fileName: file.name, size: file.size, uploaded: 0, bytesPerSecond: 0, state: 'sending' },
      ]);

      let session: LargeSession;
      try {
        session = await beginLargeSession(
          {
            fileName: file.name,
            sizeBytes: file.size,
            folderId: target.folderId,
            replaceFileId: target.replaceFileId ?? null,
            drive: target.drive ?? null,
            departmentId: target.departmentId ?? null,
            archiveKind: null,
          },
          idempotencyKey
        );
      } catch (err) {
        const anyErr = err as { code?: string; message?: string } | null;
        updateTask(id, {
          state: 'error',
          error: { code: anyErr?.code ?? 'BEGIN_FAILED', message: anyErr?.message ?? 'Không thể bắt đầu upload' },
        });
        return id;
      }

      try {
        const fingerprint = await fingerprintFile(file, sha256Hex);
        await saveSession({
          sessionId: session.sessionId,
          fileName: file.name,
          size: file.size,
          lastModified: file.lastModified,
          partSizeBytes: session.partSizeBytes,
          fingerprint,
          folderId: target.folderId,
          savedAt: Date.now(),
        });
      } catch {
        // resume-store là tiện ích phụ trợ, lỗi ở đây không chặn upload.
      }

      const transport = createTransport(
        session,
        {
          fileName: file.name,
          sizeBytes: file.size,
          folderId: target.folderId,
          replaceFileId: target.replaceFileId ?? null,
          drive: target.drive ?? null,
          departmentId: target.departmentId ?? null,
          archiveKind: null,
        },
        idempotencyKey
      );

      const entry: InternalEntry = {
        uploader: null as unknown as LargeFileUploader,
        sessionId: session.sessionId,
        file,
        target,
        fileId: session.fileId,
        lastSampleAt: Date.now(),
        lastUploaded: 0,
      };
      const uploader = new LargeFileUploader(file, session, transport, handleEvent(id, session.sessionId));
      entry.uploader = uploader;
      entriesRef.current.set(id, entry);

      await withSessionLock(
        session.sessionId,
        () => uploader.start(),
        () => updateTask(id, { state: 'error', error: { code: 'LOCKED', message: LOCKED_ELSEWHERE_MESSAGE } })
      );

      return id;
    },
    [handleEvent, updateTask]
  );

  const pause = useCallback((id: string) => {
    entriesRef.current.get(id)?.uploader.pause();
  }, []);

  const resume = useCallback(
    async (id: string) => {
      const entry = entriesRef.current.get(id);
      if (!entry) return;
      await withSessionLock(
        entry.sessionId,
        () => entry.uploader.resume(),
        () => updateTask(id, { state: 'error', error: { code: 'LOCKED', message: LOCKED_ELSEWHERE_MESSAGE } })
      );
    },
    [updateTask]
  );

  const cancel = useCallback(async (id: string) => {
    const entry = entriesRef.current.get(id);
    if (!entry) return;
    await entry.uploader.cancel();
  }, []);

  const resumeWithFile = useCallback(
    async (sessionId: string, file: File) => {
      const saved = await getSavedSession(sessionId);
      if (saved) {
        const fingerprint = await fingerprintFile(file, sha256Hex);
        const matches = matchesSaved(
          saved,
          { name: file.name, size: file.size, lastModified: file.lastModified },
          fingerprint
        );
        if (!matches) {
          throw new Error(WRONG_FILE_MESSAGE);
        }
      }

      const id = newId();
      setTasks((prev) => [
        ...prev,
        { id, fileName: file.name, size: file.size, uploaded: 0, bytesPerSecond: 0, state: 'sending' },
      ]);

      const status = await getSession(sessionId);
      const resumeResult = await resumeSession(sessionId);

      const fullSession: LargeSession = {
        sessionId,
        fileId: status.fileId,
        documentVersion: 0,
        expiresAt: status.expiresAt,
        reservedBytes: status.receivedBytes,
        protocol: resumeResult.protocol as LargeSession['protocol'],
        directUploadUrl: resumeResult.directUploadUrl ?? undefined,
        recommendedChunkSizeBytes: resumeResult.partSizeBytes,
        isLargeFile: true,
        partSizeBytes: resumeResult.partSizeBytes,
        totalParts: status.totalParts,
        maxConcurrency: resumeResult.maxConcurrency,
        idleExpiresAt: status.expiresAt,
        absoluteExpiresAt: status.absoluteExpiresAt,
      };

      const idempotencyKey = newId();
      const target: UploadTarget = { folderId: status.folderId ?? saved?.folderId ?? null };
      const transport = createTransport(
        fullSession,
        { fileName: file.name, sizeBytes: file.size, folderId: target.folderId, archiveKind: null },
        idempotencyKey
      );

      const entry: InternalEntry = {
        uploader: null as unknown as LargeFileUploader,
        sessionId,
        file,
        target,
        fileId: status.fileId,
        lastSampleAt: Date.now(),
        lastUploaded: status.receivedBytes,
      };
      const uploader = new LargeFileUploader(file, fullSession, transport, handleEvent(id, sessionId));
      entry.uploader = uploader;
      entriesRef.current.set(id, entry);
      updateTask(id, { uploaded: status.receivedBytes });

      let locked = false;
      await withSessionLock(
        sessionId,
        () => uploader.start(),
        () => {
          locked = true;
        }
      );
      if (locked) {
        updateTask(id, { state: 'error', error: { code: 'LOCKED', message: LOCKED_ELSEWHERE_MESSAGE } });
        throw new Error(LOCKED_ELSEWHERE_MESSAGE);
      }
    },
    [handleEvent, updateTask]
  );

  const onFileCompleted = useCallback((cb: (fileId: string, target: UploadTarget) => void) => {
    completedCbsRef.current.add(cb);
    return () => {
      completedCbsRef.current.delete(cb);
    };
  }, []);

  const value: UploadManagerContextValue = {
    tasks,
    enqueueLarge,
    pause,
    resume,
    cancel,
    resumeWithFile,
    pendingRemote,
    refreshPending,
    onFileCompleted,
  };

  return <UploadManagerContext.Provider value={value}>{children}</UploadManagerContext.Provider>;
};

export function useUploadManager(): UploadManagerContextValue {
  const ctx = useContext(UploadManagerContext);
  if (!ctx) {
    throw new Error('useUploadManager phải được dùng trong UploadManagerProvider');
  }
  return ctx;
}
