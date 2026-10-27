import type { Metadata } from 'next';
import './reset.css';
import './globals.css';
import Providers from '@/components/Providers';
import Shell from '@/components/Shell';
export const metadata: Metadata = { title: { default: 'Лаванда — бьюти-коворкинг', template: '%s · Лаванда' }, description: 'Ваше пространство для работы. Выберите рабочее место и удобное время в бьюти-коворкинге Лаванда.', referrer: 'no-referrer', icons: { icon: [{ url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' }, { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' }], apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }] } };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="ru" data-scroll-behavior="smooth"><body><Providers><Shell>{children}</Shell></Providers></body></html>; }
