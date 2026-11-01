import { NextResponse, type NextRequest } from "next/server";

import { brandRedirectSearch } from "@/lib/products/brand-redirect";

/**
 * 301 со старых написаний бренда в каталоге: ?brand=VICHY → ?brand=Vichy.
 * Работает только при наличии параметра brand; именно 301 (не 308) — старые
 * URL месяцами живут в индексе Яндекса. Логика — в lib/products/brand-redirect.
 */
export function middleware(request: NextRequest) {
  const search = brandRedirectSearch(request.nextUrl.search);
  if (search === null) return NextResponse.next();
  const url = request.nextUrl.clone();
  url.search = search;
  return NextResponse.redirect(url, 301);
}

export const config = {
  matcher: ["/products"],
};
