"use client"

import { useState, useRef, useEffect, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import gsap from "gsap"
import { Sparkles, Award } from "lucide-react"
import type { Product } from "@/lib/data"

type ProductCardProps = {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [currentImage, setCurrentImage] = useState(0)
  const rootRef = useRef<HTMLAnchorElement | null>(null)
  const imgRef = useRef<HTMLImageElement | null>(null)

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

  const isInStock = (product as any).stock !== undefined ? (product as any).stock > 0 : product.inStock

  const formatImageUrl = (url: string) => {
    if (!url) return "/placeholder.jpg"
    if (url.startsWith("http") || url.startsWith("data:")) return url
    if (!url.startsWith("/")) return `/${url}`
    return url
  }

  useEffect(() => {
    if (!rootRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(rootRef.current, { y: 18, opacity: 0, duration: 0.8, ease: "power3.out" })
    }, rootRef)
    return () => ctx.revert()
  }, [])

  const handleHover = () => {
    if (!imgRef.current) return
    gsap.to(imgRef.current, { scale: 1.04, duration: 0.5, ease: "power2.out" })
    gsap.to(rootRef.current, { boxShadow: "0 10px 30px rgba(0,0,0,0.15)", duration: 0.35 })
  }

  const handleLeave = () => {
    if (!imgRef.current) return
    gsap.to(imgRef.current, { scale: 1, duration: 0.35, ease: "power2.out" })
    gsap.to(rootRef.current, { boxShadow: "0 0px 0px rgba(0,0,0,0)", duration: 0.35 })
  }

  return (
    <Link
      href={`/product/${product.id}`}
      ref={rootRef}
      className="group block rounded-sm focus:outline-none focus:ring-2 focus:ring-white/20"
      onMouseEnter={handleHover}
      onMouseLeave={handleLeave}
    >
      {/* Image Container */}
      <div className="relative aspect-[3/4] overflow-hidden bg-[#111] rounded-sm">
        <Image
          src={formatImageUrl(images[currentImage])}
          alt={product.name}
          fill
          ref={imgRef as any}
          className="object-cover transition-opacity duration-300"
        />

        {/* Out of stock overlay */}
        {!isInStock && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-xs uppercase tracking-widest border border-white/40 px-3 py-1.5 text-white/80">
              Out of Stock
            </span>
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5">
          {(product.newArrival || (product as any).is_new) && (
            <span className="bg-white text-black text-[9px] uppercase tracking-widest px-2 py-0.5 font-medium flex items-center gap-1">
              <Sparkles size={8} />
              New
            </span>
          )}
          {(product.bestseller || (product as any).is_bestseller) && (
            <span className="bg-amber-500 text-black text-[9px] uppercase tracking-widest px-2 py-0.5 font-medium flex items-center gap-1">
              <Award size={8} />
              Best
            </span>
          )}
        </div>

        {/* CTA */}
        <div className="absolute inset-x-0 bottom-0 translate-y-0 transition-transform duration-300 bg-black/80 backdrop-blur-sm py-3 text-center">
          <span className="text-xs uppercase tracking-widest text-white">View Details</span>
        </div>
      </div>

      {/* Text info */}
      <div className="mt-3 space-y-0.5">
        <p className="text-[10px] uppercase tracking-widest text-gray-500">{product.category}</p>
        <h3 className="text-sm font-medium text-balance group-hover:text-gray-300 transition-colors leading-snug">
          {product.name}
        </h3>
        <p className="text-sm text-gray-400">₹{product.price.toLocaleString('en-IN')}</p>
      </div>
    </Link>
  )
}
