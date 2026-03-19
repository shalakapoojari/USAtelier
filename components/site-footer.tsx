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

      <div className="relative z-10 max-w-350 mx-auto">
        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-6 pb-6 border-b border-white/5">
          {/* Shop */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] text-white mb-3">Shop</p>
            <ul className="space-y-2.5 text-xs uppercase tracking-widest text-gray-500">
              <li><Link href="/view-all" className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link href="/#new-arrivals" className="hover:text-white transition-colors">New Arrivals</Link></li>
              <li><Link href="/#best-sellers" className="hover:text-white transition-colors">Bestsellers</Link></li>
              <li><Link href="/#featured-products" className="hover:text-white transition-colors">Featured Products</Link></li>
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
            <Link href="/" className="ml-2 flex h-8 w-32 items-center overflow-hidden md:w-40">
              <img src="/logo/us-atelier-wordmark.svg" alt="U.S ATELIER" className="h-full w-full object-contain object-left opacity-45 transition-opacity hover:opacity-100" />
            </Link>
            <span>© 2025 U.S ATELIER Maison. All Rights Reserved.</span>
          </div>
          <span className="opacity-50">Crafted in India · Designed for the World</span>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <a href="mailto:usatelier08@gmail.com" className="hover:text-gray-400 transition-colors">Contact Us: usatelier08@gmail.com</a>
            <Link href="/terms&conditions" className="hover:text-gray-400 transition-colors">Terms & Conditions</Link>
            <Link href="/terms&conditions#privacy-policy" className="hover:text-gray-400 transition-colors">Privacy Policy</Link>
            <Link href="/terms&conditions#cancellation-and-refund-policy" className="hover:text-gray-400 transition-colors">Cancellation & Refund Policy</Link>
            <Link href="/terms&conditions#shipping-and-delivery-policy" className="hover:text-gray-400 transition-colors">Shipping & Delivery Policy</Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
