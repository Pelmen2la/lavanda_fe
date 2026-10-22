'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Alert, Button, TextField } from '@mui/material';
import { api, message } from '@/lib/api';
import { useAuth } from './Providers';
import s from './Common.module.css';
import PhoneField from './PhoneField';
type Mode = 'login' | 'register' | 'forgot' | 'reset';
const titles = { login: 'С возвращением', register: 'Добро пожаловать', forgot: 'Забыли пароль?', reset: 'Новый пароль' };
export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter(); const { refresh } = useAuth(); const [email, setEmail] = useState(''); const [password, setPassword] = useState(''); const [confirm, setConfirm] = useState('');
  const [name, setName] = useState(''); const [phone, setPhone] = useState('');
  const [token, setToken] = useState(''); const [error, setError] = useState(''); const [success, setSuccess] = useState(''); const [pending, setPending] = useState(false);
  useEffect(() => { if (mode === 'register' || mode === 'reset') { const value = new URLSearchParams(window.location.hash.slice(1)).get('token') || ''; setToken(value); if (!value && mode === 'reset') setError('Откройте полную ссылку из приглашения или письма.'); } }, [mode]);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError(''); setSuccess('');
    if ((mode === 'register' || mode === 'reset') && password !== confirm) { setError('Пароли не совпадают'); return; }
    if ((mode === 'register' || mode === 'reset') && Array.from(password).length < 8) { setError('Пароль должен содержать не менее 8 символов'); return; }
    setPending(true);
    try {
      if (mode === 'forgot') { const result = await api<{ message: string }>('/auth/forgot', { email }); setSuccess(result.message); }
      else if (mode === 'reset') { await api('/auth/reset', { token, password }); setSuccess('Пароль изменён. Теперь можно войти.'); setPassword(''); setConfirm(''); window.history.replaceState(null, '', window.location.pathname); }
      else { await api(`/auth/${mode}`, mode === 'login' ? { login: email, password } : { token, name, phone, email, password, confirmPassword: confirm }); const user = await refresh(); router.replace(user?.role === 'admin' ? '/admin/bookings/' : '/account/'); }
    } catch (e) { setError(message(e)); } finally { setPending(false); }
  }
  return <div className={s.page}><div className={s.auth}><p className={s.eyebrow}>ЛИЧНОЕ ПРОСТРАНСТВО</p><h1 className={s.title}>{titles[mode]}</h1><p className={s.subtitle}>{mode === 'register' ? (token ? 'Заполните данные, чтобы активировать аккаунт по приглашению.' : 'Создайте аккаунт, чтобы бронировать места.') : mode === 'forgot' ? 'Укажите email, привязанный к вашей карточке.' : mode === 'reset' ? 'Придумайте надёжный пароль длиной от 8 символов.' : 'Войдите, чтобы бронировать места и управлять записями.'}</p>
    <form className={`${s.panel} ${s.form}`} onSubmit={submit}>{error && <Alert severity="error">{error}</Alert>}{success && <Alert severity="success">{success}</Alert>}
      {(mode === 'login' || mode === 'forgot') && <TextField label={mode === 'login' ? 'Телефон, email или логин администратора' : 'Email'} type={mode === 'login' ? 'text' : 'email'} autoComplete={mode === 'login' ? 'username' : 'email'} required value={email} onChange={e => setEmail(e.target.value)} />}
      {mode === 'register' && <><TextField label="Имя" autoComplete="name" required value={name} onChange={e => setName(e.target.value)} slotProps={{ htmlInput: { maxLength: 100 } }} /><PhoneField required value={phone} onChange={setPhone} /><TextField label="Email (необязательно)" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} helperText="Для восстановления пароля. Без email обратитесь к администратору." /></>}
      {mode !== 'forgot' && <TextField label="Пароль" type="password" autoComplete={mode === 'login' ? 'current-password' : 'new-password'} required value={password} onChange={e => setPassword(e.target.value)} slotProps={{ htmlInput: { minLength: mode === 'login' ? 1 : 8, maxLength: 72 } }} helperText={mode === 'login' ? undefined : 'Не менее 8 символов'} />}
      {(mode === 'register' || mode === 'reset') && <TextField label="Повторите пароль" type="password" autoComplete="new-password" required value={confirm} onChange={e => setConfirm(e.target.value)} />}
      <Button type="submit" variant="contained" disabled={pending || (mode === 'reset' && !token) || (mode === 'reset' && !!success)}>{pending ? 'Подождите…' : mode === 'login' ? 'Войти' : mode === 'register' ? 'Создать аккаунт' : mode === 'forgot' ? 'Отправить ссылку' : 'Сохранить пароль'}</Button>
      {mode === 'login' ? <><Link className={s.link} href="/forgot/">Не помню пароль</Link><Link className={s.link} href="/register/">Создать аккаунт</Link></> : <Link className={s.link} href="/login/">Вернуться ко входу</Link>}
    </form></div></div>;
}
