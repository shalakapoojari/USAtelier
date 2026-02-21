"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect, useRef } from "react"

type WishlistItem = {
    id: string
    name: string
    price: number
    image: string
    category: string
}

type WishlistContextType = {
    items: WishlistItem[]
    addItem: (item: WishlistItem) => void
    removeItem: (id: string) => void
    toggleItem: (item: WishlistItem) => void
    isWishlisted: (id: string) => boolean
    count: number
    // "Unseen" badge — clears when user visits /favourites
    unseenCount: number
    clearUnseen: () => void
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined)

export function WishlistProvider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<WishlistItem[]>([])
    const [isHydrated, setIsHydrated] = useState(false)
    const [unseenCount, setUnseenCount] = useState(0)

    // Keep a ref to the latest items so toggleItem can check synchronously
    // without needing to call setState inside another setState updater
    const latestItems = useRef(items)
    latestItems.current = items

    // Load from localStorage once after mount
    useEffect(() => {
        try {
            const saved = localStorage.getItem("wishlist")
            if (saved) setItems(JSON.parse(saved))
        } catch {
            // ignore
        }
        setIsHydrated(true)
    }, [])

    // Persist — only after hydration to avoid overwriting saved data
    useEffect(() => {
        if (!isHydrated) return
        localStorage.setItem("wishlist", JSON.stringify(items))
    }, [items, isHydrated])

    const addItem = (item: WishlistItem) => {
        setItems((prev) => {
            if (prev.find((i) => i.id === item.id)) return prev
            return [...prev, item]
        })
    }

    const removeItem = (id: string) => {
        setItems((prev) => prev.filter((i) => i.id !== id))
    }

    const toggleItem = (item: WishlistItem) => {
        // Check BEFORE the state update using the ref (always current)
        const alreadySaved = latestItems.current.some((i) => i.id === item.id)
        if (!alreadySaved) {
            // Adding a new favourite → increment unseen badge
            setUnseenCount((c) => c + 1)
        }
        setItems((prev) => {
            const exists = prev.find((i) => i.id === item.id)
            return exists ? prev.filter((i) => i.id !== item.id) : [...prev, item]
        })
    }

    const isWishlisted = (id: string) => items.some((i) => i.id === id)

    const clearUnseen = () => setUnseenCount(0)

    return (
        <WishlistContext.Provider
            value={{
                items,
                addItem,
                removeItem,
                toggleItem,
                isWishlisted,
                count: items.length,
                unseenCount,
                clearUnseen,
            }}
        >
            {children}
        </WishlistContext.Provider>
    )
}

export function useWishlist() {
    const ctx = useContext(WishlistContext)
    if (!ctx) throw new Error("useWishlist must be used within WishlistProvider")
    return ctx
}
