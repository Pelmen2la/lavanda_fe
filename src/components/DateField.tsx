'use client';
import { useRef } from 'react';
import { TextField } from '@mui/material';
import s from './DateField.module.css';

export default function DateField({ value, onChange, min, label = 'Дата' }: { value: string; onChange: (value: string) => void; min?: string; label?: string }) {
  const input = useRef<HTMLInputElement>(null);
  function openCalendar() {
    const field = input.current;
    if (!field) return;
    field.focus();
    // Keep the native icon and keyboard input as a fallback in older browsers.
    try { field.showPicker?.(); } catch { /* Native input remains usable. */ }
  }
  return <TextField
    className={s.field}
    inputRef={input}
    type="date"
    label={label}
    value={value}
    onClick={openCalendar}
    onChange={e => { if (e.target.value) onChange(e.target.value); }}
    slotProps={{ inputLabel: { shrink: true }, htmlInput: { min } }}
  />;
}
