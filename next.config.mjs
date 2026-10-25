/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      // С 24.10.2026 подписок Pro нет: /pricing навсегда ведёт на /for-brands
      // (B2B). Редирект на уровне конфига, а не страницы: статическая страница
      // с одним permanentRedirect() в Next 14 отдаёт 308 без заголовка Location.
      { source: "/pricing", destination: "/for-brands", permanent: true },
    ];
  },
};

export default nextConfig;
