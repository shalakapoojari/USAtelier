"use client"

import type React from "react"
import { CartProvider } from "@/lib/cart-context"

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <CartProvider>
      <div>
        {children}
      </div>
    </CartProvider>
  )
}
