"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { getApiBase } from "@/lib/api-base"

export default function AdminDashboard() {
  const [orders, setOrders] = useState<any[]>([])
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const apiBase = getApiBase()
    Promise.all([
      fetch(`${apiBase}/api/admin/orders`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
      fetch(`${apiBase}/api/products`, { credentials: "include" }).then(r => r.ok ? r.json() : []),
    ])
      .then(([ordersData, productsData]) => {
        setOrders(Array.isArray(ordersData) ? ordersData : [])
        setProducts(Array.isArray(productsData) ? productsData : [])
      })
      .catch(() => { })
      .finally(() => setLoading(false))
  }, [])

  const revenue = orders.reduce((s: number, o: any) => s + (o.total || 0), 0)
  const totalOrders = orders.length
  const pendingOrders = orders.filter((o: any) => {
    const s = (o.status || "").toLowerCase()
    return !["shipped", "delivered", "cancelled", "refunded", "out for delivery", "returned"].includes(s)
  }).length
  const customers = new Set(orders.map((o: any) => o.user_id || o.customerId)).size
  const avgOrder = totalOrders > 0 ? revenue / totalOrders : 0

  const recentOrders = orders.slice(0, 6)

  // Build top products from order items
  const productSales = orders.reduce((acc: Record<string, number>, o: any) => {
    const items = o.items || []
    items.forEach((i: any) => {
      const key = i.productId || i.product_id_str || i.productName || ""
      acc[key] = (acc[key] || 0) + (i.quantity || 1)
    })
    return acc
  }, {})

  const topProducts = Object.entries(productSales)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([key, qty]) => {
      const product = products.find((p: any) =>
        String(p.id) === String(key) || p.name === key
      )
      return { name: product?.name || key, category: product?.category || "", qty }
    })
    .filter(p => p.name)

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 sm:px-6 md:px-8 py-10 md:py-16">
      {/* HEADER */}
      <div className="max-w-350 mx-auto mb-14 md:mb-20">
        <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4">
          Admin Overview
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light">
          Dashboard
        </h1>
        <p className="mt-4 text-sm tracking-widest text-gray-500">
          Store performance at a glance.
        </p>
      </div>

      {/* METRICS */}
      <div className="max-w-350 mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 mb-14 md:mb-24">
        {[
          ["Revenue", loading ? "—" : `₹${revenue.toLocaleString('en-IN')}`],
          ["Orders", loading ? "—" : totalOrders],
          ["Pending", loading ? "—" : pendingOrders],
          ["Customers", loading ? "—" : customers],
          ["Avg Order", loading ? "—" : `₹${avgOrder.toFixed(0)}`],
        ].map(([label, value]) => (
          <div key={label} className="border border-white/10 p-5 md:p-8">
            <p className="uppercase tracking-widest text-xs text-gray-500 mb-4">
              {label}
            </p>
            <p className="text-3xl font-light">{value}</p>
          </div>
        ))}
      </div>

      {/* GRID */}
      <div className="max-w-350 mx-auto grid lg:grid-cols-2 gap-8 md:gap-16">
        {/* RECENT ORDERS */}
        <div className="border border-white/10 p-5 md:p-10">
          <div className="flex justify-between items-center mb-10">
            <h2 className="uppercase tracking-widest text-xs text-gray-400">
              Recent Orders
            </h2>
            <Link
              href="/admin/orders"
              className="uppercase tracking-widest text-xs text-gray-500 hover:text-white"
            >
              View All
            </Link>
          </div>

          <div className="space-y-6">
            {loading ? (
              <p className="text-xs text-gray-500 tracking-widest animate-pulse">Loading...</p>
            ) : recentOrders.length === 0 ? (
              <p className="text-xs text-gray-500 tracking-widest">No orders yet.</p>
            ) : recentOrders.map((o, i) => (
              <div
                key={o.id || i}
                className="flex flex-col gap-2 sm:flex-row sm:justify-between border-b border-white/5 pb-4"
              >
                <div>
                  <p className="font-medium">{o.order_number || o.id}</p>
                  <p className="text-xs tracking-widest text-gray-500">
                    {o.customerName || o.customer_name || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">₹{(o.total ?? 0).toLocaleString('en-IN')}</p>
                  <p className="text-xs tracking-widest text-gray-500 uppercase">
                    {o.status}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* TOP PRODUCTS */}
        <div className="border border-white/10 p-5 md:p-10">
          <div className="flex justify-between items-center mb-10">
            <h2 className="uppercase tracking-widest text-xs text-gray-400">
              Top Products
            </h2>
            <Link
              href="/admin/products"
              className="uppercase tracking-widest text-xs text-gray-500 hover:text-white"
            >
              View All
            </Link>
          </div>

          <div className="space-y-6">
            {loading ? (
              <p className="text-xs text-gray-500 tracking-widest animate-pulse">Loading...</p>
            ) : topProducts.length === 0 ? (
              <p className="text-xs text-gray-500 tracking-widest">No sales data yet.</p>
            ) : topProducts.map((p, i) => (
              <div
                key={i}
                className="flex flex-col gap-2 sm:flex-row sm:justify-between border-b border-white/5 pb-4"
              >
                <div>
                  <p className="font-medium">
                    {i + 1}. {p.name}
                  </p>
                  <p className="text-xs tracking-widest text-gray-500">
                    {p.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-medium">{p.qty as number} sold</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
