"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { Preloader } from "@/components/preloader"


function RunwayImage() {
  const [liked, setLiked] = useState(false)
  const imgStyle: React.CSSProperties = liked
    ? { filter: "sepia(0.15) hue-rotate(80deg) saturate(1.2) contrast(0.95)", transition: "filter 250ms ease" }
    : { filter: "grayscale(100%) opacity(0.5)", transition: "filter 250ms ease" }

  return (
    <div
      className="relative w-full h-full"
      onMouseEnter={() => setLiked(true)}
      onMouseLeave={() => setLiked(false)}
    >
      <Image
        src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2576"
        alt=""
        fill
        style={imgStyle}
        className="object-cover z-0"
      />
    </div>
  )
}

gsap.registerPlugin(ScrollTrigger)

export default function HomePage() {
  const [API_BASE, setApiBase] = useState("")

  useEffect(() => {
    setApiBase(`http://${window.location.hostname}:5000`)
  }, [])

  const rootRef = useRef<HTMLDivElement | null>(null)
  const horizontalRef = useRef<HTMLDivElement | null>(null)
  const manifestoRef = useRef<HTMLParagraphElement | null>(null)

  const [config, setConfig] = useState<any>(null)
  const [runwayProducts, setRunwayProducts] = useState<any[]>([])
  const [loadingConfig, setLoadingConfig] = useState(true)

  useEffect(() => {
    const fetchConfig = async () => {
      if (!API_BASE) return
      try {
        const res = await fetch(`${API_BASE}/api/homepage`)
        if (res.ok) {
          const data = await res.json()
          setConfig(data)

          if (data.featured_product_ids && data.featured_product_ids.length > 0) {
            const productPromises = data.featured_product_ids.map((id: string) =>
              fetch(`${API_BASE}/api/products/${id}`).then(r => r.ok ? r.json() : null)
            )
            const products = await Promise.all(productPromises)
            setRunwayProducts(products.filter(Boolean))
          }
        }
      } catch (err) {
        console.error("Failed to fetch homepage config:", err)
      } finally {
        setLoadingConfig(false)
      }
    }
    fetchConfig()
  }, [API_BASE])

  /* ================= HERO (EXACT HTML BEHAVIOR) ================= */
  useEffect(() => {
    if (loadingConfig) return
    let ctxHost: gsap.Context | null = null

    const runHero = () => {
      ctxHost = gsap.context(() => {
        const tl = gsap.timeline({ delay: 0 })

        // Reveal lines from bottom (MASKED) — faster and tighter
        tl.to(".hero-line span", {
          y: "0%",
          duration: 0.9,
          ease: "power3.out",
          stagger: 0.08,
        }).to(
          ".hero-cta",
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
          },
          "-=0.45"
        )

        // Background parallax (unchanged feel)
        gsap.to(".hero-bg", {
          yPercent: 30,
          scrollTrigger: {
            trigger: ".hero",
            start: "top top",
            end: "bottom top",
            scrub: true,
          },
        })
      }, rootRef)
    }

    const onDone = () => runHero()

    if ((window as any).__PRELOADER_DONE__) {
      runHero()
    } else {
      window.addEventListener("preloader:done", onDone)
    }

    return () => {
      window.removeEventListener("preloader:done", onDone)
      if (ctxHost) ctxHost.revert()
    }
  }, [loadingConfig])

  /* ================= HORIZONTAL SCROLL ================= */
  useEffect(() => {
    if (loadingConfig || !horizontalRef.current) return

    const panels = gsap.utils.toArray(".panel")
    if (panels.length <= 1) return

    const tween = gsap.to(panels, {
      xPercent: -100 * (panels.length - 1),
      ease: "none",
      scrollTrigger: {
        trigger: horizontalRef.current,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
        end: () =>
          "+=" + (horizontalRef.current?.offsetWidth || 0),
      },
    })

    return () => {
      tween.scrollTrigger?.kill()
      tween.kill()
    }
  }, [loadingConfig, runwayProducts])

  /* ================= MANIFESTO (STABLE) ================= */
  useEffect(() => {
    if (loadingConfig || !manifestoRef.current) return

    const words = manifestoRef.current.querySelectorAll("span")
    gsap.set(words, { opacity: 0.15 })

    const ctx = gsap.context(() => {
      gsap.to(words, {
        opacity: 1,
        stagger: 0.08,
        ease: "none",
        scrollTrigger: {
          trigger: manifestoRef.current,
          start: "top 80%",
          end: "bottom 55%",
          scrub: true,
          invalidateOnRefresh: true,
        },
      })
    }, manifestoRef)

    ScrollTrigger.refresh()
    return () => ctx.revert()
  }, [loadingConfig, config])

  // Fallbacks
  const heroData = {
    image: config?.hero_image || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2564&auto=format&fit=crop",
    subtitle: config?.hero_subtitle || "Fall Winter 2025",
    title1: config?.hero_title_1 || "ETHEREAL",
    title2: config?.hero_title_2 || "SHADOWS",
    ctaText: config?.hero_cta_text || "View The Lookbook",
    ctaLink: config?.hero_cta_link || "/view-all"
  }

  const manifestoText = config?.manifesto_text || "We believe in the quiet power of silence. In a world of noise, U.S ATELIER is the absence of it. We strip away the unnecessary to reveal the essential structure of the human form. This is not just clothing; this is architecture for the soul."

  return (
    <>
      <Preloader />

      <div ref={rootRef} className="bg-[#030303] text-[#e8e8e3] overflow-x-hidden">
        <SiteHeader />

        {/* ================= HERO ================= */}
        <section className="hero relative h-screen flex items-center justify-center overflow-hidden">
          <Image
            src={heroData.image}
            alt="Hero"
            fill
            priority
            className="hero-bg object-cover opacity-60 scale-110"
          />

          <div className="relative z-10 text-center mix-blend-difference pt-32">
            <div className="overflow-hidden mb-4">
              <p className="uppercase tracking-[0.5em] text-xs text-gray-300 translate-y-full hero-line">
                <span className="block translate-y-full">{heroData.subtitle}</span>
              </p>
            </div>

            <div className="overflow-hidden">
              <h1 className="text-[14vw] leading-[0.8] font-serif hero-line">
                <span className="block translate-y-full">{heroData.title1}</span>
              </h1>
            </div>

            <div className="overflow-hidden">
              <h1 className="text-[14vw] leading-[0.8] font-serif italic text-gray-400 hero-line">
                <span className="block translate-y-full">{heroData.title2}</span>
              </h1>
            </div>

            <div className="hero-cta mt-14 opacity-0 translate-y-6">
              <Link
                href={heroData.ctaLink}
                className="inline-block px-10 py-4 border border-white/50 rounded-full uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
              >
                {heroData.ctaText}
              </Link>
            </div>
          </div>

          <div className="absolute bottom-10 left-10 hidden md:block">
            <p className="text-[10px] uppercase tracking-widest w-32 leading-relaxed opacity-60">
              Designed in Paris.
              <br />
              Crafted in Milan.
              <br />
              Worn in Darkness.
            </p>
          </div>
        </section>

        {/* ================= MANIFESTO ================= */}
        <section className="min-h-screen flex items-center justify-center px-6 md:px-32">
          <p
            ref={manifestoRef}
            className="manifesto text-3xl md:text-5xl font-serif text-center leading-relaxed text-gray-300"
          >
            {manifestoText.split(" ").map((word: string, i: number) => (
              <span key={i} className="inline-block mr-2">
                {word}
              </span>
            ))}
          </p>
        </section>

        {/* ================= HORIZONTAL RUNWAY ================= */}
        <section ref={horizontalRef} className="overflow-hidden">
          <div className="flex w-fit h-screen">
            {/* Panel 1 */}
            <div className="panel w-screen h-full flex items-center justify-center px-6 relative flex-shrink-0">
              <span className="absolute text-9xl opacity-10 top-10 left-10 font-serif">01</span>

              <div className="text-center max-w-xl relative z-20">
                <h2 className="text-6xl font-serif mb-6">The Runway</h2>
                <p className="uppercase text-xs tracking-widest text-gray-400 max-w-sm mx-auto mb-8">
                  Featuring raw hems, structured shoulders, liquid silk drapes.
                </p>
                <span className="text-xs border-b">Scroll to Explore →</span>
              </div>

              <div className="absolute right-0 top-0 w-1/2 h-full z-10">
                <RunwayImage />
              </div>
            </div>

            {/* Dynamic Panels */}
            {runwayProducts.map((p, idx) => {
              const image = p.images ? (typeof p.images === 'string' ? JSON.parse(p.images)[0] : p.images[0]) : ''
              return (
                <div key={p.id || idx} className="panel w-screen h-full flex items-center justify-center flex-shrink-0">
                  <div className="relative w-[400px] h-[600px] group overflow-hidden">
                    <Link href={`/product/${p.id}`}>
                      <Image
                        src={image}
                        alt={p.name}
                        fill
                        className="object-cover transition-transform duration-700 group-hover:scale-110"
                      />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-6 left-6 z-10">
                        <h3 className="text-3xl font-serif italic text-white drop-shadow-md">
                          {p.name}
                        </h3>
                        <p className="uppercase text-xs mt-2 text-white/80 tracking-widest font-bold">₹{p.price.toLocaleString()}</p>
                      </div>
                    </Link>
                  </div>
                </div>
              )
            })}

            {/* Final Panel */}
            <div className="panel w-screen h-full flex items-center justify-center flex-shrink-0">
              <div className="text-center">
                <h2 className="text-8xl font-serif mb-8 text-white/10 uppercase tracking-[0.2em]">Fin</h2>
                <Link
                  href="/view-all"
                  className="inline-block px-14 py-5 border border-white/20 rounded-full uppercase tracking-widest text-sm hover:bg-white hover:text-black transition-all"
                >
                  Shop The Full Collection
                </Link>
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </div>
    </>
  )
}
