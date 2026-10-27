'use client';
import { ArrowUpRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowUpRight';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, ReactNode } from 'react';
import { Alert, Button } from '@mui/material';
import { useAuth } from './Providers';
import { message } from '@/lib/api';
import s from './Shell.module.css';
export default function Shell({ children }: { children: ReactNode }) {
  const router = useRouter(); const path = usePathname(); const { user, loading, logout } = useAuth(); const [error, setError] = useState('');
  const currentPath = path.replace(/\/$/, '');
  const links = [
    { href: '/schedule/', label: 'Расписание' },
    ...(user?.role === 'admin' ? [
      { href: '/admin/bookings/', label: 'Записи' },
      { href: '/admin/workplaces/', label: 'Рабочие места' },
      { href: '/admin/clients/', label: 'Клиенты' },
    ] : user ? [{ href: '/account/', label: 'Мои записи' }] : []),
  ];
  return <><a className={s.skip} href="#content">Перейти к содержимому</a><header className={s.header}><div className={s.bar}>
    <Link className={s.brand} href="/" aria-label="Лаванда — главная"><img className={s.mark} src="/lavender-logo.webp" alt="" width={40} height={48} /><span>лаванда<small>бьюти-коворкинг</small></span></Link>
    <nav className={s.nav} aria-label="Главная навигация">{links.map(({ href, label }) => <Link key={href} href={href} aria-current={currentPath === href.slice(0, -1) || currentPath.startsWith(href) ? 'page' : undefined}>{label}</Link>)}</nav>
    <div className={s.auth}>{!loading && (user ? <><span className={s.userName} title={user.name}>{user.name}</span><Button size="small" onClick={async () => { try { await logout(); router.replace('/'); } catch (e) { setError(message(e)); } }}>Выйти</Button></> : <><Link className={s.login} href="/register/" aria-current={path === '/register/' || path === '/register' ? 'page' : undefined}>Регистрация</Link><Link className={s.login} href="/login/">Войти <ArrowUpRightIcon size={20} aria-hidden="true" /></Link></>)}</div>
  </div></header>{error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}<main id="content" className={s.main}>{children}</main>
  <footer className={s.footer}><span className={s.footerName}>лаванда</span><span>Место для вашей практики</span><span>Ежедневно · 09:00–21:00 МСК</span></footer></>;
}
