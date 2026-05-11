import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Shopping Cart",
  description: "Review items in your U.S Atelier cart before checkout.",
  path: "/cart",
  noindex: true,
})

export default function CartLayout({ children }: { children: ReactNode }) {
  return children
}
