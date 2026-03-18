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
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { getApiBase } from "@/lib/api-base"

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
  const [localMin, setLocalMin] = useState<string>("0")
  const [localMax, setLocalMax] = useState<string>("100000")

  const searchParams = useSearchParams()
  const urlCategory = searchParams.get("category")
  const urlSubcategory = searchParams.get("subcategory")
  const urlSearch = searchParams.get("search")
  const jumpTo = searchParams.get("jumpTo")

  // Sync with URL category and subcategory
  useEffect(() => {
    if (urlCategory) {
      setSelectedCategories([urlCategory])
    } else {
      setSelectedCategories([])
    }

    if (urlSubcategory) {
      setSelectedSubcategories([urlSubcategory])
    } else {
      setSelectedSubcategories([])
    }
  }, [urlCategory, urlSubcategory])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [prodRes, catRes] = await Promise.all([
          fetch(`${API_BASE}/api/products`, { credentials: "include" }),
          fetch(`${API_BASE}/api/categories`)
        ])

        if (prodRes.ok) {
          const data = await prodRes.json()
          setProducts(data)
        }
        if (catRes.ok) {
          const data = await catRes.json()
          setCategories(data)
        }
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
      // Small delay to ensure the DOM has rendered the grouped sections
      const timer = setTimeout(() => {
        const element = document.getElementById(`section-${jumpTo.toLowerCase()}`);
        if (element) {
          const headerOffset = 150; // Reduced to bring title closer to navbar
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }, 200); // Reduced delay for faster response
      return () => clearTimeout(timer);
    }
  }, [jumpTo, loading, products])

  useEffect(() => {
    if (jumpTo) return
    window.scrollTo({ top: 0, behavior: "auto" })
  }, [urlCategory, urlSubcategory, urlSearch, jumpTo])

  const allSizes = useMemo(() => {
    const normalizeField = (str: any) => (str ?? "").toString().toLowerCase().trim()

    // Build sizes from the active browsing context so users only see relevant sizes.
    const scopedProducts = products.filter((p) => {
      const categoryMatch =
        (urlCategory ? normalizeField(p.category) === normalizeField(urlCategory) : true) &&
        (selectedCategories.length === 0 || selectedCategories.some((c) => normalizeField(c) === normalizeField(p.category)))

      const subcategoryMatch =
        (urlSubcategory ? normalizeField(p.subcategory) === normalizeField(urlSubcategory) : true) &&
        (selectedSubcategories.length === 0 || selectedSubcategories.some((s) => normalizeField(s) === normalizeField(p.subcategory)))

      const genderMatch =
        selectedGenders.length === 0 || selectedGenders.some((g) => normalizeField(g) === normalizeField(p.gender))

      const searchMatch = !urlSearch || (() => {
        const queryWords = normalizeField(urlSearch).split(/\s+/).filter(Boolean)
        const searchableText = normalizeField(`${p.name || ""} ${p.description || ""} ${p.category || ""}`)
        return queryWords.every((word: string) => searchableText.includes(word))
      })()

      return categoryMatch && subcategoryMatch && genderMatch && searchMatch
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
      } catch {
        // Ignore malformed size payloads from backend data.
      }
    })

    return Array.from(sizes).sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }))
  }, [products, urlCategory, urlSubcategory, urlSearch, selectedCategories, selectedSubcategories, selectedGenders])

  useEffect(() => {
    setSelectedSizes((prev) => prev.filter((size) => allSizes.includes(size)))
  }, [allSizes])

  const absoluteMaxPrice = useMemo(() => {
    if (products.length === 0) return 0
    return Math.max(...products.map(p => p.price))
  }, [products])

  const categoryMaxPrice = useMemo(() => {
    const categoryProducts = urlCategory
      ? products.filter(p => (p.category || "").toLowerCase() === urlCategory.toLowerCase())
      : products
    if (categoryProducts.length === 0) return absoluteMaxPrice
    return Math.max(...categoryProducts.map(p => p.price || 0))
  }, [products, urlCategory, absoluteMaxPrice])

  // Reset price limit when category changes
  useEffect(() => {
    setPriceRange([0, categoryMaxPrice])
    setSliderRange([0, categoryMaxPrice])
    setLocalMin("0")
    setLocalMax(categoryMaxPrice.toString())
  }, [categoryMaxPrice])

  const commitMinInput = () => {
    if (localMin.trim() === "") {
      setLocalMin(priceRange[0].toString())
      return
    }

    const parsed = Number(localMin)
    if (!Number.isFinite(parsed)) {
      setLocalMin(priceRange[0].toString())
      return
    }

    const nextMin = Math.max(0, Math.min(Math.floor(parsed), priceRange[1]))
    setPriceRange((prev) => [nextMin, prev[1]])
    setSliderRange((prev) => [nextMin, prev[1]])
    setLocalMin(nextMin.toString())
  }

  const commitMaxInput = () => {
    if (localMax.trim() === "") {
      setLocalMax(priceRange[1].toString())
      return
    }

    const parsed = Number(localMax)
    if (!Number.isFinite(parsed)) {
      setLocalMax(priceRange[1].toString())
      return
    }

    const nextMax = Math.max(priceRange[0], Math.min(Math.floor(parsed), categoryMaxPrice))
    setPriceRange((prev) => [prev[0], nextMax])
    setSliderRange((prev) => [prev[0], nextMax])
    setLocalMax(nextMax.toString())
  }

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const normalizeField = (str: any) => {
        if (str === null || str === undefined) return ""
        return str.toString().toLowerCase().trim()
      }

      const categoryMatch =
        selectedCategories.length === 0 ||
        selectedCategories.some(sc => {
          const normSc = normalizeField(sc)
          return normSc && normSc === normalizeField(product.category)
        })

      const subcategoryMatch =
        selectedSubcategories.length === 0 ||
        selectedSubcategories.some(ss => {
          const normSs = normalizeField(ss)
          return normSs && normSs === normalizeField(product.subcategory)
        })

      const productSizes = Array.isArray(product.sizes) ? product.sizes : (() => {
        try { return JSON.parse(product.sizes || "[]") } catch { return [] }
      })()

      const sizeMatch =
        selectedSizes.length === 0 ||
        productSizes.some((size: string) => selectedSizes.includes(size))

      const priceMatch = (product.price || 0) >= priceRange[0] && (product.price || 0) <= priceRange[1]

      const genderMatch =
        selectedGenders.length === 0 ||
        selectedGenders.some(sg => normalizeField(sg) === normalizeField(product.gender))

      const normalize = (str: string) => str.toLowerCase().trim()

      const searchMatch = !urlSearch || (() => {
        const queryWords = normalize(urlSearch).split(/\s+/).filter(Boolean)
        const searchableText = normalize(`${product.name || ""} ${product.description || ""} ${product.category || ""}`)
        return queryWords.every((word: string) => searchableText.includes(word))
      })()

      return categoryMatch && subcategoryMatch && sizeMatch && priceMatch && genderMatch && searchMatch
    })
  }, [products, selectedCategories, selectedSubcategories, selectedSizes, priceRange, selectedGenders, urlSearch])

  /* ================= FILTER UI ================= */
  const renderFilterContent = () => (
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
              <span className={`text-[11px] ${selectedGenders.includes(gender) ? "text-white font-medium" : "text-gray-400"} transition-colors uppercase tracking-widest`}>
                {gender}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Category - Only show on View All (no specific category in URL) */}
      {!urlCategory && (
        <div>
          <h3 className="text-white mb-6">Category</h3>
          <div className="space-y-4">
            {categories.map((cat) => (
              <label
                key={cat.id || cat.name}
                className="flex items-center gap-3 cursor-pointer"
              >
                <Checkbox
                  checked={selectedCategories.includes(cat.name)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedCategories([
                        ...selectedCategories,
                        cat.name,
                      ])
                    } else {
                      setSelectedCategories(
                        selectedCategories.filter((c) => c !== cat.name)
                      )
                    }
                  }}
                  className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
                />
                <span className={`text-[11px] ${selectedCategories.includes(cat.name) ? "text-white font-medium" : "text-gray-400"} transition-colors uppercase tracking-widest`}>
                  {cat.name}
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
                : "border-white/20 text-white"
                }`}
            >
              {size}
            </button>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div className="pt-10 border-t border-white/5">
        <div className="flex items-center justify-between mb-8">
          <h3 className="text-[10px] uppercase tracking-[0.4em] font-medium text-white">Price Range</h3>
          <span className="text-[10px] text-gray-500 font-mono tracking-widest">
            ₹{sliderRange[0].toLocaleString('en-IN')} — ₹{sliderRange[1].toLocaleString('en-IN')}
          </span>
        </div>

        <div className="space-y-8 px-1">
          <Slider
            value={sliderRange}
            min={0}
            max={categoryMaxPrice}
            step={1}
            onValueChange={(val) => {
              const next = val as [number, number]
              setSliderRange(next)
              setLocalMin(next[0].toString())
              setLocalMax(next[1].toString())
            }}
            onValueCommit={(val) => setPriceRange(val as [number, number])}
            className="py-4"
          />
do 
          <div className="flex items-center gap-4">
            <div className="flex-1 relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors text-[10px]">₹</span>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localMin}
                onChange={(e) => setLocalMin(e.target.value.replace(/\D/g, ""))}
                onBlur={commitMinInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    commitMinInput()
                  }
                }}
                className="h-9 pl-7 bg-white/5 border-white/10 text-white rounded-none border-0 border-b focus-visible:ring-0 focus-visible:border-white/30 transition-all text-xs font-mono"
                placeholder="0"
              />
              <span className="text-[8px] text-gray-600 uppercase tracking-tighter absolute -bottom-5 left-0">From</span>
            </div>

            <div className="text-gray-700 text-xs">—</div>

            <div className="flex-1 relative group">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors text-[10px]">₹</span>
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={localMax}
                onChange={(e) => setLocalMax(e.target.value.replace(/\D/g, ""))}
                onBlur={commitMaxInput}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    commitMaxInput()
                  }
                }}
                className="h-9 pl-7 bg-white/5 border-white/10 text-white rounded-none border-0 border-b focus-visible:ring-0 focus-visible:border-white/30 transition-all text-xs font-mono"
                placeholder={categoryMaxPrice.toString()}
              />
              <span className="text-[8px] text-gray-600 uppercase tracking-tighter absolute -bottom-5 left-0">To</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <>
      {/* ================= PAGE HEADER ================= */}
      {!loading && (
        <section className="pt-56 pb-12 text-center px-6 lg:hidden">
          <h1 className="text-4xl md:text-6xl font-serif font-light mb-4 uppercase tracking-[0.2em]">
            {urlSearch ? `Search: ${urlSearch}` : (urlCategory ? urlCategory.toString().toUpperCase() : "VIEW ALL")}
          </h1>
          <p className="text-gray-500 text-[10px] tracking-[0.3em] uppercase">
            {filteredProducts.length} pieces available
          </p>
        </section>
      )}

      {/* ================= CONTENT ================= */}
      <main className="px-6 md:px-12 pb-32 pt-0 lg:pt-52">
        {/* Desktop category heading — centered, full width */}
        {!loading && (
          <div className="hidden lg:block text-center mb-10">
            <h1 className="text-5xl font-serif font-light mb-3 uppercase tracking-[0.2em]">
              {urlSearch ? `Search: ${urlSearch}` : (urlCategory ? urlCategory.toString().toUpperCase() : "VIEW ALL")}
            </h1>
            <p className="text-gray-500 text-[10px] tracking-[0.3em] uppercase">
              {filteredProducts.length} pieces available
            </p>
          </div>
        )}

        <div className="flex gap-16 w-full">
          {/* Desktop Filters */}
          {!loading && (
              <aside className="hidden lg:block w-70 shrink-0">
              <div className="sticky top-52 pb-12">
                {renderFilterContent()}
              </div>
            </aside>
          )}

          {/* Products area */}
          <div className="flex-1">

            {loading ? (
              <div className="flex flex-col items-center justify-center py-32 gap-4">
                <Loader2 className="animate-spin text-gray-400" />
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Discovering pieces...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="w-full min-h-[70vh] flex flex-col items-center justify-center text-center animate-in fade-in duration-700">
                <h2 className="text-3xl font-serif text-gray-400">Product Not Available</h2>
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
                        {renderFilterContent()}
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Grid */}
                {(() => {
                  // If we have a subcategory in the URL OR no category OR search, show plain grid
                  if (!urlCategory || urlSearch || urlSubcategory) {
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                        {filteredProducts.map((product) => (
                          <ProductCard key={product.id || Math.random()} product={product} />
                        ))}
                      </div>
                    );
                  }

                  // Grouping Logic for Category Views
                  const subcategories = Array.from(
                    new Set(
                      filteredProducts.map(p => {
                        if (p.subcategory) return p.subcategory;

                        // Heuristics for products missing subcategory
                        const name = (p.name || "").toLowerCase();
                        const cat = (p.category || "").toLowerCase();

                        if (cat === "knitwear") {
                          if (name.includes("sweater") || name.includes("jumper")) return "Sweaters";
                          if (name.includes("cardigan")) return "Cardigans";
                        }
                        if (cat === "trousers") {
                          if (name.includes("tailored") || name.includes("wool")) return "Tailored";
                          if (name.includes("chino") || name.includes("linen") || name.includes("pants")) return "Casual";
                        }
                        if (cat === "accessories") {
                          if (name.includes("bag") || name.includes("tote")) return "Bags";
                          if (name.includes("scarf") || name.includes("muffler")) return "Scarf";
                        }
                        if (cat === "basics") {
                          if (name.includes("tee") || name.includes("t-shirt")) return "Tees";
                        }
                        if (cat === "shirts") {
                          if (name.includes("shirt")) return "Formal";
                        }

                        return null;
                      }).filter(Boolean)
                    )
                  ).sort((a: any, b: any) => {
                    const priority: Record<string, number> = {
                      "Bags": 1,
                      "Scarf": 2,
                      "Sweaters": 1,
                      "Cardigans": 2,
                      "Tailored": 1,
                      "Casual": 2,
                    };
                    return (priority[a] || 99) - (priority[b] || 99);
                  });

                  if (subcategories.length === 0) {
                    return (
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                        {filteredProducts.map((product) => (
                          <ProductCard key={product.id || Math.random()} product={product} />
                        ))}
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-20 w-full">
                      {subcategories.map((subName: any) => {
                        const sectionProducts = filteredProducts.filter(p => {
                          if (p.subcategory === subName) return true;

                          // Match heuristics if subcategory is missing
                          const name = (p.name || "").toLowerCase();
                          const cat = (p.category || "").toLowerCase();

                          if (subName === "Sweaters") return cat === "knitwear" && (name.includes("sweater") || name.includes("jumper"));
                          if (subName === "Cardigans") return cat === "knitwear" && name.includes("cardigan");
                          if (subName === "Tailored") return cat === "trousers" && (name.includes("tailored") || name.includes("wool"));
                          if (subName === "Casual") return cat === "trousers" && (name.includes("chino") || name.includes("linen") || name.includes("pants"));
                          if (subName === "Bags") return cat === "accessories" && (name.includes("bag") || name.includes("tote"));
                          if (subName === "Scarf") return cat === "accessories" && (name.includes("scarf") || name.includes("muffler"));
                          if (subName === "Tees") return cat === "basics" && (name.includes("tee") || name.includes("t-shirt"));
                          if (subName === "Formal") return cat === "shirts" && name.includes("shirt");

                          return false;
                        });

                        if (sectionProducts.length === 0) return null;

                        return (
                          <div key={subName} className="w-full pt-10 scroll-mt-40" id={`section-${subName.toLowerCase()}`}>
                            <div className="mb-8">
                              <h2 className="text-3xl font-serif font-light mb-6 uppercase tracking-[0.5em] text-white">
                                {subName}
                              </h2>
                              <div className="h-px w-full bg-white/20" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                              {sectionProducts.map((product) => (
                                <ProductCard key={product.id || Math.random()} product={product} />
                              ))}
                            </div>
                          </div>
                        );
                      })}

                      {/* Fallback for products in category that didn't match any subcategory */}
                      {(() => {
                        const unmatched = filteredProducts.filter(p => {
                          return !subcategories.some(subName => {
                            if (p.subcategory === subName) return true;
                            const name = (p.name || "").toLowerCase();
                            const cat = (p.category || "").toLowerCase();
                            if (subName === "Sweaters") return cat === "knitwear" && (name.includes("sweater") || name.includes("jumper"));
                            if (subName === "Cardigans") return cat === "knitwear" && name.includes("cardigan");
                            if (subName === "Tailored") return cat === "trousers" && (name.includes("tailored") || name.includes("wool"));
                            if (subName === "Casual") return cat === "trousers" && (name.includes("chino") || name.includes("linen") || name.includes("pants"));
                            if (subName === "Bags") return cat === "accessories" && (name.includes("bag") || name.includes("tote"));
                            if (subName === "Scarf") return cat === "accessories" && (name.includes("scarf") || name.includes("muffler"));
                            if (subName === "Tees") return cat === "basics" && (name.includes("tee") || name.includes("t-shirt"));
                            if (subName === "Formal") return cat === "shirts" && name.includes("shirt");
                            return false;
                          });
                        });

                        if (unmatched.length === 0) return null;

                        return (
                          <div className="w-full">
                            <div className="mb-12">
                              <h2 className="text-3xl font-serif font-light mb-6 uppercase tracking-[0.5em] text-white/50">
                                Other Pieces
                              </h2>
                              <div className="h-px w-full bg-white/10" />
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                              {unmatched.map((product) => (
                                <ProductCard key={product.id || Math.random()} product={product} />
                              ))}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  );
                })()}
              </>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

export default function ShopPage() {
  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen overflow-x-hidden">
      <Suspense fallback={
        <div className="bg-[#030303] min-h-screen flex items-center justify-center">
          <Loader2 className="animate-spin text-gray-400" />
        </div>
      }>
        <SiteHeader />
        <ShopContent />
      </Suspense>
      <SiteFooter />
    </div>
  )
}

