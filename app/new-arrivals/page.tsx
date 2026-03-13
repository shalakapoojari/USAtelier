"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ProductCard } from "@/components/product-card"
import { products } from "@/lib/data"

export default function NewArrivalsPage() {
  const newArrivals = products.filter((p) => p.newArrival)

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      {/* ================= PAGE INTRO ================= */}
      <section className="pt-60 pb-24 px-6 text-center">
        <p className="uppercase tracking-[0.5em] text-xs text-gray-400 mb-6">
          Latest Drop
        </p>

        <h1 className="font-serif text-6xl md:text-7xl font-light mb-6">
          New Arrivals
        </h1>

        <p className="text-sm tracking-widest text-gray-500 max-w-xl mx-auto">
          A curated selection of our newest silhouettes, crafted with intention
          and designed to endure beyond seasons.
        </p>
      </section>

      {/* ================= GRID ================= */}
      <main className="px-6 md:px-12 pb-32">
        {newArrivals.length > 0 ? (
          <div className="max-w-[1400px] mx-auto grid grid-cols-2 md:grid-cols-4 gap-10">
            {newArrivals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="text-center py-32">
            <p className="uppercase tracking-widest text-gray-500">
              No new arrivals at the moment
            </p>
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
