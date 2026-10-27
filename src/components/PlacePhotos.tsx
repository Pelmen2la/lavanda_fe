'use client';
import { ArrowLeftIcon } from '@phosphor-icons/react/dist/ssr/ArrowLeft';
import { ArrowRightIcon } from '@phosphor-icons/react/dist/ssr/ArrowRight';
import { XIcon } from '@phosphor-icons/react/dist/ssr/X';
import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';
import { api, message, photoUrl, Workplace } from '@/lib/api';
import s from './PlacePhotos.module.css';

type PhotoProps = { ids?: number[]; name: string; admin?: boolean };

export default function PlacePhotos({ ids = [], name, admin = false }: PhotoProps) {
  const [opened, setOpened] = useState<number | null>(null);
  return <>
    <PhotoSlider ids={ids} name={name} admin={admin} onOpen={setOpened} />
    {opened !== null && <Dialog open fullScreen onClose={() => setOpened(null)} aria-label={`Фотографии: ${name}`}>
      <div className={s.fullscreenHeader}><strong>{name}</strong><Button onClick={() => setOpened(null)} autoFocus aria-label="Закрыть полноэкранный просмотр" endIcon={<XIcon size={20} aria-hidden="true" />}>Закрыть</Button></div>
      <PhotoSlider ids={ids} name={name} admin={admin} initialIndex={opened} fullscreen />
    </Dialog>}
  </>;
}

function PhotoSlider({ ids = [], name, admin = false, initialIndex = 0, fullscreen = false, onOpen }: PhotoProps & { initialIndex?: number; fullscreen?: boolean; onOpen?: (index: number) => void }) {
  const track = useRef<HTMLDivElement>(null);
  const drag = useRef<{ pointerId: number; x: number; left: number; index: number } | null>(null);
  const suppressClick = useRef(false);
  const [index, setIndex] = useState(initialIndex);
  useEffect(() => {
    const el = track.current;
    if (el) el.scrollTo({ left: Math.min(initialIndex, Math.max(0, ids.length - 1)) * el.clientWidth, behavior: 'instant' });
  }, [initialIndex, ids.length]);
  if (!ids.length) return null;
  const active = Math.min(index, ids.length - 1);
  function move(next: number) {
    const el = track.current;
    const target = ((next % ids.length) + ids.length) % ids.length;
    if (el) el.scrollTo({ left: target * el.clientWidth, behavior: next !== target || matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
  }
  function startDrag(e: PointerEvent<HTMLDivElement>) {
    suppressClick.current = false;
    if (!e.isPrimary || e.button !== 0 || ids.length < 2) return;
    const el = e.currentTarget;
    if (e.pointerType === 'mouse') e.preventDefault();
    el.focus({ preventScroll: true });
    drag.current = { pointerId: e.pointerId, x: e.clientX, left: el.scrollLeft, index: Math.round(el.scrollLeft / el.clientWidth) };
    el.dataset.dragging = 'true';
    el.scrollTo({ left: el.scrollLeft, behavior: 'instant' });
    el.setPointerCapture(e.pointerId);
  }
  function continueDrag(e: PointerEvent<HTMLDivElement>) {
    const start = drag.current;
    if (!start || start.pointerId !== e.pointerId) return;
    if (Math.abs(start.x - e.clientX) > 5) suppressClick.current = true;
    e.currentTarget.scrollLeft = start.left + start.x - e.clientX;
  }
  function finishDrag(e: PointerEvent<HTMLDivElement>, cancelled = false) {
    const start = drag.current;
    if (!start || start.pointerId !== e.pointerId) return;
    const el = e.currentTarget;
    const distance = start.x - e.clientX;
    const next = cancelled ? Math.round(el.scrollLeft / el.clientWidth) : start.index + (Math.abs(distance) >= Math.min(50, el.clientWidth * 0.15) ? Math.sign(distance) : 0);
    drag.current = null;
    delete el.dataset.dragging;
    if (el.hasPointerCapture(e.pointerId)) el.releasePointerCapture(e.pointerId);
    move(next);
  }
  return <section className={`${s.gallery} ${fullscreen ? s.fullscreen : ''}`} aria-label={`Фотографии: ${name}`} aria-roledescription="карусель">
    <div className={`${s.track} ${ids.length > 1 ? s.draggable : ''}`} ref={track} tabIndex={ids.length > 1 ? 0 : undefined}
      onClick={() => { if (!suppressClick.current) onOpen?.(active); }}
      onPointerDown={startDrag} onPointerMove={continueDrag} onPointerUp={e => finishDrag(e)} onPointerCancel={e => finishDrag(e, true)} onLostPointerCapture={e => finishDrag(e, true)}
      onKeyDown={e => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { e.preventDefault(); move(active + (e.key === 'ArrowRight' ? 1 : -1)); } }} onScroll={e => { const el = e.currentTarget; if (el.clientWidth) setIndex(Math.round(el.scrollLeft / el.clientWidth)); }}>
      {ids.map((id, i) => <div className={s.slide} key={id} role="group" aria-label={`${i + 1} из ${ids.length}`}>{onOpen ? <button type="button" className={s.photoButton} tabIndex={i === active ? 0 : -1} aria-label={`Открыть фото ${i + 1} на весь экран`}><img src={photoUrl(id, admin)} alt={`${name} — фото ${i + 1}`} loading="lazy" draggable={false} /></button> : <img src={photoUrl(id, admin)} alt={`${name} — фото ${i + 1}`} loading="lazy" draggable={false} />}</div>)}
    </div>
    {ids.length > 1 && <div className={s.controls}><Button type="button" size="small" aria-label="Предыдущее фото" onClick={() => move(active - 1)}><ArrowLeftIcon size={20} aria-hidden="true" /></Button><span aria-live="polite">{active + 1} / {ids.length}</span><Button type="button" size="small" aria-label="Следующее фото" onClick={() => move(active + 1)}><ArrowRightIcon size={20} aria-hidden="true" /></Button></div>}
  </section>;
}

function readPhoto(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(new Error(`Не удалось прочитать ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function PlacePhotoEditor({ place, close, changed }: { place: Workplace; close: () => void; changed: () => void }) {
  const [ids, setIds] = useState(place.photoIds || []);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [progress, setProgress] = useState('');
  async function upload(files: File[]) {
    if (!files.length || pending) return;
    setError('');
    if (files.length + ids.length > 10) { setError('У места может быть не больше 10 фотографий.'); return; }
    if (files.some(f => !['image/jpeg', 'image/png'].includes(f.type) || f.size > 20 * 1024 * 1024)) { setError('Выберите JPEG или PNG до 20 МБ каждый.'); return; }
    setPending(true);
    try {
      for (const [i, file] of files.entries()) {
        setProgress(`Загружаем ${i + 1} из ${files.length}…`);
        const result = await api<{ id: number }>(`/admin/workplaces/${place.id}/photos`, { data: await readPhoto(file) });
        setIds(current => [...current, result.id]);
      }
    } catch (e) { setError(message(e) + ' Уже загруженные фотографии сохранены.'); }
    finally { setPending(false); setProgress(''); changed(); }
  }
  async function remove(id: number) {
    if (pending) return;
    setPending(true); setError('');
    try { await api(`/admin/workplaces/${place.id}/photos/${id}`, undefined, 'DELETE'); setIds(current => current.filter(value => value !== id)); changed(); }
    catch (e) { setError(message(e)); }
    finally { setPending(false); }
  }
  return <Dialog open fullWidth maxWidth="sm" onClose={() => !pending && close()}>
    <DialogTitle>Фотографии · {place.name}</DialogTitle>
    <DialogContent><div className={s.editor}>
      <p>До 10 фотографий, JPEG или PNG до 20 МБ. При загрузке большие изображения уменьшаются до 1920 пикселей по длинной стороне с сохранением пропорций. Изменения сохраняются сразу. Первая фотография станет обложкой.</p>
      <Button component="label" variant="outlined" disabled={pending || ids.length >= 10}>Добавить фотографии<input hidden type="file" accept="image/jpeg,image/png" multiple disabled={pending || ids.length >= 10} onChange={e => { const files = Array.from(e.target.files || []); e.target.value = ''; void upload(files); }} /></Button>
      {progress && <p role="status">{progress}</p>}
      {error && <Alert severity="error">{error}</Alert>}
      {!ids.length && <p>Фотографий пока нет.</p>}
      <div className={s.thumbnails}>{ids.map((id, i) => <div key={id}><img src={photoUrl(id, true)} alt={`${place.name} — фото ${i + 1}`} /><Button color="error" disabled={pending} onClick={() => void remove(id)} aria-label={`Удалить фото ${i + 1}`}>Удалить</Button></div>)}</div>
    </div></DialogContent>
    <DialogActions><Button disabled={pending} onClick={close}>Готово</Button></DialogActions>
  </Dialog>;
}
