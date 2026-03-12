"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import {
  CreditCard,
  Search,
  RefreshCcw,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowUpRight,
  ExternalLink,
  ChevronRight
} from "lucide-react"
import Link from "next/link"

interface Payment {
  id: number
  user_id: number
  order_id: number
  razorpay_order_id: string
  razorpay_payment_id: string
  amount: number
  currency: string
  status: string
  method: string
  email: string
  phone: string
  created_at: string
  updated_at: string
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [refreshing, setRefreshing] = useState(false)
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"

  const fetchPayments = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`${API_BASE}/api/admin/payments`, {
        credentials: "include"
      })
      if (res.ok) {
        const data = await res.json()
        setPayments(data)
      }
    } catch (err) {
      console.error("Failed to fetch payments:", err)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  const filteredPayments = payments.filter(p =>
    (p.razorpay_payment_id?.toLowerCase().includes(search.toLowerCase())) ||
    (p.email?.toLowerCase().includes(search.toLowerCase())) ||
    (p.status?.toLowerCase().includes(search.toLowerCase()))
  )

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'captured': return 'text-green-400 bg-green-400/10'
      case 'refunded': return 'text-blue-400 bg-blue-400/10'
      case 'failed': return 'text-red-400 bg-red-400/10'
      case 'pending': return 'text-orange-400 bg-orange-400/10'
      default: return 'text-gray-400 bg-gray-400/10'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'captured': return <CheckCircle2 size={12} />
      case 'refunded': return <RefreshCcw size={12} />
      case 'failed': return <XCircle size={12} />
      case 'pending': return <AlertCircle size={12} />
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCcw className="animate-spin text-gray-500" size={24} />
      </div>
    )
  }

  const totalRevenue = payments
    .filter(p => p.status === 'captured')
    .reduce((acc, curr) => acc + curr.amount, 0)

  return (
    <div className="p-8 lg:p-12 space-y-12 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <h1 className="font-serif text-4xl tracking-widest mb-3 uppercase text-[#e8e8e3]">Financial Registry</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-[0.4em] font-medium">
            Payment processing logs and treasury management
          </p>
        </div>

        <div className="flex items-center gap-8">
          <div className="text-right">
            <p className="text-[8px] uppercase tracking-[0.3em] text-gray-600 mb-1">Settled Treasury</p>
            <p className="text-2xl font-serif text-[#e8e8e3]">₹{totalRevenue.toLocaleString()}</p>
          </div>
          <button
            onClick={fetchPayments}
            className={`p-3 border border-white/10 hover:bg-white/5 transition-all ${refreshing ? 'animate-spin' : ''}`}
          >
            <RefreshCcw size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white/2 border border-white/5 p-8 space-y-4">
          <div className="flex items-center gap-3 text-gray-500">
            <CreditCard size={14} />
            <span className="text-[9px] uppercase tracking-[0.3em]">Total Transactions</span>
          </div>
          <p className="text-3xl font-serif">{payments.length}</p>
        </div>

        <div className="bg-white/2 border border-white/5 p-8 space-y-4">
          <div className="flex items-center gap-3 text-green-500/50">
            <CheckCircle2 size={14} />
            <span className="text-[9px] uppercase tracking-[0.3em]">Successful Purchases</span>
          </div>
          <p className="text-3xl font-serif text-[#e8e8e3]">
            {payments.filter(p => p.status === 'captured').length}
          </p>
        </div>

        <div className="bg-white/2 border border-white/5 p-8 space-y-4">
          <div className="flex items-center gap-3 text-blue-500/50">
            <RefreshCcw size={14} />
            <span className="text-[9px] uppercase tracking-[0.3em]">Refunded Total</span>
          </div>
          <p className="text-3xl font-serif text-gray-400">
            ₹{payments.filter(p => p.status === 'refunded').reduce((a, b) => a + b.amount, 0).toLocaleString()}
          </p>
        </div>
      </div>

      {/* Search & Filter */}
      <div className="relative group">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-[#e8e8e3] transition-colors" size={16} />
        <input
          type="text"
          placeholder="SEARCH BY PAYMENT ID, EMAIL OR STATUS..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-white/2 border border-white/5 py-5 pl-16 pr-8 text-[10px] uppercase tracking-[0.2em] focus:outline-none focus:border-white/20 transition-all placeholder:text-gray-700"
        />
      </div>

      {/* Table */}
      <div className="bg-white/2 border border-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/5 text-[9px] uppercase tracking-[0.3em] text-gray-500 bg-white/2">
                <th className="p-6 font-medium">Payment Identity</th>
                <th className="p-6 font-medium">Status</th>
                <th className="p-6 font-medium">Method</th>
                <th className="p-6 font-medium">Associate Order</th>
                <th className="p-6 font-medium text-right">Magnitude</th>
                <th className="p-6 font-medium text-right">Timestamp</th>
                <th className="p-6"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="group hover:bg-white/3 transition-colors">
                  <td className="p-6">
                    <div className="space-y-1">
                      <p className="text-[10px] font-mono text-[#e8e8e3] tracking-wider mb-0.5 group-hover:text-white transition-colors">
                        {p.razorpay_payment_id || 'N/A'}
                      </p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest">{p.email}</p>
                    </div>
                  </td>
                  <td className="p-6">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 text-[8px] uppercase tracking-widest rounded-full ${getStatusColor(p.status)}`}>
                      {getStatusIcon(p.status)}
                      {p.status}
                    </div>
                  </td>
                  <td className="p-6">
                    <span className="text-[9px] uppercase tracking-widest text-gray-400">{p.method || 'Unknown'}</span>
                  </td>
                  <td className="p-6">
                    {p.order_id ? (
                      <Link
                        href={`/admin/orders/${p.order_id}`}
                        className="inline-flex items-center gap-2 text-[9px] uppercase tracking-widest text-[#e8e8e3] hover:text-white border-b border-white/10 hover:border-white transition-all pb-0.5"
                      >
                        Order #{p.order_id}
                        <ArrowUpRight size={10} className="text-gray-600" />
                      </Link>
                    ) : (
                      <span className="text-[9px] uppercase tracking-widest text-gray-600 italic">No Order Attached</span>
                    )}
                  </td>
                  <td className="p-6 text-right">
                    <p className="text-xs font-serif text-[#e8e8e3]">₹{p.amount.toLocaleString()}</p>
                  </td>
                  <td className="p-6 text-right">
                    <p className="text-[9px] uppercase tracking-widest text-gray-500">
                      {new Date(p.created_at).toLocaleDateString()}
                      <span className="block text-[8px] mt-1 opacity-50">{new Date(p.created_at).toLocaleTimeString()}</span>
                    </p>
                  </td>
                  <td className="p-6 text-right">
                    <a
                      href={`https://dashboard.razorpay.com/app/payments/${p.razorpay_payment_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 text-gray-600 hover:text-white transition-colors inline-block"
                      title="View on Razorpay"
                    >
                      <ExternalLink size={14} />
                    </a>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-20 text-center">
                    <p className="text-[10px] uppercase tracking-[0.4em] text-gray-600 italic">No financial records detected matching criteria</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer Info */}
      <div className="pt-12 border-t border-white/5 flex justify-between items-center text-[8px] uppercase tracking-[0.4em] text-gray-700">
        <span>U.S ATELIER INTEL - RECONCILIATION SUITE V2.1</span>
        <span>GATEWAY: RAZORPAY B2B</span>
      </div>
    </div>
  )
}
