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
  const [selectedGenders, setSelectedGenders] = useState<string[]>([])
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

      const genderMatch =
        selectedGenders.length === 0 ||
        selectedGenders.includes(product.gender)

      const normalize = (str: string) => str.toLowerCase().trim()

      const searchMatch = !urlSearch || (() => {
        const queryWords = normalize(urlSearch).split(/\s+/).filter(Boolean)
        const searchableText = normalize(`${product.name} ${product.description} ${product.category}`)
        return queryWords.every(word => searchableText.includes(word))
      })()

      return categoryMatch && sizeMatch && priceMatch && genderMatch && searchMatch
    })
  }, [products, selectedCategories, selectedSizes, priceLimit, selectedGenders, urlSearch])

  /* ================= FILTER UI ================= */
  const FilterContent = () => (
    <div className="space-y-12 text-sm uppercase tracking-widest text-gray-400">
      {/* Gender */}
      <div>
        <h3 className="text-white mb-6">Gender</h3>
        <div className="space-y-4">
          {["Men", "Women"].map((gender) => (
            <label
              key={gender}
              className="flex items-center gap-3 cursor-pointer"
            >
              <Checkbox
                checked={selectedGenders.includes(gender)}
                onCheckedChange={(checked) => {
                  if (checked) {
                    setSelectedGenders([...selectedGenders, gender])
                  } else {
                    setSelectedGenders(selectedGenders.filter((g) => g !== gender))
                  }
                }}
                className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
              />
              <span className={selectedGenders.includes(gender) ? "text-white transition-colors" : "transition-colors"}>
                {gender}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Category - Only show on Shop All (no specific category in URL) */}
      {!urlCategory && (
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
                  className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
                <span className={selectedCategories.includes(category) ? "text-white transition-colors" : "transition-colors"}>
                  {category}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}


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
      {!loading && filteredProducts.length > 0 && (
        <section className="pt-32 pb-16 text-center px-6">
          <h1 className="text-5xl md:text-6xl font-serif font-light mb-2 capitalize leading-none">
            {urlSearch || urlCategory || "Shop All"}
          </h1>
          {urlCategory && (
            <p className="text-gray-500 text-[10px] tracking-[0.3em] uppercase">
              {filteredProducts.length} pieces available
            </p>
          )}
        </section>
      )}

      {/* ================= CONTENT ================= */}
      <main className={`px-6 md:px-12 pb-32 ${filteredProducts.length === 0 && !loading ? 'flex justify-center' : ''}`}>
        <div className={`flex gap-16 ${filteredProducts.length === 0 && !loading ? 'w-full max-w-4xl justify-center' : 'w-full'}`}>
          {/* Desktop Filters - Only shown if products exist */}
          {!loading && filteredProducts.length > 0 && (
            <aside className="hidden lg:block w-72 shrink-0 -mt-32">
              <div className="sticky top-28">
                <FilterContent />
              </div>
            </aside>
          )}

          {/* Products area */}
          <div className={filteredProducts.length > 0 ? "flex-1" : "w-full"}>
            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="animate-spin text-gray-400" />
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Discovering pieces...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-in fade-in duration-700">
                <h2 className="text-3xl font-serif text-gray-400">Product Not Found</h2>
              </div>
            ) : (
              <>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-10">
                  {filteredProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
