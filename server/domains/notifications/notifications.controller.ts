import { Router } from 'express';
import { notificationService, type INotificationService } from './notifications.service';
import { requireAuth, type AuthenticatedRequest } from '../auth';

export class NotificationController {
  constructor(private service: INotificationService = notificationService) {}

  // Create Express router with all notification routes
  createRouter(): Router {
    const router = Router();

    // Get user notifications
    router.get('/', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        const notifications = await this.service.getUserNotifications(userId);
        res.json(notifications);
      } catch (error) {
        console.error("Error fetching notifications:", error);
        res.status(500).json({ message: "Failed to fetch notifications" });
      }
    });

    // Mark notification as read
    router.post('/:id/mark-read', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const notificationId = parseInt(req.params.id);
        const userId = req.user!.id;
        
        await this.service.markNotificationAsRead(notificationId, userId);
        res.json({ message: "Notification marked as read" });
      } catch (error) {
        console.error("Error marking notification as read:", error);
        res.status(404).json({ message: "Notification not found" });
      }
    });

    // Mark all notifications as read
    router.post('/mark-all-read', requireAuth, async (req: AuthenticatedRequest, res) => {
      try {
        const userId = req.user!.id;
        await this.service.markAllNotificationsAsRead(userId);
        res.json({ message: "All notifications marked as read" });
      } catch (error) {
        console.error("Error marking all notifications as read:", error);
        res.status(500).json({ message: "Failed to mark all notifications as read" });
      }
    });

    return router;
  }
}

export const notificationController = new NotificationController();
export const notificationsRouter = notificationController.createRouter();