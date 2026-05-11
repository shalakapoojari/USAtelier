import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Terms and Conditions",
  description:
    "Read the terms governing purchases, shipping, exchanges, and website use at U.S Atelier.",
  path: "/terms&conditions",
})

export default function TermsLayout({ children }: { children: ReactNode }) {
  return children
}
