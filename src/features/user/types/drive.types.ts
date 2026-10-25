export type FileType = 'pdf' | 'docx' | 'sheet' | 'slide' | 'image' | 'archive' | 'code' | 'other';

export interface DriveItem {
  id: string;
  name: string;
  type: 'folder' | 'file';
  fileType?: FileType;
  extension?: string;
  size: number; // in bytes
  sizeFormatted: string;
  updatedAt: string;
  createdAt: string;
  deletedAt?: string;
  deletedBy?: string;
  storageProvider?: string;
  owner: {
    name: string;
    email: string;
    avatar?: string;
  };
  parentId: string | null; // null for root "My Drive"
  starred: boolean;
  trashed: boolean;
  sharedWith: string[];
  tags: string[];
  department?: string;
  previewUrl?: string;
  contentSnippet?: string;
}

export type DriveViewMode = 'grid' | 'list';
export type DriveSortField = 'name' | 'updatedAt' | 'size';
export type DriveSortOrder = 'asc' | 'desc';
export type DriveFilter = 'all' | 'mine' | 'shared' | 'recent' | 'starred' | 'trash';

export interface FileTextItem {
  ordinal: number;
  text: string;
  location?: string | null;
}

export interface FileTextResult {
  status: 'ready' | 'pending' | 'unavailable' | string;
  documentVersion: number;
  items: FileTextItem[];
  nextCursor?: string | null;
  isPartial?: boolean;
  reason?: string | null;
}

export interface PreviewResult {
  status: 'ready' | 'pending' | 'unavailable' | 'unsupported' | 'failed' | string;
  documentVersion: number;
  reason: string;
  previewUrl?: string | null;
}

export interface TrashFileListResponse {
  items: DriveItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  totalSizeBytes: number;
  hasMore?: boolean;
}

export interface SharedFileItem {
  id: string;
  name: string;
  type: 'file';
  fileType: FileType;
  extension: string;
  size: number;
  sizeFormatted: string;
  ownerId: string;
  owner: {
    name: string;
    email: string;
  };
  sharedAt: string;
  sharedAtFormatted: string;
  expiresAt?: string;
  expiresAtFormatted?: string;
  permissionLevel: 'Viewer' | 'Editor' | 'Owner' | string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  storageProvider?: string;
  storageProviderType?: string;
  department?: string;
  createdAt: string;
  scanStatus?: string;
}

export interface SharedFileListResponse {
  items: SharedFileItem[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  hasMore?: boolean;
}

