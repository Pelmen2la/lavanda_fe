'use client';
import { useEffect, useState } from 'react';
import { Box, ClickAwayListener, Tooltip } from '@mui/material';
import { timeline, timelineTime } from '@/lib/timeline';
import { clock, money, type Booking, type Busy } from '@/lib/api';
import s from './AvailabilityTimeline.module.css';

export default function AvailabilityTimeline({ date, intervals, bookings = [], isCabinet = false }: { date: string; intervals: Busy[]; bookings?: Booking[]; isCabinet?: boolean }) {
  const [now, setNow] = useState<number>();
  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    return () => { window.clearInterval(timer); window.removeEventListener('focus', update); };
  }, []);
  const segments = timeline(date, intervals, now);
  const [active, setActive] = useState<number | null>(null);
  return <ClickAwayListener onClickAway={() => setActive(null)}>
    <div className={s.root}>
      <div className={s.legend}><span><Box component="i" className={s.dot} sx={{ bgcolor: 'success.main' }} />Свободно</span><span><Box component="i" className={s.dot} sx={{ bgcolor: 'primary.main' }} />Бронь места</span><span><Box component="i" className={s.dot} sx={{ bgcolor: 'error.main' }} />Заблокировано</span><span><Box component="i" className={s.dot} sx={{ bgcolor: 'grey.400' }} />Прошло</span></div>
      <div className={s.bar} role="group" aria-label="Занятость рабочего места с 09:00 до 21:00 по Москве" onKeyDown={event => { if (event.key === 'Escape') setActive(null); }}>
        {segments.map((segment, index) => {
          const label = `${segment.own ? 'Ваша бронь' : segment.direct ? 'Бронь места' : segment.busy ? (segment.past ? 'Было занято' : 'Занято') : segment.past ? 'Время прошло' : 'Свободно'} · ${timelineTime(segment.start)}–${timelineTime(segment.end)}`;
          const instant = Date.parse(`${date}T09:00:00+03:00`) + segment.start * 60000;
          const blockedByNames = [...new Set(intervals.filter(b => b.blockedByName && Date.parse(b.start) <= instant && Date.parse(b.end) > instant).map(b => b.blockedByName!))];
          const blockedLabel = blockedByNames.length ? isCabinet
            ? `${blockedByNames.length === 1 ? 'Забронировано место' : 'Забронированы места'}: ${blockedByNames.join(', ')}`
            : blockedByNames.map(name => `Забронирован: ${name}`).join('; ') : '';
          const booking = segment.busy && !blockedLabel ? bookings.find(b => Date.parse(b.start) <= instant && Date.parse(b.end) > instant) : undefined;
          const total = booking ? Math.round((Date.parse(booking.end) - Date.parse(booking.start)) / 3600000 * booking.hourlyPrice) : 0;
          const details = <div className={s.details}>{blockedLabel && <strong>{blockedLabel}</strong>}{booking ? <><strong>Запись №{booking.id} · {booking.clientName}</strong>{booking.masterName && <span>Мастер: {booking.masterName}</span>}<span>{clock(booking.start)}–{clock(booking.end)}</span><span>{money(booking.hourlyPrice)}/час · Итого {money(total)}</span>{segment.past && <span>Время прошло</span>}</> : <span>{blockedLabel ? `${timelineTime(segment.start)}–${timelineTime(segment.end)}` : label}</span>}</div>;
          return <Tooltip key={`${segment.start}-${segment.end}`} title={details} arrow open={active === index} disableHoverListener disableFocusListener disableTouchListener>
            <Box component="button" type="button" className={s.segment} aria-label={blockedLabel ? `${blockedLabel}, ${timelineTime(segment.start)}–${timelineTime(segment.end)}` : booking ? `Запись №${booking.id}, ${booking.clientName}, ${clock(booking.start)}–${clock(booking.end)}, ${money(total)}` : label}
              sx={{ bgcolor: blockedLabel ? 'error.main' : segment.direct || segment.own ? 'primary.main' : segment.busy ? 'error.main' : segment.past ? 'grey.400' : 'success.main', flexGrow: segment.end - segment.start }}
              onPointerEnter={event => { if (event.pointerType === 'mouse') setActive(index); }}
              onPointerLeave={event => { if (event.pointerType === 'mouse') setActive(null); }}
              onFocus={() => setActive(index)} onBlur={() => setActive(null)} onClick={() => setActive(index)} />
          </Tooltip>;
        })}
      </div>
      <div className={s.ticks} aria-hidden="true">{Array.from({ length: 13 }, (_, hour) => (
        <span key={hour} className={`${s.tick} ${hour % 3 === 0 ? s.majorTick : ''}`} style={{ left: `${hour / 12 * 100}%` }}>
          {hour % 3 === 0 && <span className={s.tickLabel}>{timelineTime(hour * 60)}</span>}
        </span>
      ))}</div>
    </div>
  </ClickAwayListener>;
}
