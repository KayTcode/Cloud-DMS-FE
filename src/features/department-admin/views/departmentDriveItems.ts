import { DriveItem, FileType } from '@/features/user/types';
import { formatBytes } from '@/features/user/api/driveApi';

export interface DriveChildrenResponseLike {
  folders?: any[];
  files?: any[];
  breadcrumb?: any[];
}

const EXT_TYPES: Array<[FileType, string[]]> = [
  ['pdf', ['pdf']],
  ['sheet', ['xlsx', 'xls', 'csv']],
  ['docx', ['docx', 'doc', 'txt']],
  ['image', ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']],
  ['archive', ['zip', 'rar', '7z', 'tar', 'gz']],
  ['code', ['cs', 'ts', 'tsx', 'js', 'json', 'py', 'java', 'html', 'css', 'sql']],
  ['slide', ['ppt', 'pptx']],
];

const fileTypeFromExt = (ext: string): FileType =>
  EXT_TYPES.find(([, exts]) => exts.includes(ext))?.[0] ?? 'other';

const viDate = (raw?: string) =>
  raw ? new Date(raw).toLocaleDateString('vi-VN') : 'Mới cập nhật';

/**
 * Chuyen response cua GET api/drive/children thanh DriveItem cho cay tai lieu.
 *
 * Khong dung node folder gia: endpoint nay da tra dung con cua folder hien tai,
 * va ten folder vat ly tren storage khong con duoc API tra ve nua.
 */
export interface MapDriveChildrenOptions {
  /** Nhan hien thi khi file/folder khong co tac gia rieng. Vi du "Phòng ban" o Kho chung. */
  ownerFallback?: string;
}

export function mapDriveChildrenToItems(
  res: DriveChildrenResponseLike,
  opts: MapDriveChildrenOptions = {}
): DriveItem[] {
  const ownerFallback = opts.ownerFallback ?? 'Kho riêng của tôi';

  const folders: DriveItem[] = (res?.folders ?? []).map((f: any) => ({
    id: f.id,
    name: f.name,
    type: 'folder' as const,
    size: 0,
    sizeFormatted: '0 mục',
    updatedAt: viDate(f.createdAt),
    createdAt: viDate(f.createdAt),
    owner: { name: ownerFallback, email: '' },
    parentId: f.parentFolderId ?? null,
    starred: false,
    trashed: false,
    sharedWith: [],
    tags: ['Thư mục'],
    isPendingHandover: f.isPendingHandover ?? false,
  }));

  const files: DriveItem[] = (res?.files ?? []).map((f: any) => {
    const ext = f.name?.split('.').pop()?.toLowerCase() || '';
    const isArchiveFolder = f.archiveKind === 'folder' || f.archiveKind === 'batch';
    const size = f.originalSizeBytes ?? f.sizeBytes ?? 0;

    return {
      id: f.id,
      archiveKind: f.archiveKind,
      originalSizeBytes: f.originalSizeBytes,
      name: f.name,
      type: 'file' as const,
      fileType: isArchiveFolder ? 'folder' : fileTypeFromExt(ext),
      extension: ext || 'file',
      size,
      sizeFormatted: formatBytes(size),
      updatedAt: viDate(f.createdAt),
      createdAt: viDate(f.createdAt),
      owner: { name: f.authorName || ownerFallback, email: '' },
      parentId: f.folderId ?? null,
      starred: false,
      trashed: false,
      sharedWith: [],
      tags: ['Google Drive'],
      metadata: f.metadata || null,
      scanStatus: f.scanStatus ?? null,
      isSharedLink: f.isSharedLink ?? undefined,
      isSharedToDepartment: f.isSharedToDepartment ?? undefined,
    } as DriveItem;
  });

  return [...folders, ...files];
}

export interface BreadcrumbCrumb {
  id: string;
  name: string;
}

/**
 * Breadcrumb cua GET api/drive/children da xep tu goc toi folder hien tai.
 * Truoc day man hinh tu suy breadcrumb bang cach di nguoc parentId trong danh sach
 * items — cach do chi chay khi items chua ca cay, nen het hoat dong khi doc endpoint
 * chi tra con truc tiep.
 */
export function mapBreadcrumb(res: { breadcrumb?: any[] }): BreadcrumbCrumb[] {
  return (res?.breadcrumb ?? []).map((c: any) => ({ id: c.id, name: c.name }));
}
