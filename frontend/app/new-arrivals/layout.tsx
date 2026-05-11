import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "New Arrivals",
  description:
    "Discover the latest U.S Atelier arrivals, seasonal edits, and newly released essentials.",
  path: "/new-arrivals",
})

export default function NewArrivalsLayout({ children }: { children: ReactNode }) {
  return children
}
