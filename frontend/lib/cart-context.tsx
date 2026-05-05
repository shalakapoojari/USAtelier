"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { getApiBase } from "@/lib/api-base"

export type CartItem = {
  id: string
  name: string
  price: number
  size: string
  quantity: number
  stock: number
  image: string
}

type CartContextType = {
  items: CartItem[]
  addItem: (item: Omit<CartItem, "quantity">) => void
  removeItem: (id: string, size: string) => void
  updateQuantity: (id: string, size: string, quantity: number) => void
  clearCart: () => void
  trackCheckout: () => void   // call this after a successful order
  total: number
  unseenCount: number
  clearUnseen: () => void
  isHydrated: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [unseenCount, setUnseenCount] = useState(0)
  const { isAuthenticated, user } = useAuth()
  const router = useRouter()

  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart")
      if (saved) setItems(JSON.parse(saved))
    } catch { /* ignore */ }
    setIsHydrated(true)
  }, [])

  useEffect(() => {
    if (!isHydrated) return
    localStorage.setItem("cart", JSON.stringify(items))
  }, [items, isHydrated])

  // ── Fire-and-forget cart event tracking ──────────────────────────────
  const trackEvent = (
    event_type: "add" | "remove" | "checkout",
    product_id: string | null,
    product_name: string,
    snapshot: CartItem[],
  ) => {
    if (!isAuthenticated || !(user as any)?.email) return
    const API_BASE = getApiBase()
    if (!API_BASE) return
    fetch(`${API_BASE}/api/cart/event`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event_type,
        product_id,
        product_name,
        cart_snapshot: snapshot.map(i => ({
          id: i.id, name: i.name, price: i.price,
          size: i.size, quantity: i.quantity, image: i.image,
        })),
      }),
    }).catch(() => { /* silent */ })
  }

  const addItem = (newItem: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find((i) => i.id === newItem.id && i.size === newItem.size)
      let next: CartItem[]
      if (existing) {
        if (existing.quantity >= newItem.stock) {
          window.dispatchEvent(new CustomEvent('toast-show', {
            detail: { message: `Only ${newItem.stock} units available in stock`, type: 'info' }
          }))
          return prev
        }
        setUnseenCount((c) => c + 1)
        next = prev.map((i) =>
          i.id === newItem.id && i.size === newItem.size ? { ...i, quantity: i.quantity + 1 } : i
        )
      } else {
        setUnseenCount((c) => c + 1)
        next = [...prev, { ...newItem, quantity: 1 }]
      }
      setTimeout(() => trackEvent("add", newItem.id, newItem.name, next), 0)
      return next
    })
  }

  const removeItem = (id: string, size: string) => {
    setItems((prev) => {
      const removed = prev.find((i) => i.id === id && i.size === size)
      const next = prev.filter((i) => !(i.id === id && i.size === size))
      if (removed) setTimeout(() => trackEvent("remove", id, removed.name, next), 0)
      return next
    })
  }

  const updateQuantity = (id: string, size: string, quantity: number) => {
    if (quantity <= 0) { removeItem(id, size); return }
    setItems((prev) =>
      prev.map((i) => {
        if (i.id === id && i.size === size) {
          if (quantity > i.stock) {
            window.dispatchEvent(new CustomEvent('toast-show', {
              detail: { message: `Maximum stock limit reached (${i.stock} units)`, type: 'info' }
            }))
            return { ...i, quantity: i.stock }
          }
          return { ...i, quantity }
        }
        return i
      })
    )
  }

  const clearCart = () => setItems([])

  const trackCheckout = () => {
    setItems((current) => {
      setTimeout(() => trackEvent("checkout", null, "", current), 0)
      return current
    })
  }

  const clearUnseen = () => setUnseenCount(0)
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, trackCheckout, total, unseenCount, clearUnseen, isHydrated }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
