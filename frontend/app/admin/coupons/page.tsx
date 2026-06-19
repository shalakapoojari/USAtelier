"use client"

import { useEffect, useState } from "react"
import { BadgePercent, Trash2 } from "lucide-react"
import { getApiBase, apiFetch } from "@/lib/api-base"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

type Coupon = {
  id: number
  code: string
  discount_type: "percent" | "fixed"
  discount_value: number
  min_order_amount: number
  max_uses: number | null
  uses: number
  expires_at: string | null
  is_active: boolean
}

const emptyForm = {
  code: "",
  discount_type: "percent",
  discount_value: "",
  min_order_amount: "0",
  max_uses: "",
  expires_at: "",
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [form, setForm] = useState(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const loadCoupons = async () => {
    const apiBase = getApiBase()
    setLoading(true)
    try {
      const res = await apiFetch(apiBase, "/api/admin/coupons")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load coupons")
      setCoupons(Array.isArray(data) ? data : [])
    } catch (err: any) {
      setError(err.message || "Failed to load coupons")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadCoupons()
  }, [])

  const createCoupon = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError("")
    try {
      const payload = {
        code: form.code,
        discount_type: form.discount_type,
        discount_value: Number(form.discount_value),
        min_order_amount: Number(form.min_order_amount || 0),
        max_uses: form.max_uses ? Number(form.max_uses) : null,
        expires_at: form.expires_at || null,
        is_active: true,
      }
      const res = await apiFetch(getApiBase(), "/api/admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create coupon")
      setCoupons((prev) => [data.coupon, ...prev])
      setForm(emptyForm)
    } catch (err: any) {
      setError(err.message || "Failed to create coupon")
    } finally {
      setSaving(false)
    }
  }

  const deleteCoupon = async (id: number) => {
    setError("")
    try {
      const res = await apiFetch(getApiBase(), `/api/admin/coupons/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to delete coupon")
      setCoupons((prev) => prev.filter((coupon) => coupon.id !== id))
    } catch (err: any) {
      setError(err.message || "Failed to delete coupon")
    }
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 sm:px-6 md:px-8 py-10 md:py-16">
      <div className="max-w-350 mx-auto mb-14 md:mb-20">
        <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4">Admin</p>
        <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light">Coupons</h1>
        <p className="mt-4 text-sm tracking-widest text-gray-500">Create discount codes for customer checkout.</p>
      </div>

      <div className="max-w-350 mx-auto grid lg:grid-cols-[420px_1fr] gap-8 md:gap-12">
        <form onSubmit={createCoupon} className="border border-white/10 p-5 md:p-8 space-y-5 h-fit">
          <h2 className="uppercase tracking-widest text-xs text-gray-400 flex items-center gap-3">
            <BadgePercent size={14} />
            New Coupon
          </h2>

          <Input
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="Code"
            className="bg-transparent border-white/20 text-white uppercase"
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <select
              value={form.discount_type}
              onChange={(e) => setForm({ ...form, discount_type: e.target.value })}
              className="h-10 bg-[#030303] border border-white/20 px-3 text-sm text-white"
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </select>
            <Input
              value={form.discount_value}
              onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
              placeholder={form.discount_type === "percent" ? "Percent" : "Amount"}
              type="number"
              min="0"
              className="bg-transparent border-white/20 text-white"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              value={form.min_order_amount}
              onChange={(e) => setForm({ ...form, min_order_amount: e.target.value })}
              placeholder="Min order"
              type="number"
              min="0"
              className="bg-transparent border-white/20 text-white"
            />
            <Input
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
              placeholder="Max uses"
              type="number"
              min="1"
              className="bg-transparent border-white/20 text-white"
            />
          </div>

          <Input
            value={form.expires_at}
            onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            type="date"
            className="bg-transparent border-white/20 text-white"
          />

          {error && <p className="text-[10px] uppercase tracking-widest text-amber-400">{error}</p>}

          <Button disabled={saving} className="w-full border border-white/40 bg-transparent uppercase tracking-widest text-xs hover:bg-white hover:text-black">
            {saving ? "Creating..." : "Create Coupon"}
          </Button>
        </form>

        <div className="border border-white/10 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                {["Code", "Discount", "Minimum", "Usage", "Expires", ""].map((h) => (
                  <th key={h} className="px-4 md:px-6 py-4 text-left text-xs uppercase tracking-widest text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((coupon) => (
                <tr key={coupon.id} className="border-b border-white/5">
                  <td className="px-4 md:px-6 py-5 font-medium">{coupon.code}</td>
                  <td className="px-4 md:px-6 py-5 text-sm text-gray-400">
                    {coupon.discount_type === "percent" ? `${coupon.discount_value}%` : `₹${coupon.discount_value.toLocaleString("en-IN")}`}
                  </td>
                  <td className="px-4 md:px-6 py-5 text-sm text-gray-400">₹{(coupon.min_order_amount || 0).toLocaleString("en-IN")}</td>
                  <td className="px-4 md:px-6 py-5 text-sm text-gray-400">
                    {coupon.uses || 0}{coupon.max_uses ? ` / ${coupon.max_uses}` : ""}
                  </td>
                  <td className="px-4 md:px-6 py-5 text-sm text-gray-400">
                    {coupon.expires_at ? new Date(coupon.expires_at).toLocaleDateString("en-IN") : "Never"}
                  </td>
                  <td className="px-4 md:px-6 py-5 text-right">
                    <button
                      type="button"
                      onClick={() => deleteCoupon(coupon.id)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                      aria-label={`Delete ${coupon.code}`}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
              {loading ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-xs uppercase tracking-widest text-gray-500">Loading coupons...</td></tr>
              ) : coupons.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-20 text-center text-xs uppercase tracking-widest text-gray-500">No coupons yet.</td></tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
