import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Shop All Pieces",
  description:
    "Explore the full U.S Atelier catalog of premium menswear, refined tailoring, and elevated essentials.",
  path: "/view-all",
})

export default function ViewAllLayout({ children }: { children: ReactNode }) {
  return children
}
