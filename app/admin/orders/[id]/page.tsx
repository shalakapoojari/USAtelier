"use client"

import { useState } from "react"
import { use } from "react"
import { orders } from "@/lib/data"
import Link from "next/link"

export default function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const order = orders.find((o) => o.id === id)
  const [status, setStatus] = useState(order?.status)

  const handleUpdateStatus = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/orders/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      const data = await response.json();
      if (data.success) {
        alert("Status updated and email sent.");
      } else {
        alert("Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to update status.");
    }
  };

  const handleDispatchBorzo = async () => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/orders/${id}/dispatch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const data = await response.json();
      if (data.success) {
        alert("Order Dispatched via Borzo!\nTracking Link: " + data.tracking_url);
        setStatus("Shipped" as any);
      } else {
        alert("Borzo Error: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Failed to dispatch order.");
    }
  };

  if (!order) {
    return (
      <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-8 py-16">
        <Link
          href="/admin/orders"
          className="uppercase tracking-widest text-xs text-gray-500"
        >
          ← Back to Orders
        </Link>
        <p className="mt-12">Order not found.</p>
      </div>
    )
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-8 py-16">
      <div className="max-w-[1200px] mx-auto space-y-16">
        {/* ================= HEADER ================= */}
        <div>
          <Link
            href="/admin/orders"
            className="uppercase tracking-widest text-xs text-gray-500"
          >
            ← Back to Orders
          </Link>

          <h1 className="font-serif text-5xl font-light mt-8">
            Order {order.id}
          </h1>
          <p className="mt-4 text-sm tracking-widest text-gray-500">
            Placed on{" "}
            {new Date(order.date).toLocaleDateString()}
          </p>
        </div>

        {/* ================= GRID ================= */}
        <div className="grid lg:grid-cols-3 gap-16">
          {/* ITEMS */}
          <div className="lg:col-span-2 space-y-12 border border-white/10 p-10">
            <h2 className="uppercase tracking-widest text-xs text-gray-400">
              Items
            </h2>

            {order.items.map((item, i) => (
              <div
                key={i}
                className="flex justify-between border-b border-white/10 pb-6"
              >
                <div>
                  <p className="font-medium">
                    {item.productName}
                  </p>
                  <p className="text-xs tracking-widest text-gray-500 mt-1">
                    Size {item.size} × {item.quantity}
                  </p>
                </div>
                <p className="font-medium">
                  ₹{(item.price * item.quantity).toLocaleString('en-IN')}
                </p>
              </div>
            ))}

            <div className="pt-6 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Subtotal
                </span>
                <span>₹{order.subtotal.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">
                  Shipping
                </span>
                <span>₹{order.shipping.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-lg font-medium pt-4">
                <span>Total</span>
                <span>₹{order.total.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="space-y-12">
            {/* CUSTOMER */}
            <div className="border border-white/10 p-10">
              <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-6">
                Customer
              </h2>
              <p className="font-medium">
                {order.customerName}
              </p>
              <p className="text-xs tracking-widest text-gray-500 mt-2">
                {order.customerEmail}
              </p>
              <p className="text-xs tracking-widest text-gray-500 mt-4">
                ID: {order.customerId}
              </p>
            </div>

            {/* STATUS */}
            <div className="border border-white/10 p-10">
              <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-6">
                Status
              </h2>

              <select
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as any)
                }
                className="w-full bg-transparent border border-white/20 px-4 py-3 text-sm tracking-widest"
              >
                <option value="pending">Pending</option>
                <option value="processing">Processing</option>
                <option value="shipped">Shipped</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </select>

              <button
                onClick={handleUpdateStatus}
                className="w-full mt-6 border border-white/40 py-4 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
              >
                Update Status
              </button>

              <div className="mt-8 pt-6 border-t border-white/10">
                <button
                  onClick={handleDispatchBorzo}
                  disabled={status === 'delivered' || status === 'cancelled' || status === 'shipped'}
                  className="w-full py-4 bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)] disabled:opacity-50 disabled:grayscale uppercase tracking-widest text-xs font-bold transition-all"
                >
                  Dispatch via Wefast
                </button>
                <p className="text-[10px] text-gray-500 mt-3 text-center uppercase tracking-widest leading-relaxed">
                  Automatically calls a Borzo courier to pickup and deliver this order.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
