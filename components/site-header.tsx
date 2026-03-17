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
  const router = useRouter()

  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [activeDesktopCategory, setActiveDesktopCategory] = useState<string | null>(null)
  const profileRef = useRef<HTMLDivElement>(null)

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
    closeMobileMenu()
    handleCartClick()
  }

  const handleMobileFavouritesClick = () => {
    closeMobileMenu()
    handleFavouritesClick()
  }

  const closeMobileMenu = () => {
    setMobileMenuOpen(false)
    if (typeof window !== "undefined" && window.history.state?.mobileMenuOpen) {
      window.history.back()
    }
  }

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
    <header className={`fixed top-0 left-0 w-full z-100 ${isHomePage ? "bg-transparent md:bg-[#030303]" : "bg-[#030303]"}`}>
      {/* ── ROW 1: BRAND | SEARCH | ICONS ── */}
      <div className={`w-full px-3 md:px-8 py-3 md:py-4 flex items-center gap-3 md:gap-12 ${isHomePage ? "border-b border-transparent md:border-white/5" : "border-b border-white/5"}`}>
        <Link href="/" className="shrink-0 -ml-1">
          <div className="flex h-10 w-40 items-center justify-center overflow-hidden sm:w-48 md:h-12 md:w-72">
            <img
              src="/logo/us-atelier-wordmark.svg"
              alt="U.S ATELIER"
              className="h-full w-full object-contain object-center hover:opacity-80 transition-opacity"
            />
          </div>
        </Link>

        {/* Enlarged Search Box */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-5xl relative group items-center hidden md:flex mx-4">
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 px-10 py-2.5 text-[10px] tracking-widest rounded-lg focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all placeholder:text-gray-600 h-10"
          />

          <Search size={14} className="absolute left-3 text-gray-500 group-focus-within:text-white transition-colors" />
          <button type="submit" className="hidden">Search</button>
        </form>

        {/* Navigation Group - Even gaps */}
        <div className="flex items-center gap-3 sm:gap-4 md:gap-8 ml-auto">
          {/* Mobile login/profile */}
          <div className="md:hidden flex items-center">
            {!user ? (
              <Link
                href="/login"
                className="text-[10px] uppercase tracking-[0.2em] text-gray-300 hover:text-white transition-colors"
              >
                Login
              </Link>
            ) : (
              <Link
                href="/account"
                className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5 hover:border-white/50 transition-colors text-gray-300 hover:text-white"
                title="Profile"
              >
                <User size={14} strokeWidth={1.5} />
              </Link>
            )}
          </div>

          {/* About Link */}
          <Link
            href="/about"
            className="text-[10px] uppercase tracking-[0.25em] text-gray-400 hover:text-white transition-colors hidden lg:block"
          >
            About
          </Link>

          {/* Favourites icon */}
          <button
            onClick={handleFavouritesClick}
            className="relative hidden md:flex items-center gap-2 px-1 h-9 text-gray-400 hover:text-white transition-colors group"
            title="Favourites"
          >
            <Heart
              size={17}
              strokeWidth={1.5}
              className={wishlistUnseen > 0 ? "fill-red-400 text-red-400" : ""}
            />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium hidden xl:block">Favourites</span>
            {wishlistUnseen > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-pulse" />
            )}
          </button>

          {/* Cart icon */}
          <button
            onClick={handleCartClick}
            className="relative hidden md:flex items-center gap-2 px-1 h-9 text-gray-400 hover:text-white transition-colors group"
            title="Cart"
          >
            <ShoppingBag size={17} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium hidden xl:block">Cart</span>
            {cartUnseen > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-white rounded-full border border-black animate-pulse" />
            )}
          </button>

          {/* Help Link */}
          <Link
            href="/help"
            className="text-[10px] uppercase tracking-[0.25em] text-gray-400 hover:text-white transition-colors hidden lg:block"
          >
            Help
          </Link>

          {/* Profile / Login - Moved to the end */}
          <div className="flex items-center ml-2">
            {!user ? (
              <Link
                href="/login"
                className="text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors border border-white/10 px-4 py-2 hover:bg-white/5 hidden md:inline-flex"
              >
                Login
              </Link>
            ) : (
              <div className="relative hidden md:block" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center gap-1.5 text-gray-400 hover:text-white transition-colors"
                  title="Account"
                >
                  <div className="w-8 h-8 rounded-full border border-white/20 flex items-center justify-center bg-white/5 hover:border-white/50 transition-colors">
                    <User size={14} strokeWidth={1.5} />
                  </div>
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {/* Dropdown */}
                {profileOpen && (
                  <div className="absolute right-0 top-full mt-3 w-52 bg-[#0e0e0e] border border-white/10 shadow-2xl z-50">
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
                          className="flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-widest text-amber-400 hover:text-amber-300 hover:bg-amber-400/5 transition-colors border-b border-white/5"
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
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => (mobileMenuOpen ? closeMobileMenu() : setMobileMenuOpen(true))}
            className="md:hidden w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-gray-300 hover:text-white hover:border-white/50 transition-colors"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
          </button>
        </div>
      </div>

      {/* ── ROW 2: COMBINED NAV & CATEGORIES ── */}
      <div className="hidden md:block w-full bg-[#030303]/80 backdrop-blur-md border-b border-white/5 py-3 md:py-4 px-3 md:px-8 relative z-140">
        <div className="max-w-350 mx-auto flex items-center gap-4 md:gap-8 text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.25em] font-medium font-sans">
          <Link
            href="/view-all"
            className="text-white hover:text-gray-400 transition-colors shrink-0 whitespace-nowrap"
          >
            View All
          </Link>

          <span className="text-[#C8A45D] text-[20px] md:text-[28px] leading-none shrink-0" aria-hidden="true">|</span>

          <div className="flex-1 overflow-visible">
            <div className="flex items-center gap-5 md:gap-12 whitespace-nowrap pr-2 overflow-visible">
              {dynamicCategories.map((cat) => {
                const hasSubcategories = cat.subcategories.length > 0
                const isOpen = activeDesktopCategory === cat.name

                return (
                <div
                  key={cat.id || cat.name}
                  className="relative"
                  onMouseEnter={() => setActiveDesktopCategory(cat.name)}
                  onMouseLeave={() => setActiveDesktopCategory((current) => (current === cat.name ? null : current))}
                >
                  <Link
                    href={`/view-all?category=${encodeURIComponent(cat.name)}`}
                    onClick={(e) => {
                      if (!hasSubcategories) return
                      e.preventDefault()
                      setActiveDesktopCategory((current) => (current === cat.name ? null : cat.name))
                    }}
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 py-2 md:py-4 px-1"
                  >
                    {cat.name}
                    {hasSubcategories && (
                      <ChevronDown size={10} className={`transition-transform duration-300 opacity-50 ${isOpen ? "rotate-180" : ""}`} />
                    )}
                  </Link>

                  {/* Subcategories Dropdown */}
                  {hasSubcategories && (
                    <div className={`absolute left-0 top-full z-200 pt-0 transition-all duration-200 ${isOpen ? "visible opacity-100" : "invisible opacity-0 pointer-events-none"}`}>
                      <div className={`mt-0 bg-[#0e0e0e] border border-white/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] min-w-50 backdrop-blur-xl transition-transform duration-200 ${isOpen ? "translate-y-0" : "translate-y-2"}`}>
                        <div className="flex flex-col gap-3">
                          {cat.subcategories.map((sub: string) => (
                            <Link
                              key={sub}
                              href={`/view-all?category=${encodeURIComponent(cat.name)}&jumpTo=${encodeURIComponent(sub)}`}
                              className="text-gray-500 hover:text-white transition-all text-[11px] tracking-[0.25em] hover:translate-x-2 duration-300"
                            >
                              {sub}
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )})}
            </div>
          </div>
        </div>
      </div>

      {/* ── MOBILE DRAWER: ALL NAV CONTENT ── */}
      {mobileMenuOpen && (
        <div ref={mobileMenuOverlayRef} className="md:hidden fixed inset-0 bg-black/45 backdrop-blur-[1px] z-120" onClick={closeMobileMenu}>
          <div
            ref={mobileMenuRef}
            onClick={(e) => e.stopPropagation()}
            className="fixed right-0 top-0 h-dvh w-[86vw] max-w-110 bg-[#020202] border-l border-white/10 px-6 pt-10 pb-8 overflow-y-auto overscroll-y-contain touch-pan-y"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            <div className="mx-auto max-w-120 flex min-h-full flex-col">
              <div className="mobile-menu-item flex items-center justify-between text-[20px] sm:text-[22px] uppercase tracking-[0.12em] font-serif text-[#e6e6e2]">
                <span>Menu</span>
                <button onClick={closeMobileMenu} className="text-[#e6e6e2] hover:text-white transition-colors" aria-label="Close menu">
                  Close
                </button>
              </div>

              <div className="mt-16 flex flex-col gap-6">
                <Link href="/about" onClick={closeMobileMenu} className="mobile-menu-item font-serif text-[20px] sm:text-[22px] leading-none text-[#e8e8e3] hover:text-white transition-colors">
                  About
                </Link>
                <Link href="/help" onClick={closeMobileMenu} className="mobile-menu-item font-serif text-[20px] sm:text-[22px] leading-none text-[#e8e8e3] hover:text-white transition-colors">
                  Help
                </Link>
                <Link href="/view-all" onClick={closeMobileMenu} className="mobile-menu-item font-serif text-[20px] sm:text-[22px] leading-none text-[#e8e8e3] hover:text-white transition-colors">
                  View All
                </Link>
                <button onClick={handleMobileFavouritesClick} className="mobile-menu-item text-left font-serif text-[20px] sm:text-[22px] leading-none text-[#e8e8e3] hover:text-white transition-colors">
                  Favourites
                </button>
                <button onClick={handleMobileCartClick} className="mobile-menu-item text-left font-serif text-[20px] sm:text-[22px] leading-none text-[#e8e8e3] hover:text-white transition-colors">
                  Cart ({cartUnseen})
                </button>
              </div>

              <div className="mobile-menu-item mt-14 h-px bg-white/12" />

              <div className="mt-8 flex flex-col gap-5">
                {dynamicCategories.map((cat) => (
                  <div key={cat.id || cat.name} className="mobile-menu-item space-y-2">
                    <Link
                      href={`/view-all?category=${encodeURIComponent(cat.name)}`}
                      onClick={closeMobileMenu}
                      className="font-serif text-[17px] sm:text-[18px] leading-none text-[#d4d4cf] hover:text-white transition-colors"
                    >
                      {cat.name}
                    </Link>
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <div className="pl-3 border-l border-white/10 flex flex-col gap-2 text-[10px] uppercase tracking-[0.18em]">
                        {cat.subcategories.map((sub: string) => (
                          <Link
                            key={sub}
                            href={`/view-all?category=${encodeURIComponent(cat.name)}&jumpTo=${encodeURIComponent(sub)}`}
                            onClick={closeMobileMenu}
                            className="text-gray-500 hover:text-gray-300 transition-colors"
                          >
                            {sub}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="mobile-menu-item mt-8 flex flex-col gap-4 text-[18px] sm:text-[20px] font-serif text-[#e6e6e2]">
                {!user ? (
                  <Link href="/login" onClick={closeMobileMenu} className="hover:text-white transition-colors">
                    Login
                  </Link>
                ) : (
                  <>
                    <Link href="/account" onClick={closeMobileMenu} className="hover:text-white transition-colors">
                      My Account
                    </Link>
                    <Link href="/account/orders" onClick={closeMobileMenu} className="hover:text-white transition-colors">
                      Orders
                    </Link>
                    <button onClick={handleMobileFavouritesClick} className="text-left hover:text-white transition-colors">
                      Favourites
                    </button>
                    {isAdmin && (
                      <Link href="/admin" onClick={closeMobileMenu} className="text-amber-300 hover:text-amber-200 transition-colors">
                        Admin Panel
                      </Link>
                    )}
                    <button onClick={handleLogout} className="text-left text-[#bdbdb8] hover:text-white transition-colors">
                      Sign Out
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
