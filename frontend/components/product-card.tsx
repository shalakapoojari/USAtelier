"use client"

import { useRef, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import type { Product } from "@/lib/data"
import { resolveMediaUrl } from "@/lib/media-url"
import { useWishlist } from "@/lib/wishlist-context"
import { ProductPrice } from "@/components/product-price"
import { Sparkles, Award } from "lucide-react"

type ProductCardProps = {
  product: Product & {
    mrp?: number | null
    discountPercent?: number
    is_new?: boolean
    is_featured?: boolean
    is_bestseller?: boolean
    stock?: number
  }
}

// Heart SVG — outline (default) / filled (wishlisted)
function HeartIcon({ filled }: { filled: boolean }) {
  return filled ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="white"
      className="w-5 h-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
      aria-hidden="true"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="white"
      strokeWidth={2}
      className="w-5 h-5 drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
      />
    </svg>
  )
}

export function ProductCard({ product }: ProductCardProps) {
  const { toggleItem, isWishlisted } = useWishlist()
  const wishlisted = isWishlisted(String(product.id))

  // Robustly handle images which might be JSON strings or arrays
  const images = useMemo(() => {
    if (Array.isArray(product.images)) return product.images
    try {
      const parsed = JSON.parse(product.images as unknown as string)
      return Array.isArray(parsed) ? parsed : [product.images]
    } catch {
      return [product.images]
    }
  }, [product.images])

  const isInStock =
    (product as any).stock !== undefined
      ? (product as any).stock > 0
      : product.inStock

  const handleWishlistClick = (e: React.MouseEvent) => {
    // Stop propagation so the card link doesn't navigate
    e.preventDefault()
    e.stopPropagation()
    toggleItem({
      id: String(product.id),
      name: product.name,
      sellingPrice: product.sellingPrice,
      image: resolveMediaUrl(images[0]),
      category: product.category,
      stock: (product as any).stock,
    })
  }

  return (
    <Link
      href={`/product/${encodeURIComponent(product.name)}`}
      className="product-card block focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
      style={{ borderRadius: 0, boxShadow: "none", border: "none", background: "none" }}
    >
      {/* ── Image area ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden"
        style={{ aspectRatio: "3 / 4" }}
      >
        <Image
          src={resolveMediaUrl(images[0])}
          alt={product.name}
          fill
          sizes="(max-width: 639px) 50vw, (max-width: 1023px) 50vw, 25vw"
          loading="lazy"
          className="object-cover"
          style={{ objectPosition: "center top", borderRadius: 0 }}
        />

        {/* Out of stock overlay */}
        {!isInStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
            <span className="text-[10px] uppercase tracking-widest border border-white/40 px-3 py-1.5 text-white/80">
              Out of Stock
            </span>
          </div>
        )}

        {/* Badges — top left */}
        <div className="absolute top-3 left-3 flex flex-col gap-1 pointer-events-none">
          {(product.newArrival || (product as any).is_new) && (
            <span className="bg-white text-black text-[9px] uppercase tracking-widest px-2 py-0.5 font-medium flex items-center gap-1">
              <Sparkles size={7} />
              New
            </span>
          )}
          {(product.bestseller || (product as any).is_bestseller) && (
            <span className="bg-amber-500 text-black text-[9px] uppercase tracking-widest px-2 py-0.5 font-medium flex items-center gap-1">
              <Award size={7} />
              Best
            </span>
          )}
        </div>

        {/* Wishlist heart — bottom right, inside image, no circular bg */}
        <button
          type="button"
          onClick={handleWishlistClick}
          aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
          className="absolute bottom-2 right-2 z-10 p-1 transition-transform active:scale-90"
          style={{ background: "none", border: "none", cursor: "pointer" }}
        >
          <HeartIcon filled={wishlisted} />
        </button>
      </div>

      {/* ── Info bar ───────────────────────────────────────── */}
      <div
        style={{
          background: "#111111",
          padding: "12px 10px 10px 10px",
          borderRadius: 0,
        }}
      >
        {/* Product name */}
        <p
          className="uppercase text-white font-normal tracking-wide"
          style={{
            fontSize: "12px",
            lineHeight: "1.3",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 400,
          }}
        >
          {product.name}
        </p>

        {/* Price row */}
        <div className="mt-1.5">
          <ProductPrice
            sellingPrice={product.sellingPrice}
            mrp={(product as any).mrp}
            darkBg
            className="text-xs"
          />
        </div>
      </div>
    </Link>
  )
}
