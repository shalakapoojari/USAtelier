"use client"

import { useEffect, useState } from "react"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Cell,
    PieChart,
    Pie,
} from "recharts"
import {
    TrendingUp,
    Heart,
    ShoppingCart,
    AlertTriangle,
    Package,
    ArrowRight,
    RefreshCw,
} from "lucide-react"

interface CategoryStat {
    name: string
    count: number
    total_stock: number
    subcategories: {
        name: string
        count: number
        total_stock: number
        products: {
            id: number
            name: string
            stock: number
        }[]
    }[]
}

interface AnalysisData {
    most_sold: any[]
    most_favorited: any[]
    most_added_to_cart: any[]
    low_stock: any[]
    all_stock: any[]
    category_stats: CategoryStat[]
    pie_data: any[]
}

const COLORS = ["#e8e8e3", "#a1a1aa", "#71717a", "#52525b", "#3f3f46"]

export default function BusinessAnalysisPage() {
    const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"

    const [data, setData] = useState<AnalysisData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null)

    const fetchData = async () => {
        if (!API_BASE) return
        setLoading(true)
        try {
            const res = await fetch(`${API_BASE}/api/admin/analysis`, {
                credentials: "include"
            })
            if (!res.ok) throw new Error("Failed to fetch analysis data")

            const result = await res.json()
            
            // Map image placeholders and standardizing the data
            const enriched = {
                ...result,
                most_sold: result.most_sold.map((p: any) => ({
                    ...p,
                    price: p.price || 0,
                    revenue: p.total_sold * (p.price || 0),
                    image: '/placeholder.jpg',
                    sku: `US-AT-${p.id || 'N/A'}`
                }))
            }
            setData(enriched)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
                <RefreshCw className="w-8 h-8 animate-spin text-white/20" />
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-400">Syncing Intelligence...</p>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="p-10 text-center">
                <p className="text-red-400 mb-4 font-light tracking-widest uppercase text-xs">Error: {error}</p>
                <button
                    onClick={fetchData}
                    className="px-6 py-2 border border-white/20 text-[10px] uppercase tracking-widest hover:bg-white/5 transition-colors"
                >
                    Retry
                </button>
            </div>
        )
    }

    const totalCategoryItems = data.pie_data.reduce((sum, category) => sum + category.count, 0)

    return (
        <div className="p-8 lg:p-12 space-y-12 max-w-7xl mx-auto bg-[#030303]">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="font-serif text-4xl tracking-widest mb-2 uppercase text-[#e8e8e3]">Business Analysis</h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.34em] font-light">
                        Global Performance & Inventory Architecture
                    </p>
                </div>
                
                {/* Low Stock Warning Bar */}
                {data.low_stock.length > 0 && (
                    <div className="flex items-center gap-4 bg-red-950/20 border border-red-900/40 px-6 py-3 rounded-sm animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        <div>
                            <p className="text-[10px] uppercase tracking-widest text-red-400 font-bold">Critical Alert</p>
                            <p className="text-[9px] uppercase tracking-widest text-red-500/80">{data.low_stock.length} Items Below Minimum Threshold</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Performance Matrix */}
            <section className="bg-white/5 border border-white/10 rounded-sm overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-4">
                        <TrendingUp className="w-5 h-5 text-[#e8e8e3]" />
                        <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-[#e8e8e3]">Sales Volume</h2>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-[10px] uppercase tracking-[0.3em] text-gray-500">
                                <th className="p-8 font-light">Product</th>
                                <th className="p-8 font-light text-right">Volume</th>
                                <th className="p-8 font-light text-right">Contribution</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {data.most_sold.length > 0 ? data.most_sold.map((product, idx) => (
                                <tr key={idx} className="group hover:bg-white/2 transition-colors">
                                    <td className="p-8">
                                        <div>
                                            <h3 className="text-sm font-serif text-[#e8e8e3] uppercase tracking-wider mb-1">{product.name}</h3>
                                            <span className="text-[9px] uppercase tracking-widest text-gray-600">Performance ID: {idx + 1}</span>
                                        </div>
                                    </td>
                                    <td className="p-8 text-right">
                                        <div className="inline-flex flex-col items-end">
                                            <span className="text-xl font-serif text-[#e8e8e3]">{product.total_sold}</span>
                                            <span className="text-[8px] uppercase tracking-widest text-gray-600">Units</span>
                                        </div>
                                    </td>
                                    <td className="p-8 text-right">
                                        <span className="text-xs font-mono text-[#e8e8e3]">
                                            {((product.total_sold / data.most_sold.reduce((s, p) => s + p.total_sold, 0)) * 100).toFixed(1)}%
                                        </span>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={3} className="p-12 text-center text-[10px] uppercase tracking-widest text-gray-600">No Sales Data Available</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>
            
            {/* Distributed Architecture */}
            <div className="grid lg:grid-cols-2 gap-12">
                {/* Category Doughnut Chart */}
                <div className="bg-white/5 border border-white/10 rounded-sm p-8 shadow-2xl">
                    <div className="flex items-center gap-4 mb-10">
                        <TrendingUp className="w-5 h-5 text-[#e8e8e3]" />
                        <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-[#e8e8e3]">Category </h2>
                    </div>

                    <div className="flex flex-col md:flex-row items-center gap-12">
                        <div className="w-full h-64 md:w-1/2">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data.pie_data}
                                        dataKey="count"
                                        nameKey="_id"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        stroke="none"
                                    >
                                        {data.pie_data.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#111', border: '1px solid #333', borderRadius: '0', fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                                        itemStyle={{ color: '#e8e8e3' }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="w-full md:w-1/2 space-y-4">
                            {data.pie_data.map((category, idx) => (
                                <div key={idx} className="flex items-center justify-between group">
                                    <div className="flex items-center gap-3">
                                        <div 
                                            className="w-2.5 h-2.5 rounded-full" 
                                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                        />
                                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-400 group-hover:text-[#e8e8e3] transition-colors font-medium">
                                            {category._id}
                                        </span>
                                    </div>
                                    <span className="text-[10px] uppercase tracking-[0.2em] text-[#e8e8e3] font-bold group-hover:scale-110 transition-transform origin-right">
                                        {category.count} Items · {totalCategoryItems > 0 ? ((category.count / totalCategoryItems) * 100).toFixed(0) : 0}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Stock Analytics with Dropdowns */}
                <div className="bg-white/5 border border-white/10 rounded-sm p-8 shadow-2xl flex flex-col">
                    <div className="flex items-center gap-4 mb-8">
                        <Package className="w-5 h-5 text-[#e8e8e3]" />
                        <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-[#e8e8e3]">Stock Anatomy</h2>
                    </div>
                    
                    <div className="flex-1 space-y-4 overflow-visible pr-4 pb-2">
                        {data.category_stats.map((category, cIdx) => (
                            <div key={cIdx} className="border border-white/5 rounded-sm overflow-hidden">
                                <button 
                                    onClick={() => setExpandedCategory(expandedCategory === category.name ? null : category.name)}
                                    className="w-full flex items-center justify-between p-4 bg-white/2 hover:bg-white/5 transition-colors"
                                >
                                    <div className="text-left">
                                        <p className="text-[10px] uppercase tracking-widest text-[#e8e8e3] font-bold">{category.name}</p>
                                        <p className="text-[9px] uppercase tracking-widest text-gray-500">{category.count} Styles · {category.total_stock} Total Units</p>
                                    </div>
                                    <ArrowRight className={`w-3 h-3 text-gray-600 transition-transform duration-500 ${expandedCategory === category.name ? 'rotate-90' : ''}`} />
                                </button>
                                
                                {expandedCategory === category.name && (
                                    <div className="p-4 bg-black/40 space-y-6">
                                        {category.subcategories.map((sub, sIdx) => (
                                            <div key={sIdx} className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[9px] uppercase tracking-[0.2em] text-gray-400 font-bold">{sub.name}</span>
                                                    <span className="text-[8px] uppercase tracking-widest text-gray-600">{sub.count} Products</span>
                                                </div>
                                                
                                                <div className="space-y-4 pl-2 border-l border-white/10">
                                                    {sub.products.map((p, pIdx) => (
                                                        <div key={pIdx} className="space-y-1.5">
                                                            <div className="flex justify-between items-end text-[8px] uppercase tracking-widest">
                                                                <span className="text-gray-500 truncate max-w-[200px]">{p.name}</span>
                                                                <span className={p.stock <= 5 ? "text-red-500 font-bold" : "text-gray-400"}>
                                                                    {p.stock} units
                                                                </span>
                                                            </div>
                                                            <div className="h-[1px] w-full bg-white/5 overflow-hidden">
                                                                <div 
                                                                    className={`h-full transition-all duration-1000 ${
                                                                        p.stock <= 5 ? "bg-red-500" : 
                                                                        p.stock <= 15 ? "bg-orange-400" : "bg-white/20"
                                                                    }`}
                                                                    style={{ width: `${Math.min((p.stock/50)*100, 100)}%` }}
                                                                />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                             <AlertTriangle className={`w-3 h-3 ${data.low_stock.length > 0 ? "text-red-500 animate-pulse" : "text-gray-700"}`} />
                             <span className="text-[8px] uppercase tracking-widest text-gray-500 font-medium">
                                 {data.low_stock.length} Styles Below Safety Threshold
                             </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Aesthetic Footer Note */}
            <div className="pt-12 border-t border-white/5 flex justify-between items-center text-[9px] uppercase tracking-[0.4em] text-gray-700">
                <span>U.S ATELIER INTEL - DYNAMIC ANALYSIS</span>
                <span>GLOBAL SYNC: {new Date().toLocaleTimeString()}</span>
            </div>
        </div>
    )
}

