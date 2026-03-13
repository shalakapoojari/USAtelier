"use client"

import { useEffect } from "react"
import Image from "next/image"
import Link from "next/link"
import { Heart, ShoppingBag, X } from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useWishlist } from "@/lib/wishlist-context"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/lib/toast-context"

export default function FavouritesPage() {
    const { items, removeItem, clearUnseen } = useWishlist()
    const { addItem } = useCart()
    const { showToast } = useToast()

    // Clear the navbar badge as soon as the user lands here
    useEffect(() => { clearUnseen() }, [])

    const handleAddToCart = (item: typeof items[0]) => {
        // Add with default size — user can pick on product page
        addItem({ id: item.id, name: item.name, price: item.price, image: item.image, size: "M" })
        showToast("Added to cart", "cart", item.name)
    }

    return (
        <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
            <SiteHeader />

            <main className="pt-60 pb-32 px-6 md:px-12 max-w-[1400px] mx-auto">
                {/* Header */}
                <div className="flex items-end justify-between mb-20">
                    <div>
                        <p className="uppercase tracking-[0.5em] text-xs text-gray-400 mb-4">Curated By You</p>
                        <h1 className="font-serif text-6xl md:text-7xl font-light">Favourites</h1>
                    </div>
                    {items.length > 0 && (
                        <p className="text-xs uppercase tracking-widest text-gray-500">
                            {items.length} {items.length === 1 ? "piece" : "pieces"}
                        </p>
                    )}
                </div>

                {items.length === 0 ? (
                    /* Empty state */
                    <div className="text-center py-40 border border-white/10">
                        <Heart className="mx-auto mb-6 h-12 w-12 text-white/10" />
                        <p className="uppercase tracking-widest text-gray-500 mb-2 text-sm">
                            Your favourites are empty
                        </p>
                        <p className="text-xs text-gray-600 mb-12">
                            Save pieces you love while browsing the collection
                        </p>
                        <Link
                            href="/view-all"
                            className="inline-block px-10 py-4 border border-white/30 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
                        >
                            Explore the Collection
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-10">
                        {items.map((item) => (
                            <div key={item.id} className="group relative">
                                {/* Remove button */}
                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="absolute top-3 right-3 z-10 w-7 h-7 flex items-center justify-center bg-[#030303]/80 border border-white/10 text-gray-400 hover:text-white hover:border-white/40 transition-all opacity-0 group-hover:opacity-100"
                                    title="Remove from favourites"
                                >
                                    <X size={12} />
                                </button>

                                {/* Image */}
                                <Link href={`/product/${item.id}`} className="block">
                                    <div className="relative aspect-[3/4] overflow-hidden bg-[#111] mb-4">
                                        <Image
                                            src={item.image}
                                            alt={item.name}
                                            fill
                                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                                        />
                                        {/* Hover overlay */}
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </Link>

                                {/* Info */}
                                <div className="space-y-1 mb-4">
                                    <p className="text-[10px] uppercase tracking-widest text-gray-500">
                                        {item.category}
                                    </p>
                                    <Link href={`/product/${item.id}`}>
                                        <h3 className="text-sm font-medium leading-snug hover:text-gray-300 transition-colors">
                                            {item.name}
                                        </h3>
                                    </Link>
                                    <p className="text-sm text-gray-400">₹{item.price.toLocaleString("en-IN")}</p>
                                </div>

                                {/* Quick add to cart */}
                                <button
                                    onClick={() => handleAddToCart(item)}
                                    className="w-full flex items-center justify-center gap-2 py-3 border border-white/20 text-xs uppercase tracking-widest text-gray-400 hover:border-white hover:text-white transition-all duration-300"
                                >
                                    <ShoppingBag size={12} />
                                    Add to Cart
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </main>

            <SiteFooter />
        </div>
    )
}
