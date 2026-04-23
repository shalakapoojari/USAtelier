"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { X, Search } from "lucide-react"
import { getApiBase } from "@/lib/api-base"
import { resolveMediaUrl } from "@/lib/media-url"
import Image from "next/image"

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  categories?: { name: string; subcategories: string[] }[]
}

export function SearchOverlay({ isOpen, onClose, categories = [] }: SearchOverlayProps) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const router = useRouter()

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 80)
      document.body.style.overflow = "hidden"
    } else {
      document.body.style.overflow = ""
      setQuery("")
      setResults([])
    }
    return () => { document.body.style.overflow = "" }
  }, [isOpen])

  // Escape key to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose()
    }
    document.addEventListener("keydown", onKey)
    return () => document.removeEventListener("keydown", onKey)
  }, [onClose])

  // Live search — debounced 300ms
  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      setSearching(false)
      return
    }
    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const base = getApiBase()
        const res = await fetch(
          `${base}/api/products?search=${encodeURIComponent(query.trim())}`,
          { credentials: "include" }
        )
        if (res.ok) {
          const data = await res.json()
          const arr = Array.isArray(data) ? data : []
          setResults(arr.slice(0, 6))
        } else {
          setResults([])
        }
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      router.push(`/view-all?search=${encodeURIComponent(query.trim())}`)
      onClose()
    }
  }

  const handleProductClick = (product: any) => {
    router.push(`/product/${encodeURIComponent(product.name)}`)
    onClose()
  }

  const handleCategoryClick = (cat: string, sub?: string) => {
    if (sub) {
      router.push(`/view-all?category=${encodeURIComponent(cat)}&jumpTo=${encodeURIComponent(sub)}`)
    } else {
      router.push(`/view-all?category=${encodeURIComponent(cat)}`)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[9997] flex flex-col"
      style={{ background: "rgba(4,2,10,0.97)", backdropFilter: "blur(24px)" }}
      aria-modal="true"
      role="dialog"
    >


      {/* Close button */}
      <div className="flex justify-end px-6 md:px-12 pt-6 relative z-10">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-[10px] uppercase tracking-[0.35em] text-white/35 hover:text-white/70 transition-colors"
          aria-label="Close search"
        >
          <span>Close</span>
          <X size={13} />
        </button>
      </div>

      {/* Search input */}
      <div className="relative z-10 flex flex-col items-center px-6 md:px-20 mt-12 md:mt-20">
        <p className="text-[9px] uppercase tracking-[0.55em] text-white/20 mb-8">Search</p>

        <form onSubmit={handleSubmit} className="w-full max-w-3xl">
          <div
            className="relative flex items-center transition-all duration-300"
            style={{
              borderBottom: "1px solid rgba(255,255,255,0.3)",
            }}
            onFocusCapture={(e) => {
              const el = e.currentTarget as HTMLDivElement
              el.style.borderBottomColor = "rgba(255,255,255,0.7)"
              el.style.boxShadow = "0 4px 20px rgba(255,255,255,0.05)"
            }}
            onBlurCapture={(e) => {
              const el = e.currentTarget as HTMLDivElement
              el.style.borderBottomColor = "rgba(255,255,255,0.3)"
              el.style.boxShadow = "none"
            }}
          >
            <Search size={18} className="shrink-0 mr-4" style={{ color: "rgba(255,255,255,0.5)" }} />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search pieces, styles, categories..."
              className="flex-1 bg-transparent py-4 outline-none tracking-wide font-serif font-light"
              style={{
                fontSize: "clamp(20px, 4vw, 40px)",
                color: "#f0ecff",
                caretColor: "rgba(255,255,255,0.8)",
              }}
            />
            {searching && (
              <div
                className="shrink-0 ml-4 w-4 h-4 rounded-full border-2 animate-spin"
                style={{ borderColor: "rgba(255,255,255,0.2)", borderTopColor: "rgba(255,255,255,0.8)" }}
              />
            )}
          </div>
        </form>

        {/* Live results dropdown */}
        {results.length > 0 && (
          <div
            className="w-full max-w-3xl mt-4 overflow-hidden"
            style={{
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(8,4,18,0.96)",
            }}
          >
            {results.map((p, i) => {
              const images = typeof p.images === "string" ? (() => { try { return JSON.parse(p.images) } catch { return [p.images] } })() : p.images
              const imgUrl = resolveMediaUrl(images?.[0] || "/placeholder.jpg")
              return (
                <button
                  key={p.id || i}
                  onClick={() => handleProductClick(p)}
                  className="w-full flex items-center gap-4 px-5 py-3 text-left transition-all duration-150 group/result"
                  style={{
                    animation: `fadeSlideUp 0.3s ease both`,
                    animationDelay: `${i * 50}ms`,
                    borderLeft: "2px solid transparent",
                  }}
                  onMouseEnter={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderLeftColor = "rgba(255,255,255,0.6)"
                    ;(e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"
                  }}
                  onMouseLeave={(e) => {
                    ;(e.currentTarget as HTMLElement).style.borderLeftColor = "transparent"
                    ;(e.currentTarget as HTMLElement).style.background = "transparent"
                  }}
                >
                  {/* Thumbnail */}
                  <div className="relative shrink-0 rounded-sm overflow-hidden" style={{ width: 40, height: 56 }}>
                    <Image
                      src={imgUrl}
                      alt={p.name}
                      fill
                      className="object-cover opacity-80 group-hover/result:opacity-100 transition-opacity"
                    />
                  </div>
                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-white/80 truncate group-hover/result:text-white transition-colors">
                      {p.name}
                    </p>
                    <p className="text-[10px] text-white/30 mt-0.5 tracking-widest">
                      ₹{Number(p.price).toLocaleString("en-IN")}
                    </p>
                  </div>
                  {/* Arrow */}
                  <span className="text-[9px] uppercase tracking-widest opacity-0 group-hover/result:opacity-100 transition-opacity"
                    style={{ color: "rgba(255,255,255,0.8)" }}>
                    →
                  </span>
                </button>
              )
            })}
            {/* View all results */}
            <button
              onClick={handleSubmit as any}
              className="w-full px-5 py-3 text-[9px] uppercase tracking-[0.4em] text-left transition-colors"
              style={{
                color: "rgba(255,255,255,0.6)",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.9)")}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.6)")}
            >
              View all results for "{query}" →
            </button>
          </div>
        )}

        {/* No results state */}
        {!searching && query.trim() && results.length === 0 && (
          <p className="mt-8 text-[10px] uppercase tracking-[0.4em] text-white/20">
            No pieces found
          </p>
        )}

        {/* Category suggestions — shown when no query */}
        {!query && categories.length > 0 && (
          <div className="w-full max-w-3xl mt-12">
            <p className="text-[9px] uppercase tracking-[0.5em] mb-6" style={{ color: "rgba(255,255,255,0.4)" }}>
              Browse Collections
            </p>
            <div className="flex flex-wrap gap-2">
              {categories.map(cat => (
                <button
                  key={cat.name}
                  onClick={() => handleCategoryClick(cat.name)}
                  className="pill-cat"
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
