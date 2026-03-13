"use client"

import type React from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { User, Package, Heart, Settings, LogOut, ChevronRight, LayoutDashboard, ArrowLeft } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

type SidebarProps = {
    children: React.ReactNode
}

const navItems = [
    { href: "/account", icon: User, label: "Profile", exact: true },
    { href: "/account/orders", icon: Package, label: "Order History", exact: false },
    { href: "/favourites", icon: Heart, label: "Favourites", exact: false },
    { href: "/account/profile", icon: Settings, label: "Settings", exact: false },
]

export function AccountSidebar({ children }: SidebarProps) {
    const { user, logout, isAdmin } = useAuth()
    const router = useRouter()
    const pathname = usePathname()

    const handleLogout = () => {
        logout()
        router.push("/")
    }

    const isActive = (href: string, exact: boolean) =>
        exact ? pathname === href : pathname.startsWith(href)

    return (
        <div className="flex min-h-[calc(100vh-80px)] bg-[#030303] text-[#e8e8e3]">

            {/* ── SIDEBAR ── */}
            <aside className="w-64 shrink-0 border-r border-white/10 flex flex-col">
                {/* User card */}
                <div className="p-8 border-b border-white/10">
                    <div className="w-14 h-14 rounded-full border border-white/20 bg-white/5 flex items-center justify-center mb-4">
                        <User size={22} strokeWidth={1} className="text-gray-400" />
                    </div>
                    <p className="font-serif text-lg font-light truncate">{user ? `${user.firstName} ${user.lastName}` : "Guest"}</p>
                    <p className="text-xs text-gray-500 truncate mt-1">{user?.email}</p>
                </div>

                {/* Nav links */}
                <nav className="flex-1 py-4">
                    {/* Admin Panel shortcut — only for admins */}
                    {isAdmin && (
                        <Link
                            href="/admin"
                            className="flex items-center gap-3 px-6 py-3.5 text-xs uppercase tracking-widest text-amber-400 transition-all border-b border-white/5 mb-1"
                        >
                            <LayoutDashboard size={14} strokeWidth={1.5} />
                            <span>Admin Panel</span>
                            <ChevronRight size={12} className="ml-auto opacity-50" />
                        </Link>
                    )}
                    {navItems.map((item) => {
                        const active = isActive(item.href, item.exact)
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center gap-3 px-6 py-3.5 text-xs uppercase tracking-widest transition-all group ${active
                                    ? "text-white border-r-2 border-white bg-white/5"
                                    : "text-gray-500"
                                    }`}
                            >
                                <item.icon size={14} strokeWidth={1.5} />
                                <span>{item.label}</span>
                                <ChevronRight
                                    size={12}
                                    className={`ml-auto transition-opacity ${active ? "opacity-100" : "opacity-0"}`}
                                />
                            </Link>
                        )
                    })}

                    {/* Sign Out — directly below Settings */}
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-6 py-3.5 text-xs uppercase tracking-widest text-gray-500 transition-all border-b border-white/5"
                    >
                        <LogOut size={14} strokeWidth={1.5} />
                        <span>Sign Out</span>
                    </button>

                    {/* Back to Home */}
                    <Link
                        href="/"
                        className="flex items-center gap-3 w-full px-6 py-5 text-xs uppercase tracking-[0.2em] text-white/50 hover:text-white transition-all mt-auto"
                    >
                        <ArrowLeft size={14} strokeWidth={1.5} />
                        <span>Back to Store</span>
                    </Link>
                </nav>
            </aside>

            {/* ── MAIN CONTENT ── */}
            <main className="flex-1 overflow-auto">
                {children}
            </main>
        </div>
    )
}
