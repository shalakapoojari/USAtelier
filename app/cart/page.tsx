"use client"

import { useEffect } from "react"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useCart } from "@/lib/cart-context"
import Image from "next/image"
import Link from "next/link"
import { Minus, Plus, X } from "lucide-react"

export default function CartPage() {
  const { items, removeItem, updateQuantity, total, clearUnseen } = useCart()

  // Clear the navbar badge as soon as the user lands here
  useEffect(() => { clearUnseen() }, [])

  const shipping = items.length > 0 ? 1245 : 0
  const grandTotal = total + shipping

  /* ================= EMPTY STATE ================= */
  if (items.length === 0) {
    return (
      <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
        <SiteHeader />

        <main className="pt-60 pb-32 flex items-center justify-center px-6">
          <div className="text-center max-w-md">
            <h1 className="font-serif text-4xl font-light mb-6">
              Your Cart Is Empty
            </h1>

            <p className="text-sm tracking-widest text-gray-500 mb-12">
              Begin assembling your wardrobe — each piece is crafted with
              intention.
            </p>

            <Link
              href="/shop"
              className="inline-block px-10 py-4 border border-white/40 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
            >
              Continue Shopping
            </Link>
          </div>
        </main>

        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      {/* ================= CART ================= */}
      <main className="pt-60 pb-32 px-6 md:px-12">
        <h1 className="font-serif text-5xl font-light mb-20 text-center">
          Shopping Cart
        </h1>

        <div className="grid lg:grid-cols-3 gap-20 max-w-[1400px] mx-auto">
          {/* ================= ITEMS ================= */}
          <div className="lg:col-span-2 space-y-12">
            {items.map((item) => (
              <div
                key={`${item.id}-${item.size}`}
                className="flex gap-8 pb-12 border-b border-white/10"
              >
                {/* Image */}
                <div className="relative w-28 h-40 shrink-0">
                  <Image
                    src={item.image}
                    alt={item.name}
                    fill
                    className="object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <Link href={`/product/${item.id}`}>
                      <h3 className="uppercase tracking-widest text-sm hover:text-gray-400 transition-colors">
                        {item.name}
                      </h3>
                    </Link>

                    <p className="text-xs tracking-widest text-gray-500 mt-2">
                      Size: {item.size}
                    </p>

                    <p className="text-sm mt-4">
                      ₹{item.price.toLocaleString('en-IN')}
                    </p>
                  </div>

                  {/* Controls */}
                  <div className="flex items-center gap-6 mt-6">
                    <div className="flex items-center border border-white/20">
                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.size,
                            item.quantity - 1
                          )
                        }
                        className="w-10 h-10 flex items-center justify-center hover:bg-white hover:text-black transition-all"
                      >
                        <Minus size={14} />
                      </button>

                      <span className="w-10 text-center text-xs">
                        {item.quantity}
                      </span>

                      <button
                        onClick={() =>
                          updateQuantity(
                            item.id,
                            item.size,
                            item.quantity + 1
                          )
                        }
                        className="w-10 h-10 flex items-center justify-center hover:bg-white hover:text-black transition-all"
                      >
                        <Plus size={14} />
                      </button>
                    </div>

                    <button
                      onClick={() => removeItem(item.id, item.size)}
                      className="text-gray-500 hover:text-white transition-colors ml-auto"
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* ================= SUMMARY ================= */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 border border-white/10 p-8 space-y-8">
              <h2 className="uppercase tracking-widest text-xs text-gray-400">
                Order Summary
              </h2>

              <div className="text-sm text-gray-400 space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>

                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span>₹{shipping.toLocaleString('en-IN')}</span>
                </div>

                <div className="border-t border-white/10 pt-4 flex justify-between text-white">
                  <span>Total</span>
                  <span>₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <Link
                href="/checkout"
                className="block w-full py-4 border border-white/40 uppercase tracking-widest text-xs text-center hover:bg-white hover:text-black transition-all"
              >
                Proceed to Checkout
              </Link>

              <Link
                href="/shop"
                className="block w-full py-4 border border-white/20 uppercase tracking-widest text-xs text-gray-500 text-center hover:text-white transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
