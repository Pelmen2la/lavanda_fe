export class ApiError extends Error { constructor(message: string, public status: number, public details?: unknown) { super(message); } }
const pendingReads = new Map<string, Promise<unknown>>();

export function api<T>(path: string, body?: unknown, method?: string): Promise<T> {
  const verb = (method || (body === undefined ? 'GET' : 'POST')).toUpperCase();
  if (verb !== 'GET') {
    // Never reuse a read started before a mutation or authentication change.
    pendingReads.clear();
    return request<T>(path, body, verb).finally(() => pendingReads.clear());
  }
  const existing = pendingReads.get(path);
  if (existing) return existing as Promise<T>;
  const promise = request<T>(path, body, verb);
  pendingReads.set(path, promise);
  const clear = () => { if (pendingReads.get(path) === promise) pendingReads.delete(path); };
  void promise.then(clear, clear);
  return promise;
}

async function request<T>(path: string, body: unknown, method: string): Promise<T> {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}${path}`, {
    method, credentials: 'include',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body), cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(data.error || 'Сервис временно недоступен. Попробуйте ещё раз.', response.status, data);
  return data as T;
}
export type User = { id: number; clientId: number; name: string; email: string; role: 'admin' | 'client' | 'master' };
export type Workplace = { photoIds?: number[]; id: number; name: string; description: string; hourlyPrice: number; active: boolean; blockedWeekdays: number[]; linkedPlaceIds?: number[]; resourceIds?: number[] };
export type Client = { createdAt: string; id: number; name: string; phone: string; email: string; note: string; registered: boolean; hasInvitation: boolean; role: 'admin' | 'client' | 'master'; workplaceIds: number[]; workDays: number[]; reserveWorkdays: boolean };
export type Busy = { workplaceId: number; start: string; end: string; own?: boolean; booked?: boolean; blockedByName?: string };
export type Booking = Busy & { photoIds?: number[]; id: number; workplaceName: string; clientId: number; clientName: string; hourlyPrice: number; cancelledAt: string | null; masterId: number | null; masterName: string; resourceIds?: number[]; comment: string };
export const message = (e: unknown) => e instanceof Error ? e.message : 'Не удалось выполнить запрос';
export const money = (kopecks: number) => new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(kopecks / 100);
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Moscow', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
export const clock = (iso: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
export const dayLabel = (iso: string) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'Europe/Moscow', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso));
export const instant = (date: string, time: string) => `${date}T${time}:00+03:00`;
export const times = Array.from({ length: 49 }, (_, i) => `${String(9 + Math.floor(i / 4)).padStart(2, '0')}:${String((i % 4) * 15).padStart(2, '0')}`);

export const photoUrl = (id: number, admin = false) => `${process.env.NEXT_PUBLIC_API_URL || '/api'}${admin ? '/admin' : ''}/workplace-photos/${id}`;
