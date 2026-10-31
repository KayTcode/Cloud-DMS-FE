export interface FolderDto {
  id: string;
  name: string;
  parentFolderId: string | null;
  driveKind: 'Personal' | 'DepartmentShared';
  driveOwnerId: string;
  createdAt: string;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
}

export interface FolderChildrenResponse {
  folders: FolderDto[];
  breadcrumb: BreadcrumbItem[];
}

export interface TrashFolderItem {
  id: string;
  name: string;
  type: 'folder';
  deletedAt: string;
  daysLeft: number;
  trashedWithFolderId: string | null;
}

export interface CreateFolderPayload {
  name: string;
  driveKind: 'Personal' | 'DepartmentShared';
  driveOwnerId: string;
  parentFolderId: string | null;
}

export interface RenameFolderPayload {
  name: string;
}

export interface MoveFolderPayload {
  targetParentFolderId: string | null;
}
