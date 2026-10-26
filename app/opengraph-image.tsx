import { ImageResponse } from "next/og";

/** Единый OG-шаблон сайта (наследуется всеми страницами без своей OG-картинки). */

export const alt = "Buty.app — бесплатный научный разбор составов косметики";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#FFFFFF",
          color: "#222222",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            letterSpacing: -0.5,
            fontWeight: 700,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "#FF395C",
            }}
          />
          <span style={{ display: "flex", color: "#5D192E" }}>
            Buty<span style={{ color: "#FF395C" }}>.app</span>
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            marginTop: 28,
            padding: "8px 20px",
            borderRadius: 999,
            background: "#FFF0F3",
            color: "#FF385C",
            fontSize: 28,
            fontWeight: 700,
          }}
        >
          Бесплатно · без регистрации
        </div>
        <div style={{ fontSize: 72, fontWeight: 600, letterSpacing: -2, lineHeight: 1.15, marginTop: 24 }}>
          Научный разбор составов косметики
        </div>
        <div style={{ fontSize: 32, marginTop: 24, color: "#555555" }}>
          Функции ингредиентов · Концентрации · Конфликты активов · Доказательная база
        </div>
      </div>
    ),
    { ...size },
  );
}
