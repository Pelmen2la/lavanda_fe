'use client';
import { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import Notifications from './Notifications';
import { api, ApiError, User } from '@/lib/api';

const theme = createTheme({
  palette: {
    primary: { main: '#765598', dark: '#593d77', light: '#efe6f7' },
    secondary: { main: '#65775b' },
    background: { default: '#ffffff', paper: '#ffffff' },
    text: { primary: '#312c39', secondary: '#736b7d' },
  },
});
type Auth = { user: User | null; loading: boolean; unavailable: boolean; refresh: () => Promise<User | null>; logout: () => Promise<void> };
const AuthContext = createContext<Auth | null>(null);
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error('Missing provider'); return auth; }
export default function Providers({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const refresh = useCallback(async () => {
    try { const value = await api<User>('/auth/me'); setUser(value); setUnavailable(false); return value; }
    catch (e) { setUser(null); setUnavailable(!(e instanceof ApiError && e.status === 401)); return null; }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const logout = async () => { await api('/auth/logout', {}); setUser(null); };
  return <AppRouterCacheProvider options={{ enableCssLayer: true }}><ThemeProvider theme={theme}><AuthContext.Provider value={{ user, loading, unavailable, refresh, logout }}><Notifications>{children}</Notifications></AuthContext.Provider></ThemeProvider></AppRouterCacheProvider>;
}
