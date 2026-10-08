import type { Config } from "tailwindcss";

/**
 * Дизайн-система Buty.app.
 * Визуальный язык: светлый и воздушный — белые поверхности, мягкие скругления
 * (карточки 12–16px, кнопки 8px, бейджи-пилюли), многослойные мягкие тени,
 * Inter с плотным трекингом в заголовках, текст без КАПСА.
 * Основной цвет — розово-красный brand (CTA, акценты), teal — вторичный акцент,
 * success — зелёный для «совместимо / сильная доказательность».
 * coral (оранжевый) и amber — семантика риска/осторожности; не путать с brand.
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    container: {
      center: true,
      padding: "1.25rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      colors: {
        background: "#FFFFFF",
        foreground: "#222222",
        ink: {
          DEFAULT: "#222222",
          soft: "#484848",
          muted: "#6A6A6A",
          faint: "#B0B0B0",
          line: "#DDDDDD",
          hair: "#EBEBEB",
          wash: "#F7F7F7",
        },
        brand: {
          DEFAULT: "#E31C5F",
          50: "#FFF1F3",
          100: "#FFE1E7",
          200: "#FFC2CE",
          300: "#FF8FA4",
          400: "#FF5A77",
          500: "#FF385C",
          600: "#E31C5F",
          700: "#D70466",
          800: "#B0034F",
          900: "#7A0237",
        },
        success: {
          DEFAULT: "#008A05",
          50: "#EBF7EC",
          100: "#CFEDD1",
          500: "#008A05",
          700: "#006C0A",
        },
        teal: {
          DEFAULT: "#00A699",
          50: "#E6F7F5",
          100: "#C2EDE8",
          200: "#8FDDD4",
          300: "#4FC7BA",
          400: "#00A699",
          500: "#00A699",
          600: "#008A80",
          700: "#006F67",
          800: "#005A54",
          900: "#00403B",
        },
        mist: {
          DEFAULT: "#F7F7F7",
          50: "#F7F7F7",
          100: "#EBEBEB",
          700: "#6A6A6A",
        },
        coral: {
          DEFAULT: "#E8622C",
          50: "#FFF4EE",
          100: "#FFE4D5",
          200: "#FFC7A8",
          300: "#FBA173",
          400: "#F47E48",
          500: "#E8622C",
          600: "#D1501C",
          700: "#B24112",
          800: "#8A330F",
          900: "#62240B",
        },
        amber: {
          DEFAULT: "#D9A32E",
          50: "#FCF6E4",
          100: "#F8ECC6",
          200: "#F1DA94",
          300: "#EAC967",
          400: "#E8B84B",
          500: "#D9A32E",
          600: "#B98622",
          700: "#8A611A",
          800: "#6F4E16",
          900: "#503810",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
        display: ["var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
        logo: ["var(--font-logo)", "var(--font-sans)", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "sans-serif"],
      },
      // Мягкая геометрия: кнопки и поля — 8px, карточки — 12px, крупные блоки — 16–24px.
      borderRadius: {
        sm: "4px",
        DEFAULT: "6px",
        md: "8px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
        "3xl": "24px",
      },
      // Многослойные мягкие тени: «карточка», «приподнятая карточка», «плавающая панель».
      boxShadow: {
        glass: "0 1px 2px rgba(0, 0, 0, 0.04), 0 2px 8px rgba(0, 0, 0, 0.04)",
        "glass-lg": "0 6px 16px rgba(0, 0, 0, 0.12)",
        glow: "0 6px 20px rgba(0, 0, 0, 0.14)",
        pop: "0 8px 28px rgba(0, 0, 0, 0.18)",
        sticky: "0 -1px 0 rgba(0, 0, 0, 0.06), 0 -4px 16px rgba(0, 0, 0, 0.06)",
      },
      // gradient-cta — фирменный акцентный градиент (кнопки, плашки тегов): #FB5774 → #FA263D сверху вниз.
      // Остальные бывшие градиенты — плоские фоны секций (имена сохранены для совместимости).
      backgroundImage: {
        "gradient-hero": "linear-gradient(#FFFFFF, #FFFFFF)",
        "gradient-cta": "linear-gradient(180deg, #FB5774 0%, #FA263D 100%)",
        "gradient-brand": "linear-gradient(#FFF1F3, #FFF1F3)",
        "gradient-sky": "linear-gradient(#ECF1FB, #ECF1FB)",
      },
      keyframes: {
        "fade-up": {
          from: { opacity: "0", transform: "translateY(16px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
