"use client"

import { useState, useMemo, useEffect, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ProductCard } from "@/components/product-card"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { Checkbox } from "@/components/ui/checkbox"
import { SlidersHorizontal, Loader2 } from "lucide-react"

const API_BASE = "http://127.0.0.1:5000"

export default function ShopPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])

  const searchParams = useSearchParams()
  const urlCategory = searchParams.get("category")

  // Sync with URL category
  useEffect(() => {
    if (urlCategory) {
      setSelectedCategories([urlCategory])
    } else {
      setSelectedCategories([])
    }
  }, [urlCategory])

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/products`, {
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          setProducts(data)
        }
      } catch (err) {
        console.error("Failed to fetch products:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchProducts()
  }, [])

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category))), [products])
  const allSizes = useMemo(() => {
    return Array.from(new Set(products.flatMap((p) => {
      if (Array.isArray(p.sizes)) return p.sizes
      try {
        const parsed = JSON.parse(p.sizes)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })))
  }, [products])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.includes(product.category)

      const productSizes = Array.isArray(product.sizes) ? product.sizes : (() => {
        try { return JSON.parse(product.sizes) } catch { return [] }
      })()

      const sizeMatch =
        selectedSizes.length === 0 ||
        productSizes.some((size: string) => selectedSizes.includes(size))

      return categoryMatch && sizeMatch
    })
  }, [products, selectedCategories, selectedSizes])

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
      <Suspense fallback={<div>Loading...</div>}>
        <SiteHeader />
      </Suspense>

      {/* ================= PAGE HEADER ================= */}
      <section className="pt-40 pb-16 text-center px-6">
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
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="animate-spin text-gray-400" />
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Discovering pieces...</p>
              </div>
            ) : filteredProducts.length > 0 ? (
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
