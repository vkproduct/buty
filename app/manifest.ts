import type { MetadataRoute } from "next";

/** PWA-манифест. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Buty.ru — научный разбор составов косметики",
    short_name: "Buty.ru",
    description:
      "Функции ингредиентов, рабочие концентрации, конфликты активов и уровень доказательности — без маркетинговых мифов.",
    lang: "ru",
    start_url: "/",
    display: "standalone",
    background_color: "#F6F4FB",
    theme_color: "#5B4BC4",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
    ],
  };
}
