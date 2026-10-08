/** Форматирование для русского интерфейса. */

export function pluralRu(n: number, one: string, few: string, many: string): string {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

const dateFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' });
const shortFmt = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });

export function formatDate(iso: string): string {
  return dateFmt.format(new Date(iso));
}

/** «12 октября» в текущем году, иначе с годом. */
export function formatDateShort(iso: string): string {
  const d = new Date(iso);
  return d.getFullYear() === new Date().getFullYear() ? shortFmt.format(d) : dateFmt.format(d);
}

/** Дата в формате YYYY-MM-DD (локальная). */
export function isoDay(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

/** INCI-имя в привычном написании: «NIACINAMIDE» → «Niacinamide». */
export function inciTitle(inci: string): string {
  return inci
    .toLowerCase()
    .replace(/(^|[\s(/-])([a-zа-яё])/g, (_, sep: string, ch: string) => sep + ch.toUpperCase());
}
