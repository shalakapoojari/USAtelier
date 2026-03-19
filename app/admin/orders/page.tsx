"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { getApiBase } from "@/lib/api-base"

const API_BASE = getApiBase()

export default function OrdersPage() {
  const { isAuthLoading } = useAuth()
  const [orders, setOrders] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Don't fetch until authentication is complete
    if (isAuthLoading) {
      console.log("[Orders] Waiting for authentication...")
      return
    }

    const fetchOrders = async () => {
      try {
        console.log(`[Orders] Fetching from: ${API_BASE}/api/admin/orders`)
        const res = await fetch(`${API_BASE}/api/admin/orders`, {
          credentials: "include"
        })
        console.log(`[Orders] Response status: ${res.status}`)
        
        if (!res.ok) {
          const errorData = await res.json()
          console.error(`[Orders] Error response:`, errorData)
          setError(`Failed to load orders: ${res.status} ${res.statusText}`)
          setOrders([])
        } else {
          const data = await res.json()
          console.log(`[Orders] Received ${data.length} orders`)
          setOrders(data || [])
          setError(null)
        }
      } catch (err) {
        console.error("[Orders] Fetch error:", err)
        setError(`Failed to fetch orders: ${err instanceof Error ? err.message : String(err)}`)
        setOrders([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchOrders()
  }, [isAuthLoading])

  const [activeTab, setActiveTab] = useState<
    "all" | "pending" | "completed"
  >("all")

  const filteredOrders = orders.filter((order) => {
    if (activeTab === "pending")
      return order.status === "pending" || order.status === "processing"
    if (activeTab === "completed")
      return order.status === "shipped" || order.status === "delivered"
    return true
  })

  const tabBase =
    "uppercase tracking-widest text-xs pb-4 transition-colors"

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 sm:px-6 md:px-8 py-10 md:py-16">
      {/* ================= HEADER ================= */}
      <div className="max-w-350 mx-auto mb-14 md:mb-20">
        <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4">
          Admin
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light">
          Orders
        </h1>
        <p className="mt-4 text-sm tracking-widest text-gray-500">
          Manage and track all customer orders.
        </p>
      </div>

      {/* ================= TABS ================= */}
      <div className="max-w-350 mx-auto flex gap-8 md:gap-12 border-b border-white/10 mb-12 md:mb-16 overflow-x-auto whitespace-nowrap">
        <button
          onClick={() => setActiveTab("all")}
          className={`${tabBase} ${activeTab === "all"
              ? "text-white border-b border-white"
              : "text-gray-500 hover:text-white"
            }`}
        >
          All ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab("pending")}
          className={`${tabBase} ${activeTab === "pending"
              ? "text-white border-b border-white"
              : "text-gray-500 hover:text-white"
            }`}
        >
          Pending (
          {
            orders.filter(
              (o) =>
                o.status === "pending" ||
                o.status === "processing"
            ).length
          }
          )
        </button>

        <button
          onClick={() => setActiveTab("completed")}
          className={`${tabBase} ${activeTab === "completed"
              ? "text-white border-b border-white"
              : "text-gray-500 hover:text-white"
            }`}
        >
          Completed (
          {
            orders.filter(
              (o) =>
                o.status === "shipped" ||
                o.status === "delivered"
            ).length
          }
          )
        </button>
      </div>

      {/* ================= TABLE ================= */}
      <div className="max-w-350 mx-auto border border-white/10 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {[
                "Order",
                "Customer",
                "Date",
                "Items",
                "Total",
                "Status",
                "",
              ].map((h) => (
                <th
                  key={h}
                  className="px-4 md:px-8 py-4 md:py-6 text-left text-xs uppercase tracking-widest text-gray-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {filteredOrders.map((order, i) => (
              <tr
                key={order.id}
                className={`border-b border-white/5 hover:bg-white/4 transition-colors ${i % 2 === 0 ? "bg-white/2" : ""
                  }`}
              >
                <td className="px-4 md:px-8 py-4 md:py-6 font-medium">
                  {order.order_number || order.id}
                </td>

                <td className="px-4 md:px-8 py-4 md:py-6">
                  <p className="font-medium">
                    {order.customerName}
                  </p>
                  <p className="text-xs tracking-widest text-gray-500 mt-1">
                    {order.customerEmail}
                  </p>
                </td>

                <td className="px-4 md:px-8 py-4 md:py-6 text-xs tracking-widest text-gray-500">
                  {new Date(order.date || order.createdAt || Date.now()).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                </td>

                <td className="px-4 md:px-8 py-4 md:py-6">
                  {(order.items || []).length}
                </td>

                <td className="px-4 md:px-8 py-4 md:py-6 font-medium">
                  ₹{(order.total ?? 0).toLocaleString('en-IN')}
                </td>

                <td className="px-4 md:px-8 py-4 md:py-6 uppercase tracking-widest text-xs text-gray-400">
                  {order.status}
                </td>

                <td className="px-4 md:px-8 py-4 md:py-6 text-right">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="uppercase tracking-widest text-xs text-gray-400 hover:text-white transition-colors"
                  >
                    View
                  </Link>
                </td>
              </tr>
            ))}

            {isLoading ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-8 py-24 text-center text-sm tracking-widest text-gray-500 animate-pulse"
                >
                  Loading orders...
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-8 py-24 text-center text-sm tracking-widest text-red-400"
                >
                  Error: {error}
                </td>
              </tr>
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="px-8 py-24 text-center text-sm tracking-widest text-gray-500"
                >
                  No orders found.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  )
}
