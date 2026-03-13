"use client"

import { useState, useEffect } from "react"
import { use } from "react"
import Image from "next/image"
import Link from "next/link"
import { notFound, useRouter } from "next/navigation"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { useCart } from "@/lib/cart-context"
import { useWishlist } from "@/lib/wishlist-context"
import { useToast } from "@/lib/toast-context"
import { useAuth } from "@/lib/auth-context"

import { ChevronDown, ChevronUp, ShoppingBag, Heart, Star, Check, Sparkles, Award, ArrowLeft, Loader2, Share2, MessageCircle, Twitter, Facebook, Link2 } from "lucide-react"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"

export default function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const [product, setProduct] = useState<any>(null)
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { addItem } = useCart()
  const { toggleItem, isWishlisted } = useWishlist()
  const { showToast } = useToast()
  const { isAuthenticated } = useAuth()

  const [selectedSize, setSelectedSize] = useState("")
  const [selectedImage, setSelectedImage] = useState(0)
  const [showDescription, setShowDescription] = useState(true)
  const [showDetails, setShowDetails] = useState(false)
  const [showShipping, setShowShipping] = useState(false)
  const [addedToCart, setAddedToCart] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [productRes, allProductsRes] = await Promise.all([
          fetch(`${API_BASE}/api/products/${id}`, { credentials: "include" }),
          fetch(`${API_BASE}/api/products`, { credentials: "include" }),
        ])

        if (productRes.ok) {
          const data = await productRes.json()
          setProduct(data)
        } else {
          notFound()
        }

        if (allProductsRes.ok) {
          const allData = await allProductsRes.json()
          setAllProducts(allData)
        }
      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [id])

  if (loading) {
    return (
      <div className="bg-[#030303] text-[#e8e8e3] min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin text-gray-500" />
      </div>
    )
  }

  if (!product) notFound()

  // Helper to parse images
  const images = (() => {
    if (Array.isArray(product.images)) return product.images
    try {
      const parsed = JSON.parse(product.images)
      return Array.isArray(parsed) ? parsed : [product.images]
    } catch {
      return [product.images]
    }
  })()

  const isInStock = product.stock !== undefined ? product.stock > 0 : product.inStock

  const formatImageUrl = (url: string) => {
    if (!url) return "/placeholder.jpg"
    if (url.startsWith("http") || url.startsWith("data:")) return url
    if (!url.startsWith("/")) return `/${url}`
    return url
  }

  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 8)

  const handleAddToCart = () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    if (!selectedSize) {
      const sizeSection = document.getElementById("size-section")
      sizeSection?.scrollIntoView({ behavior: "smooth" })
      showToast("Please select a size first", "info", product.name)
      return
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      image: formatImageUrl(images[0]),
    })

    setAddedToCart(true)
    showToast("Added to cart", "cart", `${product.name} — Size ${selectedSize}`)
    setTimeout(() => setAddedToCart(false), 2500)
  }

  const handleWishlistToggle = () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    const wasWishlisted = isWishlisted(product.id)
    toggleItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: formatImageUrl(images[0]),
      category: product.category,
    })
    if (wasWishlisted) {
      showToast("Removed from favourites", "info", product.name)
    } else {
      showToast("Saved to favourites", "wishlist", product.name)
    }
  }

  const handleShare = () => {
    setShowShareMenu(!showShareMenu)
  }

  const handleCopyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url).then(() => {
      setLinkCopied(true)
      setTimeout(() => {
        setLinkCopied(false)
        setShowShareMenu(false)
      }, 1500)
    })
  }

  const handleShareTo = (platform: string) => {
    const url = window.location.href
    const origin = window.location.origin
    const siteName = "U.S-ATELIER"
    const productName = product.name

    // Map categories to collections for "More like this" links
    const collectionMap: Record<string, string> = {
      "Basics": "essentials",
      "Knitwear": "knitwear",
      "Trousers": "tailoring",
      "Shirts": "tailoring",
    }
    const colSlug = collectionMap[product.category]
    const collectionLink = colSlug ? `${origin}/collections/${colSlug}` : `${origin}/view-all`

    // Professional Flipkart-inspired message with clear URL separation
    const message = `Take a look at this ${productName} on ${siteName}:\n${url}\n\nMore from ${product.category}:\n${collectionLink}`

    let shareUrl = ""
    if (platform === "whatsapp") {
      shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`
    } else if (platform === "twitter") {
      const tweetText = `Take a look at this ${productName} on ${siteName}`
      shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(tweetText)}`
    } else if (platform === "facebook") {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank")
    }
    setShowShareMenu(false)
  }

  const handleBuyNow = () => {
    if (!isAuthenticated) {
      router.push("/login")
      return
    }

    if (!selectedSize) {
      const sizeSection = document.getElementById("size-section")
      sizeSection?.scrollIntoView({ behavior: "smooth" })
      showToast("Please select a size first", "info", product.name)
      return
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      image: formatImageUrl(images[0]),
    })

    showToast("Redirecting to checkout...", "cart", product.name)
    router.push("/checkout")
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      {/* ── BACK LINK ── */}
      <div className="pt-56 px-6 md:px-12 max-w-[1400px] mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={14} />
          Back
        </button>
      </div>

      {/* ── PRODUCT LAYOUT ── */}
      <main className="pt-10 px-6 md:px-12 pb-32">
        <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-start max-w-[1400px] mx-auto">

          {/* ── IMAGES COLUMN ── */}
          <div className="space-y-4">
            {/* Main image */}
            <div className="relative aspect-3/4 overflow-hidden bg-[#111]">
              <Image
                src={formatImageUrl(images[selectedImage])}
                alt={product.name}
                fill
                priority
                className="object-cover transition-opacity duration-500"
              />
              <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/10" />

              {/* Badges top-left */}
              <div className="absolute top-4 left-4 flex flex-col gap-2">
                {(product.newArrival || product.is_new) && (
                  <span className="bg-white text-black text-[10px] uppercase tracking-widest px-3 py-1 font-medium flex items-center gap-1">
                    <Sparkles size={10} />
                    New
                  </span>
                )}
                {(product.bestseller || product.is_bestseller) && (
                  <span className="bg-amber-500 text-black text-[10px] uppercase tracking-widest px-3 py-1 font-medium flex items-center gap-1">
                    <Award size={10} />
                    Bestseller
                  </span>
                )}
                {!isInStock && (
                  <span className="bg-red-600 text-white text-[10px] uppercase tracking-widest px-3 py-1 font-medium">
                    Out of Stock
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {images.map((image: string, index: number) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative aspect-square overflow-hidden transition-all ${selectedImage === index
                      ? "ring-1 ring-white"
                      : "opacity-50 hover:opacity-90"
                      }`}
                  >
                    <Image
                      src={formatImageUrl(image)}
                      alt={`${product.name} view ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* ── DETAILS COLUMN ── */}
          <div className="space-y-0">

            {/* Category breadcrumb */}
            <Link
              href="/view-all"
              className="uppercase tracking-[0.4em] text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
            >
              {product.category}
            </Link>

            {/* Name */}
            <h1 className="font-serif text-4xl md:text-5xl font-light mt-3 mb-2">
              {product.name}
            </h1>

            {/* Star rating (decorative) */}
            <div className="flex items-center gap-1 mb-4">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  size={12}
                  className={s <= 4 ? "fill-amber-400 text-amber-400" : "text-gray-600"}
                />
              ))}
              <span className="text-xs text-gray-500 ml-2">4.0 (24 reviews)</span>
            </div>

            {/* Price */}
            <p className="text-3xl font-light mb-6">₹{product.price.toLocaleString('en-IN')}</p>

            {/* Short description */}
            <p className="text-gray-400 leading-relaxed text-sm mb-8 max-w-md border-l border-white/10 pl-4">
              {product.description}
            </p>

            {/* Details grid (fabric, category, stock) */}
            <div className="grid grid-cols-2 gap-3 mb-8 text-xs">
              <div className="bg-white/5 rounded px-4 py-3">
                <p className="text-gray-500 uppercase tracking-widest mb-1">Category</p>
                <p className="text-white">{product.category}</p>
              </div>
              <div className="bg-white/5 rounded px-4 py-3">
                <p className="text-gray-500 uppercase tracking-widest mb-1">Availability</p>
                <p className={isInStock ? "text-green-400" : "text-red-400"}>
                  {isInStock ? "In Stock" : "Out of Stock"}
                </p>
              </div>
              {product.fabric && (
                <div className="bg-white/5 rounded px-4 py-3">
                  <p className="text-gray-500 uppercase tracking-widest mb-1">Fabric</p>
                  <p className="text-white">{product.fabric}</p>
                </div>
              )}
              {product.care && (
                <div className="bg-white/5 rounded px-4 py-3">
                  <p className="text-gray-500 uppercase tracking-widest mb-1">Care</p>
                  <p className="text-white">{product.care}</p>
                </div>
              )}
            </div>

            {/* Size selector */}
            <div id="size-section" className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <span className="uppercase tracking-widest text-xs text-gray-400">
                  Select Size
                </span>
                {!selectedSize && isInStock && (
                  <span className="text-[10px] text-gray-500 animate-pulse">
                    ↑ choose a size to add to cart
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                {product.sizes && (Array.isArray(product.sizes) ? product.sizes : (() => { try { return JSON.parse(product.sizes) } catch { return [] } })()).map((size: string) => (
                  <button
                    key={size}
                    disabled={!isInStock}
                    onClick={() => setSelectedSize(size)}
                    className={`px-4 py-2 text-xs tracking-widest border transition-all duration-200 ${selectedSize === size
                      ? "border-white bg-white text-black"
                      : "border-white/20 text-gray-400 hover:border-white/60 hover:text-white"
                      } disabled:opacity-30 disabled:cursor-not-allowed`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div className="space-y-3 mb-10">
              <div className="flex gap-3">
                <button
                  onClick={handleAddToCart}
                  disabled={!isInStock}
                  className={`flex-1 py-4 flex items-center justify-center gap-2 uppercase tracking-widest text-xs font-medium transition-all duration-500 ${addedToCart
                    ? "bg-green-500 text-white border border-green-500"
                    : "bg-white text-black border border-white"
                    } disabled:opacity-40 disabled:cursor-not-allowed`}
                >
                  {addedToCart ? (
                    <>
                      <Check size={14} />
                      Added to Cart
                    </>
                  ) : isInStock ? (
                    <>
                      <ShoppingBag size={14} />
                      Add to Cart
                    </>
                  ) : (
                    "Out of Stock"
                  )}
                </button>

                <button
                  onClick={handleWishlistToggle}
                  className={`px-4 py-4 border transition-all duration-300 ${isWishlisted(product.id)
                    ? "border-red-400 text-red-400"
                    : "border-white/60 text-white"
                    }`}
                  title="Add to Favourites"
                >
                  <Heart size={16} className={isWishlisted(product.id) ? "fill-red-400" : ""} />
                </button>

                <div className="relative">
                  <button
                    onClick={handleShare}
                    className={`px-4 py-4 border transition-all duration-300 ${showShareMenu ? "border-white bg-white text-black" : "border-white/60 text-white hover:border-white"
                      }`}
                    title="Share Product"
                  >
                    <Share2 size={16} />
                  </button>

                  {showShareMenu && (
                    <div className="absolute -top-16 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/95 border border-white/20 p-1.5 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
                      <button
                        onClick={() => handleShareTo("whatsapp")}
                        className="p-2 hover:bg-white/10 text-green-500 transition-colors"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle size={18} fill="currentColor" fillOpacity={0.1} />
                      </button>
                      <button
                        onClick={() => handleShareTo("twitter")}
                        className="p-2 hover:bg-white/10 text-sky-400 transition-colors"
                        title="Share on Twitter"
                      >
                        <Twitter size={18} fill="currentColor" fillOpacity={0.1} />
                      </button>
                      <button
                        onClick={() => handleShareTo("facebook")}
                        className="p-2 hover:bg-white/10 text-blue-600 transition-colors"
                        title="Share on Facebook"
                      >
                        <Facebook size={18} fill="currentColor" fillOpacity={0.1} />
                      </button>
                      <div className="w-px h-4 bg-white/10 mx-1" />
                      <button
                        onClick={handleCopyLink}
                        className="p-2 hover:bg-white/10 text-white transition-colors relative"
                        title="Copy Link"
                      >
                        {linkCopied ? <Check size={18} className="text-green-500" /> : <Link2 size={18} />}
                        {linkCopied && (
                          <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-white text-black text-[9px] uppercase tracking-tighter px-2 py-0.5 whitespace-nowrap font-bold">
                            Copied
                          </span>
                        )}
                      </button>
                      {/* Arrow Down */}
                      <div className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-3 h-3 bg-black border-r border-b border-white/20 rotate-45" />
                    </div>
                  )}
                </div>
              </div>

              {isInStock && (
                <button
                  onClick={handleBuyNow}
                  className="w-full py-4 bg-transparent text-[#facc15] border border-[#facc15] uppercase tracking-widest text-xs font-bold transition-all duration-300"
                >
                  Buy Now
                </button>
              )}
            </div>

            {/* Accordions */}
            <div className="border-t border-white/10 divide-y divide-white/10">

              {/* Description */}
              <div>
                <button
                  onClick={() => setShowDescription(!showDescription)}
                  className="flex items-center justify-between w-full py-5"
                >
                  <span className="uppercase tracking-widest text-xs">Description</span>
                  {showDescription ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showDescription && (
                  <p className="pb-5 text-gray-400 text-sm leading-relaxed">
                    {product.description}
                  </p>
                )}
              </div>

              {/* Size Guide */}
              {product.sizeGuideImage && (
                <div className="border-t border-white/10">
                  <button
                    onClick={() => {
                      const el = document.getElementById("size-guide-content");
                      if (el) el.classList.toggle("hidden");
                    }}
                    className="flex items-center justify-between w-full py-5"
                  >
                    <span className="uppercase tracking-widest text-xs text-amber-500">Size Guide</span>
                    <ChevronDown size={16} className="text-amber-500" />
                  </button>
                  <div id="size-guide-content" className="pb-10 hidden animate-in fade-in slide-in-from-top-2 duration-500">
                    <div className="mx-auto max-w-md bg-white/2 border border-white/10 p-4 rounded-sm shadow-2xl">
                      <div className="relative overflow-hidden bg-black/40">
                        <img 
                          src={formatImageUrl(product.sizeGuideImage)} 
                          alt="Size Guide" 
                          className="w-full h-auto max-h-[600px] object-contain block mx-auto transition-transform duration-700 hover:scale-105"
                        />
                      </div>
                      <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between">
                        <p className="text-[9px] text-gray-500 uppercase tracking-[0.3em]">Piece Guidelines</p>
                        <div className="flex gap-1">
                          <div className="w-1 h-1 rounded-full bg-amber-500/50" />
                          <div className="w-1 h-1 rounded-full bg-amber-500/30" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Shipping */}
              <div>
                <button
                  onClick={() => setShowShipping(!showShipping)}
                  className="flex items-center justify-between w-full py-5"
                >
                  <span className="uppercase tracking-widest text-xs">Shipping & Returns</span>
                  {showShipping ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
                {showShipping && (
                  <div className="pb-5 text-gray-400 text-sm space-y-2 leading-relaxed">
                    <p>Complimentary standard shipping on all orders over ₹12,500.</p>
                    <p>Express delivery available at checkout.</p>
                    <p>Returns accepted within 30 days of delivery. Items must be unworn and in original packaging.</p>
                  </div>
                )}
              </div>

              {/* Fabric & Care */}
              {(product.fabric || product.care) && (
                <div>
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="flex items-center justify-between w-full py-5"
                  >
                    <span className="uppercase tracking-widest text-xs">Fabric & Care</span>
                    {showDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {showDetails && (
                    <div className="pb-5 text-gray-400 text-sm space-y-2">
                      {product.fabric && (
                        <div className="flex gap-3">
                          <span className="text-gray-600 w-16 shrink-0">Fabric</span>
                          <span>{product.fabric}</span>
                        </div>
                      )}
                      {product.care && (
                        <div className="flex gap-3">
                          <span className="text-gray-600 w-16 shrink-0">Care</span>
                          <span>{product.care}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── RELATED PRODUCTS ── */}
        {relatedProducts.length > 0 && (
          <section className="mt-40 max-w-[1400px] mx-auto">
            <div className="text-center mb-14">
              <p className="uppercase tracking-[0.4em] text-xs text-gray-500 mb-4">You may also like</p>
              <h2 className="font-serif text-4xl font-light">Related Products</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {relatedProducts.map((p: any) => {
                const pImages = Array.isArray(p.images) ? p.images : (() => { try { return JSON.parse(p.images) } catch { return [p.images] } })()
                return (
                  <Link key={p.id} href={`/product/${p.id}`} className="group block">
                    <div className="relative aspect-3/4 overflow-hidden mb-4 bg-[#111]">
                      <Image
                        src={formatImageUrl(pImages[0])}
                        alt={p.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                      {(p.newArrival || p.is_new) && (
                        <span className="absolute top-3 left-3 bg-white text-black text-[9px] uppercase tracking-widest px-2 py-0.5">
                          New
                        </span>
                      )}
                    </div>
                    <p className="text-sm uppercase tracking-widest group-hover:text-gray-400 transition-colors">
                      {p.name}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">₹{p.price.toLocaleString('en-IN')}</p>
                  </Link>
                )
              })}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
