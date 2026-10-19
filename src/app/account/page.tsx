'use client';

import Link from 'next/link';
import { Alert, Button, Skeleton } from '@mui/material';
import { useAuth } from '@/components/Providers';
import BookingList from '@/components/BookingList';
import { Booking } from '@/lib/api';
import { useApiResource } from '@/lib/useApiResource';
import s from '@/components/Common.module.css';
export default function Account() {
  const { user, loading, unavailable, refresh } = useAuth();
  const resource = useApiResource<Booking[]>('/bookings', !!user, user?.id);
  const bookings = resource.data || []; const pending = resource.loading; const error = resource.error;
  return <div className={s.page}><p className={s.eyebrow}>ЛИЧНЫЙ КАБИНЕТ</p><h1 className={s.title}>Мои записи</h1>{loading ? <Skeleton height={150} /> : !user ? <Alert severity={unavailable ? 'error' : 'info'}>{unavailable ? <Button onClick={() => void refresh()}>Сервис недоступен. Повторить</Button> : <Link className={s.link} href="/login/">Войдите, чтобы увидеть свои записи</Link>}</Alert> : <div className={s.stack}><p className={s.subtitle}>{user.name}, {user.role === 'master' ? 'здесь записи на связанных с вами рабочих местах.' : 'здесь ваши предстоящие бронирования и история записей.'}</p>{user.role !== 'master' && <Link className={s.link} href="/schedule/">+ Забронировать место</Link>}{error ? <Alert severity="error" action={<Button onClick={resource.reload}>Повторить</Button>}>{error}</Alert> : pending ? <Skeleton variant="rounded" height={200} /> : <BookingList readOnly={user.role === 'master'} showClient={user.role === 'master'} bookings={bookings} reload={resource.reload} />}</div>}</div>;
}
