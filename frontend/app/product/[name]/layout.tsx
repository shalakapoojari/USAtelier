import type { ReactNode } from "react"

import { products } from "@/lib/data"
import { absoluteUrl, buildMetadata } from "@/lib/seo"

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "")
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name } = await params
  const decodedName = decodeURIComponent(name)
  const product = products.find((item) => slugify(item.name) === slugify(decodedName))

  if (!product) {
    return buildMetadata({
      title: "Product",
      description: "Browse premium menswear and timeless essentials from U.S Atelier.",
      path: `/product/${name}`,
    })
  }

  const image = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : undefined
  return buildMetadata({
    title: product.name,
    description: product.description,
    path: `/product/${encodeURIComponent(product.name)}`,
    image: image ?? absoluteUrl("/logo/us-atelier-wordmark.svg"),
  })
}

export default function ProductLayout({ children }: { children: ReactNode }) {
  return children
}
