import type { Metadata } from "next";

import { CookieSettingsButton } from "@/components/analytics/cookie-banner";
import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Политика использования cookie",
  description: "Какие cookie использует Buty.app, зачем они нужны и как изменить своё согласие.",
  alternates: { canonical: "/cookies" },
};

const NECESSARY = [
  ["next-auth.session-token, __Secure-next-auth.session-token", "Сессия входа по email — без неё не работают «Моя полка» и профиль.", "30 дней"],
  ["next-auth.csrf-token, next-auth.callback-url", "Защита формы входа и возврат на нужную страницу после входа.", "Сессия браузера"],
  ["buty_cookie_consent", "Запоминает ваш выбор в этом баннере.", "1 год"],
];

const ANALYTICS = [
  ["_ym_uid, _ym_d", "Яндекс Метрика: обезличенный идентификатор браузера и дата первого визита.", "1 год"],
  ["_ym_isad, _ym_visorc, _ym_hostIndex и другие _ym_*", "Яндекс Метрика: служебные данные счётчика и Вебвизора.", "От сессии до 1 года"],
];

function CookieTable({ rows }: { rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-ink-hair">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead className="bg-ink-wash text-ink-muted">
          <tr>
            <th className="px-4 py-3 font-medium">Cookie</th>
            <th className="px-4 py-3 font-medium">Назначение</th>
            <th className="px-4 py-3 font-medium">Срок</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ink-hair">
          {rows.map(([name, purpose, term]) => (
            <tr key={name}>
              <td className="px-4 py-3 font-mono text-xs">{name}</td>
              <td className="px-4 py-3 text-ink-soft">{purpose}</td>
              <td className="px-4 py-3 text-ink-soft">{term}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-white pb-24">
      <Container className="max-w-3xl space-y-8 pt-10">
        <header className="space-y-3">
          <h1 className="font-display text-[30px] font-semibold leading-tight sm:text-[40px]">
            Политика использования cookie
          </h1>
          <p className="text-[17px] leading-relaxed text-ink-soft">
            Cookie — небольшие файлы, которые сайт сохраняет в браузере. Buty.app использует
            два вида cookie: необходимые — для работы сервиса, и аналитические — только если вы
            дали на них согласие.
          </p>
        </header>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Необходимые cookie</h2>
          <p className="text-ink-soft">
            Работают всегда: без них невозможны вход в аккаунт и сохранение вашего выбора.
          </p>
          <CookieTable rows={NECESSARY} />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Аналитические cookie — Яндекс Метрика</h2>
          <p className="text-ink-soft">
            Устанавливаются только после нажатия «Принять». Яндекс Метрика (ООО «Яндекс»)
            собирает обезличенные данные о посещениях: просмотренные страницы, источник перехода,
            тип устройства и браузера, примерное местоположение по IP-адресу, действия на
            страницах, включая запись сеанса (Вебвизор). Поля ввода Вебвизор по умолчанию
            не записывает. Данные нужны, чтобы понимать, какие разделы полезны, и улучшать сервис.
            Условия обработки данных — в{" "}
            <a
              href="https://yandex.ru/legal/metrica_termsofuse/"
              target="_blank"
              rel="noopener"
              className="font-medium text-foreground underline"
            >
              условиях использования Яндекс Метрики
            </a>
            .
          </p>
          <CookieTable rows={ANALYTICS} />
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-semibold">Как изменить выбор</h2>
          <p className="text-ink-soft">
            Вы можете в любой момент отозвать согласие или дать его заново — откройте настройки
            cookie и выберите вариант. Также cookie можно удалить в настройках браузера.
          </p>
          <div className="inline-flex rounded-xl border border-foreground px-5 py-3 text-sm font-medium">
            <CookieSettingsButton />
          </div>
        </section>
      </Container>
    </main>
  );
}
