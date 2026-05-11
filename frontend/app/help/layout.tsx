import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Help Center",
  description:
    "Find answers about shipping, delivery, exchanges, returns, sizing, and payment support at U.S Atelier.",
  path: "/help",
})

export default function HelpLayout({ children }: { children: ReactNode }) {
  return children
}
