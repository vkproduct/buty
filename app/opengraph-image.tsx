import { ImageResponse } from "next/og";

/** Единый OG-шаблон сайта (наследуется всеми страницами без своей OG-картинки). */

export const alt = "Buty.ru — научный разбор составов косметики";
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
          background: "linear-gradient(135deg, #5B4BC4 0%, #8B7BE0 55%, #F7A58C 100%)",
          color: "white",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            fontSize: 28,
            letterSpacing: 4,
            textTransform: "uppercase",
            opacity: 0.85,
          }}
        >
          <span
            style={{
              width: 18,
              height: 18,
              borderRadius: 9,
              background: "#E8B84B",
            }}
          />
          Buty.ru
        </div>
        <div style={{ fontSize: 72, fontWeight: 800, lineHeight: 1.15, marginTop: 24 }}>
          Научный разбор составов косметики
        </div>
        <div style={{ fontSize: 32, marginTop: 24, opacity: 0.9 }}>
          Функции ингредиентов · Концентрации · Конфликты активов · Доказательность
        </div>
      </div>
    ),
    { ...size },
  );
}
