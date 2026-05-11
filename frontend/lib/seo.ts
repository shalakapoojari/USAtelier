import type { Metadata, MetadataRoute } from "next"

import { collections, products } from "@/lib/data"

export const siteName = "U.S Atelier"
export const siteDescription =
  "U.S Atelier creates premium menswear, quiet-luxury tailoring, and timeless essentials with a refined editorial point of view."

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? process.env.SITE_URL ?? "https://usatelier.in"

export const siteUrl = configuredSiteUrl.endsWith("/") ? configuredSiteUrl.slice(0, -1) : configuredSiteUrl

export const siteOrigin = new URL(siteUrl)

export const defaultSocialImage = "/logo/us-atelier-wordmark.svg"

export function absoluteUrl(path = "/") {
  return new URL(path.startsWith("/") ? path : `/${path}`, siteOrigin).toString()
}

export function buildMetadata({
  title,
  description,
  path = "/",
  image = defaultSocialImage,
  noindex = false,
}: {
  title: string
  description: string
  path?: string
  image?: string
  noindex?: boolean
}): Metadata {
  return {
    metadataBase: siteOrigin,
    title,
    description,
    alternates: {
      canonical: path,
    },
    openGraph: {
      type: "website",
      locale: "en_IN",
      url: path,
      siteName,
      title,
      description,
      images: [
        {
          url: image,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
    robots: noindex
      ? {
          index: false,
          follow: false,
          googleBot: {
            index: false,
            follow: false,
            noimageindex: true,
            "max-snippet": 0,
            "max-image-preview": "none",
            "max-video-preview": 0,
          },
        }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-snippet": -1,
            "max-image-preview": "large",
            "max-video-preview": -1,
          },
        },
  }
}

export const rootMetadata: Metadata = {
  metadataBase: siteOrigin,
  applicationName: siteName,
  title: {
    default: `${siteName} | Premium Fashion & Tailoring`,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "/",
    siteName,
    title: `${siteName} | Premium Fashion & Tailoring`,
    description: siteDescription,
    images: [
      {
        url: defaultSocialImage,
        width: 1200,
        height: 630,
        alt: siteName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${siteName} | Premium Fashion & Tailoring`,
    description: siteDescription,
    images: [defaultSocialImage],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
}

export const rootViewport = {
  themeColor: "#030303",
  width: "device-width",
  initialScale: 1,
} as const

export const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: siteName,
  url: siteUrl,
  logo: absoluteUrl(defaultSocialImage),
  description: siteDescription,
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: "usatelier08@gmail.com",
      availableLanguage: ["English"],
    },
  ],
}

export const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: siteName,
  url: siteUrl,
  description: siteDescription,
}

export const publicRoutes = [
  "/",
  "/about",
  "/help",
  "/collections",
  "/collections/bestsellers",
  "/new-arrivals",
  "/view-all",
  "/privacy-policy",
  "/refund-policy",
  "/cookie-policy",
  "/terms&conditions",
]

export const hiddenRoutes = [
  "/account",
  "/auth",
  "/cart",
  "/checkout",
  "/favourites",
  "/login",
  "/signup",
  "/admin",
]

export function buildSitemapEntries(): MetadataRoute.Sitemap {
  const now = new Date()

  const staticEntries = publicRoutes.map((path) => ({
    url: absoluteUrl(path),
    lastModified: now,
    changeFrequency: path === "/" ? ("daily" as const) : ("weekly" as const),
    priority: path === "/" ? 1 : 0.7,
  }))

  const collectionEntries = collections.map((collection) => ({
    url: absoluteUrl(`/collections/${collection.id}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.85,
  }))

  const productEntries = products.map((product) => ({
    url: absoluteUrl(`/product/${encodeURIComponent(product.name)}`),
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: product.featured || product.bestseller ? 0.92 : 0.8,
  }))

  return [...staticEntries, ...collectionEntries, ...productEntries]
}
