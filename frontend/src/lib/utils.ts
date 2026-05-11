import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatRelativeTime(isoString: string) {
  const date = new Date(isoString);
  const diff = date.getTime() - Date.now();
  const formatter = new Intl.RelativeTimeFormat('zh-CN', { numeric: 'auto' });
  const minutes = Math.round(diff / 60000);

  if (Math.abs(minutes) < 60) {
    return formatter.format(minutes, 'minute');
  }

  const hours = Math.round(minutes / 60);
  if (Math.abs(hours) < 24) {
    return formatter.format(hours, 'hour');
  }

  const days = Math.round(hours / 24);
  return formatter.format(days, 'day');
}

export function getStatusTone(status: string) {
  if (status === 'healthy') {
    return 'good' as const;
  }

  if (status === 'attention' || status === 'warming') {
    return 'warn' as const;
  }

  return 'neutral' as const;
}
