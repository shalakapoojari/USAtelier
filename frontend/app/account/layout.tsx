import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "My Account",
  description: "Manage your U.S Atelier profile, orders, and account settings.",
  path: "/account",
  noindex: true,
})

export default function AccountLayout({ children }: { children: ReactNode }) {
  return children
}
