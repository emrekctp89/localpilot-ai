import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/mini-site";

export default function robots(): MetadataRoute.Robots {
  const base = getSiteBaseUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/fiyatlandirma", "/auth", "/site/"],
        disallow: ["/dashboard", "/api/", "/offline"],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  };
}
