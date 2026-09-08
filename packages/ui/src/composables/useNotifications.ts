import { ref } from 'vue';

export interface AppNotification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  message: string;
  duration?: number;
}

const notifications = ref<AppNotification[]>([]);

export function useNotifications() {
  const show = (notif: Omit<AppNotification, 'id'>) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`;
    const item: AppNotification = { id, duration: 5000, ...notif };
    notifications.value.push(item);

    if (item.duration && item.duration > 0) {
      setTimeout(() => {
        dismiss(id);
      }, item.duration);
    }
  };

  const info = (message: string, title?: string) => show({ type: 'info', message, title });
  const success = (message: string, title?: string) => show({ type: 'success', message, title });
  const warning = (message: string, title?: string, duration = 7000) =>
    show({ type: 'warning', message, title, duration });
  const error = (message: string, title?: string, duration = 8000) =>
    show({ type: 'error', message, title, duration });

  const dismiss = (id: string) => {
    notifications.value = notifications.value.filter(n => n.id !== id);
  };

  return {
    notifications,
    show,
    info,
    success,
    warning,
    error,
    dismiss
  };
}
