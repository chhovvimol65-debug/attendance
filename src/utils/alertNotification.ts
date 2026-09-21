import { playSuccessChime, playErrorBuzz } from './audio';

export type AlertType = 'save' | 'delete' | 'success' | 'error' | 'warning';

export interface KhmerAlertDetail {
  id: string;
  type: AlertType;
  title: string;
  message: string;
  duration?: number;
  timestamp: number;
}

/**
 * Dispatches a global event so App.tsx can show a prominent Khmer alert banner.
 */
export function showKhmerAlert(options: {
  type: AlertType;
  title?: string;
  message: string;
  duration?: number;
}) {
  const defaultTitle = options.type === 'save'
    ? 'បានរក្សាទុកដោយជោគជ័យ'
    : options.type === 'delete'
      ? 'បានលុបដោយជោគជ័យ'
      : options.type === 'error'
        ? 'មានបញ្ហាក្នុងការប្រតិបត្តិ'
        : 'ប្រតិបត្តិការជោគជ័យ';

  const detail: KhmerAlertDetail = {
    id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    type: options.type,
    title: options.title || defaultTitle,
    message: options.message,
    duration: options.duration || 4000,
    timestamp: Date.now()
  };

  // Play audio chime according to type
  try {
    const rawSettings = localStorage.getItem('attendance_app_settings');
    const soundEnabled = rawSettings ? JSON.parse(rawSettings).soundEnabled ?? true : true;
    if (soundEnabled) {
      if (options.type === 'save' || options.type === 'success') {
        playSuccessChime();
      } else if (options.type === 'error') {
        playErrorBuzz();
      } else if (options.type === 'delete') {
        // Also chime or sound
        playSuccessChime();
      }
    }
  } catch {
    // Ignore audio failure
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('khmer-system-alert', { detail }));
  }
}

/**
 * Quick helper specifically for Save (រក្សាទុក) actions
 */
export function showKhmerSaveAlert(message: string, title = 'បានរក្សាទុកដោយជោគជ័យ') {
  showKhmerAlert({
    type: 'save',
    title,
    message,
    duration: 4000
  });
}

/**
 * Quick helper specifically for Delete (លុប) actions
 */
export function showKhmerDeleteAlert(message: string, title = 'បានលុបដោយជោគជ័យ') {
  showKhmerAlert({
    type: 'delete',
    title,
    message,
    duration: 4500
  });
}
