"use client"

import { useEffect, useRef, useState, useCallback } from "react" // Added useCallback
import Image from "next/image"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import useEmblaCarousel from 'embla-carousel-react' // New import
import { ChevronLeft, ChevronRight } from "lucide-react"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Preloader } from "@/components/preloader"
import { getApiBase } from "@/lib/api-base"
import { resolveMediaUrl } from "@/lib/media-url"

gsap.registerPlugin(ScrollTrigger)

function SectionProductCard({ product }: { product: any }) {
  const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images
  const imageUrl = resolveMediaUrl(images && images[0] ? images[0] : "/placeholder.jpg")

  return (
    <div className="group relative w-50 md:w-70 aspect-3/4 overflow-hidden bg-white/5 border border-white/5 hover:border-white/20 transition-all duration-500 shrink-0">
      <Link href={`/product/${product.id}`}>
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
        />
        <div className="absolute inset-x-0 bottom-0 p-6 bg-linear-to-t from-black/80 to-transparent translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
          <p className="text-xs uppercase tracking-[0.3em] text-gray-400 mb-2">{product.category}</p>
          <h3 className="text-2xl font-serif italic text-white drop-shadow-md mb-2">
            {product.name}
          </h3>
          <p className="uppercase text-xs text-white/80 tracking-widest font-bold">₹{product.price.toLocaleString()}</p>
        </div>
      </Link>
    </div>
  )
}

import { ProductSkeleton } from "@/components/product-skeleton"

function CollectionSection({ title, subtitle, products }: { title: string, subtitle: string, products: any[] }) {
  if (!products || products.length === 0) return null;

  return (
    <div className="flex flex-col justify-center px-6 md:px-24">
      <div className="max-w-400 w-full mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-serif font-light mb-6 uppercase tracking-[0.2em]">{title}</h2>
          <div className="h-px w-32 bg-white/20" />
        </div>

        <div className="flex gap-8 md:gap-12 pb-12 overflow-x-auto no-scrollbar scroll-smooth">
          {products.map((p, idx) => (
            <SectionProductCard key={`${p.id}-${idx}`} product={p} />
          ))}
        </div>

        <div className="mt-8">
          <Link href="/view-all" className="text-xs uppercase tracking-widest border-b border-white/20 pb-1 hover:border-white transition-all text-gray-400 hover:text-white">
            View Entire Collection →
          </Link>
        </div>
      </div>
    </div>
  )
}

export default function HomePage() {
  const [API_BASE, setApiBase] = useState("")
  useEffect(() => {
    setApiBase(getApiBase())
  }, [])

  const rootRef = useRef<HTMLDivElement | null>(null)
  // const manifestoRef = useRef<HTMLParagraphElement | null>(null) // Removed
  // const horizontalRef = useRef<HTMLDivElement | null>(null) // Removed
  // const panelsContainerRef = useRef<HTMLDivElement | null>(null) // Removed

  const [config, setConfig] = useState<any>(null)
  const [bestsellers, setBestsellers] = useState<any[]>([])
  const [featured, setFeatured] = useState<any[]>([])
  const [newArrivals, setNewArrivals] = useState<any[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)

  // Embla setup
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true })
  const [selectedIndex, setSelectedIndex] = useState(0) // New state for slide indicators

  const onSelect = useCallback(() => {
    if (!emblaApi) return
    setSelectedIndex(emblaApi.selectedScrollSnap())
  }, [emblaApi])

  useEffect(() => {
    if (!emblaApi) return
    onSelect()
    emblaApi.on('select', onSelect)

    let intervalId: any

    const startAutoplay = () => {
      stopAutoplay()
      intervalId = setInterval(() => {
        emblaApi.scrollNext()
      }, 2500)
    }

    const stopAutoplay = () => {
      if (intervalId) clearInterval(intervalId)
    }

    const handleVisibilityChange = () => {
      if (document.hidden) stopAutoplay()
      else startAutoplay()
    }

    startAutoplay()
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      emblaApi.off('select', onSelect)
      stopAutoplay()
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [emblaApi, onSelect])


  useEffect(() => {
    const fetchConfig = async () => {
      if (!API_BASE) return
      try {
        const res = await fetch(`${API_BASE}/api/homepage`)
        if (res.ok) {
          const data = await res.json()
          setConfig(data)

          // Fetch category products
          const fetchCategory = async (ids: string[]) => {
            if (!ids || ids.length === 0) return []
            const promises = ids.map(id =>
              fetch(`${API_BASE}/api/products/${id}`).then(r => r.ok ? r.json() : null)
            )
            const results = await Promise.all(promises)
            return results.filter(Boolean)
          }

          const [b, f, n] = await Promise.all([
            fetchCategory(data.bestseller_product_ids),
            fetchCategory(data.featured_product_ids),
            fetchCategory(data.new_arrival_product_ids)
          ])

          setBestsellers(b)
          setFeatured(f)
          setNewArrivals(n)
        }
      } catch (err) {
        console.error("Failed to fetch homepage config:", err)
      } finally {
        setLoadingConfig(false)
      }
    }
    fetchConfig()
  }, [API_BASE])

  /* ================= HERO ANIMATION ================= */
  useEffect(() => {
    if (loadingConfig) return
    let ctxHost: gsap.Context | null = null

    const runHero = () => {
      ctxHost = gsap.context(() => {
        const tl = gsap.timeline({ delay: 0 })

        tl.to(".hero-line span", {
          y: "0%",
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.1,
        })

        gsap.set(".hero-cta-desktop", { autoAlpha: 0, y: 24 })
        gsap.to(".hero-cta-desktop", {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".hero-carousel",
            start: "top+=170 top",
            toggleActions: "play reverse play reverse",
          },
        })

        // Removed: gsap.to(".hero-bg", { yPercent: 30, scrollTrigger: { trigger: ".hero", start: "top top", end: "bottom top", scrub: true, }, })
      }, rootRef)
    }

    const onPreloaderDone = () => runHero()

    if ((window as any).__PRELOADER_DONE__) {
      runHero()
    } else {
      window.addEventListener("preloader:done", onPreloaderDone)
    }

    return () => {
      window.removeEventListener("preloader:done", onPreloaderDone)
      if (ctxHost) ctxHost.revert()
    }
  }, [loadingConfig])

  const slides = config?.hero_slides || [
    {
      image: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2564&auto=format&fit=crop",
      subtitle: "Fall Winter 2025",
      title1: "ETHEREAL",
      title2: "SHADOWS",
      cta_text: "View The Lookbook",
      cta_link: "/view-all"
    }
  ]

  return (
    <>
      <Preloader />

      <div ref={rootRef} className="bg-[#030303] text-[#e8e8e3] overflow-x-hidden min-h-screen">
        <SiteHeader />
        <style jsx global>{`
          ::-webkit-scrollbar {
            display: none !important;
          }
          body {
            -ms-overflow-style: none !important;
            scrollbar-width: none !important;
          }
        `}</style>

        {/* HERO CAROUSEL */}
        <section className="hero-carousel relative md:mt-30 bg-[#030303]">
          <div className="embla w-full" ref={emblaRef}>
            <div className="embla__container flex">
              {slides.map((slide: any, idx: number) => (
                <div key={idx} className="embla__slide relative flex-[0_0_100%] w-full">
                  {/* Full Size Hero Image Background */}
                  <div className="relative w-full overflow-hidden bg-[#030303]">
                    <div className="relative h-screen md:hidden">
                      <Image
                        src={resolveMediaUrl(slide.image || "/placeholder.jpg")}
                        alt={`Hero Slide ${idx}`}
                        fill
                        priority={idx === 0}
                        className="object-cover object-center opacity-60"
                      />
                      <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/40" />
                    </div>
                    <div className="relative hidden md:block">
                      <img
                        src={resolveMediaUrl(slide.image || "/placeholder.jpg")}
                        alt={`Hero Slide ${idx}`}
                        className="w-full h-auto block opacity-60 -mt-56"
                      />
                      <div className="absolute inset-0 bg-linear-to-b from-black/20 via-transparent to-black/40" />
                    </div>
                  </div>

                  {/* Mobile hero title */}
                  <div className="absolute inset-0 z-10 flex items-start justify-center pt-70 text-center px-6 pointer-events-none md:hidden">
                    <div className="max-w-4xl mx-auto overflow-hidden text-center hero-line">
                      <h1 className="leading-[0.82] tracking-[0.04em] uppercase font-serif">
                        <span className="block bg-linear-to-r from-[#d8c892] to-[#8d7748] bg-clip-text text-[18vw] font-medium text-transparent sm:text-[13vw]">Ethereal</span>
                        <span className="-mt-2 block bg-linear-to-r from-[#8d7748] to-[#374633] bg-clip-text text-[18vw] italic text-transparent sm:text-[13vw]">Shadows</span>
                      </h1>
                    </div>
                  </div>

                  {/* Desktop hero title */}
                  <div className="absolute inset-x-0 top-0 z-10 hidden pt-60 md:flex flex-col items-center justify-start text-center px-6">
                    <div className="max-w-4xl mx-auto overflow-hidden text-center">
                      <h1 className="leading-[0.82] tracking-[0.05em] uppercase font-serif hero-line m-10">
                        <span className="block bg-linear-to-r from-[#d8c892] to-[#8d7748] bg-clip-text text-[8vw] font-medium text-transparent">Ethereal</span>
                        <span className="-mt-3 block bg-linear-to-r from-[#8d7748] to-[#374633] bg-clip-text text-[8vw] italic text-transparent">Shadows</span>
                      </h1>
                    </div>
                  </div>

                  <div className="absolute inset-x-0 bottom-60 z-30 flex justify-center px-6 md:hidden">
                    <Link
                      href={slide.cta_link || "/view-all"}
                      className="inline-flex min-w-62.5 max-w-full items-center justify-center rounded-full border border-[#b8a471]/45 bg-transparent px-10 py-4 text-center font-serif text-[12px] uppercase tracking-[0.28em] text-[#b8a471] transition-all duration-500 hover:border-[#b8a471] hover:bg-[#b8a471]/10 hover:text-[#d7c48e] md:min-w-105 md:px-16 md:py-5 md:text-[14px] active:scale-95"
                    >
                      {slide.cta_text || "View The Lookbook"}
                    </Link>
                  </div>

                  <div className="hero-cta-desktop absolute inset-x-0 bottom-30 z-30 hidden justify-center px-6 md:flex">
                    <Link
                      href={slide.cta_link || "/view-all"}
                      className="inline-flex min-w-62.5 max-w-full items-center justify-center rounded-full border border-[#b8a471]/45 bg-transparent px-10 py-4 text-center font-serif text-[12px] uppercase tracking-[0.28em] text-[#b8a471] transition-all duration-500 hover:border-[#b8a471] hover:bg-[#b8a471]/10 hover:text-[#d7c48e] md:min-w-105 md:px-16 md:py-5 md:text-[14px] active:scale-95"
                    >
                      {slide.cta_text || "View The Lookbook"}
                    </Link>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              aria-label="Previous hero slide"
              onClick={() => emblaApi?.scrollPrev()}
              className="absolute left-6 top-1/2 z-40 hidden -translate-y-1/2 items-center justify-center border border-white/20 bg-black/35 p-3 text-white/80 backdrop-blur-sm transition-all hover:border-white/60 hover:text-white md:flex"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              type="button"
              aria-label="Next hero slide"
              onClick={() => emblaApi?.scrollNext()}
              className="absolute right-6 top-1/2 z-40 hidden -translate-y-1/2 items-center justify-center border border-white/20 bg-black/35 p-3 text-white/80 backdrop-blur-sm transition-all hover:border-white/60 hover:text-white md:flex"
            >
              <ChevronRight size={20} />
            </button>
          </div>

        </section>

        <section className="px-6 md:px-16 pt-24 pb-16 md:py-24 bg-[#030303]">
          <div className="max-w-5xl mx-auto text-center">
            <p className="text-[8vw] sm:text-5xl md:text-6xl leading-[1.35] md:leading-[1.3] font-serif text-[#d8d8d6]">
              U.S Atelier is premium menswear designed for the modern man who values style, comfort, and craftsmanship with innovative tailoring to deliver clothing that makes a statement—confident, stylish, and refined.
            </p>
            <p className="mt-8 text-sm md:text-base uppercase tracking-[0.3em] text-[#a99d73] font-light">
              &ldquo;Made with Pride, Worn with Confidence&rdquo;
            </p>
          </div>
        </section>

        {/* VERTICAL SECTIONS */}
        <section className="py-24 space-y-40 bg-[#030303]">
          <CollectionSection title="Best Selling" subtitle="The Collection Essentials" products={bestsellers} />
          <CollectionSection title="Featured Pieces" subtitle="Editorial Spotlight" products={featured} />
          <CollectionSection title="New Arrivals" subtitle="Latest Drop" products={newArrivals} />
        </section>



        <SiteFooter />
      </div>
    </>
  )
}
