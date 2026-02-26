import type React from "react"
import type { Metadata, Viewport } from "next"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { WishlistProvider } from "@/lib/wishlist-context"
import { CartProvider } from "@/lib/cart-context"
import { AuthProvider } from "@/lib/auth-context"
import { ToastProvider } from "@/lib/toast-context"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-serif",
})

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
})

export const metadata: Metadata = {
  title: "ATELIER - Premium Fashion",
  description: "Curated collection of premium clothing and timeless essentials",
}

export const viewport: Viewport = {
  themeColor: "#FCFCFC",
  width: "device-width",
  initialScale: 1,
}

import { LenisProvider } from "@/components/lenis-provider"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${cormorant.variable}`}>
      <body className="font-sans antialiased">
        <AuthProvider>
          <WishlistProvider>
            <CartProvider>
              <ToastProvider>
                <LenisProvider>{children}</LenisProvider>
              </ToastProvider>
            </CartProvider>
          </WishlistProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
