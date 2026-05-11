import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Create Account",
  description: "Create a U.S Atelier account to manage orders, preferences, and saved items.",
  path: "/signup",
  noindex: true,
})

export default function SignupLayout({ children }: { children: ReactNode }) {
  return children
}
