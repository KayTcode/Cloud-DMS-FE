export interface DocumentMetadataDto {
  id: string;
  fileEntryId: string;
  title: string;
  author: string;
  otherTitle?: string | null;
  releaseYear: number;
  issueYear?: number | null;
  releaseMonth?: number | null;
  issueMonth?: number | null;
  releaseDay?: number | null;
  issueDay?: number | null;
  keywords?: string | null;
  abstract?: string | null;
  description?: string | null;
  releaseDateFormatted?: string;
  createdAt?: string;
  lastModifiedAt?: string | null;
}

export interface DocumentDetailsDto {
  fileId: string;
  fileName: string;
  name?: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
  createdAt?: string;
  parentFolderId?: string | null;
  driveKind: string;
  retentionDays?: number | null;
  expiresAt?: string | null;
  daysRemaining?: number | null;
  metadata?: DocumentMetadataDto | null;
  // Flat metadata fields some API responses return directly on the DTO
  metadataId?: string;
  title?: string;
  otherTitle?: string | null;
  author?: string;
  ownerId?: string;
  ownerName?: string;
  ownerEmail?: string | null;
  folderName?: string | null;
  storageProviderName?: string | null;
  originalSizeBytes?: number | null;
  archiveKind?: string | null;
  updatedAt?: string | null;
  hash?: string | null;
  issueYear?: number;
  releaseYear?: number;
  issueMonth?: number | null;
  releaseMonth?: number | null;
  issueDay?: number | null;
  releaseDay?: number | null;
  releaseDateFormatted?: string;
  keywords?: string | null;
  abstract?: string | null;
  description?: string | null;
}

export interface DocumentSubmissionResultDto {
  fileId: string;
  fileName: string;
  sizeBytes: number;
  storageKey: string;
  title: string;
  author: string;
  retentionDays?: number | null;
  expiresAt?: string | null;
}

export interface UploadDocumentPayload {
  file: File;
  parentFolderId?: string | null;
  retentionDays?: number | null;
  title: string;
  releaseYear: number;
  releaseMonth?: number | null;
  releaseDay?: number | null;
  keywords?: string | null;
  abstract?: string | null;
  description?: string | null;
}

export interface ReplaceDocumentFilePayload {
  fileId: string;
  newFile: File;
}

export interface UpdateDocumentMetadataPayload {
  fileId: string;
  title: string;
  releaseYear: number;
  releaseMonth?: number | null;
  releaseDay?: number | null;
  keywords?: string | null;
  abstract?: string | null;
  description?: string | null;
}

export interface ExtendRetentionPayload {
  fileId: string;
  additionalDays: number;
}

