// Analytics event tracking — wire to GA4 / GTM when ready
type EventName =
  | 'package_click'
  | 'consult_start'
  | 'consult_step'
  | 'consult_submit'
  | 'project_view'
  | 'cta_click'
  | 'service_area_check'
  | 'whatsapp_click';

interface EventParams {
  [key: string]: string | number | boolean | undefined;
}

export function trackEvent(name: EventName, params?: EventParams) {
  if (typeof window !== 'undefined' && 'gtag' in window) {
    (window as unknown as { gtag: (...args: unknown[]) => void }).gtag('event', name, params);
  }
  // Console log in dev for debugging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Analytics] ${name}`, params);
  }
}
