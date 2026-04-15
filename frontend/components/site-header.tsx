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

export function SiteHeader() {
  const navRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuRef = useRef<HTMLDivElement | null>(null)
  const mobileMenuOverlayRef = useRef<HTMLDivElement | null>(null)
  const pathname = usePathname()
  const router = useRouter()

  const { user, logout, isAdmin } = useAuth()
  const { unseenCount: cartUnseen, clearUnseen: clearCartUnseen } = useCart()
  const { unseenCount: wishlistUnseen, clearUnseen: clearWishlistUnseen } = useWishlist()
  const hasMobileUnseen = cartUnseen > 0

  const [profileOpen, setProfileOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false)
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const profileRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [])

  const handleCartClick = () => {
    clearCartUnseen()
    router.push("/cart")
  }

  const handleLogout = () => {
    logout()
    setProfileOpen(false)
    setMobileMenuOpen(false)
    router.push("/")
  }

  const closeMobileMenu = (popHistory: boolean = true) => {
    setMobileMenuOpen(false)
    if (popHistory && typeof window !== "undefined" && window.history.state?.mobileMenuOpen) {
      window.history.back()
    }
  }

  const closeMobileMenuForNavigation = () => closeMobileMenu(false)

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
        { opacity: 0 },
        { opacity: 1, duration: 0.6, ease: "power2.out" },
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

  const [dynamicCategories, setDynamicCategories] = useState<any[]>([])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setDynamicCategories(Array.isArray(data) ? data : [])
        }
      } catch (err) { }
    }
    fetchCategories()
  }, [pathname])


  const navLinkClass = "relative whitespace-nowrap text-[10px] font-light tracking-[0.15rem] uppercase block text-gray-400 hover:text-white transition-colors py-1 px-2"

  return (
    <>
      <header className={`absolute top-0 left-0 w-full z-[999] bg-transparent text-white`} style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
        <div ref={navRef} className="w-full flex justify-between items-center px-6 md:px-10 py-5">

          {/* MOBILE LEFT: Hamburger + Search */}
          <div className="md:hidden flex items-center gap-5">
            <button
              onClick={() => (mobileMenuOpen ? closeMobileMenu() : setMobileMenuOpen(true))}
              className="flex items-center justify-center transition-colors"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            >
              {hasMobileUnseen && (
                <span className="absolute left-4 top-4 h-2 w-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
              {mobileMenuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
            </button>
            <button
              onClick={() => setSearchOverlayOpen(true)}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
              title="Search"
              aria-label="Open search drawer"
            >
              <Search size={18} strokeWidth={1.5} />
            </button>
          </div>

          {/* DESKTOP LEFT: Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            <Link href="/" className={navLinkClass}>HOME</Link>

            <div
              className="relative"
              onMouseEnter={() => setCategoriesDropdownOpen(true)}
              onMouseLeave={() => setCategoriesDropdownOpen(false)}
            >
              <Link href="/view-all" className={navLinkClass}>ALL CATEGORIES</Link>
              {categoriesDropdownOpen && (
                <div className="absolute left-0 top-[100%] w-max min-w-[360px] bg-black text-white border border-white/10 p-10 flex gap-20 z-[1000] cursor-default shadow-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                  <div>
                    <h3 className="text-[10px] font-light tracking-[0.2rem] uppercase border-b border-white/10 pb-3 mb-6 text-white/50">BY CATEGORY</h3>
                    <ul className="flex flex-col gap-4">
                      {dynamicCategories.map(cat => (
                        <li key={cat.id || cat.name}>
                          <Link href={`/view-all?category=${encodeURIComponent(cat.name)}`} onClick={() => setCategoriesDropdownOpen(false)} className="text-[10px] font-light uppercase text-gray-400 hover:text-white transition-colors block tracking-widest leading-none">
                            {cat.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-[10px] font-light tracking-[0.2rem] uppercase border-b border-white/10 pb-3 mb-6 text-white/50">BY GENDER</h3>
                    <ul className="flex flex-col gap-4">
                      <li>
                        <Link href="/view-all?gender=Men" onClick={() => setCategoriesDropdownOpen(false)} className="text-[10px] font-light uppercase text-gray-400 hover:text-white transition-colors block tracking-widest leading-none">
                          MEN
                        </Link>
                      </li>
                      <li>
                        <Link href="/view-all?gender=Women" onClick={() => setCategoriesDropdownOpen(false)} className="text-[10px] font-light uppercase text-gray-400 hover:text-white transition-colors block tracking-widest leading-none">
                          WOMEN
                        </Link>
                      </li>
                      <li>
                        <Link href="/view-all?gender=Unisex" onClick={() => setCategoriesDropdownOpen(false)} className="text-[10px] font-light uppercase text-gray-400 hover:text-white transition-colors block tracking-widest leading-none">
                          UNISEX
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <Link href="/help" className={navLinkClass}>HELP</Link>
            <Link href="/about" className={navLinkClass}>ABOUT US</Link>
          </nav>

          {/* RIGHT: Search (desktop only) + User + Cart */}
          <div className="flex items-center gap-6 md:gap-10 ml-auto text-current">
            <button
              onClick={() => setSearchOverlayOpen(true)}
              className="hidden md:flex items-center text-gray-400 hover:text-white transition-colors"
              title="Search"
              aria-label="Open search"
            >
              <Search size={18} strokeWidth={1.5} />
            </button>

            {/* Login / Profile */}
            {!isMounted ? (
              <div className="w-4 h-4 opacity-0 hidden md:block" />
            ) : !user ? (
              <Link
                href="/login"
                className="flex items-center text-gray-400 hover:text-white transition-colors"
                title="Login"
              >
                <User size={18} strokeWidth={1.5} />
              </Link>
            ) : (
              <div className="relative z-[1000] hidden md:block" ref={profileRef}>
                <button
                  onClick={() => setProfileOpen((o) => !o)}
                  className="flex items-center text-gray-400 hover:text-white transition-colors"
                  title="Account"
                >
                  <User size={18} strokeWidth={1.5} />
                  <ChevronDown
                    size={12}
                    className={`ml-1 transition-transform duration-200 ${profileOpen ? "rotate-180" : ""}`}
                  />
                </button>

                {profileOpen && (
                  <div className="absolute right-0 top-[100%] mt-4 w-52 bg-black text-white border border-white/10 shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="px-5 py-4 border-b border-white/5 bg-white/5">
                      <p className="text-[10px] font-light uppercase tracking-[0.2rem] truncate text-white/70" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
                        {user.email}
                      </p>
                    </div>
                    <div className="py-2">
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-4 px-5 py-3 text-[10px] font-light uppercase tracking-[0.15em] text-gray-400 hover:text-white transition-colors border-b border-white/5"
                        >
                          <LayoutDashboard size={14} strokeWidth={1.5} />
                          ADMIN PANEL
                        </Link>
                      )}
                      <Link
                        href="/account"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-4 px-5 py-3 text-[10px] font-light uppercase tracking-[0.15em] text-gray-400 hover:text-white transition-colors border-b border-white/5"
                      >
                        <User size={14} strokeWidth={1.5} />
                        MY ACCOUNT
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-4 px-5 py-3 text-[11px] font-light uppercase tracking-[0.15em] text-gray-400 hover:text-white transition-colors"
                      >
                        <Package size={14} strokeWidth={1.5} />
                        ORDERS
                      </Link>
                    </div>
                    <div className="border-t border-white/5 py-2">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-4 px-5 py-3 text-[10px] font-light uppercase tracking-[0.15em] transition-colors text-red-400 hover:text-red-300"
                      >
                        <LogOut size={14} strokeWidth={1.5} />
                        SIGN OUT
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Cart */}
            <button
              onClick={handleCartClick}
              className="relative flex items-center text-gray-400 hover:text-white transition-colors"
              title="Cart"
              aria-label="Cart"
            >
              <ShoppingBag size={18} strokeWidth={1.5} />
              {cartUnseen > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]" />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div ref={mobileMenuOverlayRef} className="md:hidden fixed inset-0 z-[1000] bg-black/95 backdrop-blur-2xl" onClick={() => closeMobileMenu()}>
            <div
              ref={mobileMenuRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 flex flex-col items-center justify-center p-6 text-[#F0F0F0]"
            >
              <button 
                onClick={() => closeMobileMenu()} 
                aria-label="Close menu" 
                className="absolute top-8 right-6 p-2 text-white/70 hover:text-white transition-colors mobile-menu-item"
              >
                <X size={28} strokeWidth={1} />
              </button>

              <div className="flex flex-col items-center gap-6 w-full max-w-sm mt-10">
                <Link href="/" onClick={closeMobileMenuForNavigation} className="mobile-menu-item font-serif text-[clamp(2rem,8vw,3rem)] tracking-widest uppercase hover:text-white/70 transition-colors leading-none text-center">
                  HOME
                </Link>
                <Link href="/view-all" onClick={closeMobileMenuForNavigation} className="mobile-menu-item font-serif text-[clamp(2rem,8vw,3rem)] tracking-widest uppercase hover:text-white/70 transition-colors leading-none text-center">
                  SHOP ALL
                </Link>
                <Link href="/about" onClick={closeMobileMenuForNavigation} className="mobile-menu-item font-serif text-[clamp(2rem,8vw,3rem)] tracking-widest uppercase hover:text-white/70 transition-colors leading-none text-center">
                  ABOUT
                </Link>
                <Link href="/help" onClick={closeMobileMenuForNavigation} className="mobile-menu-item font-serif text-[clamp(2rem,8vw,3rem)] tracking-widest uppercase hover:text-white/70 transition-colors leading-none text-center">
                  HELP
                </Link>

                <div className="mobile-menu-item w-12 h-px bg-white/20 my-6" />

                <div className="mobile-menu-item flex gap-6 text-[11px] uppercase tracking-[0.2em] text-white/50">
                  <Link href="/view-all?gender=Men" onClick={closeMobileMenuForNavigation} className="hover:text-white transition-colors">MEN</Link>
                  <Link href="/view-all?gender=Women" onClick={closeMobileMenuForNavigation} className="hover:text-white transition-colors">WOMEN</Link>
                  <Link href="/view-all?gender=Unisex" onClick={closeMobileMenuForNavigation} className="hover:text-white transition-colors">UNISEX</Link>
                </div>

                <div className="mobile-menu-item w-12 h-px bg-white/20 my-6" />

                <div className="flex flex-col items-center gap-5 w-full">
                  {!isMounted ? null : !user ? (
                    <Link href="/login" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] uppercase tracking-[0.3em] font-light hover:text-white/70 transition-colors">
                      LOGIN
                    </Link>
                  ) : (
                    <>
                      <Link href="/account" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] uppercase tracking-[0.3em] font-light hover:text-white/70 transition-colors">
                        MY ACCOUNT
                      </Link>
                      <Link href="/account/orders" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] uppercase tracking-[0.3em] font-light hover:text-white/70 transition-colors">
                        ORDERS
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] uppercase tracking-[0.3em] font-light text-amber-500/80 hover:text-amber-500 transition-colors">
                          ADMIN PANEL
                        </Link>
                      )}
                      <button onClick={handleLogout} className="mobile-menu-item text-[12px] uppercase tracking-[0.3em] font-light text-white/40 hover:text-white/80 transition-colors mt-2">
                        SIGN OUT
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <SearchOverlay
        isOpen={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
        categories={dynamicCategories}
      />
    </>
  )
}
