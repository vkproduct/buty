import { NextResponse } from "next/server";

/** robots.txt через route handler: MetadataRoute.Robots не умеет Clean-param,
 *  а Яндексу он нужен, чтобы UTM и служебные параметры не плодили дубли.
 *  Текст фиксированный — поэтому не app/robots.ts, а статичный ответ. */
const BODY = `User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /auth/
Disallow: /go/
Disallow: /shelf
Disallow: /profile
Disallow: /onboarding
Disallow: /brand

User-agent: Yandex
Allow: /
Disallow: /admin
Disallow: /api/
Disallow: /auth/
Disallow: /go/
Disallow: /shelf
Disallow: /profile
Disallow: /onboarding
Disallow: /brand
Clean-param: utm_source&utm_medium&utm_campaign&utm_content&utm_term&yclid&gclid&from

Sitemap: https://buty.app/sitemap.xml
`;

export function GET() {
  return new NextResponse(BODY, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
