'use client';
import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { Alert, Snackbar } from '@mui/material';

const NotificationsContext = createContext<(message: string) => void>(() => {});
export const useNotify = () => useContext(NotificationsContext);

export default function Notifications({ children }: { children: ReactNode }) {
  const [notice, setNotice] = useState<{ message: string; id: number } | null>(null);
  const notify = useCallback((message: string) => {
    if (message) setNotice(previous => ({ message, id: (previous?.id || 0) + 1 }));
  }, []);
  const close = () => setNotice(null);
  return <NotificationsContext.Provider value={notify}>
    {children}
    <Snackbar key={notice?.id} open={!!notice} autoHideDuration={5000} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} onClose={(_, reason) => { if (reason !== 'clickaway') close(); }}>
      <Alert severity="success" variant="filled" onClose={close}>{notice?.message}</Alert>
    </Snackbar>
  </NotificationsContext.Provider>;
}
