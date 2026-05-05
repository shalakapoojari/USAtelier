"use client"

import type React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FolderOpen,
  CreditCard,
  Users,
  ArrowLeft,
  Paintbrush,
  BarChart3,
  ShoppingBag,
} from "lucide-react"

const navItems = [
  ["/admin",                "Dashboard",      LayoutDashboard],
  ["/admin/analysis",       "Analysis",       BarChart3],
  ["/admin/orders",         "Orders",         ShoppingCart],
  ["/admin/products",       "Products",       Package],
  ["/admin/categories",     "Categories",     FolderOpen],
  ["/admin/homepage",       "Homepage Design",Paintbrush],
  ["/admin/payments",       "Payments",       CreditCard],
  ["/admin/customers",      "Customers",      Users],
  ["/admin/cart-analytics", "Cart Analytics", ShoppingBag],
] as const

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isAuthenticated, isAuthLoading } = useAuth()
  const [isAuthorizing, setIsAuthorizing] = useState(true)

  useEffect(() => {
    if (isAuthLoading) {
      return
    }

    if (!isAuthenticated || user?.role !== "admin") {
      router.replace("/login")
      return
    }

    setIsAuthorizing(false)
  }, [isAuthLoading, isAuthenticated, user, router])

  if (isAuthorizing) {
    return (
      <div className="bg-[#030303] min-h-screen flex items-center justify-center text-white font-light tracking-[0.2em] uppercase text-xs">
        Verifying Admin Access...
      </div>
    )
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen flex">
      {/* ── SIDEBAR (desktop) ── */}
      <aside className="hidden lg:flex w-72 flex-col border-r border-white/10 px-8 py-10 fixed top-0 left-0 h-full z-40 bg-[#030303]">
        {/* Brand */}
        <div className="mb-16">
          <Link href="/" className="block w-full">
            <div className="mx-auto mb-6 flex h-16 w-60 items-center justify-center overflow-hidden">
              <img
                src="/logo/us-atelier-wordmark.svg"
                alt="U.S ATELIER"
                className="h-full w-full object-contain object-center"
              />
            </div>
          </Link>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 text-center mt-3">Admin Panel</p>
        </div>

        {/* Nav links */}
        <nav className="flex-1 space-y-1">
          {navItems.map(([href, label, Icon]) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-widest rounded-sm transition-all ${isActive
                  ? "bg-[#e8e8e3] text-black"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            )
          })}
        </nav>

        {/* Back to store */}
        <div className="pt-8 border-t border-white/10">
          <Link
            href="/"
            className="flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Store
          </Link>
        </div>
      </aside>

      {/* ── MOBILE TOP BAR ── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-[#030303]/95 backdrop-blur px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <Link href="/admin" className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Admin Panel</p>
            <p className="text-sm font-serif text-white truncate">U.S ATELIER</p>
          </Link>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Store
          </Link>
        </div>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#030303] border-t border-white/10 z-50">
        <nav className="flex py-4 text-[10px] uppercase tracking-widest overflow-x-auto whitespace-nowrap px-4 gap-5 scrollbar-hide">
          {navItems.map(([href, label]) => (
            <Link key={href} href={href} className={pathname === href ? "text-white" : "text-gray-500"}>
              {label}
            </Link>
          ))}
        </nav>
      </div>

      {/* ── CONTENT ── */}
      <main className="flex-1 pt-16 pb-24 lg:pt-0 lg:pb-0 lg:ml-72">
        {children}
      </main>
    </div>
  )
}
