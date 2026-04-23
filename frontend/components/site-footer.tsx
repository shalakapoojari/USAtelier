"use client"

import Link from "next/link"

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden bg-white pt-20 pb-12 px-6 md:px-16 border-t border-gray-100">

      {/* Giant ghost brand text - Refined for subtle impact */}
      <div className="absolute bottom-[-2%] left-0 w-full overflow-hidden pointer-events-none select-none">
        <span className="text-[20vw] font-serif italic text-gray-50 leading-none whitespace-nowrap tracking-tighter block">
          U.S Atelier
        </span>
      </div>

      <div className="relative z-10 max-w-screen-2xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-y-12 mb-20">

          {/* Brand Identity - Aligned Left */}
          <div className="md:col-span-9 space-y-6">
            <p className="text-[13px] leading-relaxed text-gray-500 max-w-xs">
              Worn with distinction. Blending a dark elegant aesthetic with timeless minimal design.
            </p>
          </div>

          <div className="md:col-span-3 flex flex-col md:items-end text-left md:text-right">
            <p className="text-[10px] tracking-[0.5em] text-gray-300 mb-6 font-sans">
              Support
            </p>
            <ul className="space-y-4 text-[12px] tracking-widest text-black font-sans font-light">
              <li><Link href="/account" className="hover:italic transition-all inline-block">My Account</Link></li>
              <li><a href="mailto:usatelier08@gmail.com" className="hover:italic transition-all inline-block">Contact Us</a></li>
              <li><Link href="/terms&conditions" className="hover:italic transition-all inline-block">Terms &amp; Legal</Link></li>
              <li><Link href="/refund-policy" className="hover:italic transition-all inline-block">Refund &amp; Exchange</Link></li>
              <li><Link href="/terms&conditions#shipping-and-delivery-policy" className="hover:italic transition-all inline-block">Shipping Policy</Link></li>
              <li><Link href="/privacy-policy" className="hover:italic transition-all inline-block">Privacy Policy</Link></li>
              <li><Link href="/cookie-policy" className="hover:italic transition-all inline-block">Cookie Policy</Link></li>
            </ul>

          </div>
        </div>

        {/* Bottom Bar - Clean & Symmetrical */}
        <div className="flex flex-col md:flex-row justify-between items-center pt-8 border-t border-gray-100 text-[10px] uppercase tracking-[0.3em] text-gray-400 gap-6 font-sans">
          <div className="flex gap-6 order-2 md:order-1">
            <span>© 2026 U.S ATELIER MAISON</span>
          </div>
          <div className="order-1 md:order-2 flex gap-6 text-[9px] text-gray-300 font-sans font-light normal-case tracking-widest">
            <span>Ships from India &middot; Worldwide Delivery</span>
          </div>
        </div>
      </div>
    </footer>
  )
}