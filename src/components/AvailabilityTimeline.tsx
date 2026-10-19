'use client';
import { useEffect, useState } from 'react';
import { Box, ClickAwayListener, Tooltip } from '@mui/material';
import { timeline, timelineTime } from '@/lib/timeline';
import { clock, money, type Booking, type Busy } from '@/lib/api';
import s from './AvailabilityTimeline.module.css';

export default function AvailabilityTimeline({ date, intervals, bookings = [] }: { date: string; intervals: Busy[]; bookings?: Booking[] }) {
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
      <div className={s.legend}><span><Box component="i" className={s.dot} sx={{ bgcolor: 'success.main' }} />Свободно</span>{segments.some(segment => segment.own) && <span><Box component="i" className={s.dot} sx={{ bgcolor: 'primary.main' }} />Ваша бронь</span>}<span><Box component="i" className={s.dot} sx={{ bgcolor: 'error.main' }} />Занято</span><span><Box component="i" className={s.dot} sx={{ bgcolor: 'grey.400' }} />Прошло</span></div>
      <div className={s.bar} role="group" aria-label="Занятость рабочего места с 09:00 до 21:00 по Москве" onKeyDown={event => { if (event.key === 'Escape') setActive(null); }}>
        {segments.map((segment, index) => {
          const label = `${segment.own ? 'Ваша бронь' : segment.busy ? (segment.past ? 'Было занято' : 'Занято') : segment.past ? 'Время прошло' : 'Свободно'} · ${timelineTime(segment.start)}–${timelineTime(segment.end)}`;
          const instant = Date.parse(`${date}T09:00:00+03:00`) + segment.start * 60000;
          const booking = segment.busy ? bookings.find(b => Date.parse(b.start) <= instant && Date.parse(b.end) > instant) : undefined;
          const total = booking ? Math.round((Date.parse(booking.end) - Date.parse(booking.start)) / 3600000 * booking.hourlyPrice) : 0;
          const details = booking ? <div className={s.details}><strong>Запись №{booking.id} · {booking.clientName}</strong>{booking.masterName && <span>Мастер: {booking.masterName}</span>}<span>{clock(booking.start)}–{clock(booking.end)}</span><span>{money(booking.hourlyPrice)}/час · Итого {money(total)}</span>{segment.past && <span>Время прошло</span>}</div> : label;
          return <Tooltip key={`${segment.start}-${segment.end}`} title={details} arrow open={active === index} disableHoverListener disableFocusListener disableTouchListener>
            <Box component="button" type="button" className={s.segment} aria-label={booking ? `Запись №${booking.id}, ${booking.clientName}, ${clock(booking.start)}–${clock(booking.end)}, ${money(total)}` : label}
              sx={{ bgcolor: segment.own ? 'primary.main' : segment.busy ? 'error.main' : segment.past ? 'grey.400' : 'success.main', flexGrow: segment.end - segment.start }}
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
