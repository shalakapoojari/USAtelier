"use client"

import Link from "next/link"

export function SiteFooter() {
  return (
    <footer
      className="site-footer-inner relative overflow-hidden pt-16 pb-8 px-6 md:px-16"
      style={{
        background: "rgba(0,0,0,0.97)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      {/* Giant ghost brand text */}
      <span
        className="font-serif font-bold absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-none leading-none select-none whitespace-nowrap"
        style={{ fontSize: "16vw", color: "rgba(255,255,255,0.025)" }}
      >
        U.S ATELIER
      </span>

      <div className="relative z-10 max-w-screen-xl mx-auto">

        {/* Top: brand + nav + contact in one clean row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-14 pb-12" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Brand */}
          <div className="space-y-4">
            <Link href="/" className="inline-flex h-8 w-36 items-center overflow-hidden">
              <img
                src="/logo/us-atelier-wordmark.svg"
                alt="U.S ATELIER"
                className="h-full w-full object-contain object-left"
                style={{ filter: "invert(1)", opacity: 0.5 }}
              />
            </Link>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gray-600 leading-relaxed max-w-xs">
              Premium contemporary fashion.<br />Designed with intention. Worn with distinction.
            </p>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gray-700">
              Crafted in India · Designed for the World
            </p>
          </div>

          {/* Shop links */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.5em] text-gray-600 mb-5">Shop</p>
            <ul className="space-y-3 text-[10px] uppercase tracking-widest text-gray-600">
              <li><Link href="/view-all"            className="hover:text-white transition-colors">All Products</Link></li>
              <li><Link href="/#best-sellers"       className="hover:text-white transition-colors">Best Sellers</Link></li>
              <li><Link href="/#featured"           className="hover:text-white transition-colors">Featured Pieces</Link></li>
              <li><Link href="/new-arrivals"        className="hover:text-white transition-colors">New Arrivals</Link></li>
              <li><Link href="/account"             className="hover:text-white transition-colors">My Account</Link></li>
            </ul>
          </div>

          {/* Contact & Legal */}
          <div>
            <p className="text-[9px] uppercase tracking-[0.5em] text-gray-600 mb-5">Contact</p>
            <ul className="space-y-3 text-[10px] uppercase tracking-widest text-gray-600">
              <li>
                <a href="mailto:usatelier08@gmail.com" className="hover:text-white transition-colors">
                  usatelier08@gmail.com
                </a>
              </li>
            </ul>

            <p className="text-[9px] uppercase tracking-[0.5em] text-gray-600 mt-8 mb-5">Legal</p>
            <ul className="space-y-3 text-[10px] uppercase tracking-widest text-gray-600">
              <li><Link href="/terms&conditions"                                    className="hover:text-white transition-colors">Terms &amp; Conditions</Link></li>
              <li><Link href="/terms&conditions#privacy-policy"                    className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link href="/terms&conditions#cancellation-and-refund-policy"    className="hover:text-white transition-colors">Cancellation &amp; Refund</Link></li>
              <li><Link href="/terms&conditions#shipping-and-delivery-policy"      className="hover:text-white transition-colors">Shipping &amp; Delivery</Link></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          className="flex flex-col md:flex-row justify-between items-center gap-4 text-[9px] uppercase tracking-widest"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          <span>© 2025 U.S Atelier Maison. All Rights Reserved.</span>
          <span className="hidden md:block opacity-50">✦</span>
          <span>GST &amp; inclusive of taxes · Free shipping above ₹2999</span>
        </div>
      </div>
    </footer>
  )
}
