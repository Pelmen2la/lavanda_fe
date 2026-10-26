'use client';
import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Tooltip } from '@mui/material';
import { Booking, Workplace, clock, dayLabel, money, times, today } from '@/lib/api';
import { calendarBookings, calendarLanes, shiftDay, weekDays } from '@/lib/bookingCalendar';
import { bookingBlocksPlace, placeResources } from '@/lib/linkedPlaces';
import { reservedOnDate } from '@/lib/workdays';
import BookingList from './BookingList';
import DateField from './DateField';
import s from './BookingCalendar.module.css';

export function CalendarDatePicker({ date, onChange }: { date: string; onChange: (date: string) => void }) {
  if (!date) return null;
  return <div className={s.datePicker}>
    <div className={s.dateToolbar}><DateField label="День записей" value={date} onChange={onChange} /><Button onClick={() => onChange(today())}>Сегодня</Button></div>
    <div className={s.week} aria-label="Выбор дня">
      <button className={s.weekArrow} type="button" aria-label="Предыдущая неделя" onClick={() => onChange(shiftDay(date, -7))}>‹</button>
      {weekDays(date).map(day => <button key={day} type="button" className={`${s.day} ${day === date ? s.selected : ''}`} aria-pressed={day === date} aria-label={dayLabel(day + 'T12:00:00+03:00')} onClick={() => onChange(day)}>
        <span>{new Intl.DateTimeFormat('ru-RU', { weekday: 'short', timeZone: 'Europe/Moscow' }).format(new Date(day + 'T12:00:00+03:00'))}</span><strong>{Number(day.slice(-2))}</strong>
        <span className={s.todayDot} style={{ visibility: day === today() ? 'visible' : 'hidden' }} />
      </button>)}
      <button className={s.weekArrow} type="button" aria-label="Следующая неделя" onClick={() => onChange(shiftDay(date, 7))}>›</button>
    </div>
  </div>;
}

export default function BookingCalendar({ date, places, bookings, reload }: { date: string; places: Workplace[]; bookings: Booking[]; reload: () => void }) {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const selected = bookings.find(b => b.id === selectedId);
  const entries = calendarBookings(date, bookings);
  // Keep historical bookings visible even if their workplace has been deleted.
  const columns = places.map(p => ({ id: p.id, name: p.name, reserved: reservedOnDate(p, date), active: p.active, resourceIds: placeResources(p) }));
  for (const { booking } of entries) if (!columns.some(p => p.id === booking.workplaceId)) columns.push({ id: booking.workplaceId, name: booking.workplaceName, reserved: false, active: false, resourceIds: [booking.workplaceId] });
  if (!columns.length) return <p className={s.empty}>Рабочие места пока не добавлены.</p>;
  return <>
    <p className={s.hint}>09:00–21:00 МСК · Нажмите на запись, чтобы открыть подробности. Отменённые записи доступны в списке.</p>
    <div className={s.viewport} tabIndex={0} role="region" aria-label={`Записи на ${dayLabel(date + 'T12:00:00+03:00')}`}>
      <div className={s.calendar} style={{ '--places': columns.length } as CSSProperties}>
        <div className={s.corner}>МСК</div>
        {columns.map(p => <div key={p.id} className={s.columnTitle}>{p.name}{p.reserved && <small>Закреплено за мастером</small>}{!p.active && <small>Недоступно для новых записей</small>}</div>)}
        <div className={s.hours}>{times.map((time, i) => <span key={time} style={{ top: i * 40 }}>{time}</span>)}</div>
        {columns.map(p => <div key={p.id} className={`${s.column} ${p.reserved ? s.reserved : ''}`}>
          {calendarLanes(entries.filter(e => bookingBlocksPlace(e.booking, p))).map(({ booking: b, minute, duration, lane, lanes }) => {
            const completed = Date.parse(b.end) <= Date.now();
            const linked = b.workplaceId !== p.id;
            const isCabinet = !!places.find(place => place.id === p.id)?.linkedPlaceIds?.length;
            const blockedLabel = `${isCabinet ? 'Забронировано место' : 'Забронирован'}: ${b.workplaceName}`;
            return <Tooltip key={b.id} title={linked ? `${blockedLabel} · ${clock(b.start)}–${clock(b.end)}` : ''} arrow describeChild><button type="button" className={`${s.booking} ${completed ? s.completed : ''} ${linked ? s.linkedBooking : ''}`} style={{ top: minute / 15 * 40, height: duration / 15 * 40 - 3, left: `calc(${lane / lanes * 100}% + 4px)`, width: `calc(${100 / lanes}% - 8px)`, right: 'auto' }} onClick={() => setSelectedId(b.id)} aria-label={`${linked ? blockedLabel + ', ' : ''}${clock(b.start)}–${clock(b.end)}, ${b.clientName}, ${b.workplaceName}`}>
              <span className={s.bookingTime}>{clock(b.start)}–{clock(b.end)}</span><strong>{linked ? blockedLabel : b.clientName}</strong>
              {b.comment && <span className={s.bookingComment}>{b.comment}</span>}
              {duration >= 45 && <><span>{linked ? b.clientName : completed ? 'Завершена' : 'Подтверждена'}</span>{b.masterName && <span>Мастер: {b.masterName}</span>}<span>{money(Math.round((Date.parse(b.end) - Date.parse(b.start)) / 3600000 * b.hourlyPrice))}</span></>}
            </button></Tooltip>;
          })}
        </div>)}
      </div>
    </div>
    <Dialog open={!!selected} onClose={() => setSelectedId(null)} fullWidth maxWidth="sm"><DialogTitle>Запись</DialogTitle><DialogContent>{selected && <BookingList bookings={[selected]} admin reload={reload} />}</DialogContent><DialogActions><Button onClick={() => setSelectedId(null)}>Закрыть</Button></DialogActions></Dialog>
  </>;
}
