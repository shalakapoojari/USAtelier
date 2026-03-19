"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AccountSidebar } from "@/components/account-sidebar"
import { useEffect, useState } from "react"
import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { getApiBase } from "@/lib/api-base"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

const API_BASE = getApiBase()

export default function OrdersPage() {
  const [userOrders, setUserOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const { user, isAdmin, isAuthLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthLoading && isAdmin) {
      router.replace("/admin")
      return
    }
  }, [isAdmin, isAuthLoading, router])

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/orders`, {
          credentials: "include"
        })
        if (res.ok) {
          const data = await res.json()
          setUserOrders(data)
        }
      } catch (err) {
        console.error("Failed to fetch orders:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (!isAuthLoading && user && !isAdmin) {
      fetchOrders()
    }
  }, [user, isAdmin, isAuthLoading])

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "delivered": return "text-green-400"
      case "shipped": return "text-white"
      default: return "text-gray-500"
    }
  }

  if (isAdmin) return null // Handled by redirect

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      <div className="pt-28 md:pt-52">
        <AccountSidebar>
          <div className="p-5 md:p-10 max-w-4xl">
            {/* Header */}
            <div className="mb-10 pb-8 border-b border-white/10">
              <p className="uppercase tracking-[0.4em] text-xs text-gray-500 mb-2">Account</p>
              <h1 className="font-serif text-3xl md:text-4xl font-light">Order History</h1>
            </div>

            {isLoading ? (
              <div className="py-24 text-center">
                <p className="uppercase tracking-widest text-gray-500 mb-8 text-xs animate-pulse">Loading orders...</p>
              </div>
            ) : userOrders.length > 0 ? (
              <div className="space-y-6">
                {userOrders.map((order) => (
                  <Link
                    key={order.id}
                    href={`/account/orders/${order.id}`}
                    className="block border border-white/10 p-4 sm:p-7 group hover:border-white/30 transition-colors"
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-5">
                      <div>
                        <p className="uppercase tracking-widest text-xs mb-2">{order.order_number || order.id}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.date || order.createdAt).toLocaleDateString("en-IN", {
                            year: "numeric",
                            month: "long",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className={`uppercase tracking-widest text-xs ${getStatusStyle(order.status)}`}>
                          {order.status}
                        </p>
                        <ChevronRight className="h-4 w-4 text-gray-500 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>

                    <div className="border-t border-white/10 pt-5 space-y-2 text-sm text-gray-400">
                      {order.items && order.items.map((item: any, index: number) => (
                        <div key={index} className="flex items-start justify-between gap-4">
                          <span className="pr-2">{item.productName || item.product_name} · Size {item.size} × {item.quantity}</span>
                          <span>₹{(item.price * item.quantity).toLocaleString("en-IN")}</span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-white/10 pt-4 mt-4 flex justify-between text-sm">
                      <span className="uppercase tracking-widest text-xs text-gray-500">Total</span>
                      <span>₹{order.total.toLocaleString("en-IN")}</span>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="border border-white/10 py-24 text-center">
                <p className="uppercase tracking-widest text-gray-500 mb-8 text-xs">No orders placed yet</p>
                <Link
                  href="/shop"
                  className="inline-block px-10 py-4 border border-white/40 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
                >
                  Start Shopping
                </Link>
              </div>
            )}
          </div>
        </AccountSidebar>
      </div>

      <SiteFooter />
    </div>
  )
}
