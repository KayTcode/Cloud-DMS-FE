export type NotificationType =
  | 'General'
  | 'QuotaRequest'
  | 'QuotaLocked'
  | 'QuotaUnlocked'
  | 'StorageProviderAlert';

export interface NotificationDto {
  id: string;
  title: string;
  content: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
  readAt?: string | null;
}

export interface NotificationPage {
  items: NotificationDto[];
  totalCount: number;
  pageNumber: number;
  pageSize: number;
  hasNextPage: boolean;
}
