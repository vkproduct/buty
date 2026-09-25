import type { Config } from "tailwindcss";

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
      padding: "1.5rem",
      screens: { "2xl": "1200px" },
    },
    extend: {
      colors: {
        background: "#F6F4FB",
        foreground: "#241E45",
        lavender: {
          DEFAULT: "#5B4BC4",
          50: "#EEEBFA",
          100: "#DDD7F5",
          200: "#BBB0EA",
          300: "#9888DF",
          400: "#7A65D6",
          500: "#5B4BC4",
          600: "#4839A6",
          700: "#382C85",
          800: "#2A2165",
          900: "#1D1748",
        },
        coral: {
          DEFAULT: "#F7A58C",
          50: "#FEF3EF",
          100: "#FDE5DD",
          200: "#FBC9B9",
          300: "#F9AE96",
          400: "#F7A58C",
          500: "#F2856A",
          600: "#EC6349",
          700: "#D14B32",
          800: "#A53B28",
          900: "#7C2D1F",
        },
        amber: {
          DEFAULT: "#E8B84B",
          50: "#FCF6E4",
          100: "#F8ECC6",
          200: "#F1DA94",
          300: "#EAC967",
          400: "#E8B84B",
          500: "#D9A32E",
          600: "#B98622",
          700: "#93681C",
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
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-manrope)", "var(--font-inter)", "sans-serif"],
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        glass:
          "0 8px 32px rgba(91, 75, 196, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.6)",
        "glass-lg":
          "0 16px 48px rgba(91, 75, 196, 0.18), inset 0 1px 0 rgba(255, 255, 255, 0.7)",
        glow: "0 0 40px rgba(91, 75, 196, 0.25)",
      },
      backgroundImage: {
        "gradient-hero":
          "linear-gradient(135deg, #EEEBFA 0%, #F6F4FB 45%, #FDE5DD 100%)",
        "gradient-lavender":
          "linear-gradient(135deg, #5B4BC4 0%, #7A65D6 60%, #9888DF 100%)",
        "gradient-warm":
          "linear-gradient(135deg, #F7A58C 0%, #E8B84B 100%)",
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
