import type { MetadataRoute } from "next";

/**
 * PWA-манифест. Его же читает Android-приложение (Trusted Web Activity, папка android/):
 * PNG-иконки нужны для заставки и установки на Android, ярлыки — для долгого нажатия на иконку.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Buty.app — научный разбор составов косметики",
    short_name: "Buty.app",
    description:
      "Функции ингредиентов, рабочие концентрации, конфликты активов и уровень доказательности — без маркетинговых мифов.",
    lang: "ru",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#FFFFFF",
    theme_color: "#FF385C",
    categories: ["health", "beauty", "lifestyle"],
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      {
        name: "Разобрать состав",
        short_name: "Разбор",
        url: "/analyze",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Моя полка",
        short_name: "Полка",
        url: "/shelf",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Каталог средств",
        short_name: "Каталог",
        url: "/products",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
