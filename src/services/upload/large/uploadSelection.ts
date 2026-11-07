/**
 * F6: bộ phân luồng duy nhất cho mọi điểm vào upload trong ứng dụng.
 *
 * `uploadSelection` gọi `planUpload` (F1) để quyết định đường đi (zip hiện có,
 * file lớn qua F5, hay cây thư mục lớn), rồi điều phối các `deps` được tiêm
 * vào (không import React/Context trực tiếp) để module này test được bằng
 * Node `vm`, theo đúng quy ước của F1.
 */
import { planUpload, type SelectedEntry } from './uploadRouting';
import { detectBlockedSignature } from './fileSignature';
import { folderNameCandidate } from './folderNaming';
import type { UploadTarget } from './UploadManagerContext';

export interface UploadSelectionItemResult {
  relativePath: string;
  ok: boolean;
  error?: { code: string; message: string };
}

export interface UploadSelectionResult {
  mode: 'zip-single' | 'zip-package' | 'large-single' | 'tree';
  items: UploadSelectionItemResult[];
  error?: { code: string; message: string };
}

export interface UploadSelectionDeps {
  uploadZip(files: File[], directories: string[], target: UploadTarget): Promise<unknown>;
  enqueueLarge(file: File, target: UploadTarget): Promise<unknown>;
  createFolder(name: string, parentId: string | null, target: UploadTarget): Promise<{ id: string }>;
  reportPendingCount(n: number): void;
  readHead(file: File): Promise<Uint8Array>;
}

const BLOCKED_ERROR = {
  code: 'BLOCKED_FILE_TYPE',
  message: 'Loại tệp này không được phép tải lên.',
} as const;

const MAX_TREE_CONCURRENCY = 3;
const MAX_FOLDER_NAME_ATTEMPTS = 100;

function toEntries(files: File[]): SelectedEntry[] {
  return files.map((file) => ({
    size: file.size,
    relativePath: (file as File & { webkitRelativePath?: string }).webkitRelativePath || file.name,
  }));
}

function toErrorResult(err: unknown, fallbackCode: string, fallbackMessage: string) {
  const anyErr = err as { code?: string; message?: string } | null;
  return { code: anyErr?.code ?? fallbackCode, message: anyErr?.message ?? fallbackMessage };
}

async function isBlocked(file: File, deps: UploadSelectionDeps): Promise<boolean> {
  const head = await deps.readHead(file);
  return detectBlockedSignature(head) !== null;
}

function parentPathOf(relativePath: string): string {
  const segments = relativePath.split('/');
  segments.pop();
  return segments.join('/');
}

async function createRootFolder(
  root: string,
  target: UploadTarget,
  deps: UploadSelectionDeps
): Promise<{ id: string }> {
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < MAX_FOLDER_NAME_ATTEMPTS; attempt++) {
    const name = folderNameCandidate(root, attempt);
    try {
      return await deps.createFolder(name, target.folderId ?? null, target);
    } catch (err) {
      lastErr = err;
      const code = (err as { code?: string } | null)?.code;
      if (code !== 'DUPLICATE_NAME') {
        throw err;
      }
    }
  }
  throw lastErr ?? new Error('Không thể tạo thư mục gốc.');
}

async function runTree(
  plan: Extract<ReturnType<typeof planUpload>, { mode: 'tree' }>,
  files: File[],
  target: UploadTarget,
  deps: UploadSelectionDeps
): Promise<UploadSelectionResult> {
  const folderIdMap = new Map<string, string>();

  if (plan.root) {
    let created: { id: string };
    try {
      created = await createRootFolder(plan.root, target, deps);
    } catch (err) {
      return { mode: 'tree', items: [], error: toErrorResult(err, 'CREATE_FOLDER_FAILED', 'Không thể tạo thư mục gốc.') };
    }
    folderIdMap.set(plan.root, created.id);
  }

  for (const folderPath of plan.folders) {
    if (folderIdMap.has(folderPath)) continue;
    const segments = folderPath.split('/');
    const name = segments[segments.length - 1];
    const parentPath = segments.slice(0, -1).join('/');
    const parentId = parentPath ? folderIdMap.get(parentPath) ?? (target.folderId ?? null) : (target.folderId ?? null);
    try {
      const created = await deps.createFolder(name, parentId, target);
      folderIdMap.set(folderPath, created.id);
    } catch (err) {
      return { mode: 'tree', items: [], error: toErrorResult(err, 'CREATE_FOLDER_FAILED', 'Không thể tạo thư mục.') };
    }
  }

  const results: UploadSelectionItemResult[] = [];
  let pending = plan.items.length;
  deps.reportPendingCount(pending);

  const queue = [...plan.items];

  async function worker(): Promise<void> {
    while (queue.length > 0) {
      const item = queue.shift();
      if (!item) continue;
      pending -= 1;
      deps.reportPendingCount(pending);

      const file = files[item.index];
      const parentPath = parentPathOf(item.relativePath);
      const folderId = parentPath ? folderIdMap.get(parentPath) ?? (target.folderId ?? null) : (target.folderId ?? null);
      const itemTarget: UploadTarget = { ...target, folderId };

      try {
        if (item.route === 'zip-file') {
          await deps.uploadZip([file], [], itemTarget);
          results.push({ relativePath: item.relativePath, ok: true });
        } else {
          if (await isBlocked(file, deps)) {
            results.push({ relativePath: item.relativePath, ok: false, error: { ...BLOCKED_ERROR } });
            continue;
          }
          await deps.enqueueLarge(file, itemTarget);
          results.push({ relativePath: item.relativePath, ok: true });
        }
      } catch (err) {
        results.push({
          relativePath: item.relativePath,
          ok: false,
          error: toErrorResult(err, 'UPLOAD_FAILED', 'Tải lên thất bại.'),
        });
      }
    }
  }

  const workerCount = Math.min(MAX_TREE_CONCURRENCY, plan.items.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  return { mode: 'tree', items: results };
}

export async function uploadSelection(
  files: File[],
  directories: string[],
  target: UploadTarget,
  deps: UploadSelectionDeps
): Promise<UploadSelectionResult> {
  const entries = toEntries(files);
  const plan = planUpload(entries, directories);

  if (plan.mode === 'zip-single' || plan.mode === 'zip-package') {
    try {
      await deps.uploadZip(files, directories, target);
      return { mode: plan.mode, items: entries.map((e) => ({ relativePath: e.relativePath, ok: true })) };
    } catch (err) {
      const error = toErrorResult(err, 'UPLOAD_FAILED', 'Tải lên thất bại.');
      return { mode: plan.mode, items: entries.map((e) => ({ relativePath: e.relativePath, ok: false, error })) };
    }
  }

  if (plan.mode === 'large-single') {
    const file = files[0];
    const relativePath = entries[0].relativePath;
    if (await isBlocked(file, deps)) {
      return { mode: plan.mode, items: [{ relativePath, ok: false, error: { ...BLOCKED_ERROR } }] };
    }
    try {
      await deps.enqueueLarge(file, target);
      return { mode: plan.mode, items: [{ relativePath, ok: true }] };
    } catch (err) {
      return {
        mode: plan.mode,
        items: [{ relativePath, ok: false, error: toErrorResult(err, 'ENQUEUE_FAILED', 'Không thể thêm vào hàng chờ upload.') }],
      };
    }
  }

  return runTree(plan, files, target, deps);
}
