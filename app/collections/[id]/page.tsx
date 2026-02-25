"use client"

import { use, useEffect, useRef } from "react"
import { notFound } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ProductCard } from "@/components/product-card"
import { collections, products } from "@/lib/data"

gsap.registerPlugin(ScrollTrigger)

// Maps each collection slug to the product categories it contains
const collectionCategoryMap: Record<string, string[]> = {
  essentials: ["Basics"],
  knitwear: ["Knitwear"],
  tailoring: ["Trousers", "Shirts"],
}

export default function CollectionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const collection = collections.find((c) => c.id === id)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".col-hero-line", {
        y: 60,
        opacity: 0,
        duration: 1,
        ease: "power3.out",
        stagger: 0.12,
      })

      gsap.utils.toArray<HTMLElement>(".col-card").forEach((el, i) => {
        gsap.from(el, {
          y: 50,
          opacity: 0,
          duration: 0.8,
          delay: i * 0.05,
          ease: "power3.out",
          scrollTrigger: {
            trigger: el,
            start: "top 90%",
          },
        })
      })
    }, rootRef)

    return () => ctx.revert()
  }, [id])

  if (!collection) notFound()

  const categories = collectionCategoryMap[id] ?? []
  const collectionProducts = categories.length > 0
    ? products.filter((p) => categories.includes(p.category))
    : products

  return (
    <div ref={rootRef} className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      {/* ── HERO ── */}
      <section className="relative h-[70vh] flex items-end overflow-hidden">
        <Image
          src={collection.image}
          alt={collection.name}
          fill
          priority
          className="object-cover opacity-50 scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/40 to-transparent" />

        {/* Breadcrumb */}
        <div className="absolute top-36 left-8 md:left-16">
          <Link
            href="/collections"
            className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            ← All Collections
          </Link>
        </div>

        {/* Title block */}
        <div className="relative z-10 px-8 md:px-16 pb-20 max-w-[1400px] mx-auto w-full">
          <p className="col-hero-line uppercase tracking-[0.5em] text-xs text-gray-400 mb-4">
            Collection
          </p>
          <h1 className="col-hero-line font-serif text-6xl md:text-8xl font-light leading-none mb-4">
            {collection.name}
          </h1>
          <p className="col-hero-line text-sm tracking-widest text-gray-400 max-w-md">
            {collection.description}
          </p>
        </div>
      </section>

      {/* ── STATS BAR ── */}
      <div className="border-b border-white/10 px-8 md:px-16 py-6 flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-gray-500">
          {collectionProducts.length}{" "}
          {collectionProducts.length === 1 ? "Piece" : "Pieces"}
        </p>
        <div className="flex gap-6 text-xs uppercase tracking-widest text-gray-600">
          <span>FW 2025</span>
          <span>·</span>
          <span>U.S ATELIER</span>
        </div>
      </div>

      {/* ── PRODUCTS ── */}
      <main className="px-6 md:px-12 py-20">
        {collectionProducts.length > 0 ? (
          <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
            {collectionProducts.map((product) => (
              <div key={product.id} className="col-card">
                <ProductCard product={product} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-48">
            <p className="uppercase tracking-widest text-gray-600 mb-6 text-sm">
              No pieces available yet
            </p>
            <Link
              href="/view-all"
              className="inline-block px-10 py-4 border border-white/30 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
            >
              View All Pieces
            </Link>
          </div>
        )}
      </main>

      {/* ── EXPLORE MORE ── */}
      {collections.filter((c) => c.id !== id).length > 0 && (
        <section className="px-8 md:px-16 pb-32 border-t border-white/10 pt-20">
          <div className="max-w-[1400px] mx-auto">
            <p className="uppercase tracking-[0.4em] text-xs text-gray-500 mb-12 text-center">
              Explore More
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {collections
                .filter((c) => c.id !== id)
                .map((col) => (
                  <Link
                    key={col.id}
                    href={`/collections/${col.id}`}
                    className="group relative aspect-[16/7] overflow-hidden"
                  >
                    <Image
                      src={col.image}
                      alt={col.name}
                      fill
                      className="object-cover opacity-60 group-hover:opacity-80 transition-opacity duration-500 group-hover:scale-105 scale-100 transition-transform"
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#030303]/70 to-transparent" />
                    <div className="absolute inset-0 flex items-center px-10">
                      <div>
                        <p className="text-xs uppercase tracking-widest text-gray-400 mb-2">
                          Collection
                        </p>
                        <h3 className="font-serif text-3xl font-light group-hover:text-gray-300 transition-colors">
                          {col.name}
                        </h3>
                      </div>
                    </div>
                  </Link>
                ))}
            </div>
          </div>
        </section>
      )}

      <SiteFooter />
    </div>
  )
}
