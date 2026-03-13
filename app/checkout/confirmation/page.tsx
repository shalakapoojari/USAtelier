"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle, Package, ArrowRight } from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

// Order data is passed via sessionStorage when the order is placed
// Falls back to a graceful empty state if navigated to directly

type ConfirmedItem = {
  id: string
  name: string
  size: string
  quantity: number
  price: number
  image: string
}

type ConfirmedOrder = {
  orderId: string
  items: ConfirmedItem[]
  subtotal: number
  shipping: number
  total: number
  address: {
    firstName: string
    lastName: string
    email: string
    address: string
    city: string
    state: string
    zip: string
  }
}

export default function ConfirmationPage() {
  const [order, setOrder] = useState<ConfirmedOrder | null>(null)
  const [show, setShow] = useState(false)

  useEffect(() => {
    // Try to retrieve saved order from sessionStorage
    const saved = sessionStorage.getItem("lastOrder")
    if (saved) {
      setOrder(JSON.parse(saved))
      sessionStorage.removeItem("lastOrder") // Clear after reading
    }
    // Animate in
    const t = setTimeout(() => setShow(true), 100)
    return () => clearTimeout(t)
  }, [])

  // Generate a random-looking order ID for demo purposes
  const orderId =
    order?.orderId ||
    `ORD-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      <main className="pt-52 pb-32 px-6 md:px-12 max-w-[900px] mx-auto">

        {/* ── SUCCESS HEADER ── */}
        <div
          className={`text-center mb-20 transition-all duration-700 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
          <div className="inline-flex items-center justify-center w-20 h-20 border border-white/20 rounded-full mb-8">
            <CheckCircle className="h-9 w-9 text-white/80" />
          </div>

          <p className="uppercase tracking-[0.5em] text-xs text-gray-400 mb-4">
            Thank You
          </p>
          <h1 className="font-serif text-5xl md:text-6xl font-light mb-6">
            Order Confirmed
          </h1>
          <p className="text-sm tracking-widest text-gray-500 max-w-md mx-auto leading-relaxed">
            Your order has been placed successfully. A confirmation email will
            be sent shortly with tracking information once dispatched.
          </p>

          {/* Order ID badge */}
          <div className="inline-block mt-8 px-6 py-3 border border-white/10 bg-white/[0.03]">
            <p className="text-xs uppercase tracking-widest text-gray-500">
              Order Reference
            </p>
            <p className="font-serif text-xl mt-1">{orderId}</p>
          </div>
        </div>

        {/* ── ORDER SUMMARY (shown only if we have real order data) ── */}
        {order && order.items.length > 0 && (
          <div
            className={`space-y-8 mb-16 transition-all duration-700 delay-200 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
              }`}
          >
            {/* Items */}
            <div className="border border-white/10 p-8 md:p-10">
              <div className="flex items-center gap-3 mb-8">
                <Package className="h-4 w-4 text-gray-500" />
                <h2 className="uppercase tracking-widest text-xs text-gray-400">
                  Your Items
                </h2>
              </div>

              <div className="space-y-6">
                {order.items.map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-6 pb-6 border-b border-white/10 last:border-0 last:pb-0"
                  >
                    {/* Image */}
                    <div
                      className="w-16 h-20 bg-[#111] shrink-0 bg-center bg-cover"
                      style={{ backgroundImage: `url(${item.image})` }}
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="uppercase tracking-widest text-xs mb-1 truncate">
                        {item.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        Size {item.size} · Qty {item.quantity}
                      </p>
                    </div>

                    {/* Price */}
                    <p className="text-sm shrink-0">
                      ₹{(item.price * item.quantity).toLocaleString("en-IN")}
                    </p>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-white/10 pt-6 mt-6 space-y-3 text-sm text-gray-400">
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

            {/* Shipping address */}
            <div className="border border-white/10 p-8 md:p-10">
              <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-6">
                Shipping To
              </h2>
              <div className="text-sm text-gray-400 leading-loose">
                <p>
                  {order.address.firstName} {order.address.lastName}
                </p>
                <p>{order.address.email}</p>
                <p>{order.address.address}</p>
                <p>
                  {order.address.city}, {order.address.state}{" "}
                  {order.address.zip}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── WHAT HAPPENS NEXT ── */}
        <div
          className={`border border-white/10 p-8 md:p-10 mb-16 transition-all duration-700 delay-300 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
          <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-8">
            What Happens Next
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-sm text-gray-400">
            <div>
              <p className="text-white uppercase tracking-widest text-xs mb-2">
                01 · Processing
              </p>
              <p className="leading-relaxed">
                Your order is being reviewed and prepared by our atelier team.
              </p>
            </div>
            <div>
              <p className="text-white uppercase tracking-widest text-xs mb-2">
                02 · Dispatched
              </p>
              <p className="leading-relaxed">
                Your pieces will be carefully packaged and shipped within 2–4
                business days.
              </p>
            </div>
            <div>
              <p className="text-white uppercase tracking-widest text-xs mb-2">
                03 · Delivered
              </p>
              <p className="leading-relaxed">
                Standard delivery takes 5–7 business days. Express options were
                available at checkout.
              </p>
            </div>
          </div>
        </div>

        {/* ── CTAs ── */}
        <div
          className={`flex flex-col sm:flex-row gap-4 transition-all duration-700 delay-500 ${show ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
        >
          <Link
            href="/view-all"
            className="flex-1 flex items-center justify-center gap-2 py-5 border border-white/40 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
          >
            Continue Shopping
            <ArrowRight size={14} />
          </Link>

          <Link
            href="/account/orders"
            className="flex-1 flex items-center justify-center gap-2 py-5 border border-white/20 uppercase tracking-widest text-xs text-gray-400 hover:text-white hover:border-white/40 transition-all"
          >
            View All Orders
            <ArrowRight size={14} />
          </Link>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
