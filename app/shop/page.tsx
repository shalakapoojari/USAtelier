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
  const [priceLimit, setPriceLimit] = useState<number>(100000)

  const searchParams = useSearchParams()
  const urlCategory = searchParams.get("category")
  const urlSearch = searchParams.get("search")

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
    const sizes = new Set<string>()
    products.forEach((p) => {
      try {
        const parsed = JSON.parse(p.sizes)
        if (Array.isArray(parsed)) parsed.forEach(s => sizes.add(s))
      } catch {
        // If not JSON, skip or handle as single string
      }
    })
    return Array.from(sizes).sort()
  }, [products])

  const absoluteMaxPrice = useMemo(() => {
    if (products.length === 0) return 0
    return Math.max(...products.map(p => p.price))
  }, [products])

  const categoryMaxPrice = useMemo(() => {
    const categoryProducts = urlCategory
      ? products.filter(p => p.category.toLowerCase() === urlCategory.toLowerCase())
      : products
    if (categoryProducts.length === 0) return absoluteMaxPrice
    return Math.max(...categoryProducts.map(p => p.price))
  }, [products, urlCategory, absoluteMaxPrice])

  // Reset price limit when category changes
  useEffect(() => {
    setPriceLimit(categoryMaxPrice)
  }, [categoryMaxPrice])

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

      const priceMatch = product.price <= priceLimit

      const normalize = (str: string) => str.toLowerCase().replace(/[\s-]/g, "")
      const searchMatch =
        !urlSearch ||
        normalize(product.name).includes(normalize(urlSearch)) ||
        normalize(product.description).includes(normalize(urlSearch))

      return categoryMatch && sizeMatch && priceMatch && searchMatch
    })
  }, [products, selectedCategories, selectedSizes, priceLimit, urlSearch])

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

      {/* Price Range */}
      <div className="pt-10 border-t border-white/5">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-[10px] uppercase tracking-[0.4em] font-medium">Price Range</h3>
          <span className="text-[10px] text-gray-500 font-mono tracking-widest">
            ₹0 — ₹{priceLimit.toLocaleString('en-IN')}
          </span>
        </div>
        <div className="px-2 relative pt-6">
          {/* Floating Tooltip */}
          <div
            className="absolute -top-2 px-2 py-1 bg-white text-black text-[9px] font-bold rounded-sm whitespace-nowrap transition-all duration-75 pointer-events-none shadow-lg -translate-x-1/2"
            style={{
              left: `${(priceLimit / categoryMaxPrice) * 100}%`,
            }}
          >
            ₹{priceLimit.toLocaleString('en-IN')}
            {/* Tooltip arrow */}
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[4px] border-t-white"></div>
          </div>

          <input
            type="range"
            min="0"
            max={categoryMaxPrice}
            step="100"
            value={priceLimit > categoryMaxPrice ? categoryMaxPrice : priceLimit}
            onChange={(e) => setPriceLimit(parseInt(e.target.value))}
            className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white hover:accent-gray-300 transition-all"
          />
          <div className="flex justify-between mt-4 text-[9px] text-gray-600 tracking-widest font-mono">
            <span>₹0</span>
            <span>₹{categoryMaxPrice.toLocaleString('en-IN')}</span>
          </div>
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
      <section className="pt-28 pb-0 text-center px-6">
        {!urlCategory && !urlSearch && (
          <p className="uppercase tracking-[0.5em] text-xs text-gray-400 mb-4">
            The Collection
          </p>
        )}
        {urlSearch && (
          <p className="uppercase tracking-[0.5em] text-xs text-gray-400 mb-4">
            Search Results
          </p>
        )}
        <h1 className="text-5xl md:text-6xl font-serif font-light mb-2 capitalize leading-none">
          {urlSearch ? `"${urlSearch}"` : (urlCategory || "Shop All")}
        </h1>
        <p className="text-gray-500 text-[10px] tracking-[0.3em] uppercase">
          {filteredProducts.length} pieces available
        </p>
      </section>

      {/* ================= CONTENT ================= */}
      <main className="px-6 md:px-12 pb-32 -mt-4">
        <div className="flex gap-16">
          {/* Desktop Filters */}
          <aside className="hidden lg:block w-72 shrink-0">
            <div className="sticky top-6">
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
