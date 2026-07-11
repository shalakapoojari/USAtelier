"use client"

import { useEffect, useState } from "react"
import { BadgePercent, Trash2, Eye, EyeOff, ToggleLeft, ToggleRight } from "lucide-react"
import { getApiBase, apiFetch } from "@/lib/api-base"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type CouponType = "standard" | "buy_n_get_n" | "influencer"

type Coupon = {
  id: number
  code: string
  coupon_type: CouponType
  discount_type: "percent" | "fixed" | "buy_n_get_n"
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  uses: number
  expires_at: string | null
  is_active: boolean
  buy_quantity: number | null
  get_quantity: number | null
  max_free_item_value: number | null
  visibility: "hidden" | "visible"
  influencer_name: string | null
}

const emptyForm = {
  code: "",
  coupon_type: "standard" as CouponType,
  discount_type: "percent",
  discount_value: "",
  min_order_amount: "0",
  max_uses: "",
  expires_at: "",
  buy_quantity: "",
  get_quantity: "",
  max_free_item_value: "",
  visibility: "hidden",
  influencer_name: "",
}

function CouponTypeBadge({ type }: { type: CouponType }) {
  const map: Record<CouponType, { label: string; cls: string }> = {
    standard: { label: "Standard", cls: "text-gray-400 border-white/10" },
    buy_n_get_n: { label: "Buy N Get N", cls: "text-emerald-400 border-emerald-400/30" },
    influencer: { label: "Influencer", cls: "text-violet-400 border-violet-400/30" },
  }
  const { label, cls } = map[type] || map.standard
  return (
    <span className={`border px-2 py-0.5 text-[9px] uppercase tracking-widest ${cls}`}>
      {label}
    </span>
  )
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const loadCoupons = async () => {
    setLoading(true)
    try {
      const res = await apiFetch(getApiBase(), "/api/admin/coupons")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load coupons")
      setCoupons(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || "Failed to load coupons")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCoupons() }, [])

  const f = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }))

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const payload: any = {
        code: form.code,
        coupon_type: form.coupon_type,
        min_order_amount: Number(form.min_order_amount || 0),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        is_active: true,
        visibility: form.visibility,
      }
      if (form.coupon_type === "buy_n_get_n") {
        payload.buy_quantity = form.buy_quantity ? Number(form.buy_quantity) : 2
        payload.get_quantity = form.get_quantity ? Number(form.get_quantity) : 1
        payload.max_free_item_value = form.max_free_item_value ? Number(form.max_free_item_value) : null
        payload.discount_type = "buy_n_get_n"
        payload.discount_value = 0
      } else {
        payload.discount_type = form.discount_type
        payload.discount_value = Number(form.discount_value)
      }
      if (form.coupon_type === "influencer") {
        payload.influencer_name = form.influencer_name || null
      }
      const res = await apiFetch(getApiBase(), "/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create coupon")
      setCoupons(prev => [data.coupon, ...prev])
      setForm(emptyForm)
    } catch (err: any) {
      setError(err.message || "Failed to create coupon")
    } finally {
      setSaving(false)
    }
  }

  const deleteCoupon = async (id: number) => {
    if (!confirm("Delete this coupon?")) return
    try {
      const res = await apiFetch(getApiBase(), `/api/admin/coupons/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete coupon")
      setCoupons(prev => prev.filter(c => c.id !== id))
    } catch (err: any) {
      setError(err.message || "Failed to delete coupon")
    }
  }

  const toggleActive = async (coupon: Coupon) => {
    try {
      const res = await apiFetch(getApiBase(), `/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !coupon.is_active }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update coupon")
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, is_active: !coupon.is_active } : c))
    } catch (err: any) {
      setError(err.message || "Update failed")
    }
  }

  const toggleVisibility = async (coupon: Coupon) => {
    const next = coupon.visibility === "visible" ? "hidden" : "visible"
    try {
      const res = await apiFetch(getApiBase(), `/api/admin/coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: next }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update visibility")
      setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, visibility: next } : c))
    } catch (err: any) {
      setError(err.message || "Update failed")
    }
  }

  const discountLabel = (c: Coupon) => {
    if (c.coupon_type === "buy_n_get_n") return `Buy ${c.buy_quantity} Get ${c.get_quantity} Free${c.max_free_item_value ? ` up to ₹${c.max_free_item_value.toLocaleString("en-IN")}` : ""}`
    return c.discount_type === "percent" ? `${c.discount_value}%` : `₹${c.discount_value.toLocaleString("en-IN")}`
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 sm:px-6 md:px-8 py-10 md:py-16">
      <div className="max-w-[1400px] mx-auto mb-14">
        <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4">Admin</p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light">Coupons</h1>
        <p className="mt-4 text-sm tracking-widest text-gray-500">Create discount codes, Buy N Get N offers, and influencer codes.</p>
      </div>

      <div className="max-w-[1400px] mx-auto grid lg:grid-cols-[460px_1fr] gap-8 md:gap-12 items-start">
        {/* ── CREATE FORM ─────────────────────────────── */}
        <form onSubmit={createCoupon} className="border border-white/10 p-5 md:p-8 space-y-5 sticky top-8">
          <h2 className="uppercase tracking-widest text-xs text-gray-400 flex items-center gap-3">
            <BadgePercent size={14} /> New Coupon
          </h2>

          <Input value={form.code} onChange={e => f("code", e.target.value.toUpperCase())}
            placeholder="Coupon code (e.g. SUMMER20)"
            className="bg-transparent border-white/20 text-white uppercase font-mono tracking-widest" required />

          {/* Coupon type */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Type</p>
            <div className="grid grid-cols-3 gap-2">
              {(["standard", "buy_n_get_n", "influencer"] as CouponType[]).map(t => (
                <button key={t} type="button"
                  onClick={() => f("coupon_type", t)}
                  className={`py-2 text-[10px] uppercase tracking-widest border transition-all ${form.coupon_type === t ? "border-white text-white bg-white/5" : "border-white/15 text-white/40 hover:text-white hover:border-white/30"}`}>
                  {t === "buy_n_get_n" ? "Buy N Get N" : t}
                </button>
              ))}
            </div>
          </div>

          {/* Standard / Influencer — discount */}
          {form.coupon_type !== "buy_n_get_n" && (
            <div className="grid grid-cols-2 gap-3">
              <select value={form.discount_type} onChange={e => f("discount_type", e.target.value)}
                className="h-10 bg-[#030303] border border-white/20 px-3 text-sm text-white">
                <option value="percent">Percent (%)</option>
                <option value="fixed">Fixed (₹)</option>
              </select>
              <Input value={form.discount_value} onChange={e => f("discount_value", e.target.value)}
                placeholder={form.discount_type === "percent" ? "e.g. 20" : "e.g. 500"}
                type="number" min="0"
                className="bg-transparent border-white/20 text-white" required />
            </div>
          )}

          {/* Buy N Get N */}
          {form.coupon_type === "buy_n_get_n" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Buy Qty (N)</p>
                  <Input value={form.buy_quantity} onChange={e => f("buy_quantity", e.target.value)}
                    placeholder="e.g. 2" type="number" min="1"
                    className="bg-transparent border-white/20 text-white" />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Get Qty Free</p>
                  <Input value={form.get_quantity} onChange={e => f("get_quantity", e.target.value)}
                    placeholder="e.g. 1" type="number" min="1"
                    className="bg-transparent border-white/20 text-white" />
                </div>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Max Free Item Value (₹)</p>
                <Input value={form.max_free_item_value} onChange={e => f("max_free_item_value", e.target.value)}
                  placeholder="e.g. 699" type="number" min="0"
                  className="bg-transparent border-white/20 text-white" />
                <p className="text-[9px] text-white/30 mt-1.5 leading-relaxed">Items priced above this value are not free and remain fully payable.</p>
              </div>
            </div>
          )}

          {/* Influencer name */}
          {form.coupon_type === "influencer" && (
            <Input value={form.influencer_name} onChange={e => f("influencer_name", e.target.value)}
              placeholder="Influencer name / handle"
              className="bg-transparent border-white/20 text-white" />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input value={form.min_order_amount} onChange={e => f("min_order_amount", e.target.value)}
              placeholder="Min order (₹)" type="number" min="0"
              className="bg-transparent border-white/20 text-white" />
            <Input value={form.max_uses} onChange={e => f("max_uses", e.target.value)}
              placeholder="Max uses (blank=∞)" type="number" min="1"
              className="bg-transparent border-white/20 text-white" />
          </div>

          <Input value={form.expires_at} onChange={e => f("expires_at", e.target.value)}
            type="date" className="bg-transparent border-white/20 text-white" />

          {/* Visibility */}
          <div>
            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Visibility at Checkout</p>
            <div className="grid grid-cols-2 gap-2">
              {(["hidden", "visible"] as const).map(v => (
                <button key={v} type="button"
                  onClick={() => f("visibility", v)}
                  className={`py-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-widest border transition-all ${form.visibility === v ? "border-white text-white bg-white/5" : "border-white/15 text-white/40 hover:text-white hover:border-white/30"}`}>
                  {v === "hidden" ? <EyeOff size={11} /> : <Eye size={11} />}
                  {v}
                </button>
              ))}
            </div>
            <p className="text-[9px] text-white/30 mt-1.5 leading-relaxed">
              {form.visibility === "visible" ? "Auto-shown at checkout when cart qualifies (min order or Buy N qty)." : "Hidden — customer must enter manually."}
            </p>
          </div>

          {error && <p className="text-[10px] uppercase tracking-widest text-amber-400">{error}</p>}

          <Button disabled={saving}
            className="w-full border border-white/40 bg-transparent uppercase tracking-widest text-xs hover:bg-white hover:text-black h-12">
            {saving ? "Creating…" : "Create Coupon"}
          </Button>
        </form>

        {/* ── TABLE ────────────────────────────────────── */}
        <div className="border border-white/10 overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/10">
                {["Code", "Type", "Discount", "Min Order", "Usage", "Visibility", "Active", "Expires", ""].map(h => (
                  <th key={h} className="px-4 py-4 text-left text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map(coupon => (
                <tr key={coupon.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-4">
                    <span className="font-mono font-medium tracking-widest text-sm">{coupon.code}</span>
                  </td>
                  <td className="px-4 py-4">
                    <CouponTypeBadge type={coupon.coupon_type as CouponType || "standard"} />
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-400 whitespace-nowrap">{discountLabel(coupon)}</td>
                  <td className="px-4 py-4 text-sm text-gray-400">₹{(coupon.min_order_amount || 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 py-4 text-sm text-gray-400 whitespace-nowrap">
                    {coupon.uses || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                  </td>
                  <td className="px-4 py-4">
                    <button type="button" onClick={() => toggleVisibility(coupon)}
                      className={`flex items-center gap-1.5 text-[10px] uppercase tracking-widest transition-colors ${coupon.visibility === "visible" ? "text-emerald-400 hover:text-emerald-300" : "text-white/30 hover:text-white/60"}`}
                      title={coupon.visibility === "visible" ? "Auto-shown at checkout" : "Hidden — manual entry only"}>
                      {coupon.visibility === "visible" ? <Eye size={12} /> : <EyeOff size={12} />}
                      {coupon.visibility}
                    </button>
                  </td>
                  <td className="px-4 py-4">
                    <button type="button" onClick={() => toggleActive(coupon)}
                      className={`transition-colors ${coupon.is_active ? "text-white/60 hover:text-white" : "text-white/20 hover:text-white/40"}`}
                      title={coupon.is_active ? "Active — click to disable" : "Disabled — click to enable"}>
                      {coupon.is_active ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                    </button>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-400 whitespace-nowrap">
                    {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button type="button" onClick={() => deleteCoupon(coupon.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors" aria-label={`Delete ${coupon.code}`}>
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {loading ? (
                <tr><td colSpan={9} className="px-6 py-20 text-center text-xs uppercase tracking-widest text-gray-500 animate-pulse">Loading coupons…</td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={9} className="px-6 py-20 text-center text-xs uppercase tracking-widest text-gray-500">No coupons yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
