export type FieldErrors = Record<string, string>;
export function validateBookingComment(comment: string): string {
  if (Array.from(comment.trim()).length > 2000) return 'Комментарий должен содержать не более 2000 символов';
  if (comment.includes('\u0000')) return 'Комментарий содержит недопустимый символ';
  return '';
}
const length = (value: string) => new TextEncoder().encode(value).length;
export function validateClient(c: { name: string; email: string; phone: string; note: string; role: string; reserveWorkdays: boolean; workDays: number[]; workplaceIds: number[] }): FieldErrors {
  const errors: FieldErrors = {};
  if (!c.name.trim()) errors.name = 'Введите имя';
  else if (length(c.name.trim()) > 200) errors.name = 'Имя слишком длинное';
  if (c.email.trim() && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(c.email.trim()) || c.email.trim().length > 254)) errors.email = 'Введите корректный email';
  // Stored phones arrive as +79991234567; PhoneField only masks their display.
  const phone = c.phone.trim();
  if (phone && !/^(?:\+7\d{10}|\+7 \(\d{3}\) \d{3}-\d{2}-\d{2})$/.test(phone)) errors.phone = 'Введите полный номер: +7 (999) 123-45-67';
  if (length(c.note) > 4000) errors.note = 'Заметка слишком длинная';
  if (c.role === 'master' && c.reserveWorkdays) {
    if (!c.workDays.length) errors.workDays = 'Выберите рабочие дни';
    if (!c.workplaceIds.length) errors.workplaceIds = 'Выберите хотя бы одно место';
  }
  return errors;
}
export function validatePlace(p: { name: string; description: string; price: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (!p.name.trim()) errors.name = 'Введите название';
  else if (length(p.name.trim()) > 200) errors.name = 'Название слишком длинное';
  if (length(p.description) > 4000) errors.description = 'Описание слишком длинное';
  const price = p.price.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(price) || Number(price) < 0.01 || Number(price) > 100000) errors.price = 'Укажите цену от 0,01 до 100 000 ₽, не более двух знаков после запятой';
  return errors;
}
