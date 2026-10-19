'use client';
import { useState } from 'react';
import { Alert, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { api, Booking, clock, dayLabel, message, money } from '@/lib/api';
import s from './Common.module.css';
export default function BookingList({ bookings, admin = false, readOnly = false, showClient = admin, reload }: { bookings: Booking[]; admin?: boolean; readOnly?: boolean; showClient?: boolean; reload: () => void }) {
  const [selected, setSelected] = useState<Booking | null>(null); const [error, setError] = useState(''); const [pending, setPending] = useState(false);
  async function cancel() { if (!selected || readOnly) return; setPending(true); setError(''); try { await api(`/bookings/${selected.id}/cancel`, {}); setSelected(null); reload(); } catch (e) { setError(message(e)); } finally { setPending(false); } }
  return <>{!bookings.length ? <div className={s.empty}>Пока нет записей.</div> : <div className={s.grid}>{bookings.map(b => <article key={b.id} className={s.panel}><div className={s.stack}><div className={s.cardTop}><div><h2 className={s.heading}>{b.workplaceName}</h2><p>{dayLabel(b.start)}</p><p>{clock(b.start)}–{clock(b.end)} МСК</p></div><Chip size="small" label={b.cancelledAt ? 'Отменена' : Date.parse(b.end) < Date.now() ? 'Завершена' : 'Подтверждена'} color={b.cancelledAt ? 'default' : 'secondary'} variant="outlined" /></div>
    {showClient && <p>Клиент: <strong>{b.clientName}</strong></p>}{b.masterName && <p>Мастер: <strong>{b.masterName}</strong></p>}<p className={s.muted}>{money(Math.round((Date.parse(b.end) - Date.parse(b.start)) / 3600000 * b.hourlyPrice))} · {money(b.hourlyPrice)}/час</p>{!readOnly && !b.cancelledAt && <Button variant="text" onClick={() => { setSelected(b); setError(''); }}>Отменить запись</Button>}</div></article>)}</div>}
    <Dialog open={!!selected} onClose={() => !pending && setSelected(null)} fullWidth maxWidth="xs"><DialogTitle>Отменить запись?</DialogTitle><DialogContent><p>{selected?.workplaceName}</p>{selected && <p>{dayLabel(selected.start)}, {clock(selected.start)}–{clock(selected.end)}</p>}<p className={s.muted}>Время станет доступным для других мастеров.</p></DialogContent>{error && <div className={s.formError}><Alert severity="error">{error}</Alert></div>}<DialogActions><Button disabled={pending} onClick={() => setSelected(null)}>Оставить</Button><Button disabled={pending} color="error" onClick={cancel}>{pending ? 'Отменяем…' : 'Отменить запись'}</Button></DialogActions></Dialog>
  </>;
}
