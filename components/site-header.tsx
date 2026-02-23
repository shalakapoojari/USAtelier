"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"
import { Heart, ShoppingBag, User, LogOut, Package, ChevronDown, LayoutDashboard, Search } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"

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
      router.push(`/shop?search=${encodeURIComponent(searchQuery.trim())}`)
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

  const categories = ["Knitwear", "Trousers", "Basics", "Shirts", "Accessories"]

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-[#030303]">
      {/* ── ROW 1: BRAND | SEARCH | ICONS ── */}
      <div className="w-full px-8 py-4 flex items-center gap-8 md:gap-12 border-b border-white/5">
        <Link href="/" className="text-2xl font-serif tracking-widest font-bold shrink-0">
          U.S ATELIER.
        </Link>

        {/* Search Box - Growing to fill center */}
        <form onSubmit={handleSearchSubmit} className="flex-1 max-w-4xl relative group items-center hidden md:flex mx-4">
          <input
            type="text"
            placeholder={placeholder}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white/5 border border-white/10 px-10 py-2.5 text-[10px] tracking-widest uppercase rounded-sm focus:outline-none focus:border-white/30 focus:bg-white/10 transition-all placeholder:text-gray-600 h-10"
          />
          <Search size={14} className="absolute left-3 text-gray-500 group-focus-within:text-white transition-colors" />
          <button type="submit" className="hidden">Search</button>
        </form>

        <div className="flex items-center gap-3 ml-auto">
          {/* Help Link Moved Here */}
          <Link
            href="/help"
            className="text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors mr-2 hidden lg:block"
          >
            Help
          </Link>

          {/* Favourites icon */}
          <button
            onClick={handleFavouritesClick}
            className="relative flex items-center gap-2 px-3 h-9 text-gray-400 hover:text-white transition-colors group"
            title="Favourites"
          >
            <Heart
              size={18}
              strokeWidth={1.5}
              className={wishlistUnseen > 0 ? "fill-red-400 text-red-400" : ""}
            />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium hidden lg:block">Favourites</span>
            {wishlistUnseen > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-pulse" />
            )}
          </button>

          {/* Cart icon */}
          <button
            onClick={handleCartClick}
            className="relative flex items-center gap-2 px-3 h-9 text-gray-400 hover:text-white transition-colors group"
            title="Cart"
          >
            <ShoppingBag size={18} strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-[0.2em] font-medium hidden lg:block">Add to Cart</span>
            {cartUnseen > 0 && (
              <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-white rounded-full border border-black animate-pulse" />
            )}
          </button>

          {/* Profile / Login */}
          {!user ? (
            <Link
              href="/login"
              className="text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors ml-2"
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

      {/* ── ROW 2: COMBINED NAV & CATEGORIES ── */}
      <div className="w-full bg-[#030303]/80 backdrop-blur-md border-b border-white/5 py-4 px-8 overflow-x-auto no-scrollbar">
        <div className="max-w-[1400px] mx-auto flex items-center justify-center gap-8 md:gap-12 whitespace-nowrap text-[10px] uppercase tracking-[0.25em] font-medium font-sans">
          <Link
            href="/shop"
            className="text-white hover:text-gray-400 transition-colors"
          >
            View All
          </Link>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {categories.map((cat) => (
            <Link
              key={cat}
              href={`/shop?category=${cat}`}
              className="text-gray-400 hover:text-white transition-colors"
            >
              {cat}
            </Link>
          ))}
        </div>
      </div>
    </header>
  )
}
