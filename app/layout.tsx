import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Outfit } from "next/font/google";

import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/seo/json-ld";
import { YandexMetrika } from "@/components/analytics/yandex-metrika";
import { MixpanelTracker } from "@/components/analytics/mixpanel-tracker";
import { GoogleTag } from "@/components/analytics/google-tag";
import { CookieBanner } from "@/components/analytics/cookie-banner";
import { absoluteUrl, SITE_NAME, SITE_URL } from "@/lib/seo/site";

import "./globals.css";

const sans = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

/** Шрифт логотипа: Outfit SemiBold (600). */
const logo = Outfit({
  subsets: ["latin"],
  weight: "600",
  variable: "--font-logo",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  // Явно перечисляем иконки: без этого Next не добавляет в <head> ссылку на app/icon.svg
  // (при наличии icon.png оставляет только PNG) и не знает про apple-touch-icon из public/.
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon.png", type: "image/png", sizes: "360x360" },
      { url: "/favicon.ico", type: "image/x-icon", sizes: "16x16" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  title: {
    default: "Buty.app — бесплатная проверка и разбор состава косметики онлайн",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Бесплатная проверка состава косметики онлайн: расшифровка ингредиентов на русском, комедогенность, отдушки и конфликты активов. Без регистрации и подписок.",
  keywords: [
    "проверить состав косметики бесплатно",
    "бесплатная проверка состава косметики",
    "разбор состава косметики бесплатно",
    "состав косметики",
    "проверить состав косметики",
    "проверка состава косметики онлайн",
    "разбор состава косметики",
    "расшифровка состава косметики",
    "состав косметики на комедогенность",
    "ингредиенты косметики",
  ],
  verification: {
    // Яндекс Вебмастер: метатег yandex-verification (переопределяется YANDEX_VERIFICATION)
    yandex: process.env.YANDEX_VERIFICATION || "95c6e4ac045fc04e",
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "Buty.app — бесплатная проверка и разбор состава косметики онлайн",
    description:
      "Бесплатно и без регистрации: функции ингредиентов, рабочие концентрации, конфликты активов и уровень доказательности — без маркетинговых мифов.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-snippet": -1, "max-image-preview": "large" },
  },
};

const ORGANIZATION = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: absoluteUrl("/"),
  logo: absoluteUrl("/icon.png"),
  description: "Бесплатный научный разбор составов косметики с дерматологической точки зрения.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${sans.variable} ${logo.variable}`}>
      <body className="font-sans">
        <JsonLd data={ORGANIZATION} />
        <YandexMetrika />
        <Suspense fallback={null}>
          <GoogleTag />
        </Suspense>
        <Providers>
          <MixpanelTracker />
          <Header />
          {children}
          <SiteFooter />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
