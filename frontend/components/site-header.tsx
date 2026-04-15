"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { usePathname, useRouter } from "next/navigation"
import gsap from "gsap"
import { ShoppingBag, User, Search, X, Menu, ChevronDown } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { getApiBase } from "@/lib/api-base"
import { SearchOverlay } from "@/components/search-overlay"

const API_BASE = getApiBase()

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { unseenCount: cartUnseen } = useCart()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false)
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false)
  const [dynamicCategories, setDynamicCategories] = useState<any[]>([])
  const [isMounted, setIsMounted] = useState(false)

  // Fix for the 'isMounted' reference error
  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/categories`, { cache: "no-store" })
        if (res.ok) {
          const data = await res.json()
          setDynamicCategories(Array.isArray(data) ? data : [])
        }
      } catch (err) {
        setDynamicCategories([])
      }
    }
    fetchCategories()
  }, [])

  // Sync scroll lock and close menu on route change
  useEffect(() => {
    if (isMounted) {
      document.body.style.overflow = mobileMenuOpen ? "hidden" : ""
    }
    return () => { document.body.style.overflow = "" }
  }, [mobileMenuOpen, isMounted])

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [pathname])

  const navLinkClass = "relative text-[10px] font-medium tracking-[0.25em] uppercase block text-white/50 hover:text-white transition-all duration-300 py-1"

  if (!isMounted) return null

  return (
    <>
      <header className="absolute top-0 left-0 w-full z-[999] bg-transparent">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center px-6 md:px-12 py-8">

          {/* MOBILE LEFT: Hamburger Trigger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="text-white p-2 -ml-2 transition-transform active:scale-90"
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>
          </div>

          {/* DESKTOP LEFT: Navigation */}
          <nav className="hidden md:flex items-center gap-10">
            <Link href="/" className={navLinkClass}>HOME</Link>

            <div
              className="relative group"
              onMouseEnter={() => setCategoriesDropdownOpen(true)}
              onMouseLeave={() => setCategoriesDropdownOpen(false)}
            >
              <button className={`${navLinkClass} flex items-center gap-2 uppercase`}>
                Collections <ChevronDown size={10} className={`transition-transform duration-300 ${categoriesDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Refined Dropdown */}
              {categoriesDropdownOpen && (
                <div className="absolute left-0 top-full pt-4 w-64 animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="bg-black/95 backdrop-blur-xl border border-white/10 p-8 shadow-2xl rounded-sm">
                    <p className="text-[9px] tracking-[0.4em] text-white/30 uppercase mb-6 font-bold">Categories</p>
                    <ul className="space-y-4">
                      <li>
                        <Link href="/view-all" className="text-[11px] uppercase tracking-widest text-white/60 hover:text-white transition-colors block">
                          Shop All
                        </Link>
                      </li>
                      {dynamicCategories.map(cat => (
                        <li key={cat.id || cat.name}>
                          <Link
                            href={`/view-all?category=${encodeURIComponent(cat.name)}`}
                            className="text-[11px] uppercase tracking-widest text-white/60 hover:text-white transition-colors block italic font-serif"
                          >
                            {cat.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            <Link href="/about" className={navLinkClass}>ATELIER</Link>
          </nav>

          {/* CENTER: Logo - Hidden on Desktop, Visible on Mobile */}
          <div className="absolute left-1/2 -translate-x-1/2 md:hidden">
            <Link href="/">
              <span className="text-xl font-serif italic tracking-[0.25em] uppercase text-white">
                U.S Atelier
              </span>
            </Link>
          </div>

          {/* RIGHT: Actions */}
          <div className="flex items-center justify-end gap-6 md:gap-8">
            <button onClick={() => setSearchOverlayOpen(true)} className="text-white/50 hover:text-white transition-colors">
              <Search size={19} strokeWidth={1.5} />
            </button>

            <Link href={user ? "/account" : "/login"} className="text-white/50 hover:text-white transition-colors">
              <User size={20} strokeWidth={1.5} />
            </Link>

            <button onClick={() => router.push('/cart')} className="relative text-white/50 hover:text-white transition-colors">
              <ShoppingBag size={20} strokeWidth={1.5} />
              {cartUnseen > 0 && (
                <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_8px_white]" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE MENU OVERLAY */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[1001] bg-black/98 backdrop-blur-3xl md:hidden animate-in fade-in duration-300">
          <div className="flex flex-col h-full p-8">
            <div className="flex justify-between items-center mb-16">
              <span className="text-[10px] tracking-[0.5em] text-white/20 uppercase font-black">Menu</span>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white/50 p-2 hover:text-white transition-colors"
              >
                <X size={28} strokeWidth={1.5} />
              </button>
            </div>

            <nav className="flex flex-col gap-10">
              {[
                { label: 'Home', href: '/' },
                { label: 'Collection', href: '/view-all' },
                { label: 'Atelier', href: '/about' },
                { label: 'Help', href: '/help' }
              ].map((link, idx) => (
                <Link
                  key={idx}
                  href={link.href}
                  className="text-5xl font-serif italic text-white/90 hover:text-white transition-all active:pl-4"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-auto pb-10">
              <div className="h-px w-full bg-white/10 mb-8" />
              <a href="mailto:usatelier08@gmail.com" className="text-[12px] tracking-[0.2em] text-white/40 uppercase">
                usatelier08@gmail.com
              </a>
            </div>
          </div>
        </div>
      )}

      <SearchOverlay
        isOpen={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
        categories={dynamicCategories}
      />
    </>
  )
}