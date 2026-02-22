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
} from "lucide-react"

const navItems = [
  ["/admin", "Dashboard", LayoutDashboard],
  ["/admin/orders", "Orders", ShoppingCart],
  ["/admin/products", "Products", Package],
  ["/admin/categories", "Categories", FolderOpen],
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
  const { user, isAuthenticated } = useAuth()
  const [isAuthorizing, setIsAuthorizing] = useState(true)

  useEffect(() => {
    // Wait for auth to initialize
    if (isAuthenticated !== undefined) {
      if (!isAuthenticated || user?.role !== "admin") {
        router.push("/login")
      } else {
        setIsAuthorizing(false)
      }
    }
  }, [isAuthenticated, user, router])

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
        <div className="mb-12">
          <p className="font-serif text-lg tracking-widest">U.S ATELIER</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mt-1">Admin</p>
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
                  ? "bg-white text-black"
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
        <nav className="flex justify-around py-4 text-[10px] uppercase tracking-widest">
          <Link href="/admin" className={pathname === "/admin" ? "text-white" : "text-gray-500"}>Dashboard</Link>
          <Link href="/admin/orders" className={pathname === "/admin/orders" ? "text-white" : "text-gray-500"}>Orders</Link>
          <Link href="/admin/products" className={pathname === "/admin/products" ? "text-white" : "text-gray-500"}>Products</Link>
          <Link href="/admin/payments" className={pathname === "/admin/payments" ? "text-white" : "text-gray-500"}>Payments</Link>
          <Link href="/admin/customers" className={pathname === "/admin/customers" ? "text-white" : "text-gray-500"}>Customers</Link>
        </nav>
      </div>

      {/* ── CONTENT ── */}
      <main className="flex-1 pb-24 lg:pb-0 lg:ml-72">
        {children}
      </main>
    </div>
  )
}
