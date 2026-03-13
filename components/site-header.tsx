"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"
import { Heart, ShoppingBag, User, LogOut, Package, ChevronDown, LayoutDashboard, Search } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { getApiBase } from "@/lib/api-base"

const API_BASE = getApiBase()

export function SiteHeader() {
  const navRef = useRef<HTMLDivElement | null>(null)
  const { user, logout, isAdmin } = useAuth()
  // Read unseen counts directly from contexts — they live in providers
  // (mounted at layout level) so they never reset on navigation
  const { unseenCount: cartUnseen, clearUnseen: clearCartUnseen } = useCart()
  const { unseenCount: wishlistUnseen, clearUnseen: clearWishlistUnseen } = useWishlist()
  const router = useRouter()

  const [profileOpen, setProfileOpen] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [placeholder, setPlaceholder] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const [loopNum, setLoopNum] = useState(0)
  const [typingSpeed, setTypingSpeed] = useState(150)

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
    router.push("/")
  }

  const [dynamicCategories, setDynamicCategories] = useState<any[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`)
        if (res.ok) {
          const data = await res.json()
          setDynamicCategories(data)
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err)
      }
    }
    fetchCategories()
  }, [])

  return (
    <header className="fixed top-0 left-0 w-full z-100 bg-[#030303]">
      {/* ── ROW 1: BRAND | SEARCH | ICONS ── */}
      <div className="w-full px-3 md:px-8 py-3 md:py-4 flex items-center gap-3 md:gap-12 border-b border-white/5">
        <Link href="/" className="shrink-0 -ml-1">
          <div className="h-10 md:h-12 w-32 sm:w-40 md:w-56 overflow-hidden flex items-center justify-center">
            <img
              src="/logo/logo.png"
              alt="U.S ATELIER"
              className="h-10 md:h-12 w-auto object-contain object-center hover:opacity-80 transition-opacity scale-[3] sm:scale-[3.8] md:scale-[4.5] origin-center"
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
            className="relative flex items-center gap-2 px-1 h-9 text-gray-400 hover:text-white transition-colors group"
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
            className="relative flex items-center gap-2 px-1 h-9 text-gray-400 hover:text-white transition-colors group"
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
                className="text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors border border-white/10 px-4 py-2 hover:bg-white/5"
              >
                Login
              </Link>
            ) : (
              <div className="relative" ref={profileRef}>
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
        </div>
      </div>

      {/* ── ROW 2: COMBINED NAV & CATEGORIES ── */}
      <div className="w-full bg-[#030303]/80 backdrop-blur-md border-b border-white/5 py-3 md:py-4 px-3 md:px-8 relative">
        <div className="max-w-[1400px] mx-auto flex items-center gap-4 md:gap-8 text-[8px] sm:text-[9px] md:text-[10px] uppercase tracking-[0.25em] font-medium font-sans">
          <Link
            href="/view-all"
            className="text-white hover:text-gray-400 transition-colors shrink-0 whitespace-nowrap"
          >
            View All
          </Link>

          <span className="text-[#C8A45D] text-[20px] md:text-[28px] leading-none shrink-0" aria-hidden="true">|</span>

          <div className="flex-1 overflow-x-auto overflow-y-visible no-scrollbar">
            <div className="flex min-w-max items-center gap-5 md:gap-12 whitespace-nowrap pr-2">
              {dynamicCategories.map((cat) => (
                <div key={cat.id || cat.name} className="relative group">
                  <Link
                    href={`/view-all?category=${cat.name}`}
                    className="text-gray-400 hover:text-white transition-colors flex items-center gap-1.5 py-2 md:py-4 px-1"
                  >
                    {cat.name}
                    {cat.subcategories && cat.subcategories.length > 0 && (
                      <ChevronDown size={10} className="group-hover:rotate-180 transition-transform duration-300 opacity-50" />
                    )}
                  </Link>

                  {/* Subcategories Dropdown */}
                  {cat.subcategories && cat.subcategories.length > 0 && (
                    <div className="absolute left-0 top-full pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-110">
                      <div className="bg-[#0e0e0e] border border-white/10 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.8)] min-w-[200px] backdrop-blur-xl">
                        <div className="flex flex-col gap-3">
                          {cat.subcategories.map((sub: string) => (
                            <Link
                              key={sub}
                              href={`/view-all?category=${cat.name}&jumpTo=${sub}`}
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
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
