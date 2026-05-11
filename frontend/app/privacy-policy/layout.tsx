import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description:
    "Read how U.S Atelier collects, stores, and protects customer information across the website and checkout flow.",
  path: "/privacy-policy",
})

export default function PrivacyPolicyLayout({ children }: { children: ReactNode }) {
  return children
}
