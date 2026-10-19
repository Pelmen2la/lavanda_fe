import Link from 'next/link';
import s from '@/components/Common.module.css';
export default function NotFound() { return <div className={s.page}><p className={s.eyebrow}>404</p><h1 className={s.title}>Здесь пока пусто</h1><p className={s.subtitle}>Такой страницы нет. Вернёмся к выбору рабочего места?</p><Link className={s.link} href="/schedule/">Открыть расписание</Link></div>; }
