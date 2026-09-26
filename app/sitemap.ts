import type { MetadataRoute } from "next";

import { prisma } from "@/lib/prisma";

const SITE_URL = "https://buty.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [ingredients, products] = await Promise.all([
    prisma.ingredient.findMany({ select: { slug: true } }),
    prisma.product.findMany({ select: { slug: true } }),
  ]);

  return [
    {
      url: SITE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${SITE_URL}/ingredients`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/products`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    ...ingredients.map((i): MetadataRoute.Sitemap[number] => ({
      url: `${SITE_URL}/ingredients/${i.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.8,
    })),
    ...products.map((p): MetadataRoute.Sitemap[number] => ({
      url: `${SITE_URL}/products/${p.slug}`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.7,
    })),
  ];
}
