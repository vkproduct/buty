/** Контакт для брендов: email из EMAIL_FROM (адрес внутри «Имя <addr>»), fallback — noreply@buty.app. */
export function brandContactEmail(): string {
  const from = process.env.EMAIL_FROM ?? "";
  const inBrackets = /<([^<>\s]+@[^<>\s]+)>/.exec(from)?.[1];
  if (inBrackets) return inBrackets;
  const bare = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/.exec(from)?.[0];
  return bare ?? "noreply@buty.app";
}
