"use client"

import { useState, useMemo } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ProductCard } from "@/components/product-card"
import { products } from "@/lib/data"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { SlidersHorizontal } from "lucide-react"

export default function ShopPage() {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))), [])
  const allSizes = useMemo(() => Array.from(new Set(products.flatMap((p) => p.sizes))), [])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category)
      const sizeMatch =
        selectedSizes.length === 0 ||
        product.sizes.some((size) => selectedSizes.includes(size))

      return categoryMatch && sizeMatch
    })
  }, [selectedCategories, selectedSizes])

  /* ================= FILTER UI ================= */
  const FilterContent = () => (
    <div className="space-y-12 text-sm uppercase tracking-widest text-gray-400">
      {/* Category */}
      <div>
        <h3 className="text-white mb-6">Category</h3>
        <div className="space-y-4">
          {categories.map((category) => (
            <label
              key={category}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Checkbox
                checked={selectedCategories.includes(category)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedCategories([
                      ...selectedCategories,
                      category,
                    ])
                  } else {
                    setSelectedCategories(
                      selectedCategories.filter((c) => c !== category)
                    )
                  }
                }}
              />
              <span className="hover:text-white transition-colors">
                {category}
              </span>
            </label>
          ))}
        </div>
      </div>


      {/* Size */}
      <div>
        <h3 className="text-white mb-6">Size</h3>
        <div className="flex flex-wrap gap-3">
          {allSizes.map((size) => (
            <button
              key={size}
              onClick={() => {
                setSelectedSizes((prev) =>
                  prev.includes(size)
                    ? prev.filter((s) => s !== size)
                    : [...prev, size]
                )
              }}
              className={`px-4 py-2 border text-xs tracking-widest transition-all ${selectedSizes.includes(size)
                ? "border-white text-white"
                : "border-white/20 text-gray-400 hover:text-white"
                }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>
    </div>
  )

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      {/* ================= PAGE HEADER ================= */}
      <section className="pt-24 pb-16 text-center px-6">
        <p className="uppercase tracking-[0.5em] text-xs text-gray-400 mb-6">
          The Collection
        </p>
        <h1 className="text-6xl md:text-7xl font-serif font-light mb-4">
          Shop All
        </h1>
        <p className="text-gray-500 text-sm tracking-widest">
          {filteredProducts.length} pieces available
        </p>
      </section>

      {/* ================= CONTENT ================= */}
      <main className="px-6 md:px-12 pb-32">
        <div className="flex gap-16">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-32">
              <FilterContent />
            </div>
          </aside>

          {/* Products */}
          <div className="flex-1">
            {/* Mobile Filter */}
            <div className="flex justify-end mb-10 lg:hidden">
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    className="border-white/20 text-white"
                  >
                    <SlidersHorizontal className="w-4 h-4 mr-2" />
                    Filters
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="bg-[#030303] border-white/10"
                >
                  <SheetHeader>
                    <SheetTitle className="text-white tracking-widest uppercase">
                      Filters
                    </SheetTitle>
                  </SheetHeader>
                  <div className="mt-12">
                    <FilterContent />
                  </div>
                </SheetContent>
              </Sheet>
            </div>

            {/* Grid */}
            {filteredProducts.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                {filteredProducts.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            ) : (
              <div className="text-center py-32">
                <p className="uppercase tracking-widest text-gray-500 mb-6">
                  No matching pieces found
                </p>
                <Button
                  variant="outline"
                  className="border-white/20 text-white"
                  onClick={() => {
                    setSelectedCategories([])
                    setSelectedSizes([])
                  }}
                >
                  Reset Filters
                </Button>
              </div>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
