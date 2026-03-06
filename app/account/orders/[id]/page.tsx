"use client"

import { use } from "react"
import { notFound } from "next/navigation"
import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AccountSidebar } from "@/components/account-sidebar"
import { orders } from "@/lib/data"

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const order = orders.find((o) => o.id === id)

  if (!order) notFound()

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "delivered": return "border-green-400/50 text-green-400"
      case "shipped": return "border-white text-white"
      default: return "border-white/20 text-gray-400"
    }
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      <div className="pt-[72px]">
        <AccountSidebar>
          <div className="p-10 max-w-3xl">
            {/* Breadcrumb */}
            <Link
              href="/account/orders"
              className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-8 inline-block"
            >
              ← Back to Orders
            </Link>

            {/* Header */}
            <div className="flex justify-between items-start mb-10 pb-8 border-b border-white/10">
              <div>
                <p className="uppercase tracking-[0.4em] text-xs text-gray-500 mb-2">Account</p>
                <h1 className="font-serif text-4xl font-light">{order.id}</h1>
                <p className="text-sm text-gray-500 mt-1">
                  Placed on{" "}
                  {new Date(order.date).toLocaleDateString("en-IN", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="flex flex-col items-end gap-3">
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
                ) : order.status === "shipped" ? (
                  <span className="text-[10px] text-gray-500 uppercase tracking-widest">
                    Awaiting Courier Link
                  </span>
                ) : null}
              </div>
            </div>

            {/* Items */}
            <div className="border border-white/10 p-8 mb-8">
              <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-7">Items</h2>
              <div className="space-y-5">
                {order.items.map((item, index) => (
                  <div key={index} className="flex justify-between pb-5 border-b border-white/10 last:border-0 last:pb-0">
                    <div>
                      <p className="uppercase tracking-widest text-sm">{item.productName}</p>
                      <p className="text-xs text-gray-500 mt-1.5">Size {item.size} · Qty {item.quantity}</p>
                    </div>
                    <p className="text-sm">₹{(item.price * item.quantity).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>

              <div className="border-t border-white/10 pt-6 mt-6 space-y-2.5 text-sm text-gray-400">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{order.subtotal.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>₹{order.shipping.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-white pt-3 border-t border-white/10">
                  <span>Total</span>
                  <span>₹{order.total.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>

            {/* Address */}
            <div className="border border-white/10 p-8">
              <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-5">Shipping Address</h2>
              <div className="text-sm text-gray-400 leading-loose">
                <p>{order.customerName}</p>
                <p>{order.shippingAddress.street}</p>
                <p>{order.shippingAddress.city}, {order.shippingAddress.state} {order.shippingAddress.zip}</p>
                <p>{order.shippingAddress.country}</p>
              </div>
            </div>
          </div>
        </AccountSidebar>
      </div >

      <SiteFooter />
    </div >
  )
}
