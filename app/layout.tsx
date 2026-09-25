import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";

import { Header } from "@/components/header";
import { Providers } from "@/components/providers";

import "./globals.css";

const inter = Inter({
  subsets: ["latin", "cyrillic"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
});

const SITE_URL = "https://buty.ru";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Buty.ru — научный разбор составов косметики",
    template: "%s | Buty.ru",
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
    siteName: "Buty.ru",
    title: "Buty.ru — научный разбор составов косметики",
    description:
      "Функции ингредиентов, рабочие концентрации, конфликты активов и уровень доказательности — без маркетинговых мифов.",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru" className={`${inter.variable} ${manrope.variable}`}>
      <body className="font-sans">
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
