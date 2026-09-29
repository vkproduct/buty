import type { MetadataRoute } from "next";

import { absoluteUrl } from "@/lib/seo/site";

/** Служебные и личные разделы закрыты; ссылки ?text= на /analyze закрыты через noindex. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/auth/", "/go/", "/shelf", "/profile", "/onboarding"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
