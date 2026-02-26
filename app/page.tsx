"use client"

import { useEffect, useRef, useState, useCallback } from "react" // Added useCallback
import Image from "next/image"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import useEmblaCarousel from 'embla-carousel-react' // New import
import { ChevronLeft, ChevronRight } from "lucide-react" // New import

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Preloader } from "@/components/preloader"

gsap.registerPlugin(ScrollTrigger)

function SectionProductCard({ product }: { product: any }) {
  const images = typeof product.images === 'string' ? JSON.parse(product.images) : product.images
  const imageUrl = images && images[0] ? images[0] : "/placeholder.jpg"

  return (
    <div className="group relative w-[200px] md:w-[280px] aspect-[3/4] overflow-hidden bg-white/5 border border-white/5 hover:border-white/20 transition-all duration-500 flex-shrink-0">
      <Link href={`/product/${product.id}`}>
        <Image
          src={imageUrl}
          alt={product.name}
          fill
          className="object-cover transition-transform duration-700 group-hover:scale-110 opacity-70 group-hover:opacity-100"
        />
        <div className="absolute inset-x-0 bottom-0 p-6 bg-gradient-to-t from-black/80 to-transparent translate-y-4 group-hover:translate-y-0 transition-transform duration-500">
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

function CollectionSection({ title, subtitle, products }: { title: string, subtitle: string, products: any[] }) {
  return (
    <div className="flex flex-col justify-center px-6 md:px-24">
      <div className="max-w-[1600px] w-full mx-auto">
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-serif font-light mb-6 uppercase tracking-[0.2em]">{title}</h2>
          <div className="h-px w-32 bg-white/20" />
        </div>

        <div className="flex gap-8 md:gap-12 pb-12 overflow-x-auto no-scrollbar scroll-smooth">
          {products.length > 0 ? (
            products.map((p) => (
              <SectionProductCard key={p.id} product={p} />
            ))
          ) : (
            <p className="text-sm uppercase tracking-widest text-gray-700 italic">Assembling collection...</p>
          )}
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
    setApiBase(`http://${window.location.hostname}:5000`)
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

    const interval = setInterval(() => {
      emblaApi.scrollNext()
    }, 6000)

    return () => {
      emblaApi.off('select', onSelect)
      clearInterval(interval)
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
        }).to(
          ".hero-cta",
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
          },
          "-=0.45"
        )

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
        <section className="relative h-screen overflow-hidden bg-[#030303] flex items-center justify-center">
          <div className="embla w-full h-full" ref={emblaRef}>
            <div className="embla__container h-full flex">
              {slides.map((slide: any, idx: number) => (
                <div key={idx} className="embla__slide relative flex-[0_0_100%] h-full flex items-center justify-center p-6 md:p-12">
                  {/* Full Size Hero Image Background */}
                  <div className="absolute inset-0 w-full h-full overflow-hidden bg-[#030303]">
                    <Image
                      src={slide.image || "/placeholder.jpg"}
                      alt={`Hero Slide ${idx}`}
                      fill
                      priority={idx === 0}
                      className="object-cover opacity-60 scale-100"
                    />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-transparent to-black/40" />
                  </div>

                  {/* Overlay Narrative - Simplified */}
                  <div className="absolute inset-x-0 bottom-32 z-10 flex flex-col items-center justify-center text-center mix-blend-difference px-6">
                    <div className="max-w-4xl mx-auto overflow-hidden text-center">
                      <h1 className="text-[4vw] md:text-[3vw] leading-[1.2] font-serif hero-line mb-10 tracking-wider">
                        <span className="block">{slide.content || "Editorial Piece"}</span>
                      </h1>
                    </div>

                    <div className="hero-cta opacity-0 translate-y-8">
                      <Link
                        href={`/product/${slide.product_id}`}
                        className="inline-block px-12 py-4 border border-white/40 rounded-none uppercase tracking-[0.3em] text-[10px] hover:bg-white hover:text-black transition-all duration-500 backdrop-blur-sm"
                      >
                        Shop Now
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Navigation Arrows - Moved to edges and resized - Increased visibility */}
          <div className="absolute inset-x-4 md:inset-x-10 top-1/2 -translate-y-1/2 flex justify-between pointer-events-none z-20">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              className="size-10 md:size-12 rounded-full border border-white/40 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 hover:border-white/60 transition-all pointer-events-auto backdrop-blur-md"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              className="size-10 md:size-12 rounded-full border border-white/40 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 hover:border-white/60 transition-all pointer-events-auto backdrop-blur-md"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Slide Indicators */}
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-4 z-20">
            {slides.map((_: any, idx: number) => (
              <button
                key={idx}
                onClick={() => emblaApi?.scrollTo(idx)}
                className={`h-1 transition-all duration-700 rounded-full ${idx === selectedIndex ? 'w-12 bg-white' : 'w-3 bg-white/10 hover:bg-white/30'}`}
              />
            ))}
          </div>
        </section>

        {/* VERTICAL SECTIONS */}
        <section className="py-24 space-y-40 bg-[#030303]">
          <CollectionSection title="Best Selling" subtitle="The Collection Essentials" products={bestsellers} />
          <CollectionSection title="Featured Pieces" subtitle="Editorial Spotlight" products={featured} />
          <CollectionSection title="New Arrivals" subtitle="Latest Drop" products={newArrivals} />
        </section>

        <div className="py-40 text-center border-t border-white/5 bg-[#030303]">
          <h2 className="text-8xl font-serif mb-12 text-white/5 uppercase tracking-[0.2em]">U.S ATELIER</h2>
          <Link
            href="/view-all"
            className="inline-block px-14 py-5 border border-white/10 rounded-full uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
          >
            Shop The Full Collection
          </Link>
        </div>

        <SiteFooter />
      </div>
    </>
  )
}
