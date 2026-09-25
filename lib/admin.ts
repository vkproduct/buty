/** Список email администраторов из env (через запятую). */
export function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/** Email текущего пользователя входит в ADMIN_EMAILS. */
export async function isAdmin(): Promise<boolean> {
  // Ленивый импорт: next-auth тянет nodemailer, которого нет в тестовом окружении
  const { getSession } = await import("@/lib/auth");
  const session = await getSession();
  const email = session?.user?.email?.toLowerCase();
  return !!email && adminEmails().includes(email);
}

const TRANSLIT: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

/** Транслитерация + нормализация в URL-slug. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => TRANSLIT[ch] ?? ch)
    .join("")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
