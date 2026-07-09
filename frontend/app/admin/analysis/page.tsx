"use client"

import { useEffect, useState } from "react"
import {
    LineChart,
    Line,
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
    Package,
    ArrowRight,
    RefreshCw,
    TrendingUp,
    AlertTriangle,
    ShoppingCart,
} from "lucide-react"
import { getApiBase, apiFetch } from "@/lib/api-base"

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

interface TopByRevenue {
    product_id: number
    product_name: string
    total_revenue: number
    order_count: number
}

interface ProductViewStat {
    product_id: number
    product_name: string
    view_count: number
}

interface SiteVisitSummary {
    total_visits: number
    unique_sessions: number
    unique_users: number
}

interface SiteVisitDay {
    date: string
    visits: number
    unique_visitors: number
}

interface TopPage {
    page: string
    visits: number
}

interface TopReferrer {
    referrer: string
    visits: number
}

interface SiteVisitData {
    summary: SiteVisitSummary
    daily_trend: SiteVisitDay[]
    top_pages: TopPage[]
    top_referrers: TopReferrer[]
}

interface AnalysisData {
    most_sold: any[]
    most_favorited: any[]
    most_added_to_cart: any[]
    low_stock: any[]
    all_stock: any[]
    category_stats: CategoryStat[]
    pie_data: any[]
    total_orders: number
    total_revenue: number
    top_by_revenue: TopByRevenue[]
    abandoned_cart_rate: number | null
}

type RevenueTrendPoint = { date: string; revenue: number }
type SortKey = "revenue" | "views" | "conversion"

const COLORS = ["#e8e8e3", "#a1a1aa", "#71717a", "#52525b", "#3f3f46"]

export default function BusinessAnalysisPage() {
    const API_BASE = getApiBase()

    const [data, setData] = useState<AnalysisData | null>(null)
    const [revenueTrend, setRevenueTrend] = useState<RevenueTrendPoint[]>([])
    const [productViews, setProductViews] = useState<ProductViewStat[]>([])
    const [siteVisits, setSiteVisits] = useState<SiteVisitData | null>(null)
    const [visitRange, setVisitRange] = useState<"today" | "7d" | "30d">("7d")
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedCategory, setExpandedCategory] = useState<string | null>(null)
    const [sortKey, setSortKey] = useState<SortKey>("revenue")
    const [sortAsc, setSortAsc] = useState(false)

    const fetchData = async () => {
        if (!API_BASE) return
        setLoading(true)
        setError(null)
        try {
            const [analysisRes, trendRes, viewsRes, siteVisitsRes] = await Promise.all([
                apiFetch(API_BASE, "/api/admin/analysis"),
                apiFetch(API_BASE, "/api/admin/analytics/revenue-trend"),
                apiFetch(API_BASE, "/api/admin/analytics/product-views?range=30d"),
                apiFetch(API_BASE, "/api/admin/analytics/site-visits?range=7d"),
            ])

            if (!analysisRes.ok) {
                const err = await analysisRes.json().catch(() => ({}))
                throw new Error(err.error || "Failed to fetch analysis data")
            }

            const result = await analysisRes.json()
            const enriched = {
                ...result,
                most_sold: (result.most_sold || []).map((p: any) => ({
                    ...p,
                    sellingPrice: p.sellingPrice || 0,
                    revenue: p.total_sold * (p.sellingPrice || 0),
                    image: "/placeholder.jpg",
                    sku: `US-AT-${p.id || "N/A"}`,
                })),
            }
            setData(enriched)

            if (trendRes.ok) setRevenueTrend(await trendRes.json())
            else setRevenueTrend([])

            if (viewsRes.ok) setProductViews(await viewsRes.json())
            else setProductViews([])

            if (siteVisitsRes.ok) setSiteVisits(await siteVisitsRes.json())
            else setSiteVisits(null)
        } catch (err: any) {
            setError(err.message || "Failed to load analytics")
        } finally {
            setLoading(false)
        }
    }

    const fetchSiteVisits = async (range: "today" | "7d" | "30d") => {
        if (!API_BASE) return
        try {
            const res = await apiFetch(API_BASE, `/api/admin/analytics/site-visits?range=${range}`)
            if (res.ok) setSiteVisits(await res.json())
        } catch { /* silent */ }
    }

    useEffect(() => { fetchData() }, [])

    const getViewCount = (productId: number) =>
        productViews.find((v) => v.product_id === productId)?.view_count ?? 0

    const topRevenueRows = (data?.top_by_revenue || []).slice(0, 10).map((product) => {
        const views = getViewCount(product.product_id)
        const orders = product.order_count ?? 0
        const conversion = views > 0 ? (orders / views) * 100 : null
        return { ...product, views, orders, conversion }
    })

    const sortedTopRevenue = [...topRevenueRows].sort((a, b) => {
        let cmp = 0
        if (sortKey === "revenue") cmp = a.total_revenue - b.total_revenue
        else if (sortKey === "views") cmp = a.views - b.views
        else cmp = (a.conversion ?? -1) - (b.conversion ?? -1)
        return sortAsc ? cmp : -cmp
    })

    const handleSort = (key: SortKey) => {
        if (sortKey === key) {
            setSortAsc(!sortAsc)
        } else {
            setSortKey(key)
            setSortAsc(false)
        }
    }

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
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div>
                    <h1 className="font-serif text-4xl tracking-widest mb-2 uppercase text-[#e8e8e3]">Business Analysis</h1>
                    <p className="text-[10px] text-gray-500 uppercase tracking-[0.34em] font-light">
                        Global Performance & Inventory Architecture
                    </p>
                </div>

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

            <section className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 p-6">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Total Orders</p>
                    <p className="text-3xl font-serif text-[#e8e8e3]">{data.total_orders.toLocaleString("en-IN")}</p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">Total Revenue</p>
                    <p className="text-3xl font-serif text-[#e8e8e3]">
                        ₹{data.total_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </p>
                </div>
                <div className="bg-white/5 border border-white/10 p-6 col-span-2 lg:col-span-1">
                    <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2 flex items-center gap-2">
                        <ShoppingCart className="w-3 h-3" />
                        Abandoned Cart Rate
                    </p>
                    <p className="text-3xl font-serif text-[#e8e8e3]">
                        {data.abandoned_cart_rate === null
                            ? "N/A"
                            : `${data.abandoned_cart_rate.toFixed(1)}%`}
                    </p>
                </div>
            </section>

            <section className="bg-white/5 border border-white/10 p-8">
                <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-[#e8e8e3] mb-8">30-Day Revenue Trend</h2>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={revenueTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                            dataKey="date"
                            tick={{ fontSize: 9, fill: "#666" }}
                            tickFormatter={(d) => d.slice(5)}
                        />
                        <YAxis
                            tick={{ fontSize: 9, fill: "#666" }}
                            tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                        />
                        <Tooltip
                            contentStyle={{ backgroundColor: "#111", border: "1px solid #333", fontSize: 10 }}
                            formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Revenue"]}
                        />
                        <Line type="monotone" dataKey="revenue" stroke="#e8e8e3" strokeWidth={1.5} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </section>

            <section className="bg-white/5 border border-white/10 rounded-sm overflow-hidden shadow-2xl">
                <div className="p-8 border-b border-white/10 flex items-center justify-between bg-white/2">
                    <div className="flex items-center gap-4">
                        <TrendingUp className="w-5 h-5 text-[#e8e8e3]" />
                        <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-[#e8e8e3]">Top Products by Revenue</h2>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-white/5 text-[10px] uppercase tracking-[0.3em] text-gray-500">
                                <th className="p-8 font-light">Product</th>
                                <th className="p-8 font-light text-right">
                                    <button type="button" onClick={() => handleSort("revenue")} className="hover:text-[#e8e8e3]">
                                        Revenue {sortKey === "revenue" ? (sortAsc ? "↑" : "↓") : ""}
                                    </button>
                                </th>
                                <th className="p-8 font-light text-right">
                                    <button type="button" onClick={() => handleSort("views")} className="hover:text-[#e8e8e3]">
                                        Views {sortKey === "views" ? (sortAsc ? "↑" : "↓") : ""}
                                    </button>
                                </th>
                                <th className="p-8 font-light text-right">
                                    <button type="button" onClick={() => handleSort("conversion")} className="hover:text-[#e8e8e3]">
                                        Conversion {sortKey === "conversion" ? (sortAsc ? "↑" : "↓") : ""}
                                    </button>
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {sortedTopRevenue.length > 0 ? sortedTopRevenue.map((product) => (
                                <tr key={product.product_id} className="group hover:bg-white/2 transition-colors">
                                    <td className="p-8">
                                        <h3 className="text-sm font-serif text-[#e8e8e3] uppercase tracking-wider">{product.product_name}</h3>
                                    </td>
                                    <td className="p-8 text-right font-mono text-[#e8e8e3]">
                                        ₹{product.total_revenue.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                                    </td>
                                    <td className="p-8 text-right text-[#e8e8e3]">{product.views}</td>
                                    <td className="p-8 text-right text-[#e8e8e3]">
                                        {product.conversion === null ? "—" : `${product.conversion.toFixed(2)}%`}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="p-12 text-center text-[10px] uppercase tracking-widest text-gray-600">
                                        No Revenue Data Available
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </section>

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

            <div className="grid lg:grid-cols-2 gap-12">
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
                                        contentStyle={{ backgroundColor: "#111", border: "1px solid #333", borderRadius: "0", fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.1em" }}
                                        itemStyle={{ color: "#e8e8e3" }}
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
                                    <ArrowRight className={`w-3 h-3 text-gray-600 transition-transform duration-500 ${expandedCategory === category.name ? "rotate-90" : ""}`} />
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
                                                                    style={{ width: `${Math.min((p.stock / 50) * 100, 100)}%` }}
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

            {/* ── SITE VISITS ─────────────────────────────────────────────── */}
            <section className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <h2 className="text-sm uppercase tracking-[0.3em] font-bold text-[#e8e8e3] flex items-center gap-3">
                        <TrendingUp className="w-4 h-4" />
                        Site Visit Analytics
                    </h2>
                    <div className="flex gap-2">
                        {(["today", "7d", "30d"] as const).map((r) => (
                            <button
                                key={r}
                                onClick={() => { setVisitRange(r); fetchSiteVisits(r) }}
                                className={`px-4 py-1.5 text-[9px] uppercase tracking-[0.25em] border transition-all ${
                                    visitRange === r
                                        ? "border-white/40 text-white bg-white/5"
                                        : "border-white/10 text-white/30 hover:text-white hover:border-white/30"
                                }`}
                            >
                                {r === "today" ? "Today" : r === "7d" ? "7 Days" : "30 Days"}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: "Total Visits", value: siteVisits?.summary.total_visits ?? 0, color: "text-[#e8e8e3]" },
                        { label: "Unique Visitors", value: siteVisits?.summary.unique_sessions ?? 0, color: "text-blue-400" },
                        { label: "Logged-in Users", value: siteVisits?.summary.unique_users ?? 0, color: "text-green-400" },
                    ].map((card) => (
                        <div key={card.label} className="bg-white/5 border border-white/10 p-5">
                            <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-2">{card.label}</p>
                            <p className={`text-3xl font-serif ${card.color}`}>
                                {card.value.toLocaleString("en-IN")}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Daily Trend Bars */}
                {siteVisits && siteVisits.daily_trend.length > 0 && (
                    <div className="bg-white/5 border border-white/10 p-6">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-5">Daily Visits Trend</p>
                        <div className="flex items-end gap-1 h-28">
                            {siteVisits.daily_trend.slice(-14).map((day) => {
                                const maxV = Math.max(...siteVisits.daily_trend.map((d) => d.visits), 1)
                                const pct = (day.visits / maxV) * 100
                                return (
                                    <div
                                        key={day.date}
                                        className="flex-1 flex flex-col items-center gap-1 group"
                                        title={`${day.date}: ${day.visits} visits, ${day.unique_visitors} unique`}
                                    >
                                        <span className="text-[8px] text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                                            {day.visits}
                                        </span>
                                        <div
                                            className="w-full bg-white/20 hover:bg-white/40 transition-colors rounded-sm"
                                            style={{ height: `${Math.max(pct, 3)}%` }}
                                        />
                                        <span className="text-[7px] text-gray-700 rotate-[-45deg] origin-top-right hidden sm:block">
                                            {day.date.slice(5)}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                )}

                {/* Top Pages + Referrers side by side */}
                <div className="grid lg:grid-cols-2 gap-6">
                    <div className="bg-white/5 border border-white/10 p-6">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-5">Top Pages</p>
                        {siteVisits && siteVisits.top_pages.length > 0 ? (
                            <div className="space-y-3">
                                {siteVisits.top_pages.slice(0, 8).map((page) => {
                                    const maxV = Math.max(...siteVisits.top_pages.map((p) => p.visits), 1)
                                    return (
                                        <div key={page.page}>
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-[10px] text-gray-400 truncate max-w-[70%] font-mono">{page.page}</span>
                                                <span className="text-[10px] text-white/70 font-bold">{page.visits}</span>
                                            </div>
                                            <div className="h-px bg-white/5">
                                                <div
                                                    className="h-px bg-white/30"
                                                    style={{ width: `${(page.visits / maxV) * 100}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ) : (
                            <p className="text-[10px] uppercase tracking-widest text-gray-600">No data yet</p>
                        )}
                    </div>

                    <div className="bg-white/5 border border-white/10 p-6">
                        <p className="text-[10px] uppercase tracking-widest text-gray-500 mb-5">Traffic Sources</p>
                        {siteVisits && siteVisits.top_referrers.length > 0 ? (
                            <div className="space-y-3">
                                {siteVisits.top_referrers.slice(0, 8).map((ref, i) => (
                                    <div key={i} className="flex items-center justify-between py-1 border-b border-white/5">
                                        <span className="text-[10px] text-gray-400 truncate max-w-[70%]">
                                            {ref.referrer || "Direct / None"}
                                        </span>
                                        <span className="text-[10px] text-white/70 font-bold shrink-0 ml-2">{ref.visits}</span>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-[10px] uppercase tracking-widest text-gray-600">No referrer data yet</p>
                        )}
                    </div>
                </div>
            </section>

            <div className="pt-12 border-t border-white/5 flex justify-between items-center text-[9px] uppercase tracking-[0.4em] text-gray-700">
                <span>U.S ATELIER INTEL - DYNAMIC ANALYSIS</span>
                <span>GLOBAL SYNC: {new Date().toLocaleTimeString()}</span>
            </div>        </div>
    )
}
