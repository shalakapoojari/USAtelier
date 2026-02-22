"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useCart } from "@/lib/cart-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CheckoutPage() {
  const { items, total, clearCart } = useCart()
  const router = useRouter()

  const shipping = 1245
  const grandTotal = total + shipping

  const [step, setStep] = useState<"shipping" | "review">("shipping")
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    city: "",
    state: "",
    zip: "",
    country: "India",
    phone: "",
  })

  if (items.length === 0) {
    router.push("/cart")
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    setStep("review")
  }

  const handlePlaceOrder = () => {
    // Save order snapshot to sessionStorage so confirmation page can display it
    const orderId = `ORD-${new Date().getFullYear()}${String(Date.now()).slice(-6)}`
    const orderSnapshot = {
      orderId,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        image: item.image,
      })),
      subtotal: total,
      shipping,
      total: grandTotal,
      address: formData,
    }
    sessionStorage.setItem("lastOrder", JSON.stringify(orderSnapshot))
    clearCart()
    router.push("/checkout/confirmation")
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      <main className="pt-48 pb-32 px-6 md:px-12">
        <h1 className="font-serif text-5xl font-light mb-16 text-center">
          Checkout
        </h1>

        <div className="grid lg:grid-cols-3 gap-20 max-w-[1400px] mx-auto">
          {/* ================= FORM ================= */}
          <div className="lg:col-span-2">
            {step === "shipping" ? (
              <form
                onSubmit={handleContinue}
                className="space-y-12 border border-white/10 p-10"
              >
                <h2 className="uppercase tracking-widest text-xs text-gray-400">
                  Shipping Information
                </h2>

                <Input
                  name="email"
                  placeholder="Email"
                  value={formData.email}
                  onChange={handleInputChange}
                  required
                  className="bg-transparent border-white/20 text-white placeholder:text-gray-600"
                />

                <Input
                  name="phone"
                  placeholder="Mobile Number"
                  value={formData.phone}
                  onChange={handleInputChange}
                  required
                  className="bg-transparent border-white/20 text-white placeholder:text-gray-600"
                />

                <div className="grid md:grid-cols-2 gap-6">
                  <Input
                    name="firstName"
                    placeholder="First Name"
                    value={formData.firstName}
                    onChange={handleInputChange}
                    required
                    className="bg-transparent border-white/20 text-white"
                  />
                  <Input
                    name="lastName"
                    placeholder="Last Name"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    required
                    className="bg-transparent border-white/20 text-white"
                  />
                </div>

                <Input
                  name="address"
                  placeholder="Address"
                  value={formData.address}
                  onChange={handleInputChange}
                  required
                  className="bg-transparent border-white/20 text-white"
                />

                <div className="grid md:grid-cols-3 gap-6">
                  <Input
                    name="city"
                    placeholder="City"
                    value={formData.city}
                    onChange={handleInputChange}
                    required
                    className="bg-transparent border-white/20 text-white"
                  />
                  <Input
                    name="state"
                    placeholder="State"
                    value={formData.state}
                    onChange={handleInputChange}
                    required
                    className="bg-transparent border-white/20 text-white"
                  />
                  <Input
                    name="zip"
                    placeholder="ZIP"
                    value={formData.zip}
                    onChange={handleInputChange}
                    required
                    className="bg-transparent border-white/20 text-white"
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full border border-white/40 bg-transparent uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
                >
                  Continue to Review
                </Button>
              </form>
            ) : (
              <div className="space-y-12">
                {/* SHIPPING REVIEW */}
                <div className="border border-white/10 p-8">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="uppercase tracking-widest text-xs text-gray-400">
                      Shipping Information
                    </h2>
                    <button
                      onClick={() => setStep("shipping")}
                      className="text-xs uppercase tracking-widest text-gray-500 hover:text-white"
                    >
                      Edit
                    </button>
                  </div>

                  <p className="text-sm text-gray-400 leading-relaxed">
                    {formData.firstName} {formData.lastName}
                    <br />
                    {formData.email}
                    <br />
                    {formData.address}
                    <br />
                    {formData.city}, {formData.state} {formData.zip}
                    <br />
                    Phone: {formData.phone}
                  </p>
                </div>

                {/* ITEMS */}
                <div className="border border-white/10 p-8">
                  <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-8">
                    Order Items
                  </h2>

                  <div className="space-y-6">
                    {items.map((item) => (
                      <div
                        key={`${item.id}-${item.size}`}
                        className="flex gap-6"
                      >
                        <div className="relative w-20 h-28">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="flex-1 text-sm text-gray-400">
                          <p className="uppercase tracking-widest text-white">
                            {item.name}
                          </p>
                          <p>Size: {item.size}</p>
                          <p>Qty: {item.quantity}</p>
                        </div>

                        <p className="text-sm">
                          ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  className="w-full border border-white/40 bg-transparent uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
                >
                  Place Order
                </Button>
              </div>
            )}
          </div>

          {/* ================= SUMMARY ================= */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 border border-white/10 p-8 space-y-6">
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
            </div>
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
