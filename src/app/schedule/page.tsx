'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Alert, Button, Skeleton } from '@mui/material';
import { Booking, Busy, Client, money, today, Workplace } from '@/lib/api';
import { useApiResource } from '@/lib/useApiResource';
import { reservedOnDate } from '@/lib/workdays';
import { useAuth } from '@/components/Providers';
import { useNotify } from '@/components/Notifications';
import BookingForm from '@/components/BookingForm';
import DateField from '@/components/DateField';
import AvailabilityTimeline from '@/components/AvailabilityTimeline';
import s from '@/components/Common.module.css';
export default function Schedule() {
  const { user, loading: authLoading } = useAuth(); const [date, setDate] = useState('');

  const [selected, setSelected] = useState<Workplace | null>(null);
  const setSuccess = useNotify();
  const placesResource = useApiResource<Workplace[]>('/workplaces');
  const isAdmin = user?.role === 'admin';
  const busyResource = useApiResource<(Busy | Booking)[]>(`${isAdmin ? '/admin/bookings' : '/availability'}?date=${date}`, !!date && !authLoading, user?.id);
  const clientsResource = useApiResource<Client[]>('/admin/clients', user?.role === 'admin' && !!selected, user?.id);
  const places = placesResource.data || [];
  const busy = (busyResource.data || []).filter(b => !('cancelledAt' in b) || !b.cancelledAt);
  const loading = authLoading || placesResource.loading || busyResource.loading || !date;
  const error = placesResource.error || busyResource.error;
  const reload = () => { placesResource.reload(); busyResource.reload(); };
  useEffect(() => { setDate(today()); }, []);
  return <div className={s.page}><p className={s.eyebrow}>ВАШЕ РАБОЧЕЕ ВРЕМЯ</p><h1 className={s.title}>Выберите своё место</h1><p className={s.subtitle}>Ежедневно с 09:00 до 21:00 по Москве. Бронируйте от 30 минут с шагом 15 минут.</p>
    <div className={s.stack}><div className={s.row}><DateField value={date} onChange={value => { setDate(value); setSuccess(''); }} min={today()} /><Button onClick={reload} disabled={loading}>Обновить</Button></div>
      {!user && !authLoading && <div className={s.notice}>Расписание доступно без регистрации. Для бронирования <Link className={s.link} href="/login/">войдите</Link> или получите приглашение у администратора.</div>}
      
      {error && <Alert severity="error" action={<Button onClick={() => { if (placesResource.error) placesResource.reload(); if (busyResource.error) busyResource.reload(); }}>Повторить</Button>}>{error}</Alert>}
      {loading ? <div className={s.grid}>{[1, 2].map(n => <Skeleton key={n} variant="rounded" height={240} />)}</div> : !error && (places.length ? <div className={s.grid}>{places.map(p => {
        const reserved = reservedOnDate(p, date);
        const intervals: (Busy | Booking)[] = busy.filter(b => b.workplaceId === p.id).map(b => ({ ...b, own: 'clientId' in b ? b.clientId === user?.clientId : b.own }));
        if (reserved && isAdmin) intervals.push({ workplaceId: p.id, start: date + 'T09:00:00+03:00', end: date + 'T21:00:00+03:00' });

        return <article key={p.id} className={s.panel}><div className={s.stack}><div><h2 className={s.heading}>{p.name}</h2><p className={s.muted}>{money(p.hourlyPrice)} / час</p></div><p className={s.note}>{p.description}</p>
          <AvailabilityTimeline key={date} date={date} intervals={intervals} bookings={isAdmin ? intervals.filter((b): b is Booking => 'clientName' in b) : undefined} />
          {user?.role === 'master' ? <Link className={s.link} href="/account/">Мои записи →</Link> : user ? <Button variant="outlined" disabled={reserved} onClick={() => setSelected(p)}>Забронировать</Button> : <Link className={s.link} href="/login/">Войти для бронирования →</Link>}
        </div></article>;
      })}</div> : <div className={s.empty}><h2 className={s.heading}>Места скоро появятся</h2><p>Администратор ещё не добавил доступные для бронирования рабочие места.</p>{user?.role === 'admin' && <Link className={s.link} href="/admin/">Добавить первое место</Link>}</div>)}
    </div>{selected && user?.role !== 'master' && <BookingForm place={selected} date={date} busy={busy} clientsResource={clientsResource} close={() => setSelected(null)} saved={() => { setSelected(null); setSuccess('Место забронировано.'); busyResource.reload(); }} />}
  </div>;
}
