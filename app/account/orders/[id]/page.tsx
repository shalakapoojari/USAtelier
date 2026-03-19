"use client"

import { use, useEffect, useState } from "react"
import { notFound, useRouter } from "next/navigation"
import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AccountSidebar } from "@/components/account-sidebar"
import { getApiBase } from "@/lib/api-base"
import { useAuth } from "@/lib/auth-context"

const API_BASE = getApiBase()

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [order, setOrder] = useState<any>(null)
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
          const found = data.find((o: any) => String(o.id) === id || o.order_number === id)
          if (found) {
            setOrder(found)
          }
        }
      } catch (err) {
        console.error("Failed to fetch order:", err)
      } finally {
        setIsLoading(false)
      }
    }

    if (!isAuthLoading && user && !isAdmin) {
      fetchOrders()
    }
  }, [id, user, isAdmin, isAuthLoading])

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "delivered": return "border-green-400/50 text-green-400"
      case "shipped": return "border-white text-white"
      default: return "border-white/20 text-gray-400"
    }
  }

  if (isAdmin) return null

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      <div className="pt-28 md:pt-52">
        <AccountSidebar>
          <div className="p-5 md:p-10 max-w-4xl">
            <Link
              href="/account/orders"
              className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-8 inline-block"
            >
              ← Back to Orders
            </Link>

            {isLoading ? (
               <div className="py-24 text-center">
                 <p className="uppercase tracking-widest text-gray-500 text-xs animate-pulse">Loading order details...</p>
               </div>
            ) : !order ? (
               <div className="py-24 text-center">
                 <p className="uppercase tracking-widest text-gray-500 text-xs">Order not found.</p>
                 <Link href="/account/orders" className="text-white hover:underline mt-4 inline-block text-xs uppercase tracking-widest">Return to Orders</Link>
               </div>
            ) : (
            <>
            {/* Header */}
            <div className="flex flex-col gap-6 sm:flex-row sm:justify-between sm:items-start mb-10 pb-8 border-b border-white/10">
              <div>
                <p className="uppercase tracking-[0.4em] text-xs text-gray-500 mb-2">Account</p>
                <h1 className="font-serif text-3xl md:text-4xl font-light break-all">{order.order_number || order.id}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Placed on{" "}
                  {new Date(order.date || order.createdAt).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex flex-col items-start sm:items-end gap-3">
                <span className={`px-4 py-1.5 border uppercase tracking-widest text-xs ${getStatusStyle(order.status)}`}>
                  {order.status}
                </span>

                {/* Wefast/Borzo Tracking Button */}
                {order.borzo_tracking_url ? (
                  <a
                    href={order.borzo_tracking_url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex justify-center items-center px-4 py-2 border border-blue-500 bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all uppercase tracking-widest text-[10px]"
                  >
                    Track Live Delivery
                  </a>
                ) : order.status === "shipped" || order.status === "processing" ? (
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                    Awaiting Courier Link
                  </span>
                ) : null}
              </div>
            </div>

            {/* Items */}
            <div className="border border-white/10 p-4 sm:p-8 mb-8">
              <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-7">Items</h2>
              <div className="space-y-5">
                {order.items && order.items.map((item: any, index: number) => (
                  <div key={index} className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between pb-5 border-b border-white/10 last:border-0 last:pb-0">
                    <div>
                      <p className="uppercase tracking-widest text-sm">{item.product_name || item.productName}</p>
                      <p className="text-xs text-gray-500 mt-1.5">Size {item.size} · Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-6 mt-6 space-y-2.5 text-sm text-gray-400">
                <div className="flex justify-between text-white pt-3 border-t border-white/10">
                  <span>Total</span>
                  <span>₹{order.total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="border border-white/10 p-4 sm:p-8">
              <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-5">Shipping Address</h2>
              <div className="text-sm text-gray-400 leading-loose">
                <p>{order.shipping_address?.firstName} {order.shipping_address?.lastName}</p>
                <p>{order.shipping_address?.address}</p>
                <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zip}</p>
                <p>{order.shipping_address?.country}</p>
              </div>
            </div>
            </>
            )}
          </div>
        </AccountSidebar>
      </div >

      <SiteFooter />
    </div >
  )
}
