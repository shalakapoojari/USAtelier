"use client"

import { useEffect, useState, use } from "react"
import Link from "next/link"
import { RefreshCcw, CheckCircle2, Package, Truck, User, CreditCard, ArrowLeft, Undo2, ExternalLink, MapPin, Clock, AlertTriangle, Info } from "lucide-react"
import { getApiBase } from "@/lib/api-base"
import { useToast } from "@/lib/toast-context"

interface OrderItem {
  productName: string
  quantity: number
  price: number
  size: string
}

interface Order {
  id: number
  user_id: number
  order_number: string
  total: number
  status: string
  payment_status: string
  shipping_address: any
  customerName: string
  customerEmail: string
  date: string
  items: OrderItem[]
  subtotal: number
  shipping: number
  razorpay_payment_id?: string
  delhivery_shipment_id?: string
  delhivery_tracking_url?: string
  delhivery_waybill?: string
}

const STATUS_CONFIG: Record<string, { color: string; bg: string; dot: string; label: string }> = {
  Processing:        { color: "text-amber-400",  bg: "bg-amber-400/10",  dot: "bg-amber-400",  label: "Processing" },
  Shipped:           { color: "text-blue-400",   bg: "bg-blue-400/10",   dot: "bg-blue-400",   label: "Shipped" },
  "Out for Delivery": { color: "text-purple-400", bg: "bg-purple-400/10", dot: "bg-purple-400", label: "Out for Delivery" },
  Delivered:         { color: "text-green-400",  bg: "bg-green-400/10",  dot: "bg-green-400",  label: "Delivered" },
  Cancelled:         { color: "text-red-400",    bg: "bg-red-400/10",    dot: "bg-red-400",    label: "Cancelled" },
  Returned:          { color: "text-gray-400",   bg: "bg-gray-400/10",   dot: "bg-gray-400",   label: "Returned" },
  Failed:            { color: "text-red-400",    bg: "bg-red-400/10",    dot: "bg-red-400",    label: "Failed" },
}

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)
  const [refunding, setRefunding] = useState(false)
  const [dispatching, setDispatching] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const API_BASE = getApiBase()
  const { showToast, confirm } = useToast()

  const fetchOrderDetail = async (showFeedback = false) => {
    if (showFeedback) setRefreshing(true)
    try {
      const response = await fetch(`${API_BASE}/api/admin/orders/${id}`, {
        credentials: "include"
      });
      if (response.ok) {
        const data = await response.json();
        setOrder(data);
        if (showFeedback) showToast("Order data refreshed", "success")
      }
    } catch (err) {
      console.error(err);
      if (showFeedback) showToast("Failed to refresh order", "error")
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrderDetail();
  }, [id]);

  const handleDispatchDelhivery = async () => {
    const confirmed = await confirm({
      title: "Dispatch Order",
      message: "This will create a Delhivery shipment and the customer will receive a tracking link via email. Proceed?",
      confirmLabel: "Dispatch",
      variant: "default",
    })
    if (!confirmed) return

    setDispatching(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/dispatch/${order?.order_number || id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: "include"
      });

      const data = await response.json();
      if (data.success) {
        showToast("Order dispatched via Delhivery", "dispatch", `Waybill: ${data.waybill}`)
        fetchOrderDetail();
      } else {
        showToast("Dispatch failed", "error", data.error)
      }
    } catch (err) {
      console.error(err);
      showToast("Failed to dispatch order", "error", "Network error — please try again")
    } finally {
      setDispatching(false);
    }
  };

  const handleRefund = async () => {
    if (!order?.razorpay_payment_id) {
      showToast("No payment found", "warning", "This order has no Razorpay payment ID attached")
      return;
    }

    const confirmed = await confirm({
      title: "Process Refund",
      message: `This will refund ₹${order.total.toLocaleString('en-IN')} to the customer's original payment method via Razorpay. This action cannot be undone.`,
      confirmLabel: "Refund ₹" + order.total.toLocaleString('en-IN'),
      cancelLabel: "Keep Payment",
      variant: "danger",
    })
    if (!confirmed) return

    setRefunding(true);
    try {
      const response = await fetch(`${API_BASE}/api/admin/payments/refund`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_payment_id: order.razorpay_payment_id,
          amount: order.total
        }),
        credentials: "include"
      });

      const data = await response.json();
      if (data.success) {
        showToast("Refund processed", "success", `₹${order.total.toLocaleString('en-IN')} returned to customer`)
        fetchOrderDetail();
      } else {
        showToast("Refund failed", "error", data.error)
      }
    } catch (err) {
      console.error(err);
      showToast("Refund failed", "error", "Network error — please contact Razorpay support")
    } finally {
      setRefunding(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#030303] min-h-screen flex items-center justify-center">
        <RefreshCcw className="animate-spin text-gray-500" size={24} />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 sm:px-6 md:px-8 py-10 md:py-16 text-center">
        <Link href="/admin/orders" className="uppercase tracking-widest text-xs text-gray-500">
          ← Back to Orders
        </Link>
        <p className="mt-12 font-serif text-2xl uppercase tracking-widest text-gray-700">Order not found.</p>
      </div>
    )
  }

  const isDispatched = !!order.delhivery_shipment_id
  const statusConfig = STATUS_CONFIG[order.status] || STATUS_CONFIG["Processing"]
  const canRefund = order.payment_status === "Paid" && order.status !== "Cancelled"
  const canDispatch = !dispatching && !isDispatched && !['Delivered', 'Cancelled', 'Returned', 'Failed'].includes(order.status) && order.payment_status === "Paid"

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 sm:px-6 md:px-8 lg:px-12 py-10 md:py-14 lg:py-20 max-w-7xl mx-auto space-y-10 md:space-y-16">
      {/* ================= HEADER ================= */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-white/5 pb-12">
        <div className="space-y-6">
          <Link href="/admin/orders" className="inline-flex items-center gap-2 uppercase tracking-[0.3em] text-[10px] text-gray-500 hover:text-white transition-colors">
            <ArrowLeft size={12} />
            Registry / Orders
          </Link>

          <div>
            <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light tracking-tight mb-4 break-all">
              {order.order_number}
            </h1>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6 text-[10px] uppercase tracking-[0.2em] text-gray-500">
              <span className="flex items-center gap-2">
                <CheckCircle2 size={12} className="text-green-500" />
                Placed {new Date(order.date).toLocaleDateString()}
              </span>
              <span className="w-1 h-1 bg-white/10 rounded-full hidden sm:block" />
              <span>{order.customerEmail}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          {/* Refresh */}
          <button
            onClick={() => fetchOrderDetail(true)}
            disabled={refreshing}
            className="px-5 py-3 border border-white/10 text-gray-400 hover:text-white hover:border-white/30 transition-all text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 disabled:opacity-50"
          >
            <RefreshCcw size={12} className={refreshing ? "animate-spin" : ""} />
            Sync
          </button>

          {/* Refund */}
          {canRefund && (
            <button
              onClick={handleRefund}
              disabled={refunding}
              className="px-6 py-3 border border-blue-500/30 text-blue-400 hover:bg-blue-500 hover:text-white transition-all text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 disabled:opacity-50"
            >
              <Undo2 size={12} className={refunding ? "animate-spin" : ""} />
              {refunding ? "Processing..." : "Refund"}
            </button>
          )}
        </div>
      </div>

      {/* ================= STATUS + AUTOMATION NOTICE ================= */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-8">
        <div className={`inline-flex items-center gap-3 px-5 py-3 rounded-full ${statusConfig.bg} border border-white/5`}>
          <div className={`w-2 h-2 rounded-full ${statusConfig.dot} animate-pulse`} />
          <span className={`text-[10px] uppercase tracking-[0.2em] font-medium ${statusConfig.color}`}>
            {statusConfig.label}
          </span>
        </div>
        <div className="flex items-center gap-2 text-[9px] text-gray-600 uppercase tracking-widest">
          <Info size={10} />
          Status is managed automatically by Delhivery
        </div>
      </div>

      {/* ================= DELHIVERY TRACKING BANNER ================= */}
      {isDispatched && (
        <div className="border border-green-500/20 bg-green-500/[0.03] p-5 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-sm">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <Truck size={18} className="text-green-400" />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest text-green-400 font-medium mb-1">Dispatched via Delhivery</p>
              <div className="flex flex-wrap items-center gap-3 md:gap-6 text-[9px] text-gray-500 uppercase tracking-widest">
                {order.delhivery_waybill && (
                  <span>Waybill: <span className="text-gray-300 font-mono">{order.delhivery_waybill}</span></span>
                )}
                {order.delhivery_shipment_id && (
                  <span>ID: <span className="text-gray-300 font-mono">{order.delhivery_shipment_id}</span></span>
                )}
              </div>
            </div>
          </div>
          {order.delhivery_tracking_url && (
            <a
              href={order.delhivery_tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 border border-green-500/30 text-green-400 hover:bg-green-500 hover:text-white transition-all text-[10px] uppercase tracking-widest rounded-sm"
            >
              <ExternalLink size={12} />
              Track Shipment
            </a>
          )}
        </div>
      )}

      {/* ================= GRID ================= */}
      <div className="grid lg:grid-cols-3 gap-12 lg:gap-20">
        {/* ITEMS & SUMMARY */}
        <div className="lg:col-span-2 space-y-8 md:space-y-12">
          <div className="bg-white/[0.02] border border-white/5 p-5 sm:p-7 md:p-10 space-y-8 rounded-sm">
            <h2 className="flex items-center gap-3 uppercase tracking-[0.3em] text-[10px] text-gray-500 mb-8">
              <Package size={14} />
              Manifested Items
            </h2>

            <div className="space-y-6 md:space-y-8">
              {order.items.map((item, i) => (
                <div key={i} className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start border-b border-white/5 pb-6 md:pb-8 last:border-0 last:pb-0 group">
                  <div className="space-y-1">
                    <p className="font-serif text-base md:text-lg text-[#e8e8e3] group-hover:text-white transition-colors">
                      {item.productName}
                    </p>
                    <div className="flex items-center gap-4 text-[9px] uppercase tracking-widest text-gray-500">
                      <span>Size {item.size}</span>
                      <span className="w-1 h-1 bg-white/10 rounded-full" />
                      <span>Qty: {item.quantity}</span>
                    </div>
                  </div>
                  <p className="text-sm font-light text-[#e8e8e3]">
                    ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-8 md:pt-10 space-y-4 border-t border-white/5">
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500">
                <span>Subtotal</span>
                <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-[10px] uppercase tracking-widest text-gray-500">
                <span>Shipping</span>
                <span>₹{order.shipping.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between items-end pt-4">
                <span className="text-[10px] uppercase tracking-[0.4em] font-medium text-gray-400">Total</span>
                <span className="text-2xl md:text-3xl font-serif text-[#e8e8e3]">₹{order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* SHIPPING ADDRESS */}
          <div className="bg-white/[0.02] border border-white/5 p-5 sm:p-7 md:p-10 rounded-sm">
            <h2 className="flex items-center gap-3 uppercase tracking-[0.3em] text-[10px] text-gray-500 mb-8">
              <MapPin size={14} />
              Delivery Address
            </h2>
            <div className="space-y-2 text-sm text-gray-400 font-light leading-relaxed max-w-md">
              <p className="text-[#e8e8e3] font-medium mb-3 uppercase tracking-widest">
                {order.shipping_address?.firstName} {order.shipping_address?.lastName}
              </p>
              <p>{order.shipping_address?.street || order.shipping_address?.address}</p>
              <p>{order.shipping_address?.city}, {order.shipping_address?.state} {order.shipping_address?.zip}</p>
              <p className="mt-4 pt-4 border-t border-white/5 flex items-center gap-3">
                <span className="text-[9px] uppercase tracking-widest text-gray-600">Contact:</span>
                {order.shipping_address?.phone || "N/A"}
              </p>
            </div>
          </div>
        </div>

        {/* CONTROLS SIDEBAR */}
        <div className="space-y-6 md:space-y-8">
          {/* CUSTOMER PROFILE */}
          <div className="bg-white/[0.02] border border-white/5 p-5 sm:p-8 space-y-6 rounded-sm">
            <h2 className="flex items-center gap-3 uppercase tracking-[0.3em] text-[10px] text-gray-500">
              <User size={14} />
              Identity
            </h2>
            <div>
              <p className="text-sm font-medium text-[#e8e8e3]">{order.customerName}</p>
              <p className="text-[10px] text-gray-600 tracking-widest mt-1">{order.customerEmail}</p>
            </div>
            <Link
              href={`/admin/customers/${order.user_id}`}
              className="block w-full text-center py-3 border border-white/5 text-[9px] uppercase tracking-widest hover:bg-white hover:text-black transition-all rounded-sm"
            >
              View Full Profile
            </Link>
          </div>

          {/* PAYMENT STATUS */}
          <div className="bg-white/[0.02] border border-white/5 p-5 sm:p-8 space-y-6 rounded-sm">
            <h2 className="flex items-center gap-3 uppercase tracking-[0.3em] text-[10px] text-gray-500">
              <CreditCard size={14} />
              Financial Status
            </h2>
            <div className={`inline-flex items-center gap-3 px-4 py-2 text-[9px] uppercase tracking-widest rounded-full ${
              order.payment_status === 'Paid' ? 'text-green-400 bg-green-400/10' :
              order.payment_status === 'Refunded' ? 'text-blue-400 bg-blue-400/10' :
              'text-orange-400 bg-orange-400/10'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                order.payment_status === 'Paid' ? 'bg-green-400' :
                order.payment_status === 'Refunded' ? 'bg-blue-400' :
                'bg-orange-400'
              }`} />
              {order.payment_status}
            </div>
            {order.razorpay_payment_id && (
              <div className="space-y-1">
                <p className="text-[8px] uppercase tracking-[0.2em] text-gray-600">Gateway ID</p>
                <p className="text-[10px] font-mono text-gray-400 break-all">{order.razorpay_payment_id}</p>
              </div>
            )}

            {/* Refund card inline */}
            {canRefund && (
              <div className="pt-4 border-t border-white/5 space-y-3">
                <button
                  onClick={handleRefund}
                  disabled={refunding}
                  className="w-full py-3 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-50 rounded-sm"
                >
                  <Undo2 size={12} className={refunding ? "animate-spin" : ""} />
                  {refunding ? "Processing Refund..." : `Refund ₹${order.total.toLocaleString('en-IN')}`}
                </button>
                <p className="text-[8px] text-gray-600 text-center uppercase tracking-widest">
                  Via Razorpay · Instant to original method
                </p>
              </div>
            )}

            {order.payment_status === "Refunded" && (
              <div className="pt-4 border-t border-white/5">
                <div className="flex items-center gap-2 text-[10px] text-blue-400 uppercase tracking-widest">
                  <CheckCircle2 size={12} />
                  Refund completed
                </div>
              </div>
            )}
          </div>

          {/* DISPATCH CONTROL */}
          <div className="bg-white/[0.02] border border-white/5 p-5 sm:p-8 space-y-6 rounded-sm">
            <h2 className="uppercase tracking-[0.3em] text-[10px] text-gray-500 flex items-center gap-3">
              <Truck size={14} />
              Logistics
            </h2>

            <button
              onClick={handleDispatchDelhivery}
              disabled={!canDispatch}
              className="w-full py-5 bg-gradient-to-r from-[#e8e8e3] to-[#d4d4cf] text-black disabled:opacity-30 disabled:grayscale uppercase tracking-[0.2em] text-[10px] font-bold transition-all shadow-[0_10px_20px_rgba(232,232,227,0.08)] hover:shadow-[0_10px_30px_rgba(232,232,227,0.15)] hover:from-white hover:to-[#e8e8e3] flex items-center justify-center gap-3 rounded-sm"
            >
              {dispatching ? (
                <>
                  <RefreshCcw size={14} className="animate-spin" />
                  Dispatching...
                </>
              ) : isDispatched ? (
                <>
                  <CheckCircle2 size={14} />
                  Dispatched via Delhivery
                </>
              ) : (
                <>
                  <Truck size={14} />
                  Dispatch via Delhivery
                </>
              )}
            </button>
            <p className="text-[9px] text-gray-600 text-center uppercase tracking-widest leading-relaxed px-4">
              {isDispatched ? "Shipment active — status updates via Delhivery webhook" : "Automated handoff — status managed by Delhivery"}
            </p>

            {/* Automation info */}
            <div className="pt-6 border-t border-white/10 space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-medium">Auto Status Updates</p>
                  <p className="text-[8px] text-gray-600 mt-0.5 tracking-wide">Delhivery webhooks update order status automatically</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-medium">Customer Notifications</p>
                  <p className="text-[8px] text-gray-600 mt-0.5 tracking-wide">Email sent on each status change</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-green-500/10 flex items-center justify-center shrink-0 mt-0.5">
                  <div className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                </div>
                <div>
                  <p className="text-[9px] uppercase tracking-widest text-gray-400 font-medium">Instant Refunds</p>
                  <p className="text-[8px] text-gray-600 mt-0.5 tracking-wide">Razorpay refund to original payment method</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
