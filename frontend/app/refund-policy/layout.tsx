import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Refund and Exchange Policy",
  description:
    "Review U.S Atelier's refund, exchange, and return policy before placing an order.",
  path: "/refund-policy",
})

export default function RefundPolicyLayout({ children }: { children: ReactNode }) {
  return children
}
