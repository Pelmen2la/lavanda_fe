'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, message } from './api';

// Cache only within this mounted screen. A new URL, user or explicit reload
// requests fresh data; reopening a tab/dialog can reuse an unchanged list.
export function useApiResource<T>(path: string, enabled = true, userId?: number, reuseOnEnable = true) {
  const [revision, setRevision] = useState(0);
  const key = JSON.stringify([path, userId, revision]);
  const settled = useRef('');
  const [state, setState] = useState<{ key: string; data?: T; error: string; loading: boolean }>({ key: '', error: '', loading: false });
  const reload = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!enabled || (reuseOnEnable && settled.current === key)) return;
    settled.current = '';
    let stale = false;
    setState({ key, error: '', loading: true });
    api<T>(path).then(data => {
      if (!stale) { settled.current = key; setState({ key, data, error: '', loading: false }); }
    }).catch(error => {
      if (!stale) setState({ key, error: message(error), loading: false });
    });
    return () => { stale = true; };
  }, [path, enabled, key, reuseOnEnable]);
  const matches = state.key === key;
  return { data: matches ? state.data : undefined, error: matches ? state.error : '', loading: enabled && (!matches || state.loading), reload };
}
