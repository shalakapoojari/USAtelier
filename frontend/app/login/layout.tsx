import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Login",
  description: "Log in to your U.S Atelier account.",
  path: "/login",
  noindex: true,
})

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children
}
