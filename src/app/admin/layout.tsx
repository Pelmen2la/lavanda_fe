import type { ReactNode } from 'react';
import AdminPanel from '@/components/AdminPanel';

// Preserve loaded lists and filters while navigating between admin sections.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <><AdminPanel />{children}</>;
}
