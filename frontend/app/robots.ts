import type { MetadataRoute } from "next"

import { absoluteUrl, hiddenRoutes } from "@/lib/seo"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: hiddenRoutes,
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
  }
}
