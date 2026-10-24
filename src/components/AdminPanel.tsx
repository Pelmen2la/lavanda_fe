'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Alert, Button, Checkbox, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, Skeleton, TextField, useMediaQuery } from '@mui/material';
import { useAuth } from '@/components/Providers';
import { useNotify } from '@/components/Notifications';
import BookingForm from '@/components/BookingForm';
import PhoneField from '@/components/PhoneField';
import DateField from '@/components/DateField';
import BookingList from '@/components/BookingList';
import BookingCalendar, { CalendarDatePicker } from '@/components/BookingCalendar';
import { api, Booking, Client, message, money, today, Workplace } from '@/lib/api';
import { validateClient, validatePlace, type FieldErrors } from '@/lib/validation';
import { weekdays } from '@/lib/workdays';
import { useApiResource } from '@/lib/useApiResource';
import s from '@/components/Common.module.css';

type Invitation = { url: string; expiresAt: string; expired: boolean; lastSentAt: string | null };
type ClientDraft = { id?: number; name: string; phone: string; email: string; note: string; registered: boolean; role: Client['role']; workplaceIds: number[]; workDays: number[]; reserveWorkdays: boolean };
type PlaceDraft = { id?: number; name: string; description: string; price: string; active: boolean; linkedPlaceIds: number[] };
const bookingDatesStorageKey = 'lavanda.admin.bookings.dates';
const bookingViewStorageKey = 'lavanda.admin.bookings.view';
function validStoredDate(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}
export default function AdminPanel() {
  const { user, loading: authLoading, unavailable, refresh } = useAuth(); const mobile = useMediaQuery('(max-width:599px)');
  const pathname = usePathname(); const router = useRouter(); const params = useSearchParams();
  const profile = pathname.replace(/\/$/, '') === '/admin/clients/profile'; const profileId = params.get('id') || '';
  const tab = pathname.replace(/\/$/, '') === '/admin/workplaces' ? 'places' : pathname.startsWith('/admin/clients') ? 'clients' : 'bookings';
  const [date, setDate] = useState(''); const [dateTo, setDateTo] = useState('');
  const [bookingView, setBookingView] = useState<'list' | 'timeline'>('list');
  const [timelineDate, setTimelineDate] = useState('');
  const [preferencesReady, setPreferencesReady] = useState(false);
  const fromDate = bookingView === 'timeline' ? timelineDate : date;
  const toDate = bookingView === 'timeline' ? timelineDate : dateTo;
  const [actionError, setError] = useState(''); const setNotice = useNotify(); const [pending, setPending] = useState(false);
  const [client, setClient] = useState<ClientDraft | null>(null); const [place, setPlace] = useState<PlaceDraft | null>(null); const [formError, setFormError] = useState('');
  const [invite, setInvite] = useState<(Invitation & { client: Client }) | null>(null); const [inviteError, setInviteError] = useState(''); const setInviteNotice = setNotice; const [bookingOpen, setBookingOpen] = useState(false); const [search, setSearch] = useState(''); const [roleFilter, setRoleFilter] = useState<'client' | 'master' | 'all'>('all');
  const [deleting, setDeleting] = useState<{ kind: 'clients' | 'workplaces'; id: number; name: string } | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [attempted, setAttempted] = useState(false);
  const fields: FieldErrors = attempted ? client ? validateClient(client) : place ? validatePlace(place) : {} : {};
  const isAdmin = user?.role === 'admin';
  const clientsResource = useApiResource<Client[]>('/admin/clients', isAdmin && ((tab === 'clients' && !profile) || bookingOpen), user?.id);
  const placesResource = useApiResource<Workplace[]>('/admin/workplaces', isAdmin && (tab === 'places' || tab === 'bookings' || profile || client?.role === 'master'), user?.id);
  const bookingsResource = useApiResource<Booking[]>(`/admin/bookings?from=${fromDate}&to=${toDate}`, isAdmin && tab === 'bookings' && !!fromDate && !!toDate && toDate >= fromDate, user?.id, false);
  const profileResource = useApiResource<{ client: Client; bookings: Booking[] }>(`/admin/clients/${profileId}`, isAdmin && profile && /^[1-9][0-9]*$/.test(profileId), user?.id);
  const clients = clientsResource.data || []; const places = placesResource.data || []; const bookings = bookingsResource.data || [];
  const busy = bookings.filter(booking => !booking.cancelledAt);
  const loading = tab === 'clients' ? clientsResource.loading : tab === 'places' ? placesResource.loading : placesResource.loading || bookingsResource.loading || !date;
  const error = (tab === 'bookings' && bookingView === 'list' && dateTo && dateTo < date ? 'Дата окончания не может быть раньше даты начала' : '') || actionError || (tab === 'clients' ? clientsResource.error : tab === 'places' ? placesResource.error : placesResource.error || bookingsResource.error);
  const reload = () => {
    setError('');
    if (tab === 'clients') clientsResource.reload();
    else if (tab === 'places') placesResource.reload();
    else { placesResource.reload(); bookingsResource.reload(); }
  };
  useEffect(() => {
    const initial = today();
    let from = initial; let to = initial; let day = initial; let view: 'list' | 'timeline' = 'list';
    try {
      const saved = JSON.parse(sessionStorage.getItem(bookingDatesStorageKey) || 'null');
      if (validStoredDate(saved?.from) && validStoredDate(saved?.to) && saved.to >= saved.from) {
        from = saved.from; to = saved.to;
      }
      if (validStoredDate(saved?.day)) day = saved.day;
    } catch { /* Use today's date if storage is unavailable or contains invalid JSON. */ }
    try {
      const savedView = localStorage.getItem(bookingViewStorageKey);
      if (savedView === 'timeline') view = 'timeline';
      if (!savedView) {
        // Preserve the old view preference, but no longer restore persistent dates.
        try {
          const legacy = JSON.parse(localStorage.getItem(bookingDatesStorageKey) || 'null');
          if (legacy?.view === 'timeline') view = 'timeline';
        } catch { /* Ignore malformed legacy preferences. */ }
      }
      localStorage.setItem(bookingViewStorageKey, view);
      localStorage.removeItem(bookingDatesStorageKey);
    } catch { /* The view remains usable when local storage is unavailable. */ }
    setDate(from); setDateTo(to); setTimelineDate(day); setBookingView(view);
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    // Empty initial values must not overwrite the saved range before it is restored.
    if (!preferencesReady || !isAdmin || tab !== 'bookings' || !validStoredDate(date) || !validStoredDate(dateTo) || dateTo < date || !validStoredDate(timelineDate)) return;
    try {
      sessionStorage.setItem(bookingDatesStorageKey, JSON.stringify({ from: date, to: dateTo, day: timelineDate }));
    } catch { /* Date selection still works when browser storage is unavailable. */ }
  }, [date, dateTo, timelineDate, preferencesReady, isAdmin, tab]);
  useEffect(() => {
    if (!preferencesReady || !isAdmin || tab !== 'bookings') return;
    try { localStorage.setItem(bookingViewStorageKey, bookingView); }
    catch { /* View selection still works when browser storage is unavailable. */ }
  }, [bookingView, preferencesReady, isAdmin, tab]);
  useEffect(() => { setError(''); setClient(null); setPlace(null); setInvite(null); setDeleting(null); setBookingOpen(false); }, [pathname]);
  async function saveClient(e: React.FormEvent) {
    e.preventDefault(); if (!client || pending) return; setAttempted(true); setFormError(''); if (Object.keys(validateClient(client)).length) return; setPending(true);
    try { const result = await api<{ id: number }>(`/admin/clients${client.id ? `/${client.id}` : ''}`, { name: client.name, phone: client.phone, email: client.email, note: client.note, role: client.role === 'admin' ? undefined : client.role, workplaceIds: client.workplaceIds, workDays: client.workDays, reserveWorkdays: client.reserveWorkdays }, client.id ? 'PUT' : 'POST'); setClient(null); if (!client.id) router.push('/admin/clients/profile/?id=' + result.id); profileResource.reload(); setNotice('Карточка сохранена.'); clientsResource.reload(); placesResource.reload(); bookingsResource.reload(); } catch (e) { setFormError(message(e)); } finally { setPending(false); }
  }
  async function savePlace(e: React.FormEvent) {
    e.preventDefault(); if (!place || pending) return; setAttempted(true); setFormError(''); if (Object.keys(validatePlace(place)).length) return; setPending(true);
    try { const hourlyPrice = Math.round(Number(place.price.replace(',', '.')) * 100); if (!Number.isFinite(hourlyPrice) || hourlyPrice <= 0) throw new Error('Укажите положительную цену'); await api(`/admin/workplaces${place.id ? `/${place.id}` : ''}`, { name: place.name, description: place.description, hourlyPrice, active: place.active, linkedPlaceIds: place.linkedPlaceIds }, place.id ? 'PUT' : 'POST'); setPlace(null); setNotice('Рабочее место сохранено.'); placesResource.reload(); bookingsResource.reload(); } catch (e) { setFormError(message(e)); } finally { setPending(false); }
  }
  async function openInvite(c: Client, renew = false) {
    setPending(true); setInviteError(''); setInviteNotice(''); setError('');
    try {
      const create = renew || !c.hasInvitation;
      const result = await api<Invitation>(`/admin/clients/${c.id}/invite`, create ? {} : undefined);
      setInvite({ ...result, client: { ...c, hasInvitation: true } });
      if (!renew) setInviteSent(false);
      if (create) { clientsResource.reload(); profileResource.reload(); }
    } catch (e) { if (invite) setInviteError(message(e)); else setError(message(e)); }
    finally { setPending(false); }
  }
  async function emailInvite() {
    if (!invite || pending || inviteSent) return;
    setPending(true); setInviteError(''); setInviteNotice('');
    try {
      const result = await api<{ email: string; lastSentAt: string }>(`/admin/clients/${invite.client.id}/invite/send`, {});
      setInvite(current => current?.client.id === invite.client.id ? { ...current, lastSentAt: result.lastSentAt } : current);
      setInviteSent(true);
      setInviteNotice(`Письмо для ${result.email} передано почтовому серверу.`);
    } catch (e) { setInviteError(message(e)); }
    finally { setPending(false); }
  }
  async function confirmDelete() {
    if (!deleting || pending) return;
    setPending(true); setDeleteError('');
    try {
      const result = await api<{ cancelledCount: number }>(`/admin/${deleting.kind}/${deleting.id}`, undefined, 'DELETE');
      if (deleting.kind === 'clients') { clientsResource.reload(); placesResource.reload(); }
      else { placesResource.reload(); clientsResource.reload(); }
      bookingsResource.reload();
      setNotice((deleting.kind === 'clients' ? 'Пользователь удалён.' : 'Рабочее место удалено.') + (result.cancelledCount ? ` Отменено записей: ${result.cancelledCount}.` : ''));
      setDeleting(null);
    } catch (e) { setDeleteError(message(e)); }
    finally { setPending(false); }
  }
  if (authLoading) return <div className={s.page}><Skeleton height={200} /></div>;
  if (!user) return <div className={s.page}><Alert severity={unavailable ? 'error' : 'info'}>{unavailable ? <Button onClick={() => void refresh()}>Сервис недоступен. Повторить</Button> : <Link className={s.link} href="/login/">Войдите как администратор</Link>}</Alert></div>;
  if (user.role !== 'admin') return <div className={s.page}><Alert severity="warning">Этот раздел доступен только администратору.</Alert></div>;
  return <div className={s.page}><p className={s.eyebrow}>УПРАВЛЕНИЕ ПРОСТРАНСТВОМ</p><h1 className={s.title}>Панель администратора</h1><p className={s.subtitle}>Записи, рабочие места и ваши клиенты — в одном месте.</p>
    <nav className={s.tabs} aria-label="Разделы администрирования">{[['bookings', 'Записи', '/admin/bookings/'], ['places', 'Рабочие места', '/admin/workplaces/'], ['clients', 'Клиенты и мастера', '/admin/clients/']].map(([value, label, href]) => <Button component={Link} href={href} key={value} variant={tab === value ? 'contained' : 'outlined'} aria-current={tab === value ? 'page' : undefined}>{label}</Button>)}</nav>
    <div className={s.stack}>{error && <Alert severity="error" action={<Button onClick={reload}>Повторить</Button>}>{error}</Alert>}
      {tab === 'bookings' && <>
        <div className={s.row} role="group" aria-label="Вид записей"><Button variant={bookingView === 'list' ? 'contained' : 'outlined'} aria-pressed={bookingView === 'list'} onClick={() => setBookingView('list')}>Список</Button><Button variant={bookingView === 'timeline' ? 'contained' : 'outlined'} aria-pressed={bookingView === 'timeline'} onClick={() => setBookingView('timeline')}>Таймлайн</Button></div>
        {bookingView === 'timeline' ? <CalendarDatePicker date={timelineDate} onChange={setTimelineDate} /> : <div className={s.row}><DateField label="С даты" value={date} onChange={value => { setDate(value); if (dateTo < value) setDateTo(value); }} /><DateField label="По дату включительно" value={dateTo} min={date} onChange={setDateTo} /></div>}
        <div className={s.row}><Button variant="contained" disabled={loading || !!error} onClick={() => setBookingOpen(true)}>Записать клиента</Button><Button onClick={reload} disabled={loading}>Обновить</Button></div>
        {loading ? <Skeleton variant="rounded" height={180} /> : !error && (bookingView === 'timeline' ? <BookingCalendar key={timelineDate} date={timelineDate} places={places} bookings={bookings} reload={bookingsResource.reload} /> : <BookingList bookings={bookings} admin reload={bookingsResource.reload} />)}</>}
      {profile && <><Link className={s.link} href="/admin/clients/">← Все пользователи</Link>{!/^[1-9][0-9]*$/.test(profileId) ? <Alert severity="error">Некорректный адрес пользователя</Alert> : profileResource.loading ? <Skeleton height={200} /> : profileResource.error ? <Alert severity="error" action={<Button onClick={profileResource.reload}>Повторить</Button>}>{profileResource.error}</Alert> : profileResource.data && <><section className={s.panel}><div className={s.stack}><h2 className={s.heading}>{profileResource.data.client.name}</h2><p>{profileResource.data.client.role === 'master' ? 'Мастер' : profileResource.data.client.role === 'admin' ? 'Администратор' : 'Клиент'}</p><p>Email: {profileResource.data.client.email || 'Не указан'}</p><p>Телефон: {profileResource.data.client.phone || 'Не указан'}</p><p className={s.muted}>Дата создания: {new Date(profileResource.data.client.createdAt).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })}</p><p>{profileResource.data.client.registered ? 'Аккаунт создан' : 'Без аккаунта'}</p>{profileResource.data.client.note && <p className={s.note}>Заметка: {profileResource.data.client.note}</p>}{profileResource.data.client.role === 'master' && <><p>Рабочие места: {profileResource.data.client.workplaceIds.map(id => places.find(p => p.id === id)?.name || `№${id}`).join(', ') || 'Не назначены'}</p><p>Рабочие дни: {weekdays.filter(day => profileResource.data!.client.workDays.includes(day.value)).map(day => day.label).join(', ') || 'Не заданы'}</p><p>Резервировать места по рабочим дням: {profileResource.data.client.reserveWorkdays ? 'Да' : 'Нет'}</p></>}<div className={s.actions}><Button onClick={() => { setAttempted(false); setFormError(''); setClient(profileResource.data!.client); }}>Изменить</Button>{!profileResource.data.client.registered && <Button disabled={pending} onClick={() => openInvite(profileResource.data!.client)}>{profileResource.data.client.hasInvitation ? 'Открыть приглашение' : 'Выдать приглашение'}</Button>}</div></div></section><h2 className={s.heading}>Записи пользователя</h2><BookingList bookings={profileResource.data.bookings} admin reload={profileResource.reload} /></>}</>}
      {tab === 'places' && <><div><Button variant="contained" onClick={() => { setAttempted(false); setFormError(''); setPlace({ name: '', description: '', price: '', active: true, linkedPlaceIds: [] }); }}>+ Добавить место</Button></div>{loading ? <Skeleton height={160} /> : !error && (places.length ? <div className={s.grid}>{places.map(p => <article key={p.id} className={`${s.panel} ${s.workplaceCard}`}><div className={s.stack}><div className={s.cardTop}><div><h2 className={s.heading}>{p.name}</h2><p>{money(p.hourlyPrice)}/час</p></div><Chip size="small" label={p.active ? 'Доступно' : 'Скрыто'} /></div><p className={`${s.muted} ${s.note}`}>{p.description}</p>{!!p.linkedPlaceIds?.length && <p className={s.muted}>Включает: {p.linkedPlaceIds.map(id => places.find(other => other.id === id)?.name || `№${id}`).join(', ')}</p>}<div className={s.workplaceActions}><Button variant="outlined" onClick={() => { setAttempted(false); setFormError(''); setPlace({ id: p.id, name: p.name, description: p.description, price: String(p.hourlyPrice / 100), active: p.active, linkedPlaceIds: p.linkedPlaceIds || [] }); }}>Редактировать</Button><Button color="error" disabled={pending} onClick={() => { setDeleteError(''); setDeleting({ kind: 'workplaces', id: p.id, name: p.name }); }}>Удалить</Button></div></div></article>)}</div> : <div className={s.empty}>Добавьте первое рабочее место, чтобы открыть бронирование.</div>)}</>}
      {tab === 'clients' && !profile && <><div className={s.clientToolbar}><TextField fullWidth label="Поиск по имени, телефону или email" value={search} onChange={e => setSearch(e.target.value)} /><Button variant="contained" onClick={() => { setAttempted(false); setFormError(''); setClient({ name: '', phone: '', email: '', note: '', registered: false, role: 'client', workplaceIds: [], workDays: [], reserveWorkdays: false }); }}>+ Добавить пользователя</Button></div><div className={s.roleFilter}><TextField select fullWidth label="Роль" value={roleFilter} onChange={e => setRoleFilter(e.target.value as 'client' | 'master' | 'all')}><MenuItem value="all">Все пользователи</MenuItem><MenuItem value="client">Клиенты</MenuItem><MenuItem value="master">Мастера</MenuItem></TextField></div>{loading ? <Skeleton height={160} /> : !error && <div className={s.grid}>{clients.filter(c => c.role !== 'admin' && (roleFilter === 'all' || c.role === roleFilter) && `${c.name} ${c.phone} ${c.email}`.toLowerCase().includes(search.toLowerCase())).map(c => <article key={c.id} className={s.panel}><div className={s.stack}><div><h2 className={s.heading}><Link href={`/admin/clients/profile/?id=${c.id}`}>{c.name}</Link></h2><p className={s.muted}>{c.email}</p><p className={s.muted}>{c.phone}</p>{c.createdAt && <p className={s.muted}>Дата создания: <time dateTime={c.createdAt}>{new Date(c.createdAt).toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' })}</time></p>}</div><Chip label={c.role === 'master' ? 'Мастер' : 'Клиент'} size="small" /><Chip label={c.registered ? 'Аккаунт создан' : 'Без аккаунта'} size="small" sx={{ alignSelf: 'flex-start' }} />{c.note && <p className={`${s.notice} ${s.note}`}>Заметка: {c.note}</p>}<div className={s.actions}><Button variant="outlined" onClick={() => { setAttempted(false); setFormError(''); setClient(c); }}>Изменить</Button>{c.id !== user.clientId && <Button color="error" disabled={pending} onClick={() => { setDeleteError(''); setDeleting({ kind: 'clients', id: c.id, name: c.name }); }}>Удалить</Button>}{!c.registered && <Button disabled={pending} onClick={() => openInvite(c)}>{c.hasInvitation ? 'Открыть приглашение' : 'Выдать приглашение'}</Button>}</div></div></article>)}</div>}</>}
    </div>
    <Dialog open={!!client} onClose={() => !pending && setClient(null)} fullWidth maxWidth="sm" fullScreen={mobile}><form noValidate onSubmit={saveClient}><DialogTitle>{client?.id ? 'Карточка пользователя' : 'Новый пользователь'}</DialogTitle><DialogContent>{client && <div className={s.form}><TextField required label="Имя" error={!!fields.name} helperText={fields.name} value={client.name} onChange={e => setClient({ ...client, name: e.target.value })} slotProps={{ htmlInput: { maxLength: 200 } }} />{client.role !== 'admin' && <TextField select label="Роль" value={client.role} onChange={e => setClient({ ...client, role: e.target.value as 'client' | 'master', workplaceIds: e.target.value === 'master' ? client.workplaceIds : [] })}><MenuItem value="client">Клиент</MenuItem><MenuItem value="master">Мастер</MenuItem></TextField>}
{client.role === 'master' && <>{placesResource.error ? <Alert severity="error" action={<Button onClick={placesResource.reload}>Повторить</Button>}>{placesResource.error}</Alert> : <TextField select label="Связанные рабочие места" error={!!fields.workplaceIds} value={client.workplaceIds} disabled={placesResource.loading} slotProps={{ select: { multiple: true, renderValue: value => (value as number[]).map(id => places.find(p => p.id === id)?.name || String(id)).join(', ') } }} onChange={e => { const value = e.target.value as unknown as number[] | string; setClient({ ...client, workplaceIds: typeof value === 'string' ? value.split(',').filter(Boolean).map(Number) : value }); }} helperText={fields.workplaceIds || (placesResource.loading ? 'Загружаем места…' : 'Можно выбрать несколько мест.')}>{places.map(p => <MenuItem key={p.id} value={p.id}><Checkbox checked={client.workplaceIds.includes(p.id)} />{p.name}{!p.active && ' (скрыто)'}</MenuItem>)}</TextField>}</>}{client.role === 'master' && <>
  <TextField select label="Рабочие дни недели" error={!!fields.workDays} helperText={fields.workDays} value={client.workDays} slotProps={{ select: { multiple: true, renderValue: value => weekdays.filter(day => (value as number[]).includes(day.value)).map(day => day.label).join(', ') } }} onChange={e => { const value = e.target.value as unknown as number[] | string; setClient({ ...client, workDays: typeof value === 'string' ? value.split(',').filter(Boolean).map(Number) : value }); }}>{weekdays.map(day => <MenuItem key={day.value} value={day.value}><Checkbox checked={client.workDays.includes(day.value)} />{day.label}</MenuItem>)}</TextField>
  <FormControlLabel control={<Checkbox checked={client.reserveWorkdays} onChange={e => setClient({ ...client, reserveWorkdays: e.target.checked })} />} label="Занимать для мастера место по рабочим дням" />
  <p className={s.muted}>При включении все прикреплённые места заняты с 09:00 до 21:00 в выбранные дни. Существующие записи сохраняются.</p>
</>}
<PhoneField disabled={client.registered && !!(clients.find(c => c.id === client.id)?.phone || profileResource.data?.client.phone)} error={!!fields.phone} helperText={fields.phone} value={client.phone} onChange={phone => setClient({ ...client, phone })} /><TextField label="Email" error={!!fields.email} type="email" disabled={client.registered} value={client.email} onChange={e => setClient({ ...client, email: e.target.value })} helperText={fields.email || (client.registered ? 'Email зарегистрированного аккаунта защищён от случайного изменения.' : 'Необязательно. Для писем и восстановления пароля.')} /><TextField label="Заметка администратора" error={!!fields.note} multiline minRows={3} value={client.note} onChange={e => setClient({ ...client, note: e.target.value })} slotProps={{ htmlInput: { maxLength: 4000 } }} helperText={fields.note || 'Видна только администратору'} /></div>}</DialogContent>{formError && <div className={s.formError}><Alert severity="error">{formError}</Alert></div>}<DialogActions><Button disabled={pending} onClick={() => setClient(null)}>Отмена</Button><Button disabled={pending} type="submit" variant="contained">{pending ? 'Сохраняем…' : 'Сохранить'}</Button></DialogActions></form></Dialog>
    <Dialog open={!!place} onClose={() => !pending && setPlace(null)} fullWidth maxWidth="sm" fullScreen={mobile}><form noValidate onSubmit={savePlace}><DialogTitle>{place?.id ? 'Рабочее место' : 'Новое рабочее место'}</DialogTitle><DialogContent>{place && <div className={s.form}><TextField required label="Название" error={!!fields.name} helperText={fields.name} placeholder="Например, стол для макияжа" value={place.name} onChange={e => setPlace({ ...place, name: e.target.value })} slotProps={{ htmlInput: { maxLength: 200 } }} /><TextField label="Описание" error={!!fields.description} helperText={fields.description} multiline minRows={4} value={place.description} onChange={e => setPlace({ ...place, description: e.target.value })} slotProps={{ htmlInput: { maxLength: 4000 } }} /><TextField required label="Цена за час, ₽" error={!!fields.price} helperText={fields.price} type="number" value={place.price} onChange={e => setPlace({ ...place, price: e.target.value })} slotProps={{ htmlInput: { min: 0.01, max: 100000, step: 0.01 } }} /><TextField select label="Связанные места (в составе кабинета)" value={place.linkedPlaceIds} slotProps={{ select: { multiple: true, renderValue: value => (value as number[]).map(id => places.find(p => p.id === id)?.name || String(id)).join(', ') } }} onChange={e => { const value = e.target.value as unknown as number[] | string; setPlace({ ...place, linkedPlaceIds: typeof value === 'string' ? value.split(',').filter(Boolean).map(Number) : value }); }} helperText="Бронь этого места занимает все выбранные места. Цена за час выше — за весь кабинет. Отдельные места можно бронировать независимо.">{places.filter(p => p.id !== place.id && !p.linkedPlaceIds?.length).map(p => <MenuItem key={p.id} value={p.id}><Checkbox checked={place.linkedPlaceIds.includes(p.id)} />{p.name}{!p.active && ' (скрыто)'}</MenuItem>)}</TextField><FormControlLabel control={<Checkbox checked={place.active} onChange={e => setPlace({ ...place, active: e.target.checked })} />} label="Доступно для новых бронирований" /><p className={s.muted}>Скрытие места не отменяет существующие брони. Изменение цены применяется только к новым записям.</p></div>}</DialogContent>{formError && <div className={s.formError}><Alert severity="error">{formError}</Alert></div>}<DialogActions><Button disabled={pending} onClick={() => setPlace(null)}>Отмена</Button><Button disabled={pending} type="submit" variant="contained">{pending ? 'Сохраняем…' : 'Сохранить'}</Button></DialogActions></form></Dialog>
    <Dialog open={!!invite} onClose={() => !pending && setInvite(null)} fullWidth maxWidth="sm"><DialogTitle>Приглашение для {invite?.client.name}</DialogTitle><DialogContent><div className={s.form}>

      
      {invite?.client.email && <p>Email клиента: {invite.client.email}</p>}
      {invite?.expired ? <Alert severity="warning">Срок приглашения истёк. Обновите ссылку.</Alert> : <p>Действует до {invite && new Date(invite.expiresAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })} МСК. Используется один раз.</p>}
      {invite?.url ? <TextField label="Ссылка для регистрации" value={invite.url} multiline slotProps={{ input: { readOnly: true } }} onFocus={e => e.target.select()} /> : <Alert severity="info">Это приглашение создано до обновления системы. Нажмите «Обновить», чтобы получить новую ссылку.</Alert>}
      <p className={s.muted}>При обновлении старая ссылка перестанет работать. Новая будет действовать 7 дней.</p>
      {invite?.lastSentAt && <p className={s.muted}>Последнее приглашение отправлено: <time dateTime={invite.lastSentAt}>{new Date(invite.lastSentAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })}</time> МСК</p>}
      {inviteError && <Alert severity="error">{inviteError}</Alert>}<div className={s.actions}>
        <Button disabled={pending || !invite?.url || invite.expired} onClick={async () => { try { await navigator.clipboard.writeText(invite!.url); setInviteNotice('Ссылка скопирована.'); } catch { setInviteError('Выделите ссылку и скопируйте вручную.'); } }}>Скопировать</Button>
        <Button disabled={pending} onClick={() => invite && openInvite(invite.client, true)}>Обновить</Button>
        {invite?.client.email && !inviteSent && <Button variant="contained" disabled={pending || !invite.url || invite.expired} onClick={emailInvite}>{pending ? 'Подождите…' : 'Отправить на почту'}</Button>}
      </div>
    </div></DialogContent><DialogActions><Button disabled={pending} onClick={() => setInvite(null)}>Закрыть</Button></DialogActions></Dialog>
    <Dialog open={!!deleting} onClose={() => !pending && setDeleting(null)} fullWidth maxWidth="xs">
      <DialogTitle>Удалить {deleting?.kind === 'clients' ? 'пользователя' : 'рабочее место'}?</DialogTitle>
      <DialogContent><div className={s.stack}>

        <p>«{deleting?.name}» будет удалён{deleting?.kind === 'clients' ? '' : 'о'} из списка.</p>
        <p>{deleting?.kind === 'clients' ? 'Все действующие записи пользователя (в том числе как мастера) будут отменены. Доступ к аккаунту и приглашения станут недействительными. История записей сохранится.' : 'Все действующие записи на это место будут отменены. Место исчезнет из расписания и списков мастеров. История записей сохранится.'}</p>
      </div></DialogContent>
      {deleteError && <div className={s.formError}><Alert severity="error">{deleteError}</Alert></div>}<DialogActions><Button disabled={pending} onClick={() => setDeleting(null)}>Отмена</Button><Button color="error" variant="contained" disabled={pending} onClick={confirmDelete}>{pending ? 'Удаляем…' : 'Удалить'}</Button></DialogActions>
    </Dialog>
    {bookingOpen && <BookingForm places={places} date={fromDate} busy={busy} clientsResource={clientsResource} close={() => setBookingOpen(false)} saved={() => { setBookingOpen(false); setNotice('Бронь создана.'); bookingsResource.reload(); }} />}
  </div>;
}
