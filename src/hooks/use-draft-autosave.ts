'use client';

import { useEffect } from 'react';

export function useDraftAutosave<T extends object>(
  key: string,
  values: T,
  intervalMs = 10_000,
) {
  useEffect(() => {
    const timer = window.setInterval(() => {
      localStorage.setItem(key, JSON.stringify(values));
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [key, values, intervalMs]);
}

export function loadDraft<T>(key: string): T | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}
