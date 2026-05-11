import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "About U.S Atelier",
  description:
    "Discover U.S Atelier's philosophy, craftsmanship, and quiet-luxury approach to modern menswear.",
  path: "/about",
})

export default function AboutLayout({ children }: { children: ReactNode }) {
  return children
}
