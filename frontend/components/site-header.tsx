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
        { x: -48, opacity: 0 },
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

  useEffect(() => {
    // Mechanical, snappy, deliberate entrance animation (no bouncy/smooth easing)
    const ctx = gsap.context(() => {
      gsap.fromTo(
        navRef.current,
        { y: -100, opacity: 1 },
        { y: 0, opacity: 1, duration: 0.3, ease: "power2.out", delay: 0.1 }
      )
    })
    return () => ctx.revert()
  }, [])

  const navLinkClass = "relative whitespace-nowrap text-[12px] font-light tracking-[0.1em] uppercase block text-gray-400 hover:text-white transition-colors py-1 px-2"

  return (
    <>
      <header className={`absolute top-0 left-0 w-full z-[999] bg-transparent text-white`} style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
        <div ref={navRef} className="w-full flex justify-between items-center px-6 md:px-10 py-5">

          {/* MOBILE LEFT: Hamburger */}
          <button
            onClick={() => (mobileMenuOpen ? closeMobileMenu() : setMobileMenuOpen(true))}
            className="md:hidden flex items-center justify-center transition-colors"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {hasMobileUnseen && (
              <span className="absolute left-4 top-4 h-2 w-2 bg-[#5C0A0A]" />
            )}
            {mobileMenuOpen ? <X size={20} strokeWidth={1.5} /> : <Menu size={20} strokeWidth={1.5} />}
          </button>

          {/* DESKTOP LEFT: Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            <Link href="/" className={navLinkClass}>HOME</Link>

            <div
              className="relative"
              onMouseEnter={() => setCategoriesDropdownOpen(true)}
              onMouseLeave={() => setCategoriesDropdownOpen(false)}
            >
              <Link href="/view-all" className={navLinkClass}>ALL CATEGORIES</Link>
              {categoriesDropdownOpen && (
                <div className="absolute left-0 top-[100%] w-max min-w-[320px] bg-black text-white border border-white/20 p-6 flex gap-12 z-[1000] cursor-default">
                  <div>
                    <h3 className="text-[12px] font-light tracking-[0.1em] uppercase border-b border-white/10 pb-2 mb-4 text-white">BY CATEGORY</h3>
                    <ul className="flex flex-col gap-3">
                      {dynamicCategories.map(cat => (
                        <li key={cat.id || cat.name}>
                          <Link href={`/view-all?category=${encodeURIComponent(cat.name)}`} onClick={() => setCategoriesDropdownOpen(false)} className="text-[12px] font-light uppercase text-gray-400 hover:text-white transition-colors block">
                            {cat.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3 className="text-[12px] font-light tracking-[0.1em] uppercase border-b border-white/10 pb-2 mb-4 text-white">BY GENDER</h3>
                    <ul className="flex flex-col gap-3">
                      <li>
                        <Link href="/view-all?gender=Men" onClick={() => setCategoriesDropdownOpen(false)} className="text-[12px] font-light uppercase text-gray-400 hover:text-white transition-colors block">
                          MEN
                        </Link>
                      </li>
                      <li>
                        <Link href="/view-all?gender=Women" onClick={() => setCategoriesDropdownOpen(false)} className="text-[12px] font-light uppercase text-gray-400 hover:text-white transition-colors block">
                          WOMEN
                        </Link>
                      </li>
                      <li>
                        <Link href="/view-all?gender=Unisex" onClick={() => setCategoriesDropdownOpen(false)} className="text-[12px] font-light uppercase text-gray-400 hover:text-white transition-colors block">
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

          {/* RIGHT: Search + User + Cart */}
          <div className="flex items-center gap-5 md:gap-8 ml-auto text-current">
            <button
              onClick={() => setSearchOverlayOpen(true)}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
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
                  <div className="absolute right-0 top-[100%] mt-3 w-52 bg-black text-white border border-white/20">
                    <div className="px-4 py-3 border-b border-white/10">
                      <p className="text-[12px] font-light uppercase tracking-[0.1em] truncate text-white" style={{ fontFamily: "Helvetica, Arial, sans-serif" }}>
                        {user.email}
                      </p>
                    </div>
                    <div className="py-0">
                      {isAdmin && (
                        <Link
                          href="/admin"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-3 px-4 py-3 text-[12px] font-light uppercase tracking-[0.1em] text-gray-400 hover:text-white transition-colors border-b border-white/10"
                        >
                          <LayoutDashboard size={14} strokeWidth={1.5} />
                          ADMIN PANEL
                        </Link>
                      )}
                      <Link
                        href="/account"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-[12px] font-light uppercase tracking-[0.1em] text-gray-400 hover:text-white transition-colors border-b border-white/10"
                      >
                        <User size={14} strokeWidth={1.5} />
                        MY ACCOUNT
                      </Link>
                      <Link
                        href="/account/orders"
                        onClick={() => setProfileOpen(false)}
                        className="flex items-center gap-3 px-4 py-3 text-[12px] font-light uppercase tracking-[0.1em] text-gray-400 hover:text-white transition-colors"
                      >
                        <Package size={14} strokeWidth={1.5} />
                        ORDERS
                      </Link>
                    </div>
                    <div className="border-t border-white/10 py-0">
                      <button
                        onClick={handleLogout}
                        className="flex w-full items-center gap-3 px-4 py-3 text-[12px] font-light uppercase tracking-[0.1em] transition-colors text-red-500 hover:text-white"
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
                <span className="absolute -top-1 -right-1 w-2 h-2 bg-[#5C0A0A]" />
              )}
            </button>
          </div>
        </div>

        {/* MOBILE DRAWER */}
        {mobileMenuOpen && (
          <div ref={mobileMenuOverlayRef} className="md:hidden fixed inset-0 bg-black/40 z-[1000]" onClick={() => closeMobileMenu()}>
            <div
              ref={mobileMenuRef}
              onClick={(e) => e.stopPropagation()}
              className="fixed left-0 top-0 h-dvh w-[80vw] max-w-[320px] bg-white border-r border-black px-6 pt-6 pb-8 overflow-y-auto"
              style={{ fontFamily: "Helvetica, Arial, sans-serif" }}
            >
              <div className="flex flex-col min-h-full text-black">
                <div className="mobile-menu-item flex items-center justify-between mb-12">
                  <button onClick={() => closeMobileMenu()} aria-label="Close menu" className="hover:bg-black hover:text-white transition-none p-1">
                    <X size={24} strokeWidth={1.5} />
                  </button>
                </div>

                <div className="flex flex-col gap-6">
                  <Link href="/" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] font-light tracking-[0.1em] uppercase text-gray-400 hover:text-white transition-colors w-max">
                    HOME
                  </Link>
                  <Link href="/view-all" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] font-light tracking-[0.1em] uppercase text-gray-400 hover:text-white transition-colors w-max">
                    ALL CATEGORIES
                  </Link>

                  <div className="pl-4 border-l border-black flex flex-col gap-4 mt-2 mb-2">
                    <p className="text-[12px] font-light uppercase tracking-[0.1em] text-black border-b border-black/10 pb-1">Shop by Category</p>
                    {dynamicCategories.map(cat => (
                      <Link key={cat.id || cat.name} href={`/view-all?category=${encodeURIComponent(cat.name)}`} onClick={closeMobileMenuForNavigation} className="text-[12px] font-light uppercase text-gray-400 hover:text-white transition-colors w-max">
                        {cat.name}
                      </Link>
                    ))}

                    <p className="text-[12px] font-light uppercase tracking-[0.1em] text-black mt-2 border-b border-black/10 pb-1">Shop by Gender</p>
                    <Link href="/view-all?gender=Men" onClick={closeMobileMenuForNavigation} className="text-[12px] font-light uppercase text-gray-400 hover:text-white transition-colors w-max">MEN</Link>
                    <Link href="/view-all?gender=Women" onClick={closeMobileMenuForNavigation} className="text-[12px] font-light uppercase text-gray-400 hover:text-white transition-colors w-max">WOMEN</Link>
                    <Link href="/view-all?gender=Unisex" onClick={closeMobileMenuForNavigation} className="text-[12px] font-light uppercase text-gray-400 hover:text-white transition-colors w-max">UNISEX</Link>
                  </div>

                  <Link href="/help" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] font-light tracking-[0.1em] uppercase text-gray-400 hover:text-white transition-colors w-max">
                    HELP
                  </Link>
                  <Link href="/about" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] font-light tracking-[0.1em] uppercase text-gray-400 hover:text-white transition-colors w-max">
                    ABOUT US
                  </Link>
                </div>

                <div className="mobile-menu-item mt-10 mb-10 h-px w-full bg-black" />

                <div className="flex flex-col gap-6">
                  {!isMounted ? null : !user ? (
                    <Link href="/login" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] font-light tracking-[0.1em] uppercase text-gray-400 hover:text-white transition-colors w-max">
                      LOGIN
                    </Link>
                  ) : (
                    <>
                      <Link href="/account" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] font-light tracking-[0.1em] uppercase text-gray-400 hover:text-white transition-colors w-max">
                        MY ACCOUNT
                      </Link>
                      <Link href="/account/orders" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] font-light tracking-[0.1em] uppercase text-gray-400 hover:text-white transition-colors w-max">
                        ORDERS
                      </Link>
                      {isAdmin && (
                        <Link href="/admin" onClick={closeMobileMenuForNavigation} className="mobile-menu-item text-[12px] font-light tracking-[0.1em] uppercase text-gray-400 hover:text-white transition-colors w-max">
                          ADMIN PANEL
                        </Link>
                      )}
                      <button onClick={handleLogout} className="mobile-menu-item text-left text-[12px] font-light tracking-[0.1em] uppercase text-red-500 hover:text-white transition-colors w-max">
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
