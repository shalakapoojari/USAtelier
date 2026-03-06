"use client"

import { useState, useEffect, use } from "react"
import Link from "next/link"
import { ArrowLeft, User, Package, MapPin, Ban, Mail, Phone, Calendar } from "lucide-react"

export default function CustomerProfilePage({
    params,
}: {
    params: Promise<{ id: string }>
}) {
    const { id } = use(params)
    const [customer, setCustomer] = useState<any>(null)
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        fetchCustomerProfile()
    }, [id])

    const fetchCustomerProfile = async () => {
        try {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/admin/customers/${id}`, {
                credentials: "include"
            })
            if (res.ok) {
                const data = await res.json()
                setCustomer(data)
            }
        } catch (err) {
            console.error(err)
        } finally {
            setIsLoading(false)
        }
    }


    if (isLoading) {
        return (
            <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-8 py-16 flex items-center justify-center">
                <p className="uppercase tracking-widest text-xs animate-pulse text-gray-500">Loading Profile...</p>
            </div>
        )
    }

    if (!customer) {
        return (
            <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-8 py-16">
                <Link href="/admin/customers" className="uppercase tracking-widest text-xs text-gray-500 flex items-center gap-2 mb-12">
                    <ArrowLeft size={14} /> Back to Customers
                </Link>
                <p>Customer not found.</p>
            </div>
        )
    }

    return (
        <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 md:px-8 py-16">
            <div className="max-w-[1200px] mx-auto">
                <Link href="/admin/customers" className="uppercase tracking-widest text-xs text-gray-500 flex items-center gap-2 mb-12 hover:text-white transition-colors w-fit">
                    <ArrowLeft size={14} /> Back to Customers
                </Link>

                {/* HEADER */}
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-16">
                    <div>
                        <h1 className="font-serif text-5xl font-light mb-4 flex items-center gap-4">
                            {customer.first_name} {customer.last_name}
                        </h1>
                        <p className="text-gray-500 text-xs tracking-widest uppercase flex items-center gap-2">
                            <User size={12} /> ID: {customer.id}
                        </p>
                    </div>
                </div>

                {/* GRID LAYOUT */}
                <div className="grid lg:grid-cols-3 gap-16">

                    {/* LEFT COL: PROFILE INFO */}
                    <div className="lg:col-span-1 space-y-12">
                        {/* Contact Details */}
                        <div className="border border-white/10 p-8 space-y-6">
                            <h2 className="uppercase tracking-widest text-xs text-gray-500 mb-8 border-b border-white/10 pb-4">Basic Info</h2>

                            <div className="flex items-start gap-4">
                                <Mail size={16} className="text-gray-500 mt-1" />
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Email</p>
                                    <p className="text-sm">{customer.email}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Phone size={16} className="text-gray-500 mt-1" />
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Phone</p>
                                    <p className="text-sm">{customer.phone}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <Calendar size={16} className="text-gray-500 mt-1" />
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Registered On</p>
                                    <p className="text-sm">{new Date(customer.date_joined).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <MapPin size={16} className="text-gray-500 mt-1" />
                                <div>
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-1">Primary Address</p>
                                    {customer.address ? (
                                        <div className="text-sm leading-relaxed text-gray-300 gap-1 flex flex-col pt-1">
                                            <p>{customer.address.street}</p>
                                            <p>{customer.address.city}, {customer.address.state} {customer.address.zip}</p>
                                            <p>{customer.address.country}</p>
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-600">No address saved.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Statistics */}
                        <div className="border border-white/10 p-8 space-y-6">
                            <h2 className="uppercase tracking-widest text-xs text-gray-500 mb-8 border-b border-white/10 pb-4">Account Analytics</h2>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="font-serif text-3xl font-light text-white">{customer.stats.total_orders}</p>
                                    <p className="text-[10px] tracking-widest uppercase text-gray-500 mt-2">Total Orders</p>
                                </div>
                                <div>
                                    <p className="font-serif text-3xl font-light text-white">
                                        ₹{customer.stats.avg_order_value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </p>
                                    <p className="text-[10px] tracking-widest uppercase text-gray-500 mt-2">Avg. Order Value</p>
                                </div>
                            </div>

                            <div className="pt-6 mt-6 border-t border-white/10">
                                <p className="font-serif text-4xl font-light text-white">
                                    ₹{customer.stats.total_spent.toLocaleString('en-IN')}
                                </p>
                                <p className="text-[10px] tracking-widest uppercase text-blue-400 mt-2">Lifetime Value (Total Spent)</p>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT COL: ORDER HISTORY */}
                    <div className="lg:col-span-2">
                        <h2 className="uppercase tracking-widest text-xs text-gray-400 mb-8 flex items-center gap-2">
                            <Package size={14} /> Order History ({customer.stats.total_orders})
                        </h2>

                        {customer.orders.length > 0 ? (
                            <div className="border border-white/10 overflow-hidden">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-white/10 bg-white/5">
                                            <th className="px-6 py-4 text-left font-normal text-[10px] uppercase tracking-widest text-gray-500">Order ID</th>
                                            <th className="px-6 py-4 text-left font-normal text-[10px] uppercase tracking-widest text-gray-500">Date</th>
                                            <th className="px-6 py-4 text-left font-normal text-[10px] uppercase tracking-widest text-gray-500">Items</th>
                                            <th className="px-6 py-4 text-right font-normal text-[10px] uppercase tracking-widest text-gray-500">Total</th>
                                            <th className="px-6 py-4 text-left font-normal text-[10px] uppercase tracking-widest text-gray-500">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {customer.orders.map((order: any, i: number) => (
                                            <tr key={order.id} className={`border-b border-white/5 hover:bg-white/[0.04] transition-colors ${i % 2 === 0 ? "bg-[#050505]" : ""}`}>
                                                <td className="px-6 py-4">
                                                    <Link href={`/admin/orders/${order.id}`} className="text-white hover:underline uppercase tracking-widest text-[10px]">
                                                        {order.id}
                                                    </Link>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500">
                                                    {new Date(order.created_at || order.date).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4 text-gray-300">
                                                    {order.items?.length || 0} items
                                                </td>
                                                <td className="px-6 py-4 text-right tabular-nums">
                                                    ₹{order.total?.toLocaleString('en-IN')}
                                                </td>
                                                <td className="px-6 py-4 text-[10px] uppercase tracking-widest text-gray-400">
                                                    {order.status}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="border border-white/10 p-16 text-center text-gray-500 text-sm tracking-widest uppercase">
                                No orders found for this customer.
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    )
}
