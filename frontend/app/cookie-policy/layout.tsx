import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Cookie Policy",
  description:
    "Learn how U.S Atelier uses cookies, analytics, and consent preferences across the site.",
  path: "/cookie-policy",
})

export default function CookiePolicyLayout({ children }: { children: ReactNode }) {
  return children
}
