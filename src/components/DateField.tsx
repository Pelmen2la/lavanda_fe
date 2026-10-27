'use client';
import { useId, useRef, useState, type KeyboardEvent } from 'react';
import { Popover } from '@mui/material';
import { CalendarBlankIcon } from '@phosphor-icons/react/dist/ssr/CalendarBlank';
import { CaretLeftIcon } from '@phosphor-icons/react/dist/ssr/CaretLeft';
import { CaretRightIcon } from '@phosphor-icons/react/dist/ssr/CaretRight';
import { today } from '@/lib/api';
import s from './DateField.module.css';

const asDate = (value: string) => new Date(value + 'T12:00:00Z');
const iso = (date: Date) => date.toISOString().slice(0, 10);
const shift = (value: string, days: number) => { const date = asDate(value); date.setUTCDate(date.getUTCDate() + days); return iso(date); };
const fullLabel = (value: string) => asDate(value).toLocaleDateString('ru-RU', { dateStyle: 'long', timeZone: 'UTC' });

export default function DateField({ value, onChange, min, label = 'Дата' }: { value: string; onChange: (value: string) => void; min?: string; label?: string }) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState('');
  const [focused, setFocused] = useState('');
  const current = today();
  function show() {
    const initial = value && (!min || value >= min) ? value : min && min > current ? min : current;
    setMonth(initial.slice(0, 7)); setFocused(initial); setOpen(true);
  }
  function select(day: string) { if (min && day < min) return; onChange(day); setOpen(false); }
  function moveMonth(delta: number) {
    const date = asDate(month + '-01'); date.setUTCMonth(date.getUTCMonth() + delta);
    setMonth(iso(date).slice(0, 7));
    setFocused(min && iso(date) < min ? min : iso(date));
  }
  function navigate(event: KeyboardEvent<HTMLButtonElement>, day: string) {
    const offsets: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7, Home: -((asDate(day).getUTCDay() + 6) % 7), End: 6 - ((asDate(day).getUTCDay() + 6) % 7) };
    if (!(event.key in offsets)) return;
    event.preventDefault();
    const next = shift(day, offsets[event.key]);
    if (min && next < min) return;
    setFocused(next); setMonth(next.slice(0, 7));
  }
  const first = month ? month + '-01' : current.slice(0, 7) + '-01';
  const start = shift(first, -((asDate(first).getUTCDay() + 6) % 7));
  return <div className={s.field}>
    <button ref={trigger} type="button" className={s.trigger} onClick={show} aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? id : undefined}>
      <span className={s.label}>{label}</span><span>{value ? value.split('-').reverse().join('.') : 'Выберите дату'}</span><CalendarBlankIcon size={22} aria-hidden="true" />
    </button>
    <Popover open={open} anchorEl={trigger.current} onClose={() => setOpen(false)} anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }} transformOrigin={{ vertical: 'top', horizontal: 'left' }} slotProps={{ paper: { sx: { borderRadius: '18px', mt: 1, border: '1px solid #e8e2eb', boxShadow: '0 12px 36px #312c3924' } } }}>
      <div id={id} role="dialog" aria-label={label} className={s.calendar}>
        <div className={s.toolbar}>
          <button type="button" className={s.arrow} aria-label="Предыдущий месяц" disabled={!!min && month <= min.slice(0, 7)} onClick={() => moveMonth(-1)}><CaretLeftIcon size={20} aria-hidden="true" /></button>
          <strong aria-live="polite">{asDate(first).toLocaleDateString('ru-RU', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</strong>
          <button type="button" className={s.arrow} aria-label="Следующий месяц" onClick={() => moveMonth(1)}><CaretRightIcon size={20} aria-hidden="true" /></button>
        </div>
        <div className={s.grid}>
          {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => <span className={s.weekday} key={day}>{day}</span>)}
          {Array.from({ length: 42 }, (_, index) => {
            const day = shift(start, index);
            return <button key={day} type="button" ref={node => { if (node && day === focused && open) node.focus(); }} tabIndex={day === focused ? 0 : -1} disabled={!!min && day < min} aria-label={fullLabel(day)} aria-pressed={day === value} aria-current={day === current ? 'date' : undefined} className={`${s.day} ${day.slice(0, 7) !== month ? s.outside : ''}`} onKeyDown={event => navigate(event, day)} onClick={() => select(day)}>{Number(day.slice(-2))}</button>;
          })}
        </div>
        <button type="button" className={s.today} disabled={!!min && current < min} onClick={() => select(current)}><CalendarBlankIcon size={18} aria-hidden="true" />Сегодня</button>
      </div>
    </Popover>
  </div>;
}
