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
} from "lucide-react"

const navItems = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/analysis", "Analysis", BarChart3],
  ["/admin/orders", "Orders", ShoppingCart],
  ["/admin/products", "Products", Package],
  ["/admin/categories", "Categories", FolderOpen],
  ["/admin/homepage", "Homepage Design", Paintbrush],
  ["/admin/payments", "Payments", CreditCard],
  ["/admin/customers", "Customers", Users],
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
            <div className="mx-auto h-16 w-56 overflow-hidden flex items-center justify-center mb-6">
              <img
                src="/logo/logo.png"
                alt="U.S ATELIER"
                className="h-16 w-auto object-contain object-center scale-[4.5] origin-center"
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

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#030303] border-t border-white/10 z-50">
        <nav className="flex justify-around py-4 text-[10px] uppercase tracking-widest overflow-x-auto whitespace-nowrap px-4 scrollbar-hide">
          <Link href="/admin" className={pathname === "/admin" ? "text-white px-2" : "text-gray-500 px-2"}>Dashboard</Link>
          <Link href="/admin/analysis" className={pathname === "/admin/analysis" ? "text-white px-2" : "text-gray-500 px-2"}>Analysis</Link>
          <Link href="/admin/orders" className={pathname === "/admin/orders" ? "text-white px-2" : "text-gray-500 px-2"}>Orders</Link>
          <Link href="/admin/products" className={pathname === "/admin/products" ? "text-white px-2" : "text-gray-500 px-2"}>Products</Link>
          <Link href="/admin/payments" className={pathname === "/admin/payments" ? "text-white px-2" : "text-gray-500 px-2"}>Payments</Link>
          <Link href="/admin/customers" className={pathname === "/admin/customers" ? "text-white px-2" : "text-gray-500 px-2"}>Customers</Link>
        </nav>
      </div>

      {/* ── CONTENT ── */}
      <main className="flex-1 pb-24 lg:pb-0 lg:ml-72">
        {children}
      </main>
    </div>
  )
}
