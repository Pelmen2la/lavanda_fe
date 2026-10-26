'use client';
import { useEffect, useState } from 'react';
import { Alert, Button, Checkbox, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, MenuItem, TextField, useMediaQuery } from '@mui/material';
import { api, ApiError, Booking, Busy, Client, clock, instant, message, money, times, Workplace } from '@/lib/api';
import { validateBookingComment, type FieldErrors } from '@/lib/validation';
import { reservedOnDate } from '@/lib/workdays';
import { bookingBlocksPlace, overlappingPlaces } from '@/lib/linkedPlaces';
import { useAuth } from './Providers';
import s from './Common.module.css';
import DateField from './DateField';
import PlacePhotos from './PlacePhotos';
const bookingDateStorageKey = 'lavanda.booking.date';
export default function BookingForm({ place: initialPlace, places, date: initialDate, busy, clientsResource, close, saved }: { place?: Workplace; places?: Workplace[]; date: string; busy: Busy[]; clientsResource: { data?: Client[]; loading: boolean; error: string; reload: () => void }; close: () => void; saved: () => void }) {
  const { user } = useAuth(); const mobile = useMediaQuery('(max-width:599px)');
  const [date, setDate] = useState(initialDate);
  const hasDatePicker = !!places;
  useEffect(() => {
    if (!hasDatePicker) return;
    try {
      const stored = sessionStorage.getItem(bookingDateStorageKey);
      if (!stored || !/^\d{4}-\d{2}-\d{2}$/.test(stored)) return;
      const parsed = new Date(`${stored}T00:00:00Z`);
      if (Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === stored) setDate(stored);
    } catch { /* Keep the supplied date when session storage is unavailable. */ }
  }, [hasDatePicker]);
  function changeDate(value: string) {
    setDate(value); setFullDay(false); setStart(''); setEnd(''); setConflicts(null); setError('');
    try { sessionStorage.setItem(bookingDateStorageKey, value); }
    catch { /* Booking remains available when browser storage is disabled. */ }
  }
  const [fullDay, setFullDay] = useState(false);
  const [start, setStart] = useState(''); const [end, setEnd] = useState(''); const [clientId, setClientId] = useState(user?.role === 'admin' ? 0 : user?.clientId || 0);
  const clients = (clientsResource.data || []).filter(c => c.role === 'client');
  const masters = (clientsResource.data || []).filter(c => c.role === 'master');
  const [masterId, setMasterId] = useState(0);
  const [comment, setComment] = useState('');
  const [placeIds, setPlaceIds] = useState<number[]>(initialPlace ? [initialPlace.id] : []);
  const availablePlaces = (places || (initialPlace ? [initialPlace] : [])).filter(p => p.active);
  const master = masters.find(c => c.id === masterId);
  const choices = master ? availablePlaces.filter(p => master.workplaceIds.includes(p.id)) : availablePlaces;
  const selectedPlaces = choices.filter(p => placeIds.includes(p.id));
  const reserved = selectedPlaces.some(p => reservedOnDate(p, date));
  const hourlyPrice = selectedPlaces.reduce((sum, p) => sum + p.hourlyPrice, 0);
  const [error, setError] = useState(''); const [pending, setPending] = useState(false);
  const isAdmin = user?.role === 'admin';
  const [conflicts, setConflicts] = useState<Booking[] | null>(null);
  const overlaps = (from: string, to: string) => busy.some(b => selectedPlaces.some(p => bookingBlocksPlace(b, p)) && Date.parse(instant(date, from)) < Date.parse(b.end) && Date.parse(instant(date, to)) > Date.parse(b.start));
  const starts = times.slice(0, -2).filter((t, i) => Date.parse(instant(date, t)) > Date.now() && (isAdmin || !overlaps(t, times[i + 2])));
  const ends = start ? times.filter(t => Date.parse(instant(date, t)) - Date.parse(instant(date, start)) >= 30 * 60000 && (isAdmin || !overlaps(start, t))) : [];
  const total = start && end ? selectedPlaces.reduce((sum, p) => sum + Math.round((Date.parse(instant(date, end)) - Date.parse(instant(date, start))) / 3600000 * p.hourlyPrice), 0) : 0;
  const [attempted, setAttempted] = useState(false);
  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (!clientId || (isAdmin && !clients.some(c => c.id === clientId))) errors.clientId = 'Выберите клиента';
    if (masterId && !masters.some(m => m.id === masterId)) errors.masterId = 'Выберите доступного мастера';
    if (!selectedPlaces.length) errors.placeIds = 'Выберите хотя бы одно место';
    else if (overlappingPlaces(selectedPlaces)) errors.placeIds = 'Выберите кабинет целиком или отдельные места: они не должны дублироваться.';
    else if (reserved) errors.placeIds = 'Место закреплено за мастером на этот день';
    if (!start) errors.start = 'Выберите время начала';
    else if (!starts.includes(start)) errors.start = 'Это время уже недоступно. Выберите другое';
    if (!end) errors.end = 'Выберите время окончания';
    else if (!ends.includes(end)) errors.end = 'Выберите доступный интервал от 30 минут';
    const commentError = validateBookingComment(comment);
    if (commentError) errors.comment = commentError;
    return errors;
  }
  const fields = attempted ? validate() : {};
  async function save(confirmedConflictIds?: number[]) {
    if (pending) return;
    setAttempted(true); setError('');
    if (Object.keys(validate()).length) { setConflicts(null); return; }
    setPending(true); setError('');
    try {
      await api('/bookings', { workplaceIds: selectedPlaces.map(p => p.id), clientId, masterId, start: instant(date, start), end: instant(date, end), comment: comment.trim(), confirmedConflictIds });
      saved();
    } catch (e) {
      if (isAdmin && e instanceof ApiError && e.status === 409 && e.details && typeof e.details === 'object' && 'conflicts' in e.details && Array.isArray(e.details.conflicts)) {
        setConflicts(e.details.conflicts as Booking[]);
      } else { setConflicts(null); setError(message(e)); }
    } finally { setPending(false); }
  }
  function submit(e: React.FormEvent) { e.preventDefault(); void save(); }
  return <><Dialog open onClose={() => !pending && close()} fullWidth maxWidth="sm" fullScreen={mobile}><form noValidate onSubmit={submit}>
    <DialogTitle>{fullDay ? 'Забронировать на день' : places ? 'Записать клиента' : 'Забронировать место'}</DialogTitle><DialogContent><div className={s.form}>
      <div><h2 className={s.heading}>{selectedPlaces.map(p => p.name).join(', ')}</h2><p className={s.muted}>{date.split('-').reverse().join('.')} · {selectedPlaces.length ? money(hourlyPrice) + '/час' : ''} · МСК</p></div>
      {selectedPlaces.map(p => <PlacePhotos key={p.id} ids={p.photoIds} name={p.name} />)}
      {selectedPlaces.some(p => p.linkedPlaceIds?.length) && <Alert severity="info">Бронирование кабинета занимает все связанные с ним места. Их стоимость уже включена в цену кабинета.</Alert>}


      {places && <DateField label="Дата записи" value={date} onChange={changeDate} />}
      {user?.role === 'admin' && <TextField select required label="Клиент" error={!!fields.clientId} helperText={fields.clientId} value={clients.some(c => c.id === clientId) ? clientId : ''} disabled={!clients.length} onChange={e => setClientId(Number(e.target.value))}>{clients.map(c => <MenuItem key={c.id} value={c.id}>{c.name} · {c.email}</MenuItem>)}</TextField>}
      {places && <><TextField select label="Мастер" error={!!fields.masterId} helperText={fields.masterId} value={masterId} disabled={clientsResource.loading} onChange={e => { const id = Number(e.target.value); setMasterId(id); const selected = masters.find(m => m.id === id); if (selected) { const first = availablePlaces.find(p => selected.workplaceIds.includes(p.id) && !reservedOnDate(p, date)); setPlaceIds(first ? [first.id] : []); } setFullDay(false); setStart(''); setEnd(''); }}><MenuItem value={0}>Без мастера</MenuItem>{masters.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}</TextField>
      <TextField select required label="Рабочие места" error={!!fields.placeIds} value={selectedPlaces.map(p => p.id)} slotProps={{ select: { multiple: true, renderValue: value => (value as number[]).map(id => choices.find(p => p.id === id)?.name).join(', ') } }} onChange={e => { const value = e.target.value as unknown as number[] | string; setPlaceIds(typeof value === 'string' ? value.split(',').filter(Boolean).map(Number) : value); setFullDay(false); setStart(''); setEnd(''); }} helperText={fields.placeIds || 'Можно выбрать несколько мест. Время записи общее для всех.'}>{choices.map(p => <MenuItem key={p.id} value={p.id} disabled={reservedOnDate(p, date)}><Checkbox checked={placeIds.includes(p.id)} />{p.name} · {money(p.hourlyPrice)}/час{reservedOnDate(p, date) && ' · Занято мастером'}</MenuItem>)}</TextField>
      {!choices.length && <Alert severity="info">{master ? 'У мастера нет доступных прикреплённых мест.' : 'Нет доступных рабочих мест.'}</Alert>}</>}
      {(fullDay || (selectedPlaces.length > 0 && (isAdmin || !overlaps('09:00', '21:00')))) && <FormControlLabel label="На весь день (09:00–21:00)" control={<Checkbox checked={fullDay} disabled={pending || (!fullDay && (reserved || !starts.includes('09:00')))} onChange={(_, checked) => { setFullDay(checked); setStart(checked ? '09:00' : ''); setEnd(checked ? '21:00' : ''); setConflicts(null); setError(''); }} />} />}
      {reserved && <Alert severity="warning">Место закреплено за мастером на этот день. Выберите другое место или дату.</Alert>}{!!selectedPlaces.length && !starts.length && <Alert severity="info">Для выбранных мест нет общего свободного интервала. Измените места или дату.</Alert>}<div className={s.twoFields}>
        <TextField select required disabled={fullDay || !selectedPlaces.length || reserved} label="Начало" error={!!fields.start} helperText={fields.start} value={start} onChange={e => { setStart(e.target.value); setEnd(''); }}>{starts.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
        <TextField select required label="Окончание" error={!!fields.end} helperText={fields.end} value={end} disabled={fullDay || !start} onChange={e => setEnd(e.target.value)}>{ends.map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}</TextField>
      </div>
      {isAdmin && start && end && overlaps(start, end) && <Alert severity="warning">Выбранное время пересекается с существующими записями. Перед сохранением потребуется подтвердить их полную отмену.</Alert>}
      <TextField label="Комментарий" multiline minRows={3} value={comment} onChange={e => setComment(e.target.value)} disabled={pending} error={!!fields.comment} helperText={fields.comment || 'Необязательно. До 2000 символов.'} />
      <div className={s.notice}>{total ? <>Стоимость: <strong>{money(total)}</strong><br /></> : null}Онлайн-оплата не требуется. Отменить бронь можно в любое время.</div>
    </div></DialogContent>{(error || (isAdmin && clientsResource.error)) && <div className={s.formError}><Alert severity="error" action={clientsResource.error ? <Button onClick={clientsResource.reload}>Повторить</Button> : undefined}>{error || clientsResource.error}</Alert></div>}<DialogActions><Button onClick={close} disabled={pending}>Назад</Button><Button type="submit" variant="contained" disabled={pending || (isAdmin && clientsResource.loading)}>{pending ? 'Сохраняем…' : 'Подтвердить бронь'}</Button></DialogActions>
  </form></Dialog>
  <Dialog open={conflicts !== null} onClose={() => !pending && setConflicts(null)} fullWidth maxWidth="sm">
    <DialogTitle>Подтвердите приоритетную запись</DialogTitle>
    <DialogContent><div className={s.stack}>
      <Alert severity="warning">{conflicts?.length ? 'Следующие записи будут отменены целиком, даже если пересечение частичное. Вместо них будет создана новая запись.' : 'Конфликтующих записей больше нет. Можно сохранить новую запись без отмен.'}</Alert>
      {conflicts?.map(b => <div key={b.id}><strong>№{b.id} · {b.clientName}</strong><p>{b.workplaceName} · {clock(b.start)}–{clock(b.end)}</p></div>)}
      <p>Новая запись: {selectedPlaces.map(p => p.name).join(', ')} · {start}–{end}</p>
    </div></DialogContent>
    <DialogActions><Button disabled={pending} onClick={() => setConflicts(null)}>Назад</Button><Button color="error" variant="contained" disabled={pending} onClick={() => void save(conflicts?.map(b => b.id) || [])}>{pending ? 'Сохраняем…' : conflicts?.length ? 'Отменить записи и сохранить' : 'Сохранить'}</Button></DialogActions>
  </Dialog></>;
}
