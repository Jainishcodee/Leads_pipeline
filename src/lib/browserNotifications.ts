import { toast } from 'sonner';

export class BrowserNotificationService {
  private static instance: BrowserNotificationService;
  private permission: NotificationPermission = 'default';

  private constructor() {
    if ('Notification' in window) {
      this.permission = Notification.permission;
    }
  }

  public static getInstance(): BrowserNotificationService {
    if (!BrowserNotificationService.instance) {
      BrowserNotificationService.instance = new BrowserNotificationService();
    }
    return BrowserNotificationService.instance;
  }

  public async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission === 'denied') {
      toast.error('Browser notifications are blocked. Please enable them in your browser settings.');
      return false;
    }

    try {
      this.permission = await Notification.requestPermission();
      if (this.permission === 'granted') {
        toast.success('Browser notifications enabled!');
        return true;
      } else {
        toast.error('Notification permission denied');
        return false;
      }
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }

  public async showNotification(title: string, options?: NotificationOptions): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('Browser does not support notifications');
      return;
    }

    if (this.permission !== 'granted') {
      const granted = await this.requestPermission();
      if (!granted) return;
    }

    try {
      const notification = new Notification(title, {
        icon: '/logo.png',
        badge: '/logo.png',
        requireInteraction: false,
        ...options,
      });

      // Auto close after 10 seconds
      setTimeout(() => notification.close(), 10000);

      notification.onclick = () => {
        window.focus();
        notification.close();
        if (options?.data?.url) {
          window.location.href = options.data.url;
        }
      };
    } catch (error) {
      console.error('Error showing notification:', error);
    }
  }

  public isSupported(): boolean {
    return 'Notification' in window;
  }

  public hasPermission(): boolean {
    return this.permission === 'granted';
  }

  public getPermissionStatus(): NotificationPermission {
    return this.permission;
  }
}

export const browserNotifications = BrowserNotificationService.getInstance();
