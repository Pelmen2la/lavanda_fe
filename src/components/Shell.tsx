'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, ReactNode } from 'react';
import { Alert, Button } from '@mui/material';
import { useAuth } from './Providers';
import { message } from '@/lib/api';
import s from './Shell.module.css';
export default function Shell({ children }: { children: ReactNode }) {
  const router = useRouter(); const path = usePathname(); const { user, loading, logout } = useAuth(); const [error, setError] = useState('');
  return <><a className={s.skip} href="#content">Перейти к содержимому</a><header className={s.header}><div className={s.bar}>
    <Link className={s.brand} href="/" aria-label="Лаванда — главная"><img className={s.mark} src="/lavender-logo.webp" alt="" width={40} height={48} /><span>лаванда<small>бьюти-коворкинг</small></span></Link>
    <nav className={s.nav} aria-label="Главная навигация"><Link aria-current={path === '/schedule/' ? 'page' : undefined} href="/schedule/">Расписание</Link>{user && <Link href="/account/">Мои записи</Link>}{user?.role === 'admin' && <Link href="/admin/bookings/">Админка</Link>}</nav>
    <div className={s.auth}>{!loading && (user ? <><span className={s.userName} title={user.name}>{user.name}</span><Button size="small" onClick={async () => { try { await logout(); router.replace('/'); } catch (e) { setError(message(e)); } }}>Выйти</Button></> : <><Link className={s.login} href="/register/" aria-current={path === '/register/' || path === '/register' ? 'page' : undefined}>Регистрация</Link><Link className={s.login} href="/login/">Войти <span aria-hidden="true">↗</span></Link></>)}</div>
  </div></header>{error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}<main id="content" className={s.main}>{children}</main>
  <footer className={s.footer}><span className={s.footerName}>лаванда</span><span>Место для вашей практики</span><span>Ежедневно · 09:00–21:00 МСК</span></footer></>;
}
