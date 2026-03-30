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
    <footer
      className="relative overflow-hidden pt-6 pb-3 px-6 md:px-16"
      style={{
        background: "rgba(0,0,0,0.95)",
        borderTop: "1px solid rgba(123,47,190,0.2)",
        boxShadow: "0 -1px 30px rgba(123,47,190,0.1)",
      }}
    >
      {/* Removed glow orbs to match clean styling */}

      {/* Giant background brand text — galaxy tinted */}
      <span
        className="font-serif font-bold absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none leading-none select-none whitespace-nowrap"
        style={{
          fontSize: "18vw",
          color: "rgba(255,255,255,0.03)",
        }}
      >
        U.S ATELIER
      </span>

      <div className="relative z-10 max-w-350 mx-auto">
        {/* Top grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 mb-6 pb-6" style={{ borderBottom: "1px solid rgba(123,47,190,0.1)" }}>
          {/* Shop */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] mb-3" style={{ color: "rgba(240,240,240,0.6)" }}>Shop</p>
            <ul className="space-y-2.5 text-xs uppercase tracking-widest" style={{ color: "rgba(240,240,240,0.35)" }}>
              <li>
                <Link href="/view-all" className="footer-link hover:text-white transition-colors">
                  All Products
                </Link>
              </li>
              <li>
                <Link href="/#best-sellers" className="footer-link hover:text-white transition-colors">
                  Bestsellers
                </Link>
              </li>
            </ul>
          </div>

          {/* The House */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] mb-3" style={{ color: "rgba(240,240,240,0.6)" }}>More Info</p>
            <ul className="space-y-2.5 text-xs uppercase tracking-widest" style={{ color: "rgba(240,240,240,0.35)" }}>
              <li>
                <Link href="/about" className="footer-link hover:text-white transition-colors">
                  About Us
                </Link>
              </li>
              <li>
                <Link href="/help" className="footer-link hover:text-white transition-colors">
                  Help
                </Link>
              </li>
            </ul>
          </div>

          {/* Help */}
          <div>
            <p className="text-[10px] uppercase tracking-[0.4em] mb-3" style={{ color: "rgba(240,240,240,0.6)" }}>Help</p>
            <ul className="space-y-2.5 text-xs uppercase tracking-widest" style={{ color: "rgba(240,240,240,0.35)" }}>
              <li>
                <Link href="/account" className="footer-link hover:text-white transition-colors">
                  My Account
                </Link>
              </li>
              <li>
                <Link href="/help#shipping" className="footer-link hover:text-white transition-colors">
                  Order Tracking
                </Link>
              </li>
              <li>
                <Link href="/help#shipping" className="footer-link hover:text-white transition-colors">
                  Shipping Info
                </Link>
              </li>
              <li>
                <Link href="/help#returns" className="footer-link hover:text-white transition-colors">
                  Returns
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row justify-between items-center gap-6 text-[10px] uppercase tracking-widest"
          style={{ color: "rgba(240,240,240,0.25)" }}
        >
          <div className="flex items-center gap-4">
            <Link href="/" className="ml-2 flex h-8 w-32 items-center overflow-hidden md:w-40">
              <img
                src="/logo/us-atelier-wordmark.svg"
                alt="U.S ATELIER"
                className="h-full w-full object-contain object-left transition-opacity hover:opacity-80"
                style={{ opacity: 0.35, filter: "invert(1)" }}
              />
            </Link>
            <span>© 2025 U.S ATELIER Maison. All Rights Reserved.</span>
          </div>
          <span style={{ opacity: 0.5 }}>Crafted in India · Designed for the World</span>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
            <a href="mailto:usatelier08@gmail.com" className="hover:text-gray-400 transition-colors">
              Contact Us: usatelier08@gmail.com
            </a>
            <Link href="/terms&conditions" className="hover:text-gray-400 transition-colors">
              Terms &amp; Conditions
            </Link>
            <Link href="/terms&conditions#privacy-policy" className="hover:text-gray-400 transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms&conditions#cancellation-and-refund-policy" className="hover:text-gray-400 transition-colors">
              Cancellation &amp; Refund Policy
            </Link>
            <Link href="/terms&conditions#shipping-and-delivery-policy" className="hover:text-gray-400 transition-colors">
              Shipping &amp; Delivery Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
