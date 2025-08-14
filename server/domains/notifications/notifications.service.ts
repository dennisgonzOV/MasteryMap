import { notificationStorage, type INotificationStorage } from './notifications.storage';
import { type Notification } from "../../../shared/schema";

export interface INotificationService {
  getUserNotifications(userId: number): Promise<Notification[]>;
  markNotificationAsRead(notificationId: number, userId: number): Promise<void>;
  markAllNotificationsAsRead(userId: number): Promise<void>;
}

export class NotificationService implements INotificationService {
  constructor(private storage: INotificationStorage = notificationStorage) {}

  async getUserNotifications(userId: number): Promise<Notification[]> {
    return await this.storage.getNotificationsByUser(userId);
  }

  async markNotificationAsRead(notificationId: number, userId: number): Promise<void> {
    // Verify notification belongs to user before marking as read
    const notifications = await this.storage.getNotificationsByUser(userId);
    const notification = notifications.find(n => n.id === notificationId);
    
    if (!notification) {
      throw new Error("Notification not found or access denied");
    }

    await this.storage.markNotificationAsRead(notificationId);
  }

  async markAllNotificationsAsRead(userId: number): Promise<void> {
    await this.storage.markAllNotificationsAsRead(userId);
  }
}

export const notificationService = new NotificationService();