"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Users, MoreVertical, Edit2, Ban, Eye, UserCheck } from "lucide-react"
import { getApiBase } from "@/lib/api-base"
import { useToast } from "@/lib/toast-context"

const API_BASE = getApiBase()

export default function CustomersPage() {
  const [customers, setCustomers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const { showToast } = useToast()

  useEffect(() => {
    fetchCustomers()
  }, [])

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/customers`, {
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
  const toggleBlockStatus = async (customerId: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`${API_BASE}/api/admin/customers/${customerId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_blocked: !currentStatus }),
        credentials: "include"
      })

      if (res.ok) {
        setCustomers(prev => prev.map(c =>
          c.id === customerId ? { ...c, is_blocked: !currentStatus } : c
        ))
        setOpenMenuId(null)
        showToast(currentStatus ? "User unblocked" : "User blocked", currentStatus ? "success" : "warning")
      } else {
        const errData = await res.json()
        showToast("Failed to update status", "error", errData.error)
      }
    } catch (err) {
      console.error("Error toggling block status:", err)
      showToast("An error occurred", "error", "Please try again")
    }
  }


  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 sm:px-6 md:px-8 py-10 md:py-16">
      {/* HEADER */}
      <div className="max-w-350 mx-auto mb-16 flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4 flex items-center gap-2">
            <Users size={14} /> Admin
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light">
            Customers
          </h1>
          <p className="mt-4 text-sm tracking-widest text-gray-500">
            View and manage {customers.length} registered customers.
          </p>
        </div>
      </div>

      {/* TABLE */}
      <div className="max-w-350 mx-auto border border-white/10 overflow-x-auto relative min-h-125">
        {isLoading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="uppercase tracking-widest text-xs animate-pulse text-gray-500">Loading Customers...</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                <th className="px-4 md:px-8 py-4 md:py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal">Customer</th>
                <th className="px-4 md:px-8 py-4 md:py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal">Contact</th>
                <th className="px-4 md:px-8 py-4 md:py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal">Date Joined</th>
                <th className="px-4 md:px-8 py-4 md:py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal text-right">Orders</th>
                <th className="px-4 md:px-8 py-4 md:py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal text-right">Total Spent</th>
                <th className="px-4 md:px-8 py-4 md:py-6 uppercase tracking-widest text-[10px] text-gray-500 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer, i) => (
                <tr
                  key={customer.id}
                  className={`border-b border-white/5 hover:bg-white/4 transition-colors ${i % 2 === 0 ? "bg-white/2" : ""}`}
                >
                  <td className="px-4 md:px-8 py-4 md:py-6">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-white">{customer.name}</p>
                      {customer.is_blocked && (
                        <span className="px-2 py-0.5 bg-red-500/10 text-red-500 text-[8px] uppercase tracking-widest border border-red-500/20 rounded-full">
                          Blocked
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] tracking-widest text-gray-500 uppercase mt-1">ID: {String(customer.id).slice(-6)}</p>
                  </td>

                  <td className="px-4 md:px-8 py-4 md:py-6">
                    <p className="text-gray-300">{customer.email}</p>
                    <p className="text-xs text-gray-500 mt-1">{customer.phone}</p>
                  </td>

                  <td className="px-4 md:px-8 py-4 md:py-6 text-gray-400">
                    {new Date(customer.date_joined).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>

                  <td className="px-4 md:px-8 py-4 md:py-6 text-right tabular-nums text-white">
                    {customer.total_orders}
                  </td>

                  <td className="px-4 md:px-8 py-4 md:py-6 text-right tabular-nums text-white">
                    ₹{customer.total_spent.toLocaleString('en-IN')}
                  </td>



                  <td className="px-4 md:px-8 py-4 md:py-6 text-right relative">
                    <button
                      onClick={() => setOpenMenuId(openMenuId === customer.id ? null : customer.id)}
                      className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>

                    {openMenuId === customer.id && (
                      <div className="absolute right-4 md:right-8 top-12 w-48 bg-[#111] border border-white/10 shadow-2xl z-50 py-2">
                        <Link
                          href={`/admin/customers/${customer.id}`}
                          className="flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-xs tracking-widest uppercase text-gray-300 transition-colors w-full text-left"
                        >
                          <Eye size={14} /> View Profile
                        </Link>

                        <button
                          onClick={() => toggleBlockStatus(customer.id, customer.is_blocked)}
                          className={`flex items-center gap-3 px-4 py-2 hover:bg-white/5 text-xs tracking-widest uppercase transition-colors w-full text-left ${customer.is_blocked ? "text-green-500" : "text-red-500"
                            }`}
                        >
                          {customer.is_blocked ? (
                            <>
                              <UserCheck size={14} /> Unblock User
                            </>
                          ) : (
                            <>
                              <Ban size={14} /> Block User
                            </>
                          )}
                        </button>

                      </div>
                    )}
                  </td>
                </tr>
              ))}

              {customers.length === 0 && !isLoading && (
                <tr>
                  <td colSpan={6} className="px-4 md:px-8 py-24 text-center">
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
