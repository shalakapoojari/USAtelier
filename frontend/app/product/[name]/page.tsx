"use client"

import { useState, useEffect, useRef, useCallback } from "react"
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
import { getApiBase, apiFetch } from "@/lib/api-base"
import { resolveMediaUrl } from "@/lib/media-url"

import { ChevronDown, ChevronUp, ShoppingBag, Heart, Star, Check, Sparkles, Award, ArrowLeft, Loader2, Share2, MessageCircle, Twitter, Facebook, Link2 } from "lucide-react"

const API_BASE = getApiBase()

export default function ProductPage({
  params,
}: {
  params: Promise<{ name: string }>
}) {
  const { name: urlName } = use(params)
  const decodedName = decodeURIComponent(urlName)
  const [product, setProduct] = useState<any>(null)
  const [allProducts, setAllProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const { addItem, items } = useCart()
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

  // Mobile swipe
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  // Reviews
  const [reviews, setReviews] = useState<any[]>([])
  const [newReviewComment, setNewReviewComment] = useState("")
  const [newReviewRating, setNewReviewRating] = useState(5)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [showReviewForm, setShowReviewForm] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      try {
        const allProductsRes = await apiFetch(API_BASE, "/api/products")
        if (!allProductsRes.ok) throw new Error("Failed to fetch products")
        const allData = await allProductsRes.json()
        setAllProducts(allData)

        const slugify = (text: string) => text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
        const targetSlug = slugify(decodedName)
        const targetProduct = allData.find((p: any) => slugify(p.name) === targetSlug)

        if (!targetProduct) {
          setProduct(null)
          return
        }

        const [productRes, reviewsRes] = await Promise.all([
          apiFetch(API_BASE, `/api/products/${targetProduct.id}`),
          apiFetch(API_BASE, `/api/products/${targetProduct.id}/reviews`),
        ])

        if (productRes.ok) {
          const data = await productRes.json()
          setProduct(data)
        } else {
          setProduct(null)
        }

        if (reviewsRes.ok) {
          const rData = await reviewsRes.json()
          setReviews(rData)
        }
      } catch (err) {
        console.error("Fetch error:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [decodedName])

  // Track recently viewed products (Hook must be before any early returns)
  useEffect(() => {
    if (!product) return
    try {
      const imagesList = (() => {
        if (Array.isArray(product.images)) return product.images
        try {
          const parsed = JSON.parse(product.images)
          return Array.isArray(parsed) ? parsed : [product.images]
        } catch {
          return [product.images]
        }
      })()
      const key = "recentlyViewed"
      const existing = JSON.parse(localStorage.getItem(key) || "[]")
      const filtered = existing.filter((p: any) => p.id !== product.id)
      const updated = [{
        id: product.id,
        name: product.name,
        price: product.price,
        image: resolveMediaUrl(imagesList[0]),
        category: product.category,
      }, ...filtered].slice(0, 6)
      localStorage.setItem(key, JSON.stringify(updated))
    } catch { /* ignore */ }
  }, [product?.id])

  // Handle Hash Nav
  useEffect(() => {
    if (window.location.hash === "#write-review") {
      setShowReviewForm(true)
      setTimeout(() => {
        document.getElementById("reviews-section")?.scrollIntoView({ behavior: "smooth" })
      }, 500)
    }
  }, [product?.id])

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isAuthenticated) {
      showToast("Please log in to submit a review", "error")
      return
    }
    if (!newReviewComment.trim()) {
      showToast("Review cannot be empty", "error")
      return
    }
    if (newReviewRating < 1 || newReviewRating > 5) {
      showToast("Rating must be between 1 and 5", "error")
      return
    }

    setSubmittingReview(true)
    try {
      const res = await apiFetch(API_BASE, `/api/products/${product.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: newReviewRating, comment: newReviewComment }),
      })
      const data = await res.json()
      if (data.success) {
        setReviews([data.review, ...reviews])
        setNewReviewComment("")
        setNewReviewRating(5)
        setShowReviewForm(false)
        showToast("Review submitted successfully", "success")
      } else {
        showToast(data.error || "Failed to submit review", "error")
      }
    } catch (err) {
      showToast("Network error submitting review", "error")
    } finally {
      setSubmittingReview(false)
    }
  }

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

  const SIZE_ORDER = ["XXS", "XS", "S", "M", "L", "XL", "XXL", "XXXL", "2XL", "3XL", "4XL", "Free Size", "One Size"]

  const parseSizes = (sizesField: any) => {
    if (!sizesField) return []
    let raw: string[]
    if (typeof sizesField === "object" && !Array.isArray(sizesField)) {
      raw = Object.keys(sizesField)
    } else if (Array.isArray(sizesField)) {
      raw = sizesField
    } else {
      try {
        const parsed = JSON.parse(sizesField)
        raw = typeof parsed === "object" && !Array.isArray(parsed)
          ? Object.keys(parsed)
          : Array.isArray(parsed) ? parsed : []
      } catch { raw = [] }
    }
    // Sort: known sizes by order, unknown appended alphabetically
    return raw.sort((a, b) => {
      const ai = SIZE_ORDER.indexOf(a.toUpperCase())
      const bi = SIZE_ORDER.indexOf(b.toUpperCase())
      if (ai !== -1 && bi !== -1) return ai - bi
      if (ai !== -1) return -1
      if (bi !== -1) return 1
      return a.localeCompare(b)
    })
  }

  const getStockForSize = (size: string) => {
    if (!product || !size) return 0
    const sizesData = typeof product.sizes === "string" ? JSON.parse(product.sizes || "{}") : (product.sizes || {})
    if (typeof sizesData === "object" && !Array.isArray(sizesData)) {
      return parseInt(sizesData[size] || "0")
    }
    // Fallback for legacy array format
    return product.stock || 0
  }

  const sizes = parseSizes(product.sizes)
  const totalStock = product.stock !== undefined ? product.stock : (product.inStock ? 99 : 0)
  const isInStock = totalStock > 0
  const isLowStock = totalStock > 0 && totalStock < 5

  const isSizeAvailable = (size: string) => {
    return getStockForSize(size) > 0
  }


  const relatedProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 8)

  // Swipe handlers for mobile image navigation
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) {
        setSelectedImage((prev) => (prev + 1) % images.length)
      } else {
        setSelectedImage((prev) => (prev - 1 + images.length) % images.length)
      }
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  const handleAddToCart = () => {

    if (!selectedSize) {
      const sizeSection = document.getElementById("size-section")
      sizeSection?.scrollIntoView({ behavior: "smooth" })
      showToast("Please select a size first", "info", product.name)
      return
    }

    const availableStock = getStockForSize(selectedSize)
    if (availableStock <= 0) {
      showToast("This size is currently sold out", "error", product.name)
      return
    }

    addItem({
      id: product.id,
      name: product.name,
      price: product.price,
      size: selectedSize,
      stock: availableStock,
      image: resolveMediaUrl(images[0]),
    })

    setAddedToCart(true)
    showToast("Added to cart", "cart", `${product.name} — Size ${selectedSize}`, () => router.push("/cart"))
    setTimeout(() => setAddedToCart(false), 2500)
  }

  const handleWishlistToggle = () => {

    const wasWishlisted = isWishlisted(product.id)
    toggleItem({
      id: product.id,
      name: product.name,
      price: product.price,
      image: resolveMediaUrl(images[0]),
      category: product.category,
      stock: product.stock,
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

    if (!selectedSize) {
      const sizeSection = document.getElementById("size-section")
      sizeSection?.scrollIntoView({ behavior: "smooth" })
      showToast("Please select a size first", "info", product.name)
      return
    }

    const availableStock = getStockForSize(selectedSize)
    if (availableStock <= 0) {
      showToast("This size is currently sold out", "error", product.name)
      return
    }

    const existing = items.find((i: any) => i.id === product.id && i.size === selectedSize)
    if (!existing) {
      addItem({
        id: product.id,
        name: product.name,
        price: product.price,
        size: selectedSize,
        stock: availableStock,
        image: resolveMediaUrl(images[0]),
      })
    }

    showToast("Redirecting to checkout...", "cart", product.name)
    router.push("/checkout")
  }



  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      {/* ── BACK LINK ── */}
      <div className="pt-56 px-6 md:px-12 max-w-350 mx-auto">
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
        <div className="grid md:grid-cols-2 gap-16 lg:gap-24 items-start max-w-350 mx-auto">

          {/* ── IMAGES COLUMN ── */}
          <div className="space-y-4">
            {/* Main image with swipe support */}
            <div
              className="relative aspect-3/4 overflow-hidden bg-[#111] select-none"
              onTouchStart={handleTouchStart}
              onTouchEnd={handleTouchEnd}
            >
              <Image
                src={resolveMediaUrl(images[selectedImage])}
                alt={product.name}
                fill
                priority
                className="object-contain transition-opacity duration-500"
              />
              <div className="absolute inset-0 bg-linear-to-b from-transparent to-black/10 pointer-events-none" />

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
                  <span className="bg-white/10 text-white/50 border border-white/20 text-[10px] uppercase tracking-widest px-3 py-1 font-medium">
                    Out of Stock
                  </span>
                )}
              </div>

              {/* Mobile swipe dots */}
              {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 md:hidden">
                  {images.map((_: any, idx: number) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedImage(idx)}
                      className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${
                        selectedImage === idx ? "bg-white w-4" : "bg-white/30"
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Mobile prev/next arrows */}
              {images.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev - 1 + images.length) % images.length)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 md:hidden flex items-center justify-center bg-black/40 backdrop-blur-sm text-white/80"
                    aria-label="Previous image"
                  >
                    <ArrowLeft size={14} />
                  </button>
                  <button
                    onClick={() => setSelectedImage((prev) => (prev + 1) % images.length)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 md:hidden flex items-center justify-center bg-black/40 backdrop-blur-sm text-white/80"
                    aria-label="Next image"
                  >
                    <ArrowLeft size={14} className="rotate-180" />
                  </button>
                </>
              )}
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
                      src={resolveMediaUrl(image)}
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


            {/* Dynamic rating from real reviews */}
            {reviews.length > 0 && (
              <div className="flex items-center gap-1 mb-4">
                {[1, 2, 3, 4, 5].map((s) => {
                  const avg = reviews.reduce((a: number, b: any) => a + b.rating, 0) / reviews.length
                  return (
                    <Star
                      key={s}
                      size={12}
                      className={s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-gray-600"}
                    />
                  )
                })}
                <span className="text-xs text-gray-500 ml-2">
                  {(reviews.reduce((a: number, b: any) => a + b.rating, 0) / reviews.length).toFixed(1)} ({reviews.length} {reviews.length === 1 ? "review" : "reviews"})
                </span>
              </div>
            )}

            {/* Price */}
            <p className="text-3xl font-light mb-6">₹{product.price.toLocaleString('en-IN')}</p>

            {/* Details grid (fabric, category, stock) */}
            <div className="grid grid-cols-2 gap-3 mb-8 text-xs">
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
                {sizes.map((size: string) => {
                  const available = isSizeAvailable(size)
                  return (
                    <button
                      key={size}
                      onClick={() => available && setSelectedSize(size)}
                      className={`relative px-5 py-3 text-[10px] tracking-[0.2em] border transition-all duration-300 uppercase font-medium ${selectedSize === size
                          ? "border-white bg-white text-black"
                          : available
                            ? "border-white/10 text-gray-400 hover:border-white/40 hover:text-white"
                            : "border-white/5 text-gray-700 cursor-not-allowed overflow-hidden"
                        }`}
                    >
                      {size}
                      {!available && (
                        <div className="absolute inset-x-0 top-1/2 h-[1px] bg-white/40 -rotate-45 scale-x-110 pointer-events-none" />
                      )}
                    </button>
                  )
                })}
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
                    ? "border-white text-white bg-white/5"
                    : "border-white/60 text-white"
                    }`}
                  title="Add to Favourites"
                >
                  <Heart size={16} className={isWishlisted(product.id) ? "fill-white" : ""} />
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
              {(product.sizeGuideImage || product.size_guide_image) && (
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
                          src={resolveMediaUrl(product.sizeGuideImage || product.size_guide_image)}
                          alt="Size Guide"
                          className="w-full h-auto max-h-150 object-contain block mx-auto transition-transform duration-700 hover:scale-105"
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
                    <p>Complimentary standard shipping on all orders over ₹2,000.</p>
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

        {/* ── REVIEWS ── */}
        <div id="reviews-section" className="mt-32 border-t border-white/10 pt-20">
          <div className="flex flex-col md:flex-row items-start justify-between gap-8 mb-12">
            <div>
              <h2 className="font-serif text-3xl font-light">Client Reviews</h2>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex text-amber-500">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} size={14} fill={i < (reviews.length ? Math.round(reviews.reduce((a, b) => a + b.rating, 0) / reviews.length) : 5) ? "currentColor" : "none"} />
                  ))}
                </div>
                <span className="text-gray-400 text-sm">
                  {reviews.length > 0 ? `${(reviews.reduce((a, b) => a + b.rating, 0) / reviews.length).toFixed(1)} / 5 (${reviews.length} reviews)` : "No reviews yet"}
                </span>
              </div>
            </div>
            {isAuthenticated ? (
              <button
                onClick={() => setShowReviewForm(!showReviewForm)}
                className="px-6 py-3 border border-white/30 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-colors"
              >
                {showReviewForm ? "Cancel Review" : "Write a Review"}
              </button>
            ) : (
              <Link href="/login" className="px-6 py-3 border border-white/30 text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-colors">
                Login to Review
              </Link>
            )}
          </div>

          {showReviewForm && isAuthenticated && (
            <form onSubmit={submitReview} className="mb-16 p-6 border border-white/10 bg-white/[0.02] max-w-2xl">
              <h3 className="uppercase tracking-widest text-xs mb-6">Write your review</h3>
              <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-3">Rating</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setNewReviewRating(star)}
                      className={`text-2xl ${newReviewRating >= star ? "text-amber-500" : "text-gray-600"}`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>
              <div className="mb-6">
                <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-3">Your Comment</label>
                <textarea
                  value={newReviewComment}
                  onChange={(e) => setNewReviewComment(e.target.value)}
                  className="w-full bg-transparent border border-white/20 p-4 text-sm focus:border-white focus:outline-none min-h-[120px]"
                  placeholder="What did you think about this piece?"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={submittingReview}
                className="px-8 py-3 bg-white text-black text-xs uppercase tracking-widest disabled:opacity-50"
              >
                {submittingReview ? "Submitting..." : "Submit Review"}
              </button>
            </form>
          )}

          {reviews.length > 0 ? (
            <div className="space-y-8">
              {reviews.map((review) => (
                <div key={review.id} className="border-b border-white/5 pb-8">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex text-amber-500">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={12} fill={i < review.rating ? "currentColor" : "none"} />
                      ))}
                    </div>
                    <span className="text-[10px] text-gray-500 tracking-widest uppercase">{review.date ? new Date(review.date).toLocaleDateString() : 'Just now'}</span>
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed mb-3">"{review.comment}"</p>
                  <p className="text-[10px] uppercase tracking-widest text-gray-500">{(review.user || 'Guest').split('@')[0]}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm py-8 border-t border-white/5">Be the first to review this exceptional piece.</p>
          )}
        </div>

        {/* ── RELATED PRODUCTS ── */}
        {relatedProducts.length > 0 && (
          <section className="mt-40 max-w-350 mx-auto">
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
                        src={resolveMediaUrl(pImages[0])}
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

      {/* Sticky Mobile Add-to-Cart Bar */}
      {isInStock && (
        <div className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-[#030303]/95 backdrop-blur-xl border-t border-white/10 px-4 py-3 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs uppercase tracking-widest truncate">{product.name}</p>
            <p className="text-sm">₹{product.price.toLocaleString('en-IN')}</p>
          </div>
          <button
            onClick={handleAddToCart}
            disabled={!selectedSize}
            className={`px-6 py-3 uppercase tracking-widest text-xs font-medium transition-all ${addedToCart
                ? "bg-green-500 text-white"
                : selectedSize
                  ? "bg-white text-black"
                  : "bg-white/20 text-gray-500"
              } disabled:cursor-not-allowed`}
          >
            {addedToCart ? "Added ✓" : selectedSize ? "Add to Cart" : "Select Size"}
          </button>
        </div>
      )}
    </div>
  )
}
