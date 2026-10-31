import apiClient from '@/api/axiosClient';
import { API_ENDPOINTS } from '@/api/endpoints';
import { NotificationDto, NotificationPage } from '../types/notification.types';

export const notificationApi = {
  async list(pageNumber = 1, pageSize = 20): Promise<NotificationPage> {
    const res: any = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.LIST(pageNumber, pageSize));
    return res?.value ?? res?.data ?? res;
  },

  async unreadCount(): Promise<number> {
    const res: any = await apiClient.get(API_ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
    return res?.value ?? res?.data ?? res;
  },

  async markRead(id: string): Promise<void> {
    const res: any = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.READ(id));
    return res?.value ?? res?.data ?? res;
  },

  async markAllRead(): Promise<number> {
    const res: any = await apiClient.post(API_ENDPOINTS.NOTIFICATIONS.READ_ALL);
    return res?.value ?? res?.data ?? res;
  },
};
