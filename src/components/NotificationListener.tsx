import { useEffect, useRef } from 'react';
import { collection, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { browserNotifications } from '@/lib/browserNotifications';
import { useAuth } from '@/auth/AuthContext';
import type { Notification } from '@/types';
import { toast } from 'sonner';

export function NotificationListener() {
  const { user, profile } = useAuth();
  const lastNotificationTimeRef = useRef<Date>(new Date());
  const hasRequestedPermissionRef = useRef(false);

  useEffect(() => {
    if (!user?.uid) return;

    // Request notification permission on first mount
    if (!hasRequestedPermissionRef.current && browserNotifications.isSupported()) {
      hasRequestedPermissionRef.current = true;
      
      // Show a prompt to enable notifications
      if (!browserNotifications.hasPermission()) {
        toast.info('Enable browser notifications to get updates even when you\'re away!', {
          duration: 5000,
          action: {
            label: 'Enable',
            onClick: () => browserNotifications.requestPermission(),
          },
        });
      }
    }

    // Listen for new notifications in real-time
    const notificationsQuery = query(
      collection(db, 'notifications'),
      where('userId', '==', user.uid),
      where('read', '==', false),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const notification = { id: change.doc.id, ...change.doc.data() } as Notification;
          const notificationDate = notification.createdAt instanceof Timestamp
            ? notification.createdAt.toDate()
            : new Date(notification.createdAt);

          // Only show browser notification for new items (not initial load)
          if (notificationDate > lastNotificationTimeRef.current) {
            showBrowserNotification(notification);
          }
        }
      });

      // Update the last notification time
      if (!snapshot.empty) {
        const latestNotification = snapshot.docs[0].data();
        const latestDate = latestNotification.createdAt instanceof Timestamp
          ? latestNotification.createdAt.toDate()
          : new Date(latestNotification.createdAt);
        
        if (latestDate > lastNotificationTimeRef.current) {
          lastNotificationTimeRef.current = latestDate;
        }
      }
    });

    return () => unsubscribe();
  }, [user?.uid]);

  const showBrowserNotification = (notification: Notification) => {
    if (!browserNotifications.hasPermission()) return;

    let title = 'New Notification';
    let body = notification.message;
    let url = '/';

    switch (notification.type) {
      case 'task':
        title = '📋 New Task';
        url = `/leads/${notification.leadId}`;
        break;
      case 'lead':
        title = '🎯 Lead Update';
        url = `/leads/${notification.leadId}`;
        break;
      case 'assignment':
        title = '👤 New Assignment';
        url = `/leads/${notification.leadId}`;
        break;
      case 'chat':
        title = '💬 New Message';
        url = `/leads/${notification.leadId}`;
        break;
      case 'activity':
        title = '📢 New Activity';
        url = `/leads/${notification.leadId}`;
        break;
      default:
        title = '🔔 Notification';
    }

    browserNotifications.showNotification(title, {
      body: body,
      icon: '/logo.png',
      badge: '/logo.png',
      tag: notification.id,
      requireInteraction: false,
      data: {
        url: url,
        notificationId: notification.id,
      },
    });
  };

  return null; // This is a non-visual component
}
