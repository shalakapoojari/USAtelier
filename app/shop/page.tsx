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

const API_BASE = "http://localhost:5000"

export default function ShopPage() {
  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
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

  const allSizes = useMemo(() => {
    const sizes = new Set<string>()
    const relevantProducts = urlCategory
      ? products.filter(p => (p.category || "").toLowerCase() === urlCategory.toLowerCase())
      : products

    relevantProducts.forEach((p) => {
      if (!p.sizes) return
      try {
        const parsed = typeof p.sizes === 'string' ? JSON.parse(p.sizes) : p.sizes
        if (Array.isArray(parsed)) parsed.forEach(s => sizes.add(s))
      } catch {
        // If not JSON, skip
      }
    })
    return Array.from(sizes).sort()
  }, [products, urlCategory])

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
                <span className={selectedCategories.includes(cat.name) ? "text-white transition-colors" : "transition-colors"}>
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
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen overflow-x-hidden">
      <Suspense fallback={<div>Loading...</div>}>
        <SiteHeader />
      </Suspense>

      {/* ================= PAGE HEADER ================= */}
      {!loading && filteredProducts.length > 0 && (
        <section className="pt-32 pb-16 text-center px-6">
          {urlCategory && (
            <h1 className="text-4xl md:text-6xl font-serif font-light mb-4 uppercase tracking-[0.2em]">
              {urlCategory.toString().toUpperCase()}
            </h1>
          )}
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
                {(() => {
                  if (!urlCategory || urlSearch) {
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
                          <div key={subName} className="w-full">
                            <div className="mb-12">
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

      <SiteFooter />
    </div>
  )
}
