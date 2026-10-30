export type NotificationVariant = 'success' | 'error' | 'info';
export interface NotificationPayload {
  message: string;
  variant?: NotificationVariant;
  title?: string;
  duration?: number;
}

const EVENT_NAME = 'artcraft:notification';

export function notify(payload: NotificationPayload): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<NotificationPayload>(EVENT_NAME, { detail: payload }));
}

export { EVENT_NAME as NOTIFICATION_EVENT_NAME };
