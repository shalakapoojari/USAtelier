import type { ReactNode } from "react"

import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "Wishlist",
  description: "View your saved U.S Atelier favourites.",
  path: "/favourites",
  noindex: true,
})

export default function FavouritesLayout({ children }: { children: ReactNode }) {
  return children
}
