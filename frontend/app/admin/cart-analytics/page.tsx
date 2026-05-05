"use client"

import { useState, useEffect, useCallback } from "react"
import { getApiBase, apiFetch } from "@/lib/api-base"
import {
  ShoppingCart, BarChart3, Users, Mail, Settings2,
  TrendingDown, TrendingUp, RefreshCcw, ChevronRight,
  X, CheckCircle2, XCircle, AlertCircle, Package,
  ToggleLeft, ToggleRight, Send,
} from "lucide-react"

const API_BASE = getApiBase()

const RANGES = [
  { label: "All Time", value: "all" },
  { label: "Today",    value: "today" },
  { label: "Last 7d",  value: "7d" },
  { label: "Last 30d", value: "30d" },
]
const SORTS = [
  { label: "Most Added",       value: "total_adds" },
  { label: "Most Removed",     value: "total_removes" },
  { label: "Highest Abandon",  value: "abandonment_rate" },
  { label: "Best Conversion",  value: "conversion_rate" },
]

type ProductRow = {
  product_id: number
  product_name: string
  product_image: string
  total_adds: number
  total_removes: number
  total_checkouts: number
  conversion_rate: number
  abandonment_rate: number
}

type Summary = {
  active_carts: number
  total_cart_value: number
  avg_abandonment_rate: number
  top_abandoned: { product_id: number; product_name: string; abandon_count: number }[]
}

type DrillUser = {
  user_email: string
  user_name: string
  quantity: number
  size: string
  hours_in_cart: number
}

type EmailLog = {
  id: number
  user_email: string
  item_count: number
  total_value: number
  sent_at: string
  reminder_count: number
  converted: boolean
  email_status: string
}

type CartSettingsType = {
  abandonment_emails_on: boolean
  first_email_delay_hours: number
  second_email_delay_hours: number
  discount_code_enabled: boolean
  discount_code: string | null
}

type ActiveTab = "analytics" | "settings" | "emails"

export default function CartAnalyticsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("analytics")
  const [range,    setRange]    = useState("all")
  const [sort,     setSort]     = useState("total_adds")
  const [products, setProducts] = useState<ProductRow[]>([])
  const [summary,  setSummary]  = useState<Summary | null>(null)
  const [loading,  setLoading]  = useState(true)
  const [drillProduct, setDrillProduct] = useState<ProductRow | null>(null)
  const [drillUsers,   setDrillUsers]   = useState<DrillUser[]>([])
  const [drillLoading, setDrillLoading] = useState(false)
  const [emailLog,  setEmailLog]  = useState<EmailLog[]>([])
  const [settings,  setSettings]  = useState<CartSettingsType | null>(null)
  const [saving,    setSaving]    = useState(false)
  const [triggerLoading, setTriggerLoading] = useState(false)
  const [triggerResult,  setTriggerResult]  = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [prodRes, sumRes] = await Promise.all([
        apiFetch(API_BASE, `/api/admin/cart-analytics?range=${range}&sort=${sort}`),
        apiFetch(API_BASE, `/api/admin/cart-analytics/summary`),
      ])
      if (prodRes.ok) setProducts(await prodRes.json())
      if (sumRes.ok)  setSummary(await sumRes.json())
    } finally {
      setLoading(false)
    }
  }, [range, sort])

  const fetchSettings = useCallback(async () => {
    const res = await apiFetch(API_BASE, "/api/admin/cart-settings")
    if (res.ok) setSettings(await res.json())
  }, [])

  const fetchEmails = useCallback(async () => {
    const res = await apiFetch(API_BASE, "/api/admin/abandoned-emails")
    if (res.ok) setEmailLog(await res.json())
  }, [])

  useEffect(() => { fetchData() }, [fetchData])
  useEffect(() => { fetchSettings() }, [fetchSettings])
  useEffect(() => { if (activeTab === "emails") fetchEmails() }, [activeTab, fetchEmails])

  const openDrill = async (product: ProductRow) => {
    setDrillProduct(product)
    setDrillLoading(true)
    const res = await apiFetch(API_BASE, `/api/admin/cart-analytics/users/${product.product_id}`)
    if (res.ok) setDrillUsers(await res.json())
    setDrillLoading(false)
  }

  const saveSettings = async () => {
    if (!settings) return
    setSaving(true)
    await apiFetch(API_BASE, "/api/admin/cart-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    })
    setSaving(false)
  }

  const triggerJob = async () => {
    setTriggerLoading(true)
    setTriggerResult(null)
    const res = await apiFetch(API_BASE, "/api/internal/run-abandoned-cart", { method: "POST" })
    if (res.ok) {
      const d = await res.json()
      setTriggerResult(`✅ Sent: ${d.sent} · Skipped: ${d.skipped} · Errors: ${d.errors}`)
    } else {
      setTriggerResult("❌ Failed to run job")
    }
    setTriggerLoading(false)
  }

  const tabBtn = (t: ActiveTab, label: string, Icon: any) => (
    <button
      onClick={() => setActiveTab(t)}
      className={`flex items-center gap-2 px-5 py-3 text-[10px] uppercase tracking-widest border-b-2 transition-all ${
        activeTab === t ? "border-white text-white" : "border-transparent text-gray-500 hover:text-white"
      }`}
    >
      <Icon size={12} />
      {label}
    </button>
  )

  return (
    <div className="p-6 lg:p-12 max-w-7xl mx-auto space-y-10">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
        <div>
          <h1 className="font-serif text-4xl tracking-widest mb-2 uppercase text-[#e8e8e3]">Cart Analytics</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.3em]">Live cart behaviour & recovery</p>
        </div>
        <button onClick={fetchData} className="p-3 border border-white/10 hover:bg-white/5 transition-all">
          <RefreshCcw size={14} className={`text-gray-400 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Active Carts",     value: summary.active_carts,                      icon: ShoppingCart, color: "text-blue-400" },
            { label: "Total Cart Value", value: `₹${summary.total_cart_value.toLocaleString()}`, icon: Package,     color: "text-green-400" },
            { label: "Avg Abandonment",  value: `${summary.avg_abandonment_rate}%`,          icon: TrendingDown, color: "text-red-400" },
            { label: "Top Abandoned",    value: summary.top_abandoned[0]?.product_name || "—", icon: BarChart3, color: "text-amber-400" },
          ].map((c) => (
            <div key={c.label} className="bg-white/[0.02] border border-white/5 p-6 space-y-3">
              <div className={`flex items-center gap-2 ${c.color}`}>
                <c.icon size={13} />
                <span className="text-[9px] uppercase tracking-[0.25em] text-gray-500">{c.label}</span>
              </div>
              <p className="text-xl font-serif text-[#e8e8e3] truncate">{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Top 3 abandoned */}
      {summary && summary.top_abandoned.length > 0 && (
        <div className="bg-white/[0.02] border border-white/5 p-6">
          <p className="text-[9px] uppercase tracking-[0.3em] text-gray-500 mb-4">Top Abandoned Products</p>
          <div className="flex flex-wrap gap-3">
            {summary.top_abandoned.map((p, i) => (
              <span key={p.product_id} className="flex items-center gap-2 px-4 py-2 border border-white/10 text-xs text-gray-300">
                <span className="text-gray-600 font-mono">#{i + 1}</span>
                {p.product_name}
                <span className="text-red-400">{p.abandon_count}×</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-white/10 gap-2">
        {tabBtn("analytics", "Product Analytics", BarChart3)}
        {tabBtn("settings",  "Email Settings",    Settings2)}
        {tabBtn("emails",    "Email Log",          Mail)}
      </div>

      {/* ─────────────── ANALYTICS TAB ─────────────── */}
      {activeTab === "analytics" && (
        <>
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1">
              {RANGES.map(r => (
                <button key={r.value} onClick={() => setRange(r.value)}
                  className={`px-4 py-2 text-[9px] uppercase tracking-widest border transition-all ${range === r.value ? "bg-white text-black border-white" : "border-white/10 text-gray-500 hover:text-white"}`}>
                  {r.label}
                </button>
              ))}
            </div>
            <select value={sort} onChange={e => setSort(e.target.value)}
              className="bg-transparent border border-white/10 text-[9px] uppercase tracking-widest text-gray-400 px-3 py-2 outline-none">
              {SORTS.map(s => <option key={s.value} value={s.value} className="bg-[#111]">{s.label}</option>)}
            </select>
          </div>

          {/* Product table */}
          <div className="bg-white/[0.02] border border-white/5 overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.25em] text-gray-500">
                  <th className="p-5">Product</th>
                  <th className="p-5 text-right">Added</th>
                  <th className="p-5 text-right">Removed</th>
                  <th className="p-5 text-right">In Cart</th>
                  <th className="p-5 text-right">Conversion</th>
                  <th className="p-5 text-right">Abandonment</th>
                  <th className="p-5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {loading ? (
                  <tr><td colSpan={7} className="p-12 text-center text-gray-600 text-xs animate-pulse">Loading...</td></tr>
                ) : products.length === 0 ? (
                  <tr><td colSpan={7} className="p-12 text-center text-gray-600 text-[10px] uppercase tracking-widest">No cart events yet</td></tr>
                ) : products.map(p => (
                  <tr key={p.product_id} className="hover:bg-white/[0.03] transition-colors group cursor-pointer"
                    onClick={() => openDrill(p)}>
                    <td className="p-5">
                      <div className="flex items-center gap-4">
                        {p.product_image && (
                          <img src={p.product_image} alt={p.product_name}
                            className="w-10 h-12 object-cover bg-white/5 shrink-0" />
                        )}
                        <span className="text-sm text-[#e8e8e3] font-light">{p.product_name}</span>
                      </div>
                    </td>
                    <td className="p-5 text-right text-sm font-mono text-green-400">{p.total_adds}</td>
                    <td className="p-5 text-right text-sm font-mono text-red-400">{p.total_removes}</td>
                    <td className="p-5 text-right text-sm font-mono text-blue-400">{p.total_checkouts}</td>
                    <td className="p-5 text-right">
                      <span className={`text-sm font-mono ${p.conversion_rate >= 50 ? "text-green-400" : "text-amber-400"}`}>
                        {p.conversion_rate}%
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <span className={`text-sm font-mono ${p.abandonment_rate >= 70 ? "text-red-400" : "text-gray-400"}`}>
                        {p.abandonment_rate}%
                      </span>
                    </td>
                    <td className="p-5 text-right">
                      <ChevronRight size={14} className="text-gray-600 group-hover:text-white transition-colors" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ─────────────── SETTINGS TAB ─────────────── */}
      {activeTab === "settings" && settings && (
        <div className="max-w-xl space-y-8">
          {/* Toggle emails */}
          <div className="flex items-center justify-between p-6 bg-white/[0.02] border border-white/5">
            <div>
              <p className="text-sm text-[#e8e8e3]">Abandonment Emails</p>
              <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Send recovery emails to cart abandoners</p>
            </div>
            <button onClick={() => setSettings(s => s ? {...s, abandonment_emails_on: !s.abandonment_emails_on} : s)}>
              {settings.abandonment_emails_on
                ? <ToggleRight size={28} className="text-green-400" />
                : <ToggleLeft  size={28} className="text-gray-600" />}
            </button>
          </div>

          {/* Delay */}
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <label className="block text-[9px] uppercase tracking-[0.3em] text-gray-500 mb-2">First Email Delay (hours)</label>
                <input type="number" min={0} max={72} value={settings.first_email_delay_hours}
                  onChange={e => setSettings(s => s ? {...s, first_email_delay_hours: parseInt(e.target.value) || 1} : s)}
                  className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-[#e8e8e3] outline-none focus:border-white/30" />
              </div>
              <div className="flex-1">
                <label className="block text-[9px] uppercase tracking-[0.3em] text-gray-500 mb-2">Second Email Delay (hours)</label>
                <input type="number" min={1} max={168} value={settings.second_email_delay_hours}
                  onChange={e => setSettings(s => s ? {...s, second_email_delay_hours: parseInt(e.target.value) || 24} : s)}
                  className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-[#e8e8e3] outline-none focus:border-white/30" />
              </div>
            </div>
          </div>

          {/* Discount code */}
          <div className="p-6 bg-white/[0.02] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#e8e8e3]">Include Discount Code</p>
                <p className="text-[10px] text-gray-500 mt-1 uppercase tracking-widest">Show a promo code in the email</p>
              </div>
              <button onClick={() => setSettings(s => s ? {...s, discount_code_enabled: !s.discount_code_enabled} : s)}>
                {settings.discount_code_enabled
                  ? <ToggleRight size={28} className="text-amber-400" />
                  : <ToggleLeft  size={28} className="text-gray-600" />}
              </button>
            </div>
            {settings.discount_code_enabled && (
              <input type="text" placeholder="e.g. COMEBACK10"
                value={settings.discount_code || ""}
                onChange={e => setSettings(s => s ? {...s, discount_code: e.target.value} : s)}
                className="w-full bg-white/[0.03] border border-white/10 px-4 py-3 text-sm text-[#e8e8e3] outline-none focus:border-white/30 uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal" />
            )}
          </div>

          <div className="flex items-center gap-4">
            <button onClick={saveSettings} disabled={saving}
              className="px-8 py-3 border border-white text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-50">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>

          {/* Manual trigger */}
          <div className="pt-6 border-t border-white/5">
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mb-4">Manual Trigger (for testing)</p>
            <div className="flex items-center gap-4 flex-wrap">
              <button onClick={triggerJob} disabled={triggerLoading}
                className="flex items-center gap-2 px-6 py-3 border border-amber-500/30 text-amber-400 text-[10px] uppercase tracking-widest hover:bg-amber-500/10 transition-all disabled:opacity-50">
                <Send size={11} className={triggerLoading ? "animate-pulse" : ""} />
                {triggerLoading ? "Running..." : "Run Abandonment Job Now"}
              </button>
              {triggerResult && <p className="text-xs text-gray-400">{triggerResult}</p>}
            </div>
            <p className="mt-3 text-[9px] text-gray-600 uppercase tracking-widest">
              In production: schedule `POST {typeof window !== "undefined" ? window.location.origin.replace("usatelier.in", "api.usatelier.in") : "https://api.usatelier.in"}/api/internal/run-abandoned-cart` hourly with header `X-Cron-Secret: YOUR_CRON_SECRET`
            </p>
          </div>
        </div>
      )}

      {/* ─────────────── EMAIL LOG TAB ─────────────── */}
      {activeTab === "emails" && (
        <div className="bg-white/[0.02] border border-white/5 overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.25em] text-gray-500">
                <th className="p-5">User</th>
                <th className="p-5 text-right">Items</th>
                <th className="p-5 text-right">Value</th>
                <th className="p-5 text-right">Reminder #</th>
                <th className="p-5 text-right">Sent At</th>
                <th className="p-5 text-right">Status</th>
                <th className="p-5 text-right">Converted</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {emailLog.length === 0 ? (
                <tr><td colSpan={7} className="p-12 text-center text-gray-600 text-[10px] uppercase tracking-widest">No emails sent yet</td></tr>
              ) : emailLog.map(e => (
                <tr key={e.id} className="hover:bg-white/[0.02] transition-colors">
                  <td className="p-5 text-xs text-gray-300 font-mono">{e.user_email}</td>
                  <td className="p-5 text-right text-xs text-gray-400">{e.item_count}</td>
                  <td className="p-5 text-right text-xs text-gray-400">₹{e.total_value.toLocaleString()}</td>
                  <td className="p-5 text-right">
                    <span className="text-[9px] uppercase tracking-widest text-gray-500">#{e.reminder_count}</span>
                  </td>
                  <td className="p-5 text-right text-[9px] text-gray-500">
                    {new Date(e.sent_at).toLocaleDateString()}<br />
                    <span className="opacity-50">{new Date(e.sent_at).toLocaleTimeString()}</span>
                  </td>
                  <td className="p-5 text-right">
                    {e.email_status === "sent"
                      ? <CheckCircle2 size={12} className="text-green-400 ml-auto" />
                      : <XCircle      size={12} className="text-red-400 ml-auto" />}
                  </td>
                  <td className="p-5 text-right">
                    {e.converted
                      ? <span className="text-[9px] text-green-400 uppercase tracking-widest">Yes</span>
                      : <span className="text-[9px] text-gray-600 uppercase tracking-widest">No</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ─────────────── DRILL-DOWN PANEL ─────────────── */}
      {drillProduct && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDrillProduct(null)} />
          <div className="relative z-10 w-full max-w-md bg-[#0a0a0a] border-l border-white/10 h-full overflow-y-auto flex flex-col">
            <div className="flex items-start justify-between p-6 border-b border-white/10">
              <div>
                <p className="text-[9px] uppercase tracking-[0.3em] text-gray-500 mb-1">Users with this in cart</p>
                <h2 className="font-serif text-lg text-[#e8e8e3]">{drillProduct.product_name}</h2>
              </div>
              <button onClick={() => setDrillProduct(null)} className="text-gray-500 hover:text-white transition-colors mt-1">
                <X size={18} />
              </button>
            </div>

            {/* Stats mini row */}
            <div className="grid grid-cols-3 border-b border-white/5">
              {[
                { label: "Adds",        value: drillProduct.total_adds,       color: "text-green-400" },
                { label: "Conversion",  value: `${drillProduct.conversion_rate}%`,  color: "text-blue-400" },
                { label: "Abandonment", value: `${drillProduct.abandonment_rate}%`, color: "text-red-400" },
              ].map(s => (
                <div key={s.label} className="p-4 text-center border-r border-white/5 last:border-0">
                  <p className={`text-lg font-serif ${s.color}`}>{s.value}</p>
                  <p className="text-[8px] uppercase tracking-widest text-gray-600 mt-1">{s.label}</p>
                </div>
              ))}
            </div>

            <div className="flex-1 p-6">
              {drillLoading ? (
                <p className="text-xs text-gray-500 animate-pulse text-center py-12">Loading users...</p>
              ) : drillUsers.length === 0 ? (
                <p className="text-[10px] uppercase tracking-widest text-gray-600 text-center py-12">
                  No active carts found for this product
                </p>
              ) : (
                <div className="space-y-3">
                  {drillUsers.map((u, i) => (
                    <div key={i} className="p-4 border border-white/5 bg-white/[0.02] space-y-1">
                      <div className="flex items-start justify-between">
                        <p className="text-sm text-[#e8e8e3]">{u.user_name || u.user_email}</p>
                        <span className={`text-[9px] uppercase tracking-widest px-2 py-0.5 border ${
                          u.hours_in_cart > 24 ? "border-red-500/30 text-red-400" :
                          u.hours_in_cart > 2  ? "border-amber-500/30 text-amber-400" :
                          "border-white/10 text-gray-500"
                        }`}>
                          {u.hours_in_cart}h
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-600 font-mono">{u.user_email}</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest">
                        Size {u.size} · Qty {u.quantity}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
