"use client"

import Link from "next/link"
import { useState } from "react"

export function SiteFooter() {
  const [email, setEmail] = useState("")
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setSubmitted(true)
    setEmail("")
  }

  return (
    <footer className="bg-[#050505] pt-6 pb-3 px-6 md:px-16 border-t border-white/5 relative overflow-hidden">
      {/* Giant background brand */}
      <span className="text-[18vw] font-serif font-bold text-white/5 absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none leading-none select-none whitespace-nowrap">
        U.S ATELIER
      </span>

      <div className="relative z-10 max-w-[1400px] mx-auto">
        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-6 pb-6 border-b border-white/5">
          {/* Shop */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white mb-3">Shop</p>
            <ul className="space-y-2.5 text-xs uppercase tracking-widest text-gray-500">
              <li><Link href="/view-all" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link href="/new-arrivals" className="hover:text-white transition-colors">New Arrivals</Link></li>
              <li><Link href="/collections/bestsellers" className="hover:text-white transition-colors">Bestsellers</Link></li>
              <li><Link href="/collections" className="hover:text-white transition-colors">Collections</Link></li>
            </ul>
          </div>

          {/* The House */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white mb-3">More Info</p>
            <ul className="space-y-2.5 text-xs uppercase tracking-widest text-gray-500">
              <li><Link href="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link href="/help" className="hover:text-white transition-colors">Help</Link></li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white mb-3">Help</p>
            <ul className="space-y-2.5 text-xs uppercase tracking-widest text-gray-500">
              <li><Link href="/account" className="hover:text-white transition-colors">My Account</Link></li>
              <li><Link href="/account/orders" className="hover:text-white transition-colors">Order Tracking</Link></li>
              <li><Link href="/cart" className="hover:text-white transition-colors">Shipping Info</Link></li>
              <li><Link href="/cart" className="hover:text-white transition-colors">Returns</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] uppercase tracking-widest text-gray-700">
          <div className="flex items-center gap-4">
            <div className="h-8 w-28 overflow-hidden flex items-center ml-2">
              <img src="/logo/logo.png" alt="Logo" className="h-8 w-auto opacity-30 grayscale hover:grayscale-0 hover:opacity-100 transition-all scale-[4.5] origin-left object-contain object-left" />
            </div>
            <span>© 2025 U.S ATELIER Maison. All Rights Reserved.</span>
          </div>
          <span className="opacity-50">Crafted in India · Designed for the World</span>
          <div className="flex gap-8">
            
            <Link href="/terms&conditions" className="hover:text-gray-400 transition-colors">Terms & Conditions</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
