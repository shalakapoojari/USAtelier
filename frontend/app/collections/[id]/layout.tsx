import type { ReactNode } from "react"

import { collections } from "@/lib/data"
import { buildMetadata } from "@/lib/seo"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const collection = collections.find((item) => item.id === id)

  if (!collection) {
    return buildMetadata({
      title: "Collection",
      description: "Browse premium collections from U.S Atelier.",
      path: `/collections/${id}`,
    })
  }

  return buildMetadata({
    title: `${collection.name} Collection`,
    description: collection.description,
    path: `/collections/${collection.id}`,
    image: collection.image,
  })
}

export default function CollectionLayout({ children }: { children: ReactNode }) {
  return children
}
