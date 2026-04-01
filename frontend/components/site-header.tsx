"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import gsap from "gsap"
import { Heart, ShoppingBag, User, LogOut, Package, ChevronDown, LayoutDashboard, Search, Menu, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { getApiBase } from "@/lib/api-base"
import { SearchOverlay } from "@/components/search-overlay"

const API_BASE = getApiBase()

type NavCategory = {
  id?: string | number
  name: string
  subcategories: string[]
}

function normalizeSubcategories(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean)
  }

  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>)
      .map((v) => String(v).trim())
      .filter(Boolean)
  }

  if (typeof value === "string") {
    const raw = value.trim()
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed)) {
        return parsed.map((v) => String(v).trim()).filter(Boolean)
      }
    } catch {
      return [raw]
    }
    return [raw]
  }

  return []
}

export function SiteHeader() {
  const navRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuOverlayRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()
  const { user, logout, isAdmin } = useAuth()
  // Read unseen counts directly from contexts — they live in providers
  // (mounted at layout level) so they never reset on navigation
  const { unseenCount: cartUnseen, clearUnseen: clearCartUnseen } = useCart()
  const { unseenCount: wishlistUnseen, clearUnseen: clearWishlistUnseen } = useWishlist()
  const hasMobileUnseen = cartUnseen > 0 || wishlistUnseen > 0
  const router = useRouter()

  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDesktopCategory, setActiveDesktopCategory] = useState<string | null>(null)
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)
  const collectionsRef = useRef<HTMLDivElement>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // Track scroll position for nav-scrolled effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 80)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [])

  // Close Collections flyout on outside click or Escape
  useEffect(() => {
    if (!collectionsOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCollectionsOpen(false)
    }
    const onOutside = (e: MouseEvent) => {
      if (collectionsRef.current && !collectionsRef.current.contains(e.target as Node)) {
        setCollectionsOpen(false)
      }
    }
    document.addEventListener("keydown", onKey)
    document.addEventListener("mousedown", onOutside)
    return () => {
      document.removeEventListener("keydown", onKey)
      document.removeEventListener("mousedown", onOutside)
    }
  }, [collectionsOpen])

  const [searchQuery, setSearchQuery] = useState("")
  const [placeholder, setPlaceholder] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [loopNum, setLoopNum] = useState(0)
  const [typingSpeed, setTypingSpeed] = useState(150)
  const isHomePage = pathname === "/"

  const phrases = [
    "Search for pieces...",
    "Search for Trousers...",
    "Search for Knitwear...",
    "Search for Basics...",
    "Search for Shirts...",
    "Search for Accessories..."
  ]

  useEffect(() => {
    const handleTyping = () => {
      const i = loopNum % phrases.length
      const fullText = phrases[i]

      setPlaceholder(
        isDeleting
          ? fullText.substring(0, placeholder.length - 1)
          : fullText.substring(0, placeholder.length + 1)
      )

      setTypingSpeed(isDeleting ? 50 : 150)

      if (!isDeleting && placeholder === fullText) {
        setTimeout(() => setIsDeleting(true), 2000)
      } else if (isDeleting && placeholder === "") {
        setIsDeleting(false)
        setLoopNum(loopNum + 1)
      }
    }

    const timer = setTimeout(handleTyping, typingSpeed)
    return () => clearTimeout(timer)
  }, [placeholder, isDeleting, loopNum, typingSpeed, phrases])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/view-all?search=${encodeURIComponent(searchQuery.trim())}`)
    }
  }

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  // GSAP entrance
  useEffect(() => {
    if (!navRef.current) return
    const ctx = gsap.context(() => {
      gsap.from(navRef.current, { y: -40, opacity: 0, duration: 1, ease: "power3.out" })
    })
    return () => ctx.revert()
  }, [])

  const handleCartClick = () => {
    if (!user) {
      router.push("/login")
      return
    }
    clearCartUnseen()
    router.push("/cart")
  }

  const handleFavouritesClick = () => {
    if (!user) {
      router.push("/login")
      return
    }
    clearWishlistUnseen()
    router.push("/favourites")
  }

  const handleLogout = () => {
    logout()
    setProfileOpen(false)
    setMobileMenuOpen(false)
    router.push("/")
  }

  const handleMobileCartClick = () => {
    closeMobileMenu(false)
    handleCartClick()
  }

  const handleMobileFavouritesClick = () => {
    closeMobileMenu(false)
    handleFavouritesClick()
  }

  const closeMobileMenu = (popHistory: boolean = true) => {
    setMobileMenuOpen(false)
    if (popHistory && typeof window !== "undefined" && window.history.state?.mobileMenuOpen) {
      window.history.back()
    }
  }

  const closeMobileMenuForNavigation = () => closeMobileMenu(false)

  const [dynamicCategories, setDynamicCategories] = useState<NavCategory[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          const normalized: NavCategory[] = Array.isArray(data)
            ? data
              .map((cat: any) => ({
                id: cat?.id,
                name: String(cat?.name || "").trim(),
                subcategories: normalizeSubcategories(cat?.subcategories),
              }))
              .filter((cat) => !!cat.name)
            : []
          setDynamicCategories(normalized)
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err)
      }
    }

    fetchCategories()

    const refreshOnFocus = () => fetchCategories()
    window.addEventListener("focus", refreshOnFocus)
    return () => window.removeEventListener("focus", refreshOnFocus)
  }, [pathname])

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : ""
    return () => {
      document.body.style.overflow = ""
    }
  }, [mobileMenuOpen])

  useEffect(() => {
    if (!mobileMenuOpen) return
    if (typeof window === "undefined") return
    if (window.history.state?.mobileMenuOpen) return

    window.history.pushState({ ...(window.history.state || {}), mobileMenuOpen: true }, "", window.location.href)
  }, [mobileMenuOpen])

  useEffect(() => {
    const handlePopState = () => {
      setMobileMenuOpen((open) => (open ? false : open))
    }

    window.addEventListener("popstate", handlePopState)
    return () => window.removeEventListener("popstate", handlePopState)
  }, [])

  useEffect(() => {
    if (!mobileMenuOpen || !mobileMenuRef.current) return

    const ctx = gsap.context(() => {
      if (mobileMenuOverlayRef.current) {
        gsap.fromTo(
          mobileMenuOverlayRef.current,
          { opacity: 0 },
          { opacity: 1, duration: 0.26, ease: "power2.out" },
        )
      }

      gsap.fromTo(
        mobileMenuRef.current,
        { x: 48, opacity: 0 },
        { x: 0, opacity: 1, duration: 0.42, ease: "power3.out" },
      )

      gsap.fromTo(
        ".mobile-menu-item",
        { y: 20, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.42,
          ease: "power3.out",
          stagger: 0.06,
          delay: 0.08,
        },
      )
    }, mobileMenuRef)

    return () => ctx.revert()
  }, [mobileMenuOpen])

  return (
    <>
      <header className={`fixed top-0 left-0 w-full z-[999] transition-all duration-500 
          ? "bg-black/60 backdrop-blur-md border-b"
          : isHomePage
            ? "bg-transparent"
            : "bg-[#030303]"
        }`}>

        {/* ── REFERENCE-STYLE SINGLE NAV ROW ── */}
        <div
          ref={navRef}
          className={`relative z-160 w-full flex items-center justify-between px-6 md:px-10 py-4 md:py-5 ${isHomePage ? "" : "border-b border-white/5"
            }`}
        >
          {/* LEFT: Brand wordmark — gradient-text treatment */}
          <Link href="/" className="shrink-0">
            <span
              className="gradient-text font-serif text-base md:text-lg tracking-[0.06em] hover:opacity-80 transition-opacity whitespace-nowrap"
              style={{ fontFamily: "'Playfair Display', 'Georgia', serif" }}
            >
              U.S ATELIER.
            </span>
          </Link>

          {/* CENTER: Desktop nav — inline category pills + Shop */}
          <nav className="hidden md:flex items-center gap-2 lg:gap-3 absolute left-1/2 -translate-x-1/2" style={{ maxWidth: "60vw", overflowX: "auto" }}>
            <Link
              href="/view-all"
              className={`pill-cat nav-link-underline ${pathname === "/view-all" && !new URLSearchParams(typeof window !== "undefined" ? window.location.search : "").get("category") ? "active" : ""
                }`}
            >
              All
            </Link>
            {dynamicCategories.map(cat => (
              <Link
                key={cat.id || cat.name}
                href={`/view-all?category=${encodeURIComponent(cat.name)}`}
                className="pill-cat"
              >
                {cat.name}
              </Link>
            ))}
          </nav>

          {/* RIGHT: Search + Wishlist + Cart + Login + Hamburger */}
          <div className="flex items-center gap-4 md:gap-6">
            {/* Search icon — visible on ALL screen sizes */}
            <button
              onClick={() => setSearchOverlayOpen(true)}
              className="flex items-center text-white/60 hover:text-white transition-colors"
              title="Search"
              aria-label="Open search"
            >
              <Search size={16} strokeWidth={1.5} />
            </button>

            {/* Search on non-homepage desktop (form) — removed; replaced by icon */}
            {!isHomePage && (
              <form onSubmit={handleSearchSubmit} className="hidden lg:flex items-center relative" style={{ display: 'none' }}>
                <input type="text" placeholder={placeholder} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-white/5 border border-white/10 px-8 py-2 text-[10px] tracking-widest rounded focus:outline-none focus:border-white/30 placeholder:text-gray-600 w-48" />
                <Search size={12} className="absolute left-2.5 text-gray-500" />
                <button type="submit" className="hidden">Search</button>
              </form>
            )}

            {/* Wishlist — desktop only */}
            <button
              onClick={handleFavouritesClick}
              className="relative hidden md:flex items-center text-white/60 hover:text-white transition-colors"
              title="Favourites"
            >
              <Heart size={16} strokeWidth={1.5} className={wishlistUnseen > 0 ? "fill-red-400 text-red-400" : ""} />
              {wishlistUnseen > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-black" />
              )}
            </button>

            {/* Cart */}
            <button
              onClick={handleCartClick}
              className="relative hidden md:flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/60 hover:text-white transition-colors"
              title="Cart"
            >
              <ShoppingBag size={16} strokeWidth={1.5} />
              {isMounted && (
                <span>Cart</span>
              )}
              {cartUnseen > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-black" />
              )}
            </button>

            {/* Login / Profile */}
            {!isMounted ? (
              <div className="w-12 h-4 opacity-0 hidden md:block" />
            ) : !user ? (
              <Link
                href="/login"
                className="hidden md:inline-flex text-[10px] uppercase tracking-[0.3em] text-white/60 hover:text-white transition-colors"
              >
                Login
              </Link>
            ) : (
              <div className="relative hidden md:block z-170" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-white/60 hover:text-white transition-colors"
                  title="Account"
                >
                  <div className="w-7 h-7 rounded-full border border-white/20 flex items-center justify-center bg-white/5 hover:border-white/50 transition-colors">
                    <User size={13} strokeWidth={1.5} />
                  </div>
                  <ChevronDown
                    size={11}
                    className={`transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-3 w-52 bg-[#0e0e0e] border border-white/10 shadow-2xl z-220">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-xs uppercase tracking-widest text-gray-400 truncate">
                        {user.email}
                      </p>
                    </div>
                    <div className="py-1">
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-widest text-[#d8d4cc] hover:text-white hover:bg-white/5 transition-colors border-b border-white/5"
                        >
                          <LayoutDashboard size={13} />
                          Admin Panel
                        </Link>
                      )}
                      <Link
                        href="/account"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-widest text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <User size={13} />
                        My Account
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-widest text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <Package size={13} />
                        Orders
                      </Link>
                    </div>
                    <div className="border-t border-white/10 py-1">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-3 text-xs uppercase tracking-widest text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                      >
                        <LogOut size={13} />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Hamburger — mobile only (pill nav serves desktop) */}
            <button
              onClick={() => (mobileMenuOpen ? closeMobileMenu() : setMobileMenuOpen(true))}
              className="md:hidden relative w-9 h-9 rounded-full border border-white/30 flex items-center justify-center text-white/60 hover:text-white hover:border-white/60 transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {hasMobileUnseen && (
                <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border border-black bg-red-500 animate-pulse" />
              )}
              {mobileMenuOpen ? <X size={14} /> : <Menu size={14} />}
            </button>

          </div>
        </div>


        {/* ── Mobile category pills row — all pages ── */}



        {/* ── MOBILE DRAWER: ALL NAV CONTENT ── */}
        {mobileMenuOpen && (
          <div ref={mobileMenuOverlayRef} className="md:hidden fixed inset-0 bg-black/45 backdrop-blur-[1px] z-300" onClick={() => closeMobileMenu()}>
            <div
              ref={mobileMenuRef}
              onClick={(e) => e.stopPropagation()}
              className="fixed right-0 top-0 h-dvh w-[86vw] max-w-110 bg-[#020202] border-l border-white/10 px-6 pt-10 pb-8 overflow-y-auto overscroll-y-contain touch-pan-y"
              style={{ WebkitOverflowScrolling: "touch" }}
            >
              <div className="mx-auto max-w-120 flex min-h-full flex-col">
                <div className="mobile-menu-item flex items-center justify-between text-[20px] sm:text-[22px] uppercase tracking-[0.12em] font-serif text-[#e6e6e2]">
                  <span>Menu</span>
                  <button onClick={() => closeMobileMenu()} className="text-[#e6e6e2] hover:text-white transition-colors" aria-label="Close menu">
                    Close
                  </button>
                </div>

                <div className="mt-16 flex flex-col gap-6">
                  <Link href="/about" onClick={closeMobileMenuForNavigation} className="mobile-menu-item font-serif text-[20px] sm:text-[22px] leading-none text-[#e8e8e3] hover:text-white transition-colors">
                    About
                  </Link>
                  <Link href="/help" onClick={closeMobileMenuForNavigation} className="mobile-menu-item font-serif text-[20px] sm:text-[22px] leading-none text-[#e8e8e3] hover:text-white transition-colors">
                    Help
                  </Link>
                  <Link href="/view-all" onClick={closeMobileMenuForNavigation} className="mobile-menu-item font-serif text-[20px] sm:text-[22px] leading-none text-[#e8e8e3] hover:text-white transition-colors">
                    View All
                  </Link>
                  <button onClick={handleMobileFavouritesClick} className="mobile-menu-item text-left font-serif text-[20px] sm:text-[22px] leading-none text-[#e8e8e3] hover:text-white transition-colors">
                    <span className="inline-flex items-center gap-2">
                      Favourites
                      {wishlistUnseen > 0 && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    </span>
                  </button>
                  <button onClick={handleMobileCartClick} className="mobile-menu-item text-left font-serif text-[20px] sm:text-[22px] leading-none text-[#e8e8e3] hover:text-white transition-colors">
                    <span className="inline-flex items-center gap-2">
                      Cart
                      {cartUnseen > 0 && <span className="h-2 w-2 rounded-full bg-red-500" />}
                    </span>
                  </button>
                </div>

                <div className="mobile-menu-item mt-14 h-px bg-white/12" />

                <div className="mobile-menu-item mt-8 flex flex-col gap-4 text-[18px] sm:text-[20px] font-serif text-[#e6e6e2]">
                  {!isMounted ? (
                    <div className="h-10" />
                  ) : !user ? (
                    <Link href="/login" onClick={closeMobileMenuForNavigation} className="hover:text-white transition-colors">
                      Login
                    </Link>
                  ) : (
                    <>
                      <Link href="/account" onClick={closeMobileMenuForNavigation} className="hover:text-white transition-colors">
                        My Account
                      </Link>
                      <Link href="/account/orders" onClick={closeMobileMenuForNavigation} className="hover:text-white transition-colors">
                        Orders
                      </Link>
                      <Link href="/account/profile" onClick={closeMobileMenuForNavigation} className="hover:text-white transition-colors">
                        Settings
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={closeMobileMenuForNavigation} className="text-amber-300 hover:text-amber-200 transition-colors">
                          Admin Panel
                        </Link>
                      )}
                      <button onClick={handleLogout} className="text-left text-[#bdbdb8] hover:text-white transition-colors">
                        Sign Out
                      </button>
                    </>
                  )}
                </div>

                <div className="mobile-menu-item mt-8 h-px bg-white/12" />

                <p className="mobile-menu-item mt-8 text-[10px] uppercase tracking-[0.35em] text-gray-500">Categories</p>
                <div className="mt-8 flex flex-col gap-5">
                  {dynamicCategories.map((cat) => (
                    <div key={cat.id || cat.name} className="mobile-menu-item">
                      <Link
                        href={`/view-all?category=${encodeURIComponent(cat.name)}`}
                        onClick={closeMobileMenuForNavigation}
                        className="font-serif text-[17px] sm:text-[18px] leading-none text-[#d4d4cf] hover:text-white transition-colors"
                      >
                        {cat.name}
                      </Link>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      {/* Full-screen search overlay */}
      <SearchOverlay
        isOpen={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
        categories={dynamicCategories}
      />
    </>
  )
}
