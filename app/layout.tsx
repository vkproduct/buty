import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Header } from "@/components/header";
import { SiteFooter } from "@/components/site-footer";
import { Providers } from "@/components/providers";

import "./globals.css";

const sans = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-sans",
  display: "swap",
});

const SITE_URL = "https://buty.app";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Buty.app — научный разбор составов косметики",
    template: "%s | Buty.app",
  },
  description:
    "Разбираем составы косметики с дерматологической точки зрения: функции ингредиентов, рабочие концентрации, конфликты активов и уровень доказательности — без маркетинговых мифов.",
  keywords: [
    "состав косметики",
    "разбор состава",
    "ингредиенты косметики",
    "уход за кожей",
    "дерматология",
  ],
  openGraph: {
    type: "website",
    locale: "ru_RU",
    url: SITE_URL,
    siteName: "Buty.app",
    title: "Buty.app — научный разбор составов косметики",
    description:
      "Функции ингредиентов, рабочие концентрации, конфликты активов и уровень доказательности — без маркетинговых мифов.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={sans.variable}>
      <body className="font-sans">
        <Providers>
          <Header />
          {children}
          <SiteFooter />
        </Providers>
      </body>
    </html>
  );
}
