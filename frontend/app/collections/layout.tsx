import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Collections",
  description:
    "Browse U.S Atelier collections shaped around essentials, knitwear, tailoring, and timeless silhouettes.",
  path: "/collections",
})

export default function CollectionsLayout({ children }: { children: ReactNode }) {
  return children
}
