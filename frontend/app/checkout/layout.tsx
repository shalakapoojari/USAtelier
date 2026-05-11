import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Checkout",
  description: "Complete your U.S Atelier order securely.",
  path: "/checkout",
  noindex: true,
})

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children
}
