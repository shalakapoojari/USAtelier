"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"

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
  total: number
  // "Unseen" badge — clears when user visits /cart
  unseenCount: number
  clearUnseen: () => void
  isHydrated: boolean
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([])
  const [isHydrated, setIsHydrated] = useState(false)
  const [unseenCount, setUnseenCount] = useState(0)
  const { isAuthenticated } = useAuth()
  const router = useRouter()

  // Load from localStorage once after mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("cart")
      if (saved) setItems(JSON.parse(saved))
    } catch {
      // ignore corrupt data
    }
    setIsHydrated(true)
  }, [])

  // Persist to localStorage — only after hydration
  useEffect(() => {
    if (!isHydrated) return
    localStorage.setItem("cart", JSON.stringify(items))
  }, [items, isHydrated])

  // Cart persists in localStorage regardless of auth state
  // (no wipe on logout — guest cart is preserved)

  const addItem = (newItem: Omit<CartItem, "quantity">) => {
    setItems((prev) => {
      const existing = prev.find(
        (i) => i.id === newItem.id && i.size === newItem.size
      )
      
      if (existing) {
        if (existing.quantity >= newItem.stock) {
          // Dispatch custom event to show toast since context isn't available here
          window.dispatchEvent(new CustomEvent('toast-show', { 
            detail: { message: `Only ${newItem.stock} units available in stock`, type: 'info' } 
          }))
          return prev
        }
        setUnseenCount((c) => c + 1)
        return prev.map((i) =>
          i.id === newItem.id && i.size === newItem.size
            ? { ...i, quantity: i.quantity + 1 }
            : i
        )
      }
      setUnseenCount((c) => c + 1)
      return [...prev, { ...newItem, quantity: 1 }]
    })
  }

  const removeItem = (id: string, size: string) => {
    setItems((prev) => prev.filter((i) => !(i.id === id && i.size === size)))
  }

  const updateQuantity = (id: string, size: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(id, size)
      return
    }
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

  const clearUnseen = () => setUnseenCount(0)

  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0)

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        total,
        unseenCount,
        clearUnseen,
        isHydrated,
      }}
    >
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be used within CartProvider")
  return ctx
}
