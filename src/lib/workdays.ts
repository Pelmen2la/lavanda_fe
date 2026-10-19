export const weekdays = [
  { value: 1, label: 'Понедельник' }, { value: 2, label: 'Вторник' },
  { value: 3, label: 'Среда' }, { value: 4, label: 'Четверг' },
  { value: 5, label: 'Пятница' }, { value: 6, label: 'Суббота' },
  { value: 0, label: 'Воскресенье' },
];

export function reservedOnDate(place: { blockedWeekdays?: number[] }, date: string) {
  // Calendar date is selected in Moscow; UTC noon avoids browser timezone shifts.
  return !!place.blockedWeekdays?.includes(new Date(`${date}T12:00:00Z`).getUTCDay());
}
