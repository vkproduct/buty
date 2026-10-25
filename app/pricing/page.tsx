import { permanentRedirect } from "next/navigation";

/**
 * /pricing — с 24.10.2026 все функции для пользователей бесплатны,
 * подписок Pro больше нет: раздел «Тарифы» убран из меню, страница
 * навсегда ведёт на /for-brands (монетизация — B2B).
 */
export default function PricingPage() {
  permanentRedirect("/for-brands");
}
