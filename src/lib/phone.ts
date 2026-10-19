export function phoneDigits(value: string): string {
  let digits = value.replace(/\D/g, '');
  if (/^\s*\+7/.test(value) || (/^[78]$/.test(digits)) || (digits.length > 10 && /^[78]/.test(digits))) digits = digits.slice(1);
  return digits.slice(0, 10);
}

export function formatPhone(value: string): string {
  const digits = phoneDigits(value);
  if (!digits) return value.trim() === '+' || /^[78]$/.test(value.trim()) || value.trim() === '+7' ? '+7' : '';
  let result = `+7 (${digits.slice(0, 3)}`;
  if (digits.length > 3) result += `) ${digits.slice(3, 6)}`;
  if (digits.length > 6) result += `-${digits.slice(6, 8)}`;
  if (digits.length > 8) result += `-${digits.slice(8, 10)}`;
  return result;
}

// Position the caret by national-number digits, not by punctuation offsets.
export function phoneCaret(value: string, count: number): number {
  if (!value) return 0;
  if (count <= 0) return Math.min(4, value.length);
  let seen = 0;
  for (let i = 2; i < value.length; i++) {
    if (/\d/.test(value[i]) && ++seen === count) return i + 1;
  }
  return value.length;
}
