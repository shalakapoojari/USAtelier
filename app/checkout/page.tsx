"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function CheckoutPage() {
  const { items, total, clearCart, isHydrated } = useCart()
  const { user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isHydrated && items.length === 0) {
      router.push("/cart")
    }
  }, [items, isHydrated, router])

  const shipping = 500
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

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkoutTermsAccepted, setCheckoutTermsAccepted] = useState(false)
  const [checkoutTermsError, setCheckoutTermsError] = useState("")
  const [qrData, setQrData] = useState<{ url: string; vpa: string; id: string } | null>(null)
  const [paymentMethod, setPaymentMethod] = useState<"standard" | "upi_qr">("standard")

  // Load Razorpay script
  useEffect(() => {
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.async = true
    document.body.appendChild(script)
    return () => {
      document.body.removeChild(script)
    }
  }, [])

  useEffect(() => {
    if (user) {
      const address = user.addresses && user.addresses.length > 0 ? user.addresses[0] : null;
      setFormData(prev => ({
        ...prev,
        email: user.email || prev.email,
        firstName: user.firstName || prev.firstName,
        lastName: user.lastName || prev.lastName,
        phone: user.phone || prev.phone,
        address: address ? (address.street || address.address || prev.address) : prev.address,
        city: address ? (address.city || prev.city) : prev.city,
        state: address ? (address.state || prev.state) : prev.state,
        zip: address ? (address.zip || prev.zip) : prev.zip,
      }))
    }
  }, [user])

  if (!isHydrated || items.length === 0) {
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    // Clear error when user types
    if (errors[e.target.name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[e.target.name]
        return newErrors
      })
    }
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    // Phone validation (10 digits)
    const phoneRegex = /^\d{10}$/
    if (!formData.phone) {
      newErrors.phone = "Phone number is required"
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = "Please enter a valid 10-digit phone number"
    }

    // ZIP validation (assuming 6 digits for India)
    const zipRegex = /^\d{6}$/
    if (!formData.zip) {
      newErrors.zip = "ZIP code is required"
    } else if (!zipRegex.test(formData.zip)) {
      newErrors.zip = "Please enter a valid 6-digit ZIP code"
    }

    // Required fields
    if (!formData.firstName) newErrors.firstName = "First name is required"
    if (!formData.lastName) newErrors.lastName = "Last name is required"
    if (!formData.address) newErrors.address = "Address is required"
    if (!formData.city) newErrors.city = "City is required"
    if (!formData.state) newErrors.state = "State is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      setStep("review")
    }
  }

  const handlePlaceOrder = async () => {
    if (!checkoutTermsAccepted) {
      setCheckoutTermsError("Please accept the Terms & Conditions before placing your order")
      return
    }

    setCheckoutTermsError("")
    setIsProcessing(true)
    try {
      // CASE 1: UPI QR Mode (Verify existing QR payment)
      if (paymentMethod === "upi_qr" && qrData) {
        const verifyRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000'}/api/payments/check-qr-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ qr_id: qrData.id }),
        })

        const verifyData = await verifyRes.json()
        if (verifyRes.ok && verifyData.success) {
          // Payment found! Finalize the order
          const finalizeRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000'}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              total: total,
              items: items.map((item) => ({
                id: item.id,
                name: item.name,
                size: item.size,
                quantity: item.quantity,
                price: item.price,
                image: item.image,
              })),
              shippingAddress: formData,
              termsAccepted: checkoutTermsAccepted,
              razorpay_payment_id: verifyData.payment_id,
              // For VA, we don't have order_id or signature in the same way
            }),
          })

          if (finalizeRes.ok) {
            const finalData = await finalizeRes.json()
            sessionStorage.setItem("lastOrder", JSON.stringify({
              orderId: finalData.orderId,
              items,
              subtotal: total,
              shipping,
              total: grandTotal,
              address: formData
            }))
            clearCart()
            router.push("/checkout/confirmation")
            return
          } else {
            throw new Error("Payment verified but order creation failed.")
          }
        } else {
          alert("Payment not detected yet. Please scan the QR and pay, then try verifying again.")
          setIsProcessing(false)
          return
        }
      }

      // CASE 2: Standard Flow (Open Popup)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000'}/api/payments/create-order`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: grandTotal }),
      })

      if (!res.ok) throw new Error("Could not create payment order")
      const rzpOrder = await res.json()

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
        amount: rzpOrder.amount,
        currency: rzpOrder.currency,
        name: "U.S ATELIER",
        description: "Order Payment",
        order_id: rzpOrder.id,
        handler: async function (response: any) {
          const finalizeRes = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000'}/api/orders`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              total: total,
              items: items.map((item) => ({
                id: item.id,
                name: item.name,
                size: item.size,
                quantity: item.quantity,
                price: item.price,
                image: item.image,
              })),
              shippingAddress: formData,
              termsAccepted: checkoutTermsAccepted,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature
            }),
          })

          if (finalizeRes.ok) {
            const finalData = await finalizeRes.json()
            sessionStorage.setItem("lastOrder", JSON.stringify({
              orderId: finalData.orderId,
              items,
              subtotal: total,
              shipping,
              total: grandTotal,
              address: formData
            }))
            clearCart()
            router.push("/checkout/confirmation")
          } else {
            alert("Payment verified but order creation failed. Please contact support.")
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone
        },
        theme: { color: "#030303" }
      };

      const rzp = new (window as any).Razorpay(options)
      rzp.open()
    } catch (err: any) {
      console.error(err)
      alert(`Something went wrong: ${err.message || 'Unknown error'}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleGenerateQR = async () => {
    setIsProcessing(true)
    setQrData(null)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE || process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:5000'}/api/payments/create-qr`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ amount: grandTotal }),
      })

      const data = await res.json()
      if (res.ok && data.success) {
        setQrData({ url: data.qr_url, vpa: data.vpa, id: data.qr_id })
        setPaymentMethod("upi_qr")
      } else {
        throw new Error(data.error || "Failed to generate QR")
      }
    } catch (err: any) {
      alert(`QR Error: ${err.message}`)
    } finally {
      setIsProcessing(false)
    }
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      <main className="pt-60 pb-32 px-6 md:px-12">
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

                <div className="space-y-4">
                  <Input
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`bg-transparent border-white/20 text-white placeholder:text-gray-600 ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && <p className="text-[10px] text-red-500 uppercase tracking-widest">{errors.email}</p>}
                </div>

                <div className="space-y-4">
                  <Input
                    name="phone"
                    placeholder="Mobile Number"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className={`bg-transparent border-white/20 text-white placeholder:text-gray-600 ${errors.phone ? 'border-red-500' : ''}`}
                  />
                  {errors.phone && <p className="text-[10px] text-red-500 uppercase tracking-widest">{errors.phone}</p>}
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <Input
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`bg-transparent border-white/20 text-white ${errors.firstName ? 'border-red-500' : ''}`}
                    />
                    {errors.firstName && <p className="text-[10px] text-red-500 uppercase tracking-widest">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-4">
                    <Input
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`bg-transparent border-white/20 text-white ${errors.lastName ? 'border-red-500' : ''}`}
                    />
                    {errors.lastName && <p className="text-[10px] text-red-500 uppercase tracking-widest">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-4">
                  <Input
                    name="address"
                    placeholder="Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`bg-transparent border-white/20 text-white ${errors.address ? 'border-red-500' : ''}`}
                  />
                  {errors.address && <p className="text-[10px] text-red-500 uppercase tracking-widest">{errors.address}</p>}
                </div>

                <div className="grid md:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <Input
                      name="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={`bg-transparent border-white/20 text-white ${errors.city ? 'border-red-500' : ''}`}
                    />
                    {errors.city && <p className="text-[10px] text-red-500 uppercase tracking-widest">{errors.city}</p>}
                  </div>
                  <div className="space-y-4">
                    <Input
                      name="state"
                      placeholder="State"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={`bg-transparent border-white/20 text-white ${errors.state ? 'border-red-500' : ''}`}
                    />
                    {errors.state && <p className="text-[10px] text-red-500 uppercase tracking-widest">{errors.state}</p>}
                  </div>
                  <div className="space-y-4">
                    <Input
                      name="zip"
                      placeholder="ZIP"
                      value={formData.zip}
                      onChange={handleInputChange}
                      className={`bg-transparent border-white/20 text-white ${errors.zip ? 'border-red-500' : ''}`}
                    />
                    {errors.zip && <p className="text-[10px] text-red-500 uppercase tracking-widest">{errors.zip}</p>}
                  </div>
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

                {/* PAYMENT METHOD SELECTION */}
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <button
                    onClick={() => setPaymentMethod("standard")}
                    className={`py-4 border text-[10px] uppercase tracking-widest transition-all ${paymentMethod === "standard" ? "border-white text-white bg-white/5" : "border-white/10 text-gray-500"}`}
                  >
                    Card / Netbanking
                  </button>
                  <button
                    onClick={handleGenerateQR}
                    className={`py-4 border text-[10px] uppercase tracking-widest transition-all ${paymentMethod === "upi_qr" ? "border-white text-white bg-white/5" : "border-white/10 text-gray-500"}`}
                  >
                    UPI QR Code
                  </button>
                </div>

                {qrData && paymentMethod === "upi_qr" && (
                  <div className="mb-8 p-8 border border-white/10 bg-white/5 text-center space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-gray-400">Scan to Pay</p>
                    <div className="mx-auto w-48 h-48 bg-white p-2 rounded-lg">
                      <img src={qrData.url} alt="Payment QR" className="w-full h-full" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-white tabular-nums">₹{grandTotal.toLocaleString("en-IN")}</p>
                      <p className="text-[10px] text-gray-500 uppercase tracking-widest">{qrData.vpa}</p>
                    </div>
                    <p className="text-[10px] text-gray-400 uppercase leading-relaxed max-w-[200px] mx-auto">
                      After scanning and paying in your app, click the button below to complete your order.
                    </p>
                  </div>
                )}

                <div className="border border-white/10 p-4">
                  <label className="flex items-start gap-3 text-xs text-gray-400 leading-relaxed">
                    <input
                      type="checkbox"
                      checked={checkoutTermsAccepted}
                      onChange={(e) => {
                        setCheckoutTermsAccepted(e.target.checked)
                        if (e.target.checked) setCheckoutTermsError("")
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-white/30 bg-transparent"
                    />
                    <span>
                      I agree to the <Link href="/terms&conditions" target="_blank" className="text-[#C8A45D] hover:text-white underline underline-offset-4">Terms & Conditions</Link> and authorize order placement.
                    </span>
                  </label>
                  {checkoutTermsError && (
                    <p className="mt-3 text-[10px] uppercase tracking-widest text-red-500">{checkoutTermsError}</p>
                  )}
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || !checkoutTermsAccepted}
                  className="w-full border border-white/40 bg-transparent uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all py-8"
                >
                  {isProcessing ? "Processing..." : paymentMethod === "upi_qr" ? "I have Paid · Verify" : `Pay ₹${grandTotal.toLocaleString("en-IN")}`}
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
