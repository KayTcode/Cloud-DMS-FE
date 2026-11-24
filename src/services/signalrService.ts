import {
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr';
import { BASE_URL } from '@/api/axiosClient';
import { getAuthClient } from '@/api/authClient';
import { NotificationDto } from '@/features/notifications/types/notification.types';

export type NotificationReceivedCallback = (notification: NotificationDto) => void;

class SignalRNotificationService {
  private connection: HubConnection | null = null;
  private listeners: Set<NotificationReceivedCallback> = new Set();
  private isStarting = false;

  private getHubUrl(): string {
    const cleanBase = BASE_URL.replace(/\/+$/, '');
    return `${cleanBase}/hubs/notifications`;
  }

  public async start(): Promise<void> {
    if (this.connection?.state === HubConnectionState.Connected || this.isStarting) {
      return;
    }

    const token = getAuthClient().accessToken();
    if (!token) {
      return;
    }

    this.isStarting = true;

    try {
      if (!this.connection) {
        this.connection = new HubConnectionBuilder()
          .withUrl(this.getHubUrl(), {
            accessTokenFactory: () => getAuthClient().accessToken() || '',
          })
          .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
          .configureLogging(LogLevel.Warning)
          .build();

        this.connection.on('ReceiveNotification', (raw: any) => {
          const notification: NotificationDto = {
            id: raw.id || `${Date.now()}-${Math.random()}`,
            title: raw.title || 'Thông báo mới',
            content: raw.content || '',
            type: raw.type || 'General',
            isRead: false,
            createdAt: raw.createdAt || new Date().toISOString(),
          };

          this.listeners.forEach((callback) => {
            try {
              callback(notification);
            } catch (err) {
              console.error('[SignalR] Error in notification listener callback:', err);
            }
          });
        });

        this.connection.onreconnected(() => {
          console.info('[SignalR] Reconnected to NotificationHub successfully.');
        });
      }

      if (this.connection.state === HubConnectionState.Disconnected) {
        await this.connection.start();
        console.info('[SignalR] Connected to NotificationHub at', this.getHubUrl());
      }
    } catch (err) {
      console.warn('[SignalR] Could not connect to NotificationHub:', err);
    } finally {
      this.isStarting = false;
    }
  }

  public async stop(): Promise<void> {
    if (this.connection && this.connection.state !== HubConnectionState.Disconnected) {
      try {
        await this.connection.stop();
        console.info('[SignalR] Disconnected from NotificationHub.');
      } catch (err) {
        console.warn('[SignalR] Error stopping connection:', err);
      }
    }
    this.connection = null;
  }

  public onNotificationReceived(callback: NotificationReceivedCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  public isConnected(): boolean {
    return this.connection?.state === HubConnectionState.Connected;
  }
}

export const signalRService = new SignalRNotificationService();
