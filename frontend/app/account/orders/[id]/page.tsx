"use client"

import { use, useEffect, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AccountSidebar } from "@/components/account-sidebar"
import { getApiBase, apiFetch } from "@/lib/api-base"
import { useAuth } from "@/lib/auth-context"
import { resolveMediaUrl } from "@/lib/media-url"
import {
  ArrowLeft, Package, Truck, CheckCircle, Clock,
  Copy, Check, Mail, ExternalLink, AlertTriangle, XCircle, RefreshCw
} from "lucide-react"

const API_BASE = getApiBase()

const COD_FEE = 150

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [order, setOrder] = useState<any>(null)
  const [products, setProducts] = useState<Record<string, any>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [copiedWaybill, setCopiedWaybill] = useState(false)
  const [cancelState, setCancelState] = useState<"idle" | "confirming" | "loading" | "done" | "error">("idle")
  const [cancelMessage, setCancelMessage] = useState("")
  const { user, isAdmin, isAuthLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isAuthLoading && isAdmin) { router.replace("/admin"); return }
  }, [isAdmin, isAuthLoading, router])

  const fetchOrder = async () => {
    try {
      const res = await apiFetch(API_BASE, "/api/orders")
      if (res.ok) {
        const data = await res.json()
        const found = data.find((o: any) => String(o.id) === id || o.order_number === id)
        if (found) {
          setOrder(found)
          const productMap: Record<string, any> = {}
          if (found.items) {
            await Promise.all(found.items.map(async (item: any) => {
              try {
                const pid = item.product_id_str || item.product_id || item.id
                if (pid) {
                  const pRes = await apiFetch(API_BASE, `/api/products/${pid}`)
                  if (pRes.ok) productMap[pid] = await pRes.json()
                }
              } catch { /* ignore */ }
            }))
          }
          setProducts(productMap)
        }
      }
    } catch (err) {
      console.error("Failed to fetch order:", err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!isAuthLoading && user && !isAdmin) fetchOrder()
  }, [id, user, isAdmin, isAuthLoading])

  // ── Cancellation window logic ──────────────────────────────────────────
  const getCancelEligibility = () => {
    if (!order) return { eligible: false, reason: "" }
    const s = (order.status || "").toLowerCase()
    if (["cancelled", "delivered", "shipped", "out for delivery", "refunded", "expired"].includes(s))
      return { eligible: false, reason: `Order is already ${order.status}.` }
    if (order.delhivery_shipment_id)
      return { eligible: false, reason: "Order already dispatched. Contact support to cancel." }
    const created = new Date(order.createdAt || order.date)
    const minutesElapsed = (Date.now() - created.getTime()) / 60000
    if (minutesElapsed > 30)
      return { eligible: false, reason: "30-minute cancellation window has closed." }
    return { eligible: true, reason: "", minutesLeft: Math.max(0, 30 - minutesElapsed) }
  }

  const handleCancelOrder = async () => {
    if (cancelState === "idle") { setCancelState("confirming"); return }
    if (cancelState !== "confirming") return
    setCancelState("loading")
    try {
      const orderNum = order.order_number || order.id
      const res = await apiFetch(API_BASE, `/api/orders/${orderNum}/cancel`, { method: "POST" })
      const data = await res.json()
      if (res.ok && data.success) {
        const isCOD = order.payment_method === "cod"
        const fallbackMessage = isCOD
          ? "Order cancelled. The ₹150 COD advance fee is non-refundable."
          : "Order cancelled. Refund will be initiated to your original payment method within 5–10 business days."
        setCancelMessage(data.message || fallbackMessage)
        setCancelState("done")
        setOrder((prev: any) => ({ ...prev, status: "Cancelled", payment_status: isCOD ? "COD Advance Non-Refundable" : "Refunded" }))
      } else {
        setCancelMessage(data.error || "Cancellation failed.")
        setCancelState("error")
      }
    } catch {
      setCancelMessage("Network error. Please try again.")
      setCancelState("error")
    }
  }

  const getStatusConfig = (status: string) => {
    const s = status?.toLowerCase()
    if (s === "delivered") return { color: "text-green-400 border-green-400/30 bg-green-400/5", icon: CheckCircle }
    if (["shipped", "in_transit", "out for delivery"].includes(s)) return { color: "text-amber-400 border-amber-400/30 bg-amber-400/5", icon: Truck }
    if (["processing", "pickup"].includes(s)) return { color: "text-blue-400 border-blue-400/30 bg-blue-400/5", icon: RefreshCw }
    if (["cancelled", "failed", "expired"].includes(s)) return { color: "text-red-400 border-red-400/30 bg-red-400/5", icon: XCircle }
    return { color: "text-gray-400 border-white/20 bg-white/5", icon: Clock }
  }

  const getProductImage = (item: any) => {
    const pid = item.product_id_str || item.product_id || item.id
    const product = products[pid]
    if (product) {
      const images = Array.isArray(product.images) ? product.images : (() => { try { return JSON.parse(product.images) } catch { return [] } })()
      if (images[0]) return resolveMediaUrl(images[0])
    }
    return null
  }

  if (isAdmin) return null

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />
      <div className="pt-28 md:pt-52">
        <AccountSidebar>
          <div className="p-5 md:p-10 max-w-4xl">
            <Link href="/account/orders"
              className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors mb-8 inline-flex items-center gap-2">
              <ArrowLeft size={12} /> Back to Orders
            </Link>

            {isLoading ? (
              <div className="py-24 space-y-6">
                <div className="h-8 w-64 bg-white/5 animate-pulse rounded" />
                <div className="h-4 w-40 bg-white/5 animate-pulse rounded" />
                <div className="border border-white/10 p-8 space-y-4">
                  {[1,2,3].map(i => <div key={i} className="h-4 bg-white/5 animate-pulse rounded" />)}
                </div>
              </div>
            ) : !order ? (
              <div className="py-24 text-center">
                <p className="uppercase tracking-widest text-gray-500 text-xs">Order not found.</p>
                <Link href="/account/orders" className="text-white hover:underline mt-4 inline-block text-xs uppercase tracking-widest">
                  Return to Orders
                </Link>
              </div>
            ) : (() => {
              const statusConfig = getStatusConfig(order.status)
              const StatusIcon = statusConfig.icon
              const isCOD = order.payment_method === "cod"
              const cancelEligibility = getCancelEligibility()

              return (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">

                  {/* ── Header ───────────────────────────────────────── */}
                  <div className="flex flex-col gap-6 sm:flex-row sm:justify-between sm:items-start pb-8 border-b border-white/10">
                    <div>
                      <p className="uppercase tracking-[0.4em] text-xs text-gray-500 mb-2">Order</p>
                      <h1 className="font-serif text-3xl md:text-4xl font-light break-all">{order.order_number || order.id}</h1>
                      <p className="text-sm text-gray-500 mt-2">
                        Placed on {new Date(order.date || order.createdAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                    <div className="flex flex-col items-start sm:items-end gap-3">
                      <span className={`px-4 py-2 border uppercase tracking-widest text-xs flex items-center gap-2 ${statusConfig.color}`}>
                        <StatusIcon size={14} />
                        {order.status}
                      </span>
                      {isCOD && (
                        <span className="px-3 py-1 border border-amber-500/30 bg-amber-500/5 text-amber-400 text-[10px] uppercase tracking-widest">
                          Cash on Delivery
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── COD Payment Breakdown ─────────────────────────── */}
                  {isCOD && (
                    <div className="border border-amber-500/20 bg-amber-500/5 p-5 sm:p-6 space-y-3">
                      <h2 className="uppercase tracking-widest text-xs text-amber-400/80 flex items-center gap-2">
                        <Package size={13} /> COD Payment Details
                      </h2>
                      <div className="text-sm space-y-2 text-gray-300">
                        <div className="flex justify-between">
                          <span>Advance paid online (Razorpay)</span>
                          <span className="text-amber-400">₹{COD_FEE.toLocaleString("en-IN")}</span>
                        </div>
                        {order.cod_collectable_amount > 0 && (
                          <div className="flex justify-between">
                            <span>Amount payable in cash</span>
                            <span>₹{order.cod_collectable_amount.toLocaleString("en-IN")}</span>
                          </div>
                        )}
                        <p className="text-[10px] text-amber-500/70 pt-1 border-t border-amber-500/20 leading-relaxed">
                          Note: The ₹150 COD advance fee is non-refundable, including in the event of cancellation or exchange.
                          See our <Link href="/refund-policy#cod-orders" className="underline underline-offset-2">Refund Policy</Link>.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* ── Cancellation ─────────────────────────────────── */}
                  {cancelEligibility.eligible && cancelState !== "done" && (
                    <div className="border border-white/10 p-5 sm:p-6">
                      <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-4 flex items-center gap-2">
                        <XCircle size={13} /> Cancel Order
                      </h2>
                      {cancelState === "confirming" && (
                        <div className="mb-4 p-4 border border-amber-500/30 bg-amber-500/5">
                          <p className="text-sm text-amber-300 font-medium mb-1">Are you sure?</p>
                          {isCOD ? (
                            <p className="text-xs text-amber-400/80 leading-relaxed">
                              Your order will be cancelled. The <strong>₹150 COD advance fee is non-refundable</strong> and the remaining balance will not be collected.
                            </p>
                          ) : (
                            <p className="text-xs text-gray-400 leading-relaxed">
                              Your order will be cancelled and a full refund will be initiated to your original payment method within 5–10 business days.
                            </p>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-3 flex-wrap">
                        <button onClick={handleCancelOrder} disabled={cancelState === "loading"}
                          className={`flex items-center gap-2 px-5 py-2.5 border text-xs uppercase tracking-widest transition-all ${
                            cancelState === "confirming"
                              ? "border-red-500/60 text-red-400 bg-red-500/10 hover:bg-red-500/20"
                              : "border-white/20 text-gray-400 hover:text-white hover:border-white/40"
                          } disabled:opacity-50`}>
                          {cancelState === "loading" ? <RefreshCw size={12} className="animate-spin" /> : <XCircle size={12} />}
                          {cancelState === "loading" ? "Cancelling…" : cancelState === "confirming" ? "Yes, Cancel My Order" : "Cancel Order"}
                        </button>
                        {cancelState === "confirming" && (
                          <button onClick={() => setCancelState("idle")}
                            className="px-4 py-2.5 text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors">
                            Keep Order
                          </button>
                        )}
                        {cancelState === "idle" && (
                          <span className="text-[10px] text-gray-600 uppercase tracking-widest">
                            {Math.floor(cancelEligibility.minutesLeft ?? 0)} min left in window
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cancellation done / error feedback */}
                  {(cancelState === "done" || cancelState === "error") && cancelMessage && (
                    <div className={`border p-4 text-sm ${cancelState === "done" ? "border-green-500/30 bg-green-500/5 text-green-400" : "border-red-500/30 bg-red-500/5 text-red-400"}`}>
                      {cancelMessage}
                    </div>
                  )}

                  {/* Non-eligible cancel reason */}
                  {!cancelEligibility.eligible && cancelEligibility.reason && !["cancelled","delivered","shipped","out for delivery","refunded","expired"].includes((order.status||"").toLowerCase()) && (
                    <div className="flex items-start gap-3 border border-white/10 p-4 text-xs text-gray-500">
                      <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500/60" />
                      <span>{cancelEligibility.reason}</span>
                    </div>
                  )}

                  {/* ── Tracking ─────────────────────────────────────── */}
                  <div className="border border-white/10 p-6 sm:p-8">
                    <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-6 flex items-center gap-2">
                      <Truck size={14} /> Shipping & Tracking
                    </h2>
                    {order.delhivery_tracking_url ? (
                      <div className="space-y-4">
                        {order.delhivery_waybill && (
                          <div className="flex items-center gap-3 bg-white/5 border border-white/10 px-4 py-3">
                            <span className="text-xs text-gray-500 uppercase tracking-widest">Tracking ID:</span>
                            <code className="text-sm font-mono text-white">{order.delhivery_waybill}</code>
                            <button onClick={() => { navigator.clipboard.writeText(order.delhivery_waybill); setCopiedWaybill(true); setTimeout(() => setCopiedWaybill(false), 2000) }}
                              className="ml-auto p-1.5 hover:bg-white/10 transition-colors rounded" title="Copy">
                              {copiedWaybill ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-500" />}
                            </button>
                          </div>
                        )}
                        <a href={order.delhivery_tracking_url} target="_blank" rel="noreferrer"
                          className="flex items-center justify-center gap-2 w-full px-6 py-3 border border-amber-600/50 bg-amber-600/10 text-amber-400 hover:bg-amber-600 hover:text-white transition-all uppercase tracking-widest text-[10px]">
                          <ExternalLink size={14} /> Track Live Delivery
                        </a>
                      </div>
                    ) : (
                      <div className="bg-white/5 border border-white/10 px-6 py-8 text-center">
                        <Clock size={24} className="mx-auto text-gray-600 mb-3" />
                        <p className="text-sm text-gray-400">Tracking will be assigned once dispatched</p>
                        <p className="text-xs text-gray-600 mt-2">Estimated dispatch: 2–4 business days</p>
                      </div>
                    )}
                  </div>

                  {/* ── Items ────────────────────────────────────────── */}
                  <div className="border border-white/10 p-6 sm:p-8">
                    <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-7 flex items-center gap-2">
                      <Package size={14} /> Items
                    </h2>
                    <div className="space-y-6">
                      {order.items?.map((item: any, index: number) => {
                        const productImage = getProductImage(item)
                        return (
                          <div key={index} className="flex gap-4 sm:gap-6 pb-6 border-b border-white/10 last:border-0 last:pb-0">
                            {productImage && (
                              <div className="relative w-16 h-20 sm:w-20 sm:h-24 flex-shrink-0 bg-[#111] overflow-hidden">
                                <Image src={productImage} alt={item.product_name || "Product"} fill className="object-cover" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="uppercase tracking-widest text-sm font-medium truncate">{item.product_name || item.productName}</p>
                              <p className="text-xs text-gray-500 mt-1.5">Size {item.size} · Qty {item.quantity}</p>
                              <p className="text-xs text-gray-500 mt-1">₹{(item.sellingPrice ?? 0).toLocaleString("en-IN")} per unit</p>
                            </div>
                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <p className="text-sm font-medium">₹{((item.sellingPrice ?? 0) * item.quantity).toLocaleString("en-IN")}</p>
                              {(order.status || "").toLowerCase() === "delivered" && (
                                <Link href={`/product/${encodeURIComponent(item.product_name || item.productName || "")}#write-review`}
                                  className="text-[10px] uppercase tracking-[0.2em] text-gray-500 hover:text-white transition-colors border border-gray-500/30 hover:border-white/50 px-3 py-1.5 mt-2">
                                  Write Review
                                </Link>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Totals */}
                    <div className="border-t border-white/10 pt-6 mt-6 space-y-3 text-sm text-gray-400">
                      {order.discount_amount > 0 && (
                        <div className="flex justify-between text-green-400">
                          <span>Discount {order.coupon_code && `(${order.coupon_code})`}</span>
                          <span>−₹{(order.discount_amount ?? 0).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      {isCOD && order.cod_fee > 0 && (
                        <div className="flex justify-between text-amber-400/80">
                          <span>COD Advance (paid online)</span>
                          <span>₹{(order.cod_fee ?? 0).toLocaleString("en-IN")}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-white pt-3 border-t border-white/10 text-base font-medium">
                        <span>Total</span>
                        <span>₹{(order.total ?? 0).toLocaleString("en-IN")}</span>
                      </div>
                    </div>
                  </div>

                  {/* ── Payment ──────────────────────────────────────── */}
                  <div className="border border-white/10 p-6 sm:p-8">
                    <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-5">Payment</h2>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600 text-xs uppercase tracking-widest mb-1">Method</p>
                        <p className="text-gray-300">{isCOD ? "Cash on Delivery" : "Online Payment"}</p>
                      </div>
                      <div>
                        <p className="text-gray-600 text-xs uppercase tracking-widest mb-1">Status</p>
                        <p className={
                          (order.payment_status || "").toLowerCase().includes("paid") || (order.payment_status || "").toLowerCase().includes("cod")
                            ? "text-green-400" : "text-amber-400"}>
                          {order.payment_status || "Paid"}
                        </p>
                      </div>
                      {order.razorpay_payment_id && (
                        <div className="col-span-2">
                          <p className="text-gray-600 text-xs uppercase tracking-widest mb-1">Payment ID</p>
                          <p className="text-gray-400 font-mono text-xs truncate">{order.razorpay_payment_id}</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* ── Shipping Address ─────────────────────────────── */}
                  <div className="border border-white/10 p-6 sm:p-8">
                    <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-5">Shipping Address</h2>
                    <div className="text-sm text-gray-400 leading-loose">
                      <p className="text-white font-medium">{order.shipping_address?.firstName} {order.shipping_address?.lastName}</p>
                      <p>{order.shipping_address?.address || order.shipping_address?.street}</p>
                      <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zip}</p>
                      {order.shipping_address?.country && <p>{order.shipping_address.country}</p>}
                      {order.shipping_address?.phone && <p className="mt-2 text-gray-500">Phone: {order.shipping_address.phone}</p>}
                    </div>
                  </div>

                  {/* ── Support ──────────────────────────────────────── */}
                  <div className="border border-white/10 border-dashed p-6 sm:p-8 text-center">
                    <Mail size={20} className="mx-auto text-gray-600 mb-3" />
                    <p className="text-xs text-gray-500 uppercase tracking-widest mb-2">Need Help?</p>
                    <p className="text-sm text-gray-400">
                      Write to{" "}
                      <a href="mailto:usatelier08@gmail.com" className="text-amber-500 hover:text-amber-400 underline underline-offset-4 transition-colors">
                        usatelier08@gmail.com
                      </a>
                    </p>
                  </div>
                </div>
              )
            })()}
          </div>
        </AccountSidebar>
      </div>
      <SiteFooter />
    </div>
  )
}
