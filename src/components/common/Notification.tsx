import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { NOTIFICATION_EVENT_NAME, type NotificationPayload, type NotificationVariant } from '../../lib/notifications';

interface ToastItem extends NotificationPayload { id: number; variant: NotificationVariant; }
const variantIcon: Record<NotificationVariant, string> = { success: '✓', error: '!', info: 'i' };
const variantColor: Record<NotificationVariant, string> = { success: 'var(--color-success)', error: 'var(--color-danger)', info: 'var(--color-primary)' };

export default function NotificationHost() {
  const { t } = useTranslation();
  const [items, setItems] = useState<ToastItem[]>([]);
  useEffect(() => {
    const handle = (event: Event) => {
      const detail = (event as CustomEvent<NotificationPayload>).detail;
      const id = Date.now() + Math.random();
      const item: ToastItem = { ...detail, id, variant: detail.variant ?? 'info' };
      setItems((current) => [...current, item].slice(-5));
      window.setTimeout(() => setItems((current) => current.filter((toast) => toast.id !== id)), detail.duration ?? 4500);
    };
    window.addEventListener(NOTIFICATION_EVENT_NAME, handle);
    return () => window.removeEventListener(NOTIFICATION_EVENT_NAME, handle);
  }, []);

  return <div aria-live="polite" aria-relevant="additions" className="pointer-events-none fixed bottom-5 right-5 z-[100] flex w-[min(380px,calc(100vw-40px))] flex-col gap-2">
    {items.map((item) => <div key={item.id} role={item.variant === 'error' ? 'alert' : 'status'} className="glass-card pointer-events-auto flex items-start gap-3 rounded-2xl p-4 shadow-xl">
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white" style={{ background: variantColor[item.variant] }}>{variantIcon[item.variant]}</span>
      <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{item.title ?? (item.variant === 'error' ? t('common.error') : item.variant === 'success' ? t('common.success') : t('common.info'))}</div><p className="mt-1 break-words text-xs muted-text">{item.message}</p></div>
      <button type="button" onClick={() => setItems((current) => current.filter((toast) => toast.id !== item.id))} aria-label={t('common.close')} className="muted-text transition hover:text-[var(--color-text)]">×</button>
    </div>)}
  </div>;
}
