import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";

import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { Providers } from "@/components/providers";
import { JsonLd } from "@/components/seo/json-ld";
import { YandexMetrika } from "@/components/analytics/yandex-metrika";
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
  title: {
    default: "Buty.app — проверка и разбор состава косметики онлайн",
    template: `%s | ${SITE_NAME}`,
  },
  description:
    "Проверка состава косметики онлайн: расшифровка ингредиентов на русском, рабочие концентрации, комедогенность, отдушки и конфликты активов — без маркетинговых мифов.",
  keywords: [
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
    title: "Buty.app — проверка и разбор состава косметики онлайн",
    description:
      "Функции ингредиентов, рабочие концентрации, конфликты активов и уровень доказательности — без маркетинговых мифов.",
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
  description: "Научный разбор составов косметики с дерматологической точки зрения.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${sans.variable} ${logo.variable}`}>
      <body className="font-sans">
        <JsonLd data={ORGANIZATION} />
        <YandexMetrika />
        <Providers>
          <Header />
          {children}
          <SiteFooter />
          <CookieBanner />
        </Providers>
      </body>
    </html>
  );
}
