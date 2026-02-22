"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import gsap from "gsap"
import { Heart, ShoppingBag, User, LogOut, Package, ChevronDown, LayoutDashboard } from "lucide-react"
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
    clearCartUnseen()
    router.push("/cart")
  }

  const handleFavouritesClick = () => {
    clearWishlistUnseen()
    router.push("/favourites")
  }

  const handleLogout = () => {
    logout()
    setProfileOpen(false)
    router.push("/")
  }

  return (
    <nav
      ref={navRef}
      className="fixed top-0 left-0 w-full px-8 py-5 flex justify-between items-center z-50 bg-[#030303] border-b border-white/5"
    >
      {/* ── BRAND ── */}
      <Link href="/" className="text-2xl font-serif tracking-widest font-bold shrink-0">
        U.S ATELIER.
      </Link>

      {/* ── CENTER NAV ── */}
      <div className="hidden md:flex gap-12 text-xs uppercase tracking-[0.25em] font-medium">
        <Link href="/collections" className="hover:text-gray-400 transition-colors">Collections</Link>
        <Link href="/campaign" className="hover:text-gray-400 transition-colors">Campaign</Link>
        <Link href="/maison" className="hover:text-gray-400 transition-colors">Maison</Link>
        <Link href="/shop" className="hover:text-gray-400 transition-colors">Shop</Link>
      </div>

      {/* ── RIGHT ICONS ── */}
      <div className="flex items-center gap-5">

        {/* Favourites icon */}
        <button
          onClick={handleFavouritesClick}
          className="relative flex items-center justify-center w-9 h-9 text-gray-400 hover:text-white transition-colors"
          title="Favourites"
        >
          <Heart
            size={18}
            strokeWidth={1.5}
            className={wishlistUnseen > 0 ? "fill-red-400 text-red-400" : ""}
          />
          {wishlistUnseen > 0 && (
            <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border border-black animate-pulse" />
          )}
        </button>

        {/* Cart icon */}
        <button
          onClick={handleCartClick}
          className="relative flex items-center justify-center w-9 h-9 text-gray-400 hover:text-white transition-colors"
          title="Cart"
        >
          <ShoppingBag size={18} strokeWidth={1.5} />
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
    </nav>
  )
}
