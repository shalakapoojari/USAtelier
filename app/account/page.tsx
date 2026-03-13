"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AccountSidebar } from "@/components/account-sidebar"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { useState, useEffect } from "react"
import { Package, Heart, ShoppingBag } from "lucide-react"
import Link from "next/link"

export default function AccountPage() {
  const { user } = useAuth()
  const { items: cartItems } = useCart()
  const { count: wishlistCount } = useWishlist()
  const [userOrders, setUserOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showHelloGreeting, setShowHelloGreeting] = useState(false)

  useEffect(() => {
    if (!user?.id) return

    const greetingSeenKey = `account_greeting_seen_${user.id}`
    const alreadySeen = sessionStorage.getItem(greetingSeenKey)

    if (!alreadySeen) {
      setShowHelloGreeting(true)
      sessionStorage.setItem(greetingSeenKey, "1")
      return
    }

    setShowHelloGreeting(false)
  }, [user?.id])

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000'}/api/orders`, {
          credentials: "include"
        })
        if (res.ok) {
          const data = await res.json()
          setUserOrders(data.slice(0, 2)) // Show recent 2
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err)
      } finally {
        setIsLoading(false)
      }
    }
    fetchOrders()
  }, [])

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      <div className="pt-52">
        <AccountSidebar>
          <div className="p-10 max-w-3xl">

            {/* Page Title */}
            <div className="mb-10 pb-8 border-b border-white/10">
              <p className="uppercase tracking-[0.4em] text-xs text-gray-500 mb-2">Dashboard</p>
              <h1 className="font-serif text-4xl font-light">
                {showHelloGreeting ? "Hello" : "Welcome back"}
                {user?.firstName ? `, ${user.firstName}` : ""}
              </h1>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-6 mb-12">
              <div className="border border-white/10 p-6 text-center">
                <p className="font-serif text-3xl font-light mb-1">{userOrders.length}</p>
                <p className="text-xs uppercase tracking-widest text-gray-500">Orders</p>
              </div>
              <div className="border border-white/10 p-6 text-center">
                <p className="font-serif text-3xl font-light mb-1">{wishlistCount}</p>
                <p className="text-xs uppercase tracking-widest text-gray-500">Favourites</p>
              </div>
              <div className="border border-white/10 p-6 text-center">
                <p className="font-serif text-3xl font-light mb-1">{cartItems.length}</p>
                <p className="text-xs uppercase tracking-widest text-gray-500">In Cart</p>
              </div>
            </div>

            {/* Recent Orders */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <h2 className="uppercase tracking-widest text-xs text-gray-400 flex items-center gap-2">
                  <Package size={13} />
                  Recent Orders
                </h2>
                <Link href="/account/orders" className="text-[10px] uppercase tracking-widest text-gray-600 hover:text-white transition-colors">
                  View All →
                </Link>
              </div>

              {userOrders.length > 0 ? (
                <div className="space-y-4">
                  {userOrders.map((order) => (
                    <Link
                      key={order.id}
                      href={`/account/orders/${order.id}`}
                      className="flex items-center justify-between border border-white/10 px-6 py-4 hover:border-white/30 transition-colors group"
                    >
                      <div>
                        <p className="text-xs uppercase tracking-widest mb-1">{order.id}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.date).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <div className="flex items-center gap-6">
                        <p className="text-xs uppercase tracking-widest text-gray-400">{order.status}</p>
                        <p className="text-sm">₹{order.total.toLocaleString("en-IN")}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="border border-white/10 p-8 text-center">
                  <p className="text-xs text-gray-600 uppercase tracking-widest mb-4">No orders yet</p>
                  <Link href="/shop" className="text-xs uppercase tracking-widest text-gray-400 hover:text-white transition-colors">
                    Start Shopping →
                  </Link>
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div>
              <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-6 flex items-center gap-2">
                <ShoppingBag size={13} />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <Link
                  href="/shop"
                  className="border border-white/10 px-6 py-4 text-xs uppercase tracking-widest text-gray-400 hover:text-white hover:border-white/30 transition-all"
                >
                  Browse Collection →
                </Link>
                <Link
                  href="/favourites"
                  className="border border-white/10 px-6 py-4 text-xs uppercase tracking-widest text-gray-400 hover:text-white hover:border-white/30 transition-all flex items-center gap-2"
                >
                  <Heart size={12} />
                  My Favourites →
                </Link>
              </div>
            </div>
          </div>
        </AccountSidebar>
      </div>

      <SiteFooter />
    </div>
  )
}
