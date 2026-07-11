"use client"

import { useState, useMemo, useEffect, useRef, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { ProductCard } from "@/components/product-card"
import { Loader2, ChevronDown, X, SlidersHorizontal, Users, Ruler, Tag } from "lucide-react"
import { Slider } from "@/components/ui/slider"
import { getApiBase, apiFetch } from "@/lib/api-base"

const API_BASE = getApiBase()

const getAllowedSizesForCategory = (categoryName: string) => {
  const cat = (categoryName || "").toLowerCase()
  if (cat.includes("shoe") || cat.includes("footwear")) {
    return ["IND 6", "IND 7", "IND 8", "IND 9", "IND 10", "IND 11", "IND 12"]
  }
  if (cat.includes("purse") || cat.includes("bag") || cat.includes("handbag")) {
    return ["Small", "Medium", "Large", "Tote", "Oversized", "Clutch"]
  }
  if (cat.includes("trouser") || cat.includes("pant") || cat.includes("jeans") || cat.includes("bottom")) {
    return ["28", "30", "32", "34", "36", "38", "40"]
  }
  if (cat.includes("saree") || cat.includes("traditional")) {
    return ["Free Size", "5.5m", "6.3m"]
  }
  if (cat.includes("shirt") || cat.includes("top") || cat.includes("basics") || cat.includes("knitwear") || cat.includes("clothing")) {
    return ["XS", "S", "M", "L", "XL", "2XL", "3XL"]
  }
  return null
}

function CheckMark() {
  return (
    <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
      <path d="M1.5 4L3 5.5L6.5 2" stroke="#000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ── Dropdown filter component ──────────────────────────────────────────────
function FilterDropdown({
  label,
  activeCount,
  children,
}: {
  label: React.ReactNode
  activeCount?: number
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center gap-2 px-4 py-2 border text-[10px] uppercase tracking-[0.25em] transition-all duration-200 whitespace-nowrap ${
          open || (activeCount && activeCount > 0)
            ? "border-white/50 text-white bg-white/5"
            : "border-white/15 text-white/50 hover:text-white hover:border-white/30"
        }`}
      >
        {label}
        {activeCount ? (
          <span className="flex items-center justify-center w-4 h-4 rounded-full bg-white text-black text-[8px] font-bold">
            {activeCount}
          </span>
        ) : null}
        <ChevronDown
          size={10}
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <>
          {/* Mobile Overlay */}
          <div 
            className="fixed inset-0 z-40 md:hidden" 
            onClick={(e) => { e.stopPropagation(); setOpen(false); }} 
          />
          {/* Dropdown / Mobile Sheet */}
          <div className="fixed bottom-0 left-0 right-0 z-[80] bg-[#0a0a0a] border-t border-white/10 p-6 pb-12 rounded-t-3xl md:p-0 md:pb-0 md:rounded-none md:border-t-0 md:absolute md:top-full md:bottom-auto md:left-0 md:mt-1 md:min-w-[220px] md:border md:border-white/15 animate-in slide-in-from-bottom-8 md:slide-in-from-top-1 duration-300 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] md:shadow-2xl flex flex-col max-h-[80vh] md:max-h-none">
            <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-6 md:hidden" />
            <div className="overflow-y-auto no-scrollbar md:overflow-visible">
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function ShopContent() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedSubcategories, setSelectedSubcategories] = useState<string[]>([])
  const [selectedSizes, setSelectedSizes] = useState<string[]>([])
  const [selectedGenders, setSelectedGenders] = useState<string[]>([])
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000])
  const [sliderRange, setSliderRange] = useState<[number, number]>([0, 100000])
  const [priceMode, setPriceMode] = useState<"all" | "range">("all")
  const [sortOrder, setSortOrder] = useState<"none" | "low-high" | "high-low">("none")
  const [searchInput, setSearchInput] = useState("")
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const router = useRouter()
  const searchParams = useSearchParams()
  const urlCategory = searchParams.get("category")
  const urlSubcategory = searchParams.get("subcategory")
  const urlSearch = searchParams.get("search")
  const jumpTo = searchParams.get("jumpTo")
  const activeSearch = searchInput.trim()

  useEffect(() => {
    setSearchInput(urlSearch || "")
  }, [urlSearch])

  // Sync with URL category and subcategory
  useEffect(() => {
    setSelectedCategories(urlCategory ? [urlCategory] : [])
    setSelectedSubcategories(urlSubcategory ? [urlSubcategory] : [])
  }, [urlCategory, urlSubcategory])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          apiFetch(API_BASE, "/api/products"),
          apiFetch(API_BASE, "/api/categories"),
        ])
        if (prodRes.ok) setProducts(await prodRes.json())
        if (catRes.ok) setCategories(await catRes.json())
      } catch (err) {
        console.error("Failed to fetch shop data:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  // Scroll to section if jumpTo is present
  useEffect(() => {
    if (jumpTo && !loading && products.length > 0) {
      const timer = setTimeout(() => {
        const element = document.getElementById(`section-${jumpTo.toLowerCase()}`)
        if (element) {
          const headerOffset = 150
          const elementPosition = element.getBoundingClientRect().top
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset
          window.scrollTo({ top: offsetPosition, behavior: "smooth" })
        }
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [jumpTo, loading, products])

  useEffect(() => {
    if (jumpTo) return
    window.scrollTo({ top: 0, behavior: "auto" })
  }, [urlCategory, urlSubcategory, activeSearch, jumpTo])

  const allSizes = useMemo(() => {
    const norm = (str: any) => (str ?? "").toString().toLowerCase().trim()
    const scopedProducts = products.filter((p) => {
      const catMatch =
        (urlCategory ? norm(p.category) === norm(urlCategory) : true) &&
        (selectedCategories.length === 0 || selectedCategories.some((c) => norm(c) === norm(p.category)))
      const subMatch =
        (urlSubcategory ? norm(p.subcategory) === norm(urlSubcategory) : true) &&
        (selectedSubcategories.length === 0 || selectedSubcategories.some((s) => norm(s) === norm(p.subcategory)))
      const genderMatch =
        selectedGenders.length === 0 || selectedGenders.some((g) => norm(g) === norm(p.gender))
      const searchMatch = !activeSearch || (() => {
        const words = norm(activeSearch).split(/\s+/).filter(Boolean)
        const text = norm(`${p.name || ""} ${p.description || ""} ${p.category || ""}`)
        return words.every((w: string) => text.includes(w))
      })()
      return catMatch && subMatch && genderMatch && searchMatch
    })

    const sizes = new Set<string>()
    scopedProducts.forEach((p) => {
      if (!p.sizes) return
      const allowed = getAllowedSizesForCategory(p.category || "")
      try {
        const parsed = typeof p.sizes === "string" ? JSON.parse(p.sizes) : p.sizes
        if (Array.isArray(parsed)) {
          parsed.forEach((s) => {
            const val = (s ?? "").toString().trim()
            if (!val) return
            if (allowed && !allowed.includes(val)) return
            sizes.add(val)
          })
        }
      } catch {}
    })
    return Array.from(sizes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
  }, [products, urlCategory, urlSubcategory, activeSearch, selectedCategories, selectedSubcategories, selectedGenders])

  useEffect(() => {
    setSelectedSizes((prev) => prev.filter((size) => allSizes.includes(size)))
  }, [allSizes])

  const absoluteMaxPrice = useMemo(() => {
    if (products.length === 0) return 0
    return Math.max(...products.map((p) => p.sellingPrice))
  }, [products])

  const categoryMaxPrice = useMemo(() => {
    const cp = urlCategory
      ? products.filter((p) => (p.category || "").toLowerCase() === urlCategory.toLowerCase())
      : products
    if (cp.length === 0) return absoluteMaxPrice
    return Math.max(...cp.map((p) => p.sellingPrice || 0))
  }, [products, urlCategory, absoluteMaxPrice])

  useEffect(() => {
    setPriceRange([0, categoryMaxPrice])
    setSliderRange([0, categoryMaxPrice])
    setPriceMode("all")
  }, [categoryMaxPrice])

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const norm = (str: any) => (str === null || str === undefined ? "" : str.toString().toLowerCase().trim())

      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.some((sc) => norm(sc) && norm(sc) === norm(product.category))

      const subcategoryMatch =
        selectedSubcategories.length === 0 ||
        selectedSubcategories.some((ss) => norm(ss) && norm(ss) === norm(product.subcategory))

      const productSizes = Array.isArray(product.sizes) ? product.sizes : (() => {
        try { return JSON.parse(product.sizes || "[]") } catch { return [] }
      })()

      const sizeMatch =
        selectedSizes.length === 0 ||
        productSizes.some((size: string) => selectedSizes.includes(size))

      const priceMatch = priceMode !== "range" || ((product.sellingPrice || 0) >= priceRange[0] && (product.sellingPrice || 0) <= priceRange[1])

      const genderMatch =
        selectedGenders.length === 0 ||
        selectedGenders.some((sg) => norm(sg) === norm(product.gender))

      const searchMatch = !activeSearch || (() => {
        const words = activeSearch.toLowerCase().trim().split(/\s+/).filter(Boolean)
        const text = `${product.name || ""} ${product.description || ""} ${product.category || ""}`.toLowerCase()
        return words.every((w: string) => text.includes(w))
      })()

      return categoryMatch && subcategoryMatch && sizeMatch && priceMatch && genderMatch && searchMatch
    })
  }, [products, selectedCategories, selectedSubcategories, selectedSizes, priceRange, priceMode, selectedGenders, activeSearch])

  const visibleProducts = useMemo(() => {
    const next = [...filteredProducts]
    if (sortOrder === "low-high") {
      next.sort((a, b) => Number(a.sellingPrice || 0) - Number(b.sellingPrice || 0))
    }
    if (sortOrder === "high-low") {
      next.sort((a, b) => Number(b.sellingPrice || 0) - Number(a.sellingPrice || 0))
    }
    return next
  }, [filteredProducts, sortOrder])

  const activeFilterCount =
    selectedCategories.length +
    selectedSizes.length +
    selectedGenders.length +
    (priceMode === "range" ? 1 : 0) +
    (sortOrder !== "none" ? 1 : 0)

  const clearAllFilters = () => {
    setSelectedCategories([])
    setSelectedSizes([])
    setSelectedGenders([])
    setPriceRange([0, categoryMaxPrice])
    setSliderRange([0, categoryMaxPrice])
    setPriceMode("all")
    setSortOrder("none")
  }

  const filterControls = (mobile = false) => (
    <>
      <FilterDropdown label={mobile ? "Gender" : <><span className="hidden md:inline">Gender</span><Users size={12} className="md:hidden" /></>} activeCount={selectedGenders.length}>
        <div className="p-4 space-y-2">
          {["Men", "Women"].map((gender) => (
            <button
              key={gender}
              onClick={() =>
                setSelectedGenders((prev) =>
                  prev.includes(gender) ? prev.filter((g) => g !== gender) : [...prev, gender]
                )
              }
              className={`w-full text-left flex items-center gap-3 px-2 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${
                selectedGenders.includes(gender) ? "text-white" : "text-white/40 hover:text-white/80"
              }`}
            >
              <span className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${selectedGenders.includes(gender) ? "border-white bg-white" : "border-white/20"}`}>
                {selectedGenders.includes(gender) && <CheckMark />}
              </span>
              {gender}
            </button>
          ))}
        </div>
      </FilterDropdown>

      {!urlCategory && (
        <FilterDropdown label="Category" activeCount={selectedCategories.length}>
          <div className="p-4 space-y-2 max-h-60 overflow-y-auto">
            {categories.map((cat: any) => (
              <button
                key={cat.id || cat.name}
                onClick={() =>
                  setSelectedCategories((prev) =>
                    prev.includes(cat.name) ? prev.filter((c) => c !== cat.name) : [...prev, cat.name]
                  )
                }
                className={`w-full text-left flex items-center gap-3 px-2 py-1.5 text-[11px] uppercase tracking-widest transition-colors ${selectedCategories.includes(cat.name) ? "text-white" : "text-white/40 hover:text-white/80"}`}
              >
                <span className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 ${selectedCategories.includes(cat.name) ? "border-white bg-white" : "border-white/20"}`}>
                  {selectedCategories.includes(cat.name) && <CheckMark />}
                </span>
                {cat.name}
              </button>
            ))}
          </div>
        </FilterDropdown>
      )}

      {allSizes.length > 0 && (
        <FilterDropdown label={mobile ? "Size" : <><span className="hidden md:inline">Size</span><Ruler size={12} className="md:hidden" /></>} activeCount={selectedSizes.length}>
          <div className="p-4 w-64">
            <div className="flex flex-wrap gap-2 max-w-[220px]">
              {allSizes.map((size) => (
                <button
                  key={size}
                  onClick={() => setSelectedSizes((prev) => prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size])}
                  className={`px-3 py-1.5 border text-[10px] tracking-widest transition-all ${selectedSizes.includes(size) ? "border-white text-white bg-white/10" : "border-white/15 text-white/50 hover:border-white/40 hover:text-white"}`}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
        </FilterDropdown>
      )}

      <FilterDropdown label={mobile ? "Price" : <><span className="hidden md:inline">Price</span><Tag size={12} className="md:hidden" /></>} activeCount={(priceMode === "range" ? 1 : 0) + (sortOrder !== "none" ? 1 : 0)}>
        <div className="p-4 w-72 space-y-4">
          <div className="grid gap-2">
            {[
              ["none", "Recommended"],
              ["low-high", "Price: Low to High"],
              ["high-low", "Price: High to Low"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSortOrder(value as "none" | "low-high" | "high-low")}
                className={`flex items-center justify-between border px-3 py-2 text-left text-[10px] uppercase tracking-[0.18em] transition-colors ${sortOrder === value ? "border-white/50 bg-white/10 text-white" : "border-white/10 text-white/45 hover:text-white hover:border-white/30"}`}
              >
                {label}
                {sortOrder === value && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </button>
            ))}
          </div>

          <div className="border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setPriceMode(priceMode === "range" ? "all" : "range")}
              className={`w-full flex items-center justify-between border px-3 py-2 text-[10px] uppercase tracking-[0.18em] transition-colors ${priceMode === "range" ? "border-white/50 bg-white/10 text-white" : "border-white/10 text-white/45 hover:text-white hover:border-white/30"}`}
            >
              Price Range
              <span>{priceMode === "range" ? "On" : "Off"}</span>
            </button>
            {priceMode === "range" && (
              <div className="pt-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[9px] uppercase tracking-[0.25em] text-white/40">Range</span>
                  <span className="text-[9px] text-white/70 font-mono">₹{sliderRange[0].toLocaleString("en-IN")} - ₹{sliderRange[1].toLocaleString("en-IN")}</span>
                </div>
                <Slider
                  value={sliderRange}
                  min={0}
                  max={categoryMaxPrice || 100000}
                  step={100}
                  onValueChange={(val) => setSliderRange(val as [number, number])}
                  onValueCommit={(val) => setPriceRange(val as [number, number])}
                  className="py-3"
                />
                <div className="flex justify-between mt-2 text-[9px] text-white/30 font-mono tracking-tight">
                  <span>₹0</span>
                  <span>₹{(categoryMaxPrice || 100000).toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </FilterDropdown>
    </>
  )

  return (
    <>
      {/* ─── MAIN CONTENT ────────────────────────────────────────── */}
      <main className="px-0 pb-32 pt-36 md:pt-40">
        <div className="px-4 md:px-12 mb-6 md:mb-8">
          <div className="mx-auto max-w-4xl border-b border-white/20 flex items-center gap-3 py-3 focus-within:border-white/60 transition-colors">
            <SlidersHorizontal size={14} className="text-white/30 rotate-90" />
            <input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products"
              className="flex-1 bg-transparent outline-none text-lg md:text-2xl font-serif text-white placeholder:text-white/25"
              aria-label="Search products"
            />
            {activeSearch && (
              <button type="button" onClick={() => { setSearchInput(""); if (urlSearch) router.push("/view-all") }} className="p-2 text-white/40 hover:text-white" aria-label="Clear search">
                <X size={14} />
              </button>
            )}
          </div>
          {activeSearch && (
            <div className="mx-auto max-w-4xl mt-4 flex items-center justify-between gap-4">
              <p className="text-[10px] uppercase tracking-[0.25em] text-white/35">Results for <span className="text-white/75">{activeSearch}</span></p>
              <span className="text-[10px] uppercase tracking-[0.25em] text-white/35">{visibleProducts.length} piece{visibleProducts.length === 1 ? "" : "s"}</span>
            </div>
          )}
        </div>

        {/* ─── CATEGORIES & FILTERS BAR ───────────────────────────────────── */}
        {!loading && (
          <div className="mb-8 px-4 md:px-12 flex flex-col gap-3 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-4 md:pb-6 relative z-30 overflow-visible">

            {/* Category pills */}
            {!activeSearch && categories.length > 0 && (
              <div className="flex-1 w-full overflow-x-auto no-scrollbar pr-4">
                <div className="flex items-center gap-3 min-w-max">
                  <a
                    href="/view-all"
                    className={`px-5 py-2 text-[10px] uppercase tracking-[0.3em] border transition-all duration-300 whitespace-nowrap ${
                      !urlCategory
                        ? "border-white/40 text-white bg-white/5"
                        : "border-white/10 text-white/35 hover:text-white hover:border-white/30"
                    }`}
                  >
                    All
                  </a>
                  {categories.map((cat: any) => (
                    <a
                      key={cat.id || cat.name}
                      href={`/view-all?category=${encodeURIComponent(cat.name)}`}
                      className={`px-5 py-2 text-[10px] uppercase tracking-[0.3em] border transition-all duration-300 whitespace-nowrap ${
                        urlCategory?.toLowerCase() === cat.name.toLowerCase()
                          ? "border-white/40 text-white bg-white/5"
                          : "border-white/10 text-white/35 hover:text-white hover:border-white/30"
                      }`}
                    >
                      {cat.name}
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Filter Dropdowns */}
            <div className="hidden md:flex flex-wrap items-center gap-2 w-full md:w-auto md:flex-nowrap md:shrink-0 md:overflow-visible">
              {filterControls(false)}
            </div>

            <div className="md:hidden w-full">
              <button
                type="button"
                onClick={() => setMobileFiltersOpen((v) => !v)}
                className="w-full h-11 border border-white/15 flex items-center justify-between px-4 text-[10px] uppercase tracking-[0.25em] text-white/70"
              >
                <span className="flex items-center gap-2"><SlidersHorizontal size={13} /> Filters</span>
                <ChevronDown size={12} className={`transition-transform ${mobileFiltersOpen ? "rotate-180" : ""}`} />
              </button>
              {mobileFiltersOpen && (
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {filterControls(true)}
                </div>
              )}
            </div>

            {/* Active filter chips + clear */}
            {activeFilterCount > 0 && (
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-[9px] uppercase tracking-widest text-white/30">
                  {visibleProducts.length} result{visibleProducts.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={clearAllFilters}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-white/15 text-[9px] uppercase tracking-widest text-white/40 hover:text-white hover:border-white/30 transition-all"
                >
                  <X size={9} />
                  Clear
                </button>
              </div>
            )}

            {/* Result count when no filters active */}
            {activeFilterCount === 0 && !loading && (
              <span className="ml-auto text-[9px] uppercase tracking-widest text-white/20">
                {visibleProducts.length} piece{visibleProducts.length !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}

        {/* Products area */}
        <div className="w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40 gap-4">
              <Loader2 className="animate-spin text-gray-400" />
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Discovering pieces...</p>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center text-center">
              <h2 className="text-3xl font-serif text-gray-500 font-light">No pieces found</h2>
              <button
                onClick={clearAllFilters}
                className="mt-6 px-6 py-3 border border-white/20 text-xs uppercase tracking-widest text-white/60 hover:text-white hover:border-white/40 transition-all"
              >
                Clear Filters
              </button>
            </div>
          ) : (
            <>
              {/* Grid — plain when no category or with search */}
              {(!urlCategory || activeSearch || urlSubcategory) ? (
                <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 0 }}>
                  {visibleProducts.map((product) => (
                    <ProductCard key={product.id || Math.random()} product={product} />
                  ))}
                </div>
              ) : (
                (() => {
                  // Grouping Logic for Category Views
                  const subcategories = Array.from(
                    new Set(
                      visibleProducts.map((p) => {
                        if (p.subcategory) return p.subcategory
                        const name = (p.name || "").toLowerCase()
                        const cat = (p.category || "").toLowerCase()
                        if (cat === "knitwear") {
                          if (name.includes("sweater") || name.includes("jumper")) return "Sweaters"
                          if (name.includes("cardigan")) return "Cardigans"
                        }
                        if (cat === "trousers") {
                          if (name.includes("tailored") || name.includes("wool")) return "Tailored"
                          if (name.includes("chino") || name.includes("linen") || name.includes("pants")) return "Casual"
                        }
                        if (cat === "accessories") {
                          if (name.includes("bag") || name.includes("tote")) return "Bags"
                          if (name.includes("scarf") || name.includes("muffler")) return "Scarf"
                        }
                        if (cat === "basics") {
                          if (name.includes("tee") || name.includes("t-shirt")) return "Tees"
                        }
                        if (cat === "shirts") {
                          if (name.includes("shirt")) return "Formal"
                        }
                        return null
                      }).filter(Boolean)
                    )
                  ).sort((a: any, b: any) => {
                    const priority: Record<string, number> = {
                      Bags: 1, Scarf: 2, Sweaters: 1, Cardigans: 2, Tailored: 1, Casual: 2,
                    }
                    return (priority[a] || 99) - (priority[b] || 99)
                  })

                  if (subcategories.length === 0) {
                    return (
                      <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 0 }}>
                        {visibleProducts.map((product) => (
                          <ProductCard key={product.id || Math.random()} product={product} />
                        ))}
                      </div>
                    )
                  }

                  const matchProduct = (p: any, subName: any): boolean => {
                    if (p.subcategory === subName) return true
                    const name = (p.name || "").toLowerCase()
                    const cat = (p.category || "").toLowerCase()
                    if (subName === "Sweaters") return cat === "knitwear" && (name.includes("sweater") || name.includes("jumper"))
                    if (subName === "Cardigans") return cat === "knitwear" && name.includes("cardigan")
                    if (subName === "Tailored") return cat === "trousers" && (name.includes("tailored") || name.includes("wool"))
                    if (subName === "Casual") return cat === "trousers" && (name.includes("chino") || name.includes("linen") || name.includes("pants"))
                    if (subName === "Bags") return cat === "accessories" && (name.includes("bag") || name.includes("tote"))
                    if (subName === "Scarf") return cat === "accessories" && (name.includes("scarf") || name.includes("muffler"))
                    if (subName === "Tees") return cat === "basics" && (name.includes("tee") || name.includes("t-shirt"))
                    if (subName === "Formal") return cat === "shirts" && name.includes("shirt")
                    return false
                  }

                  return (
                    <div className="space-y-20 w-full">
                      {subcategories.map((subName: any) => {
                        const sectionProducts = visibleProducts.filter((p) => matchProduct(p, subName))
                        if (sectionProducts.length === 0) return null
                        return (
                          <div key={subName} className="w-full pt-4 scroll-mt-40" id={`section-${subName.toLowerCase()}`}>
                            <div className="mb-8">
                              <h2 className="text-2xl md:text-3xl font-serif font-light mb-4 tracking-[0.3em] gradient-text">
                                {subName}
                              </h2>
                              <div className="h-px w-full bg-white/8" />
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 0 }}>
                              {sectionProducts.map((product) => (
                                <ProductCard key={product.id || Math.random()} product={product} />
                              ))}
                            </div>
                          </div>
                        )
                      })}

                      {/* Fallback for unmatched products */}
                      {(() => {
                        const unmatched = visibleProducts.filter(
                          (p) => !subcategories.some((subName) => matchProduct(p, subName))
                        )
                        if (unmatched.length === 0) return null
                        return (
                          <div className="w-full pt-4">
                            <div className="mb-8">
                              <h2 className="text-2xl md:text-3xl font-serif font-light mb-4 tracking-[0.3em] text-white/40">
                                Other Pieces
                              </h2>
                              <div className="h-px w-full bg-white/8" />
                            </div>
                            <div className="grid grid-cols-2 lg:grid-cols-4" style={{ gap: 0 }}>
                              {unmatched.map((product) => (
                                <ProductCard key={product.id || Math.random()} product={product} />
                              ))}
                            </div>
                          </div>
                        )
                      })()}
                    </div>
                  )
                })()
              )}
            </>
          )}
        </div>
      </main>
    </>
  )
}

export default function ShopPage() {
  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen overflow-x-hidden">
      <Suspense
        fallback={
          <div className="bg-[#030303] min-h-screen flex items-center justify-center">
            <Loader2 className="animate-spin text-gray-400" />
          </div>
        }
      >
        <SiteHeader />
        <ShopContent />
      </Suspense>
      <SiteFooter />
    </div>
  )
}
