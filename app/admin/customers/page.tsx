"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Users, MoreVertical, Edit2, Ban, Eye } from "lucide-react"

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/customers`, {
        credentials: "include"
      })
      if (res.ok) {
        const data = await res.json()
        setCustomers(data)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 md:px-8 py-16">
      {/* HEADER */}
      <div className="max-w-[1400px] mx-auto mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4 flex items-center gap-2">
            <Users size={14} /> Admin
          </p>
          <h1 className="font-serif text-5xl font-light">
            Customers
          </h1>
          <p className="mt-4 text-sm tracking-widest text-gray-500">
            View and manage {customers.length} registered customers.
          </p>
        </div>
      </div>

      {/* TABLE */}
      <div className="max-w-[1400px] mx-auto border border-white/10 overflow-x-auto relative min-h-[500px]">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="uppercase tracking-widest text-xs animate-pulse text-gray-500">Loading Customers...</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-8 py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal">Customer</th>
                <th className="px-8 py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal">Contact</th>
                <th className="px-8 py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal">Date Joined</th>
                <th className="px-8 py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal text-right">Orders</th>
                <th className="px-8 py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal text-right">Total Spent</th>
                <th className="px-8 py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, i) => (
                <tr
                  key={customer.id}
                  className={`border-b border-white/5 hover:bg-white/[0.04] transition-colors ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}
                >
                  <td className="px-8 py-6">
                    <p className="font-medium text-white">{customer.name}</p>
                    <p className="text-[10px] tracking-widest text-gray-500 uppercase mt-1">ID: {customer.id.substring(customer.id.length - 6)}</p>
                  </td>

                  <td className="px-8 py-6">
                    <p className="text-gray-300">{customer.email}</p>
                    <p className="text-xs text-gray-500 mt-1">{customer.phone}</p>
                  </td>

                  <td className="px-8 py-6 text-gray-400">
                    {new Date(customer.date_joined).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>

                  <td className="px-8 py-6 text-right tabular-nums text-white">
                    {customer.total_orders}
                  </td>

                  <td className="px-8 py-6 text-right tabular-nums text-white">
                    ₹{customer.total_spent.toLocaleString('en-IN')}
                  </td>



                  <td className="px-8 py-6 text-right relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openMenuId === customer.id && (
                      <div className="absolute right-8 top-12 w-48 bg-[#111] border border-white/10 shadow-2xl z-50 py-2">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-xs tracking-widest uppercase text-gray-300 transition-colors w-full text-left"
                        >
                          <Eye size={14} /> View Profile
                        </Link>

                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {customers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-8 py-24 text-center">
                    <p className="text-sm tracking-widest uppercase text-gray-500">No Customers Found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
