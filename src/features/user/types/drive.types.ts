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
