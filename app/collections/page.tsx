"use client"

import Link from "next/link"
import Image from "next/image"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { collections } from "@/lib/data"

export default function CollectionsPage() {
  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      {/* ================= INTRO ================= */}
      <section className="pt-52 pb-16 px-6 text-center">
        <h1 className="font-serif text-6xl md:text-7xl font-light mb-6">
          Collections
        </h1>

        <p className="text-sm tracking-widest text-gray-500 max-w-xl mx-auto">
          Each collection is a study in form, restraint, and silhouette —
          designed to exist beyond trends.
        </p>
      </section>

      {/* ================= COLLECTION GRID ================= */}
      <main className="px-6 md:px-12 pb-32">
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-12">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/collections/${collection.id}`}
              className="group"
            >
              <div className="relative aspect-[3/4] overflow-hidden mb-6">
                <Image
                  src={collection.image}
                  alt={collection.name}
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                />

                {/* Overlay */}
                <div className="absolute inset-0 bg-black/40" />
              </div>

              <h2 className="font-serif text-3xl font-light mb-2">
                {collection.name}
              </h2>

              <p className="text-xs uppercase tracking-widest text-gray-500">
                View Collection
              </p>
            </Link>
          ))}
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
