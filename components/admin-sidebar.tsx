"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { LayoutDashboard, Package, ShoppingBag, Users, CreditCard, Tag, ArrowLeft } from "lucide-react"

const navItems = [
    { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/payments", label: "Payments", icon: CreditCard },
    { href: "/admin/categories", label: "Categories", icon: Tag },
]

export function AdminSidebar() {
    const pathname = usePathname()

    return (
        <aside className="fixed left-0 top-0 h-full w-64 bg-[#060606] border-r border-white/5 z-40 flex flex-col">
            {/* Brand */}
            <div className="px-8 py-8 border-b border-white/5">
                <p className="font-serif text-lg tracking-widest">U.S ATELIER</p>
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mt-1">Admin Panel</p>
            </div>

            {/* Nav */}
            <nav className="flex-1 px-4 py-8 space-y-1">
                {navItems.map(({ href, label, icon: Icon }) => {
                    const isActive = pathname === href
                    return (
                        <Link
                            key={href}
                            href={href}
                            className={`flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-widest rounded-sm ${isActive
                                ? "text-white bg-white/5"
                                : "text-gray-400"
                                }`}
                        >
                            <Icon size={14} />
                            {label}
                        </Link>
                    )
                })}
            </nav>

            {/* Footer */}
            <div className="px-4 py-8 border-t border-white/5">
                <Link
                    href="/"
                    className="flex items-center gap-3 px-4 py-3 text-xs uppercase tracking-widest text-gray-500"
                >
                    <ArrowLeft size={14} />
                    Back to Store
                </Link>
            </div>
        </aside>
    )
}
