import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Bestsellers",
  description:
    "Shop U.S Atelier bestsellers, including our most sought-after pieces across tailoring, knitwear, and essentials.",
  path: "/collections/bestsellers",
})

export default function BestsellersLayout({ children }: { children: ReactNode }) {
  return children
}
