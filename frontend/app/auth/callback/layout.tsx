import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Authentication Callback",
  description: "Authentication processing route for U.S Atelier.",
  path: "/auth/callback",
  noindex: true,
})

export default function AuthCallbackLayout({ children }: { children: ReactNode }) {
  return children
}
