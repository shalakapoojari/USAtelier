"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { Shield, Truck, CheckCircle, MapPin, CreditCard, Package, ChevronRight, AlertTriangle, WifiOff, Tag, X, Banknote } from "lucide-react"

import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { getApiBase, apiFetch } from "@/lib/api-base"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

const API_BASE = getApiBase()

type FormData = {
  email: string; firstName: string; lastName: string
  address: string; city: string; state: string
  zip: string; country: string; phone: string
}

declare global {
  interface Window {
    Razorpay: any
  }
}

export default function CheckoutPage() {
  const { items, total, clearCart, trackCheckout, isHydrated } = useCart()
  const { user, refreshUser } = useAuth()
  const router = useRouter()

  // Auth gate: removed to allow guest checkout
  // Account will be automatically created on successful order
  /*
  useEffect(() => {
    if (!isAuthLoading && !isAuthenticated) {
      router.push("/login?next=/checkout")
    }
  }, [isAuthenticated, isAuthLoading, router])
  */

  useEffect(() => {
    if (isHydrated && items.length === 0) {
      router.push("/cart")
    }
  }, [items, isHydrated, router])

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


  const [step, setStep] = useState<"shipping" | "review" | "payment">("shipping")

  // ─ sessionStorage key for form persistence across reloads
  const FORM_KEY = "checkout_form_draft"
  const PENDING_PAYMENT_KEY = "checkout_pending_payment"

  const [formData, setFormData] = useState(() => {
    // Restore from sessionStorage if available (survives F5 but not tab close)
    if (typeof window !== "undefined") {
      try {
        const saved = sessionStorage.getItem(FORM_KEY)
        if (saved) return JSON.parse(saved)
      } catch { /* ignore */ }
    }
    return {
      email: "", firstName: "", lastName: "",
      address: "", city: "", state: "",
      zip: "", country: "India", phone: "",
    }
  })

  // Persist form to sessionStorage on every change
  useEffect(() => {
    try { sessionStorage.setItem(FORM_KEY, JSON.stringify(formData)) } catch { /* ignore */ }
  }, [formData])

  const [isOnline, setIsOnline] = useState(true)
  const [showOfflineBanner, setShowOfflineBanner] = useState(false)

  useEffect(() => {
    const goOnline  = () => { setIsOnline(true);  setShowOfflineBanner(false) }
    const goOffline = () => { setIsOnline(false); setShowOfflineBanner(true) }
    window.addEventListener("online",  goOnline)
    window.addEventListener("offline", goOffline)
    // Set initial state
    setIsOnline(navigator.onLine)
    if (!navigator.onLine) setShowOfflineBanner(true)
    return () => {
      window.removeEventListener("online",  goOnline)
      window.removeEventListener("offline", goOffline)
    }
  }, [])

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isProcessing, setIsProcessing] = useState(false)
  const [checkoutTermsAccepted, setCheckoutTermsAccepted] = useState(false)
  const [checkoutTermsError, setCheckoutTermsError] = useState("")
  const [globalError, setGlobalError] = useState("")
  const [pincodeStatus, setPincodeStatus] = useState<"idle" | "checking" | "valid" | "invalid">("idle")
  const [pincodeMessage, setPincodeMessage] = useState("")
  const [shippingEstimate, setShippingEstimate] = useState<any>(null)
  const [couponCode, setCouponCode] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<any>(null)
  const [couponMessage, setCouponMessage] = useState("")
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false)
  const [availableCoupons, setAvailableCoupons] = useState<any[]>([])
  const [paymentMethod, setPaymentMethod] = useState<"razorpay" | "cod">("razorpay")

  const isMumbai = formData.zip.startsWith("400") || formData.zip.startsWith("401")
  const isOut = formData.zip.length === 6 && !isMumbai
  const discountAmount = appliedCoupon?.discount_amount ?? 0
  const discountedSubtotal = Math.max(0, total - discountAmount)
  const cgst = shippingEstimate?.cgst ?? (isMumbai ? discountedSubtotal * 0.025 : 0)
  const sgst = shippingEstimate?.sgst ?? (isMumbai ? discountedSubtotal * 0.025 : 0)
  const igst = shippingEstimate?.igst ?? (isOut ? discountedSubtotal * 0.05 : 0)
  const tax = shippingEstimate?.tax_total ?? (cgst + sgst + igst)

  const shipping = shippingEstimate?.shipping_cost ?? (discountedSubtotal >= 2000 ? 0 : 149)
  const codFee = paymentMethod === "cod" ? (discountedSubtotal < 2000 ? 150 : 0) : 0
  const grandTotal = discountedSubtotal + shipping + tax + codFee

  useEffect(() => {
    if (user) {
      const address = user.addresses && user.addresses.length > 0 ? user.addresses[0] : null;
      setFormData((prev: FormData) => ({
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

  const buildCheckoutPayload = (payment?: any) => ({
    email: formData.email,
    phone: formData.phone,
    total: grandTotal,
    paymentMethod,
    codFee,
    idempotencyKey: payment?.razorpay_order_id,
    items: items.map((item) => ({
      id: item.id,
      name: item.name,
      size: item.size,
      quantity: item.quantity,
      sellingPrice: item.sellingPrice,
      image: item.image,
    })),
    shippingAddress: {
      ...formData,
      street: formData.address,
    },
    termsAccepted: checkoutTermsAccepted,
    couponCode: appliedCoupon?.code || couponCode.trim().toUpperCase() || undefined,
    razorpay_order_id: payment?.razorpay_order_id,
    razorpay_payment_id: payment?.razorpay_payment_id,
    razorpay_signature: payment?.razorpay_signature,
  })

  const completeSuccessfulOrder = async (orderId: string, paymentId?: string) => {
    sessionStorage.setItem("lastOrder", JSON.stringify({
      orderId,
      items,
      subtotal: total,
      discount: discountAmount,
      couponCode: appliedCoupon?.code || "",
      shipping,
      tax,
      cgst,
      sgst,
      igst,
      total: grandTotal,
      address: formData,
      paymentId,
    }))
    try {
      sessionStorage.removeItem(FORM_KEY)
      localStorage.removeItem(PENDING_PAYMENT_KEY)
    } catch { /* ignore */ }
    trackCheckout()
    clearCart()
    await refreshUser()
    router.push(`/account/orders/${orderId}`)
  }

  useEffect(() => {
    if (!isHydrated) return
    let cancelled = false

    const recoverPendingPayment = async () => {
      let pending: any = null
      try {
        const raw = localStorage.getItem(PENDING_PAYMENT_KEY)
        if (!raw) return
        pending = JSON.parse(raw)
      } catch {
        return
      }

      if (!pending?.razorpay_order_id && !pending?.razorpay_payment_id) return
      setIsProcessing(true)
      setGlobalError("Checking your payment status...")

      try {
        const res = await apiFetch(API_BASE, "/api/payments/recover-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            razorpay_order_id: pending.razorpay_order_id,
            razorpay_payment_id: pending.razorpay_payment_id,
            checkoutPayload: pending.checkoutPayload,
          }),
        })
        const data = await res.json()
        if (cancelled) return

        if (res.ok && data.order_found && (data.orderId || data.order?.order_number)) {
          await completeSuccessfulOrder(data.orderId || data.order.order_number, pending.razorpay_payment_id || data.payment?.razorpay_payment_id)
          return
        }

        if (data.payment_captured === false) {
          setGlobalError("")
          setIsProcessing(false)
          return
        }

        setGlobalError(data.message || "We could not recover the pending payment yet. Please try again in a moment.")
      } catch (err: any) {
        if (!cancelled) setGlobalError(`Payment recovery check failed: ${err.message || "Unknown error"}`)
      } finally {
        if (!cancelled) setIsProcessing(false)
      }
    }

    recoverPendingPayment()
    return () => { cancelled = true }
  }, [isHydrated])

  if (!isHydrated || items.length === 0) {
    return null
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    if (errors[e.target.name]) {
      setErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[e.target.name]
        return newErrors
      })
    }
    // Reset pincode status when zip changes
    if (e.target.name === "zip") {
      setPincodeStatus("idle")
      setPincodeMessage("")
    }
  }

  const checkPincode = async (pincode: string) => {
    if (!pincode || pincode.length !== 6) return
    setPincodeStatus("checking")

    // Helper: fetch with timeout + retry
    const fetchWithRetry = async (url: string, body: object, retries = 2): Promise<Response> => {
      for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 6000) // 6s timeout
        try {
          const res = await apiFetch(API_BASE, url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
            signal: controller.signal,
          })
          clearTimeout(timer)
          return res
        } catch (err: any) {
          clearTimeout(timer)
          if (attempt === retries) throw err
          await new Promise(r => setTimeout(r, 500 * (attempt + 1))) // backoff
        }
      }
      throw new Error("Max retries exceeded")
    }

    try {
      const [checkRes, estimateRes, lookupRes] = await Promise.allSettled([
        fetchWithRetry("/api/delivery/check-pincode", { pincode }),
        fetchWithRetry("/api/delivery/estimate", { pincode, subtotal: discountedSubtotal }),
        fetchWithRetry("/api/delivery/pincode-lookup", { pincode }),
      ])

      // Serviceability
      if (checkRes.status === "fulfilled" && checkRes.value.ok) {
        const checkData = await checkRes.value.json()
        if (checkData.serviceable) {
          setPincodeStatus("valid")
          setPincodeMessage(checkData.message || "Delivery available")
        } else {
          setPincodeStatus("invalid")
          setPincodeMessage(checkData.message || "Delivery not available to this pincode")
        }
      } else {
        // Fail open — don't block the user if the API is unreachable
        setPincodeStatus("valid")
        setPincodeMessage("Delivery will be attempted to this pincode")
      }

      // Shipping estimate
      if (estimateRes.status === "fulfilled" && estimateRes.value.ok) {
        const estimateData = await estimateRes.value.json()
        if (estimateData.success) setShippingEstimate(estimateData)
      }

      // City/state autofill
      if (lookupRes.status === "fulfilled" && lookupRes.value.ok) {
        const lookupData = await lookupRes.value.json()
        if (lookupData.success && lookupData.city) {
          setFormData((prev: FormData) => ({
            ...prev,
            city: lookupData.city || prev.city,
            state: lookupData.state || prev.state,
          }))
        }
      }
    } catch {
      // Complete fail-open: network unreachable, let the backend validate
      setPincodeStatus("valid")
      setPincodeMessage("Delivery will be attempted to this pincode")
    }
  }

  // Load visible/auto-apply coupons when entering review step
  const loadAvailableCoupons = async () => {
    if (items.length === 0) return
    try {
      const res = await apiFetch(API_BASE, "/api/coupons/auto-apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map(i => ({ id: i.id, quantity: i.quantity, sellingPrice: i.sellingPrice })),
          subtotal: total,
        }),
      })
      if (res.ok) {
        const data = await res.json()
        setAvailableCoupons(Array.isArray(data) ? data : [])
      }
    } catch { /* silent — coupons are a nice-to-have */ }
  }

  const applyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride || couponCode).trim().toUpperCase()
    if (!code) {
      setCouponMessage("Enter a coupon code")
      return
    }
    setCouponCode(code)
    setIsApplyingCoupon(true)
    setCouponMessage("")
    try {
      const res = await apiFetch(API_BASE, "/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, subtotal: total, items: items.map(i => ({ id: i.id, quantity: i.quantity, sellingPrice: i.sellingPrice })) }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Coupon could not be applied")
      setAppliedCoupon({ ...data, code })
      setShippingEstimate(null)
      setCouponMessage(`Coupon applied. You saved ₹${Number(data.discount_amount || 0).toLocaleString("en-IN")}.`)
    } catch (err: any) {
      setAppliedCoupon(null)
      setCouponMessage(err.message || "Coupon could not be applied")
    } finally {
      setIsApplyingCoupon(false)
    }
  }

  const removeCoupon = () => {
    setAppliedCoupon(null)
    setCouponCode("")
    setCouponMessage("")
    setShippingEstimate(null)
  }

  const validate = () => {
    const newErrors: Record<string, string> = {}

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    const phoneRegex = /^\d{10}$/
    if (!formData.phone) {
      newErrors.phone = "Phone number is required"
    } else if (!phoneRegex.test(formData.phone)) {
      newErrors.phone = "Please enter a valid 10-digit phone number"
    }

    const zipRegex = /^\d{6}$/
    if (!formData.zip) {
      newErrors.zip = "Pincode is required"
    } else if (!zipRegex.test(formData.zip)) {
      newErrors.zip = "Please enter a valid 6-digit pincode"
    }

    if (!formData.firstName) newErrors.firstName = "First name is required"
    if (!formData.lastName) newErrors.lastName = "Last name is required"
    if (!formData.address) newErrors.address = "Address is required"
    if (!formData.city) newErrors.city = "City is required"
    if (!formData.state) newErrors.state = "State is required"

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleContinue = async (e: React.FormEvent) => {
    e.preventDefault()
    if (validate()) {
      // Check pincode serviceability before continuing
      if (pincodeStatus !== "valid") {
        await checkPincode(formData.zip)
      }
      // Load auto-apply coupons for review step
      loadAvailableCoupons()
      setStep("review")
    }
  }

  const handlePayAndPlaceOrder = async () => {
    if (!checkoutTermsAccepted) {
      setCheckoutTermsError("Please accept the Terms & Conditions before placing your order")
      return
    }

    if (pincodeStatus === "invalid") {
      setGlobalError("Delivery is not available to the entered pincode. Please update your address.")
      return
    }

    setCheckoutTermsError("")
    setGlobalError("")
    setIsProcessing(true)

    try {
      // Step 1: Create Razorpay order
      const orderRes = await apiFetch(API_BASE, "/api/payments/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: grandTotal,
          checkoutPayload: buildCheckoutPayload(),
        }),
      })

      if (!orderRes.ok) {
        const err = await orderRes.json()
        throw new Error(err.error || "Failed to create payment order")
      }

      const rzpOrder = await orderRes.json()
      const pendingCheckoutPayload = buildCheckoutPayload({ razorpay_order_id: rzpOrder.id })
      try {
        localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
          razorpay_order_id: rzpOrder.id,
          checkoutPayload: pendingCheckoutPayload,
          createdAt: new Date().toISOString(),
        }))
      } catch { /* ignore */ }

      // Step 2: Open Razorpay checkout modal
      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_live_SSzOPc9pat6HkB",
        amount: rzpOrder.amount,
        currency: rzpOrder.currency || "INR",
        name: "U.S ATELIER",
        description: `Order for ${items.length} item(s)`,
        order_id: rzpOrder.id,
        handler: async (response: any) => {
          try {
            const existing = JSON.parse(localStorage.getItem(PENDING_PAYMENT_KEY) || "{}")
            localStorage.setItem(PENDING_PAYMENT_KEY, JSON.stringify({
              ...existing,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              checkoutPayload: buildCheckoutPayload(response),
              capturedAt: new Date().toISOString(),
            }))
          } catch { /* ignore */ }
          // Step 3: Payment successful — create order with payment verification
          try {
            const finalizeRes = await apiFetch(API_BASE, "/api/orders", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(buildCheckoutPayload(response)),
            })

            if (finalizeRes.ok) {
              const finalData = await finalizeRes.json()
              await completeSuccessfulOrder(finalData.orderId, response.razorpay_payment_id)
            } else {
              const errorData = await finalizeRes.json()
              setGlobalError(errorData.error || "Order creation failed after payment. Contact support.")
            }
          } catch (err: any) {
            setGlobalError(`Order finalization failed: ${err.message}. Your payment was received — contact support.`)
          }
        },
        prefill: {
          name: `${formData.firstName} ${formData.lastName}`,
          email: formData.email,
          contact: formData.phone,
        },
        theme: {
          color: "#1a1a1a",
          backdrop_color: "rgba(0, 0, 0, 0.85)",
        },
        modal: {
          ondismiss: () => {
            setIsProcessing(false)
          },
        },
      }

      const razorpay = new window.Razorpay(options)
      razorpay.on("payment.failed", (response: any) => {
        setGlobalError(`Payment failed: ${response.error?.description || "Unknown error"}. Please try again.`)
        setIsProcessing(false)
      })
      razorpay.open()
    } catch (err: any) {
      setGlobalError(`Something went wrong: ${err.message || "Unknown error"}`)
      setIsProcessing(false)
    }
  }

  const handleCODOrder = async () => {
    if (!checkoutTermsAccepted) {
      setCheckoutTermsError("Please accept the Terms & Conditions before placing your order")
      return
    }

    if (pincodeStatus === "invalid") {
      setGlobalError("Delivery is not available to the entered pincode. Please update your address.")
      return
    }

    setCheckoutTermsError("")
    setGlobalError("")
    setIsProcessing(true)

    try {
      const res = await apiFetch(API_BASE, "/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCheckoutPayload()),
      })

      if (!res.ok) {
        const err = await res.json()
        setGlobalError(err.error || "Failed to place order")
        return
      }

      const data = await res.json()
      await completeSuccessfulOrder(data.orderId)
    } catch (err: any) {
      setGlobalError(`Something went wrong: ${err.message || "Unknown error"}`)
    } finally {
      setIsProcessing(false)
    }
  }

  const handlePlaceOrder = () => {
    if (paymentMethod === "cod") {
      handleCODOrder()
    } else {
      handlePayAndPlaceOrder()
    }
  }

  const steps = [
    { key: "shipping", label: "Shipping", icon: MapPin },
    { key: "review", label: "Review & Pay", icon: CreditCard },
  ]

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen overflow-x-hidden">
      {/* ── Offline warning banner ── */}
      {showOfflineBanner && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-amber-900/95 border-b border-amber-500/40 px-4 py-3 flex items-center justify-between gap-4 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-amber-300">
            <WifiOff size={14} />
            <span className="text-[10px] uppercase tracking-widest font-medium">
              No internet connection — your details are saved. Please reconnect before placing your order.
            </span>
          </div>
          {isOnline && (
            <button onClick={() => setShowOfflineBanner(false)} className="text-amber-500/60 hover:text-amber-300 text-xs">×</button>
          )}
        </div>
      )}

      {/* ── Distraction-free checkout header ── */}
      <header className={`fixed top-0 left-0 right-0 z-50 border-b border-white/5 bg-[#030303]/95 backdrop-blur-md ${showOfflineBanner ? 'mt-[44px]' : ''}`}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between">
          <Link href="/" className="font-serif text-lg tracking-[0.3em] uppercase text-[#e8e8e3]">
            U.S Atelier
          </Link>
          <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-gray-500">
            <Shield size={11} className="text-green-500/60" />
            Secure Checkout
          </div>
        </div>
      </header>

      <main className="pt-36 md:pt-48 pb-20 md:pb-32 px-4 md:px-12">
        {/* Progress Stepper */}
        <div className="max-w-[600px] mx-auto mb-12 md:mb-16">
          <div className="flex items-center justify-center gap-2 md:gap-4">
            {steps.map((s, i) => {
              const Icon = s.icon
              const isActive = step === s.key
              const isPast = steps.findIndex(x => x.key === step) > i
              return (
                <div key={s.key} className="flex items-center gap-2 md:gap-4">
                  <div className={`flex items-center gap-2 md:gap-3 px-3 md:px-5 py-2 md:py-3 rounded-full border transition-all duration-500 ${isActive
                      ? "border-white/30 bg-white/5 text-white"
                      : isPast
                        ? "border-green-500/30 bg-green-500/5 text-green-400"
                        : "border-white/5 text-gray-600"
                    }`}>
                    {isPast ? (
                      <CheckCircle size={14} className="text-green-400" />
                    ) : (
                      <Icon size={14} />
                    )}
                    <span className="text-[9px] md:text-[10px] uppercase tracking-[0.2em] font-medium hidden sm:inline">{s.label}</span>
                    <span className="text-[9px] uppercase tracking-widest font-medium sm:hidden">{i + 1}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <ChevronRight size={14} className={`${isPast ? "text-green-500/50" : "text-white/10"}`} />
                  )}
                </div>
              )
            })}
          </div>
        </div>

        <h1 className="font-serif text-3xl md:text-5xl font-light mb-10 md:mb-16 text-center">
          Checkout
        </h1>

        <div className="grid lg:grid-cols-3 gap-10 md:gap-20 max-w-[1400px] mx-auto min-w-0">
          {/* ================= FORM ================= */}
          <div className="lg:col-span-2 min-w-0">
            {step === "shipping" ? (
              <form
                onSubmit={handleContinue}
                className="space-y-8 md:space-y-12 border border-white/10 p-6 md:p-10 bg-white/[0.01] backdrop-blur-sm"
              >
                <h2 className="uppercase tracking-widest text-xs text-gray-400 flex items-center gap-3">
                  <MapPin size={14} />
                  Shipping Information
                </h2>

                <div className="space-y-3">
                  <Input
                    name="email"
                    placeholder="Email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`bg-transparent border-white/20 text-white placeholder:text-gray-600 h-12 ${errors.email ? 'border-amber-500' : ''}`}
                  />
                  {errors.email && <p className="text-[10px] text-amber-500 uppercase tracking-widest">{errors.email}</p>}
                </div>

                <div className="space-y-3">
                  <Input
                    name="phone"
                    placeholder="Mobile Number (10 digits)"
                    value={formData.phone}
                    onChange={handleInputChange}
                    maxLength={10}
                    className={`bg-transparent border-white/20 text-white placeholder:text-gray-600 h-12 ${errors.phone ? 'border-amber-500' : ''}`}
                  />
                  {errors.phone && <p className="text-[10px] text-amber-500 uppercase tracking-widest">{errors.phone}</p>}
                </div>

                <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-3">
                    <Input
                      name="firstName"
                      placeholder="First Name"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      className={`bg-transparent border-white/20 text-white h-12 ${errors.firstName ? 'border-amber-500' : ''}`}
                    />
                    {errors.firstName && <p className="text-[10px] text-amber-500 uppercase tracking-widest">{errors.firstName}</p>}
                  </div>
                  <div className="space-y-3">
                    <Input
                      name="lastName"
                      placeholder="Last Name"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      className={`bg-transparent border-white/20 text-white h-12 ${errors.lastName ? 'border-amber-500' : ''}`}
                    />
                    {errors.lastName && <p className="text-[10px] text-amber-500 uppercase tracking-widest">{errors.lastName}</p>}
                  </div>
                </div>

                <div className="space-y-3">
                  <Input
                    name="address"
                    placeholder="Full Street Address"
                    value={formData.address}
                    onChange={handleInputChange}
                    className={`bg-transparent border-white/20 text-white h-12 ${errors.address ? 'border-amber-500' : ''}`}
                  />
                  {errors.address && <p className="text-[10px] text-amber-500 uppercase tracking-widest">{errors.address}</p>}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                  <div className="space-y-3">
                    <Input
                      name="city"
                      placeholder="City"
                      value={formData.city}
                      onChange={handleInputChange}
                      className={`bg-transparent border-white/20 text-white h-12 ${errors.city ? 'border-amber-500' : ''}`}
                    />
                    {errors.city && <p className="text-[10px] text-amber-500 uppercase tracking-widest">{errors.city}</p>}
                  </div>
                  <div className="space-y-3">
                    <Input
                      name="state"
                      placeholder="State"
                      value={formData.state}
                      onChange={handleInputChange}
                      className={`bg-transparent border-white/20 text-white h-12 ${errors.state ? 'border-amber-500' : ''}`}
                    />
                    {errors.state && <p className="text-[10px] text-amber-500 uppercase tracking-widest">{errors.state}</p>}
                  </div>
                  <div className="space-y-3 col-span-2 md:col-span-1">
                    <div className="relative">
                      <Input
                        name="zip"
                        placeholder="Pincode"
                        value={formData.zip}
                        onChange={handleInputChange}
                        maxLength={6}
                        onBlur={() => formData.zip.length === 6 && checkPincode(formData.zip)}
                        className={`bg-transparent border-white/20 text-white h-12 pr-10 ${errors.zip ? 'border-amber-500' :
                            pincodeStatus === "valid" ? 'border-green-500/50' :
                              pincodeStatus === "invalid" ? 'border-amber-500' : ''
                          }`}
                      />
                      {pincodeStatus === "checking" && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        </div>
                      )}
                      {pincodeStatus === "valid" && (
                        <CheckCircle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-green-400" />
                      )}
                      {pincodeStatus === "invalid" && (
                        <AlertTriangle size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-amber-400" />
                      )}
                    </div>
                    {errors.zip && <p className="text-[10px] text-amber-500 uppercase tracking-widest">{errors.zip}</p>}
                    {pincodeMessage && (
                      <p className={`text-[10px] uppercase tracking-widest ${pincodeStatus === "valid" ? "text-green-400" : pincodeStatus === "invalid" ? "text-amber-400" : "text-gray-500"
                        }`}>
                        {pincodeMessage}
                      </p>
                    )}
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full border border-white/40 bg-transparent uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all h-14"
                >
                  Continue to Review
                </Button>
              </form>
            ) : (
              <div className="space-y-8 md:space-y-12">
                {/* SHIPPING REVIEW */}
                <div className="border border-white/10 p-6 md:p-8 bg-white/[0.01]">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="uppercase tracking-widest text-xs text-gray-400 flex items-center gap-3">
                      <MapPin size={14} />
                      Shipping Information
                    </h2>
                    <button
                      onClick={() => setStep("shipping")}
                      className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
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

                  {pincodeStatus === "valid" && (
                    <div className="mt-4 flex items-center gap-2 text-green-400 text-[10px] uppercase tracking-widest">
                      <Truck size={12} />
                      Delivery available to {formData.zip}
                    </div>
                  )}
                </div>

                {/* ITEMS */}
                <div className="border border-white/10 p-6 md:p-8 bg-white/[0.01]">
                  <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-6 md:mb-8 flex items-center gap-3">
                    <Package size={14} />
                    Order Items ({items.length})
                  </h2>

                  <div className="space-y-4 md:space-y-6">
                    {items.map((item) => (
                      <div
                        key={`${item.id}-${item.size}`}
                        className="flex gap-4 md:gap-6 group"
                      >
                        <div className="relative w-16 h-22 md:w-20 md:h-28 shrink-0 overflow-hidden rounded-sm">
                          <Image
                            src={item.image}
                            alt={item.name}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="flex-1 text-sm text-gray-400 min-w-0">
                          <p className="uppercase tracking-widest text-white text-xs md:text-sm truncate">
                            {item.name}
                          </p>
                          <p className="text-xs mt-1">Size: {item.size}</p>
                          <p className="text-xs">Qty: {item.quantity}</p>
                        </div>

                        <p className="text-sm shrink-0">
                          ₹{(item.sellingPrice * item.quantity).toLocaleString('en-IN')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                {globalError && (
                  <div className="p-4 md:p-6 border border-amber-500/30 bg-amber-950/20 text-amber-400 flex items-start justify-between gap-4 rounded-sm">
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-xs uppercase tracking-widest font-bold flex items-center gap-2">
                        <AlertTriangle size={12} />
                        Checkout Error
                      </h3>
                      <p className="text-[10px] uppercase tracking-widest break-words">{globalError}</p>
                    </div>
                    <button onClick={() => setGlobalError("")} className="text-amber-500/50 hover:text-amber-400 transition-colors text-xl leading-none shrink-0">
                      &times;
                    </button>
                  </div>
                )}

                <div className="border border-white/10 p-6 md:p-8 bg-white/[0.01] space-y-4">
                  <h3 className="uppercase tracking-widest text-xs text-gray-400">Payment Method</h3>
                  {[
                    { value: "razorpay" as const, label: "Pay Online (Razorpay)", description: "Credit / Debit card, UPI, Netbanking" },
                    { value: "cod" as const, label: "Cash on Delivery", description: codFee > 0 ? `+₹${codFee} COD fee` : "+ ₹150 extra charges" },
                  ].map((option) => (
                    <label
                      key={option.value}
                      className={`flex items-start gap-4 p-4 border cursor-pointer transition-all ${
                        paymentMethod === option.value
                          ? "border-white/40 bg-white/[0.03]"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <input
                        type="radio"
                        name="paymentMethod"
                        value={option.value}
                        checked={paymentMethod === option.value}
                        onChange={() => setPaymentMethod(option.value)}
                        className="sr-only"
                        aria-label={option.label}
                      />
                      <div className={`mt-0.5 w-4 h-4 rounded-full border shrink-0 flex items-center justify-center ${
                        paymentMethod === option.value ? "border-white" : "border-white/30"
                      }`}>
                        {paymentMethod === option.value && <div className="w-2 h-2 rounded-full bg-white" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs uppercase tracking-widest text-white">{option.label}</p>
                        <p className="text-[10px] text-gray-500 mt-1">{option.description}</p>
                      </div>
                    </label>
                  ))}
                </div>

                <div className="border border-white/10 p-4 bg-white/[0.01]">
                  <label className="flex items-start gap-3 text-xs text-gray-400 leading-relaxed cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkoutTermsAccepted}
                      onChange={(e) => {
                        setCheckoutTermsAccepted(e.target.checked)
                        if (e.target.checked) setCheckoutTermsError("")
                      }}
                      className="mt-0.5 h-4 w-4 rounded border-white/30 bg-transparent accent-white"
                    />
                    <span>
                      I agree to the <Link href="/terms-and-conditions" target="_blank" className="text-[#C8A45D] hover:text-white underline underline-offset-4">Terms &amp; Conditions</Link> and authorize order placement.
                    </span>
                  </label>
                  {checkoutTermsError && (
                    <p className="mt-3 text-[10px] uppercase tracking-widest text-amber-500">{checkoutTermsError}</p>
                  )}
                </div>

                <Button
                  onClick={handlePlaceOrder}
                  disabled={isProcessing || !checkoutTermsAccepted || !isOnline}
                  className="w-full border border-white/40 bg-white/5 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all py-6 md:py-8 disabled:opacity-40 group"
                >
                  <div className="flex items-center justify-center gap-3">
                    {!isOnline ? (
                      <><WifiOff size={14} className="text-amber-400" />No Connection</>
                    ) : isProcessing ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin group-hover:border-black/30 group-hover:border-t-black" />
                        {paymentMethod === "cod" ? "Placing Order..." : "Processing Payment..."}
                      </>
                    ) : paymentMethod === "cod" ? (
                      <>
                        <Banknote size={14} />
                        Place Order · ₹{grandTotal.toLocaleString("en-IN")}
                      </>
                    ) : (
                      <>
                        <Shield size={14} />
                        Pay Securely · ₹{grandTotal.toLocaleString("en-IN")}
                      </>
                    )}
                  </div>
                </Button>

                {/* Trust badges */}
                <div className="flex flex-wrap items-center justify-center gap-4 md:gap-8 pt-2">
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-gray-600">
                    <Shield size={12} /> Secure Payment
                  </div>
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-gray-600">
                    <Truck size={12} /> Delhivery Shipping
                  </div>
                  <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest text-gray-600">
                    <CheckCircle size={12} /> Order Tracking
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ================= SUMMARY ================= */}
          <div className="lg:col-span-1 min-w-0">
            <div className="sticky top-32 border border-white/10 p-6 md:p-8 space-y-6 bg-white/[0.01] backdrop-blur-sm overflow-hidden">
              <h2 className="uppercase tracking-widest text-xs text-gray-400 flex items-center gap-3">
                <Package size={14} />
                Order Summary
              </h2>

              <div className="text-sm text-gray-400 space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal ({items.length} items)</span>
                  <span>₹{total.toLocaleString('en-IN')}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between text-green-400">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span>-₹{discountAmount.toLocaleString('en-IN')}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="text-green-400 text-xs uppercase tracking-widest">{shipping === 0 ? "Free" : `₹${shipping.toLocaleString('en-IN')}`}</span>
                </div>
                {cgst > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>CGST (2.5%)</span>
                    <span>₹{cgst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {sgst > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>SGST (2.5%)</span>
                    <span>₹{sgst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {igst > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>IGST (5%)</span>
                    <span>₹{igst.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {codFee > 0 && (
                  <div className="flex justify-between text-xs text-gray-400">
                    <span>COD Fee</span>
                    <span>₹{codFee.toLocaleString("en-IN")}</span>
                  </div>
                )}
                <div className="border-t border-white/10 pt-4 flex justify-between text-white font-medium">
                  <span>Total</span>
                  <span className="text-lg">₹{grandTotal.toLocaleString('en-IN')}</span>
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest text-gray-500">
                  <Tag size={12} />
                  Coupon Code
                </div>
                {appliedCoupon ? (
                  <div className="flex items-center justify-between gap-3 border border-green-500/30 bg-green-500/5 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-xs uppercase tracking-widest text-green-300 truncate">{appliedCoupon.code}</p>
                      <p className="text-[10px] uppercase tracking-widest text-green-500 mt-1">₹{discountAmount.toLocaleString("en-IN")} saved</p>
                    </div>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-green-400/70 hover:text-white transition-colors shrink-0"
                      aria-label="Remove coupon"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <Input
                        value={couponCode}
                        onChange={(e) => {
                          setCouponCode(e.target.value.toUpperCase())
                          setCouponMessage("")
                        }}
                        placeholder="Enter code"
                        className="bg-transparent border-white/20 text-white placeholder:text-gray-600 h-11 uppercase"
                      />
                      <Button
                        type="button"
                        onClick={() => applyCoupon()}
                        disabled={isApplyingCoupon}
                        className="border border-white/30 bg-transparent px-4 uppercase tracking-widest text-[10px] hover:bg-white hover:text-black disabled:opacity-50"
                      >
                        {isApplyingCoupon ? "Checking" : "Apply"}
                      </Button>
                    </div>
                    {availableCoupons.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {availableCoupons.slice(0, 3).map((coupon) => (
                          <button
                            key={coupon.code}
                            type="button"
                            onClick={() => applyCoupon(coupon.code)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[9px] uppercase tracking-[0.25em] text-gray-300 hover:border-white/40 hover:text-white"
                          >
                            {coupon.code}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {couponMessage && (
                  <p className={`text-[10px] uppercase tracking-widest ${appliedCoupon ? "text-green-400" : "text-amber-400"}`}>
                    {couponMessage}
                  </p>
                )}
              </div>

              <div className="pt-4 border-t border-white/10 space-y-3">
                <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-gray-600">
                  <Shield size={11} className="text-green-500/60" />
                  <span>256-bit SSL Encrypted</span>
                </div>
                <div className="flex items-center gap-3 text-[9px] uppercase tracking-widest text-gray-600">
                  <CreditCard size={11} className="text-green-500/60" />
                  <span>Razorpay Secure Gateway</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal checkout footer */}
      <footer className="border-t border-white/5 py-6 px-6 md:px-12">
        <div className="max-w-[1400px] mx-auto flex flex-wrap items-center justify-between gap-4 text-[8px] uppercase tracking-widest text-gray-700">
          <span>© {new Date().getFullYear()} U.S Atelier. All rights reserved.</span>
          <div className="flex items-center gap-6">
            <Link href="/privacy-policy" className="hover:text-gray-400 transition-colors">Privacy</Link>
            <Link href="/terms-and-conditions" className="hover:text-gray-400 transition-colors">Terms</Link>
            <Link href="/refund-policy" className="hover:text-gray-400 transition-colors">Refunds</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
