"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

gsap.registerPlugin(ScrollTrigger)

export default function AboutPage() {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Hero animations
      gsap.from(".hero-title", {
        y: 100,
        opacity: 0,
        duration: 1.5,
        ease: "power4.out",
        delay: 0.5
      })

      // Section animations
      gsap.utils.toArray<HTMLElement>(".reveal-section").forEach((section) => {
        gsap.from(section, {
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            toggleActions: "play none none none"
          },
          y: 50,
          opacity: 0,
          duration: 1,
          ease: "power3.out"
        })
      })
    }, containerRef)

    return () => ctx.revert()
  }, [])

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen" ref={containerRef}>
      <SiteHeader />

      <main className="pt-52">
        {/* Hero Section */}
        <section className="px-6 md:px-12 max-w-[1400px] mx-auto mb-40">
          <div className="overflow-hidden">
            <h1 className="hero-title font-serif text-[12vw] md:text-[8vw] leading-none font-light uppercase tracking-tighter">
              The Art of <br />
              <span className="italic ml-[10%]">Modern Manner</span>
            </h1>
          </div>

          <div className="mt-20 grid md:grid-cols-2 gap-12 items-end">
            <div className="reveal-section">
              <p className="text-sm uppercase tracking-[0.4em] text-gray-500 mb-8 font-medium">Est. 2025</p>
              <p className="text-xl md:text-2xl font-light leading-relaxed text-gray-300">
                U.S ATELIER is a contemporary fashion house dedicated to the pursuit of effortless elegance.
                Founded on the principles of minimalism, craftsmanship, and timeless design, we create
                pieces that bridge the gap between tradition and the avant-garde.
              </p>
            </div>
            <div className="reveal-section aspect-4/5 relative overflow-hidden bg-white/5">
              <Image
                src="https://images.unsplash.com/photo-1534030347209-c87ca36e65e5?q=80&w=1974&auto=format&fit=crop"
                alt="Craftsmanship"
                fill
                className="object-cover opacity-80"
              />
            </div>
          </div>
        </section>

        {/* Philosophy Section */}
        <section className="bg-white text-black py-40 px-6 md:px-12">
          <div className="max-w-[1400px] mx-auto">
            <div className="grid md:grid-cols-3 gap-24">
              <div className="reveal-section">
                <p className="text-[10px] uppercase tracking-[0.5em] mb-10 font-bold border-b border-black/10 pb-4 text-black/50">Philosophy</p>
                <h3 className="font-serif text-3xl mb-8">Quiet Luxury</h3>
                <p className="text-sm leading-relaxed text-black/70 italic">
                  "Style is a way to say who you are without having to speak. We believe in the power of the understated."
                </p>
              </div>
              <div className="reveal-section">
                <p className="text-[10px] uppercase tracking-[0.5em] mb-10 font-bold border-b border-black/10 pb-4 text-black/50">Origin</p>
                <h3 className="font-serif text-3xl mb-8">Crafted Individuality</h3>
                <p className="text-sm leading-relaxed text-black/70">
                  Every piece in our collection is born from meticulous attention to detail.
                  From the selection of the finest Italian wools to the final hand-finished stitch in our Indian ateliers.
                </p>
              </div>
              <div className="reveal-section">
                <p className="text-[10px] uppercase tracking-[0.5em] mb-10 font-bold border-b border-black/10 pb-4 text-black/50">Future</p>
                <h3 className="font-serif text-3xl mb-8">Slow Fashion</h3>
                <p className="text-sm leading-relaxed text-black/70">
                  A commitment to longevity. We reject the ephemeral nature of trends, opting instead for
                  silhouettes that remain relevant through the passing of seasons.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Studio Section */}
        <section className="py-40 px-6 md:px-12 max-w-[1400px] mx-auto overflow-hidden">
          <div className="grid md:grid-cols-2 gap-20 items-center">
            <div className="reveal-section order-2 md:order-1">
              <div className="relative aspect-3/4 w-full bg-white/5 overflow-hidden">
                <Image
                  src="https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2070&auto=format&fit=crop"
                  alt="Studio view"
                  fill
                  className="object-cover grayscale hover:grayscale-0 transition-all duration-1000"
                />
              </div>
            </div>
            <div className="reveal-section order-1 md:order-2">
              <h2 className="font-serif text-5xl md:text-7xl font-light mb-12 leading-tight">
                Beyond the <br /> <span className="italic pl-12 text-gray-500">Fabric.</span>
              </h2>
              <p className="text-gray-400 text-lg leading-relaxed mb-10">
                Our atelier is more than just a workshop; it's a sanctuary for creativity.
                Located in the heart of the capital, our studio hums with the energy of
                designers, tailors, and artisans working in unison.
              </p>
              <div className="flex gap-4">
                <div className="h-px w-20 bg-white/20 mt-3" />
                <p className="text-[10px] uppercase tracking-[0.5em] text-white">Visit our Maison</p>
              </div>
            </div>
          </div>
        </section>

        {/* Manifesto */}
        <section className="py-40 px-6 md:px-12 bg-zinc-900 border-y border-white/5 text-center">
          <div className="max-w-4xl mx-auto reveal-section">
            <p className="text-[10px] uppercase tracking-[0.5em] text-amber-500 mb-10 font-bold">The Atelier Manifesto</p>
            <h2 className="font-serif text-4xl md:text-6xl font-light italic leading-tight mb-12">
              "We don't just dress the body; we clothe the character."
            </h2>
            <div className="w-16 h-px bg-white/20 mx-auto" />
            <p className="mt-12 text-xs uppercase tracking-[0.4em] text-gray-500">U.S ATELIER Maison</p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
