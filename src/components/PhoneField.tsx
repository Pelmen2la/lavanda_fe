'use client';
import { useRef } from 'react';
import { TextField } from '@mui/material';
import { formatPhone, phoneCaret, phoneDigits } from '@/lib/phone';

export default function PhoneField({ value, onChange, error, helperText }: { value: string; onChange: (value: string) => void; error?: boolean; helperText?: string }) {
  const input = useRef<HTMLInputElement>(null);
  const formatted = formatPhone(value);
  function update(next: string, count: number) {
    onChange(next);
    requestAnimationFrame(() => { const position = phoneCaret(next, count); input.current?.setSelectionRange(position, position); });
  }
  return <TextField
    label="Телефон"
    error={error}
    helperText={helperText}
    type="tel"
    autoComplete="tel"
    placeholder="+7 (999) 123-45-67"
    inputRef={input}
    value={formatted}
    onBlur={() => { if (!phoneDigits(formatted)) onChange(''); }}
    onChange={e => {
      const raw = e.target.value;
      const caret = e.target.selectionStart ?? raw.length;
      let digits = phoneDigits(raw);
      const count = phoneDigits(raw.slice(0, caret)).length;
      const inputType = (e.nativeEvent as InputEvent).inputType;
      // Mobile keyboards can delete a separator without firing keydown.
      if (inputType?.startsWith('delete') && raw.length < formatted.length && digits === phoneDigits(formatted)) {
        const index = inputType === 'deleteContentBackward' ? count - 1 : count;
        if (index >= 0) digits = digits.slice(0, index) + digits.slice(index + 1);
        update(formatPhone(`+7${digits}`), Math.max(0, index));
        return;
      }
      update(formatPhone(raw), count);
    }}
    onKeyDown={e => {
      if (e.key !== 'Backspace' && e.key !== 'Delete') return;
      const field = input.current;
      if (!field || field.selectionStart !== field.selectionEnd) return;
      const caret = field.selectionStart ?? 0;
      const count = (formatted.slice(2, caret).match(/\d/g) || []).length;
      const digits = phoneDigits(formatted);
      if (!digits) { e.preventDefault(); update('', 0); return; }
      const index = e.key === 'Backspace' ? count - 1 : count;
      e.preventDefault();
      if (index < 0 || index >= digits.length) return;
      const next = digits.slice(0, index) + digits.slice(index + 1);
      update(formatPhone(`+7${next}`), index);
    }}
    slotProps={{ htmlInput: { inputMode: 'tel', pattern: '\\+7 \\([0-9]{3}\\) [0-9]{3}-[0-9]{2}-[0-9]{2}', title: 'Введите полный номер: +7 (999) 123-45-67' } }}
  />;
}
