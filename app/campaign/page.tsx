"use client"

import { useEffect, useRef } from "react"
import Image from "next/image"
import Link from "next/link"
import gsap from "gsap"
import { ScrollTrigger } from "gsap/ScrollTrigger"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

gsap.registerPlugin(ScrollTrigger)

const campaignImages = [
    {
        src: "https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2576",
        alt: "Campaign I",
        label: "01 — The Silence",
    },
    {
        src: "https://images.unsplash.com/photo-1485230405346-71acb9518d9c?q=80&w=2694",
        alt: "Campaign II",
        label: "02 — The Form",
    },
    {
        src: "https://images.unsplash.com/photo-1496747611176-843222e1e57c?q=80&w=2573",
        alt: "Campaign III",
        label: "03 — The Drape",
    },
    {
        src: "https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?q=80&w=2560",
        alt: "Campaign IV",
        label: "04 — The Shadow",
    },
    {
        src: "https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2670",
        alt: "Campaign V",
        label: "05 — The Movement",
    },
    {
        src: "https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=2574",
        alt: "Campaign VI",
        label: "06 — The Soul",
    },
]

export default function CampaignPage() {
    const rootRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            // Fade in hero text
            gsap.from(".campaign-hero-text", {
                y: 60,
                opacity: 0,
                duration: 1.2,
                ease: "power3.out",
                stagger: 0.15,
            })

            // Animate each campaign image on scroll
            gsap.utils.toArray<HTMLElement>(".campaign-img-block").forEach((el) => {
                gsap.from(el, {
                    y: 80,
                    opacity: 0,
                    duration: 1,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: el,
                        start: "top 85%",
                    },
                })
            })
        }, rootRef)

        return () => ctx.revert()
    }, [])

    return (
        <div ref={rootRef} className="bg-[#030303] text-[#e8e8e3] min-h-screen">
            <SiteHeader />

            {/* ── HERO ── */}
            <section className="relative h-screen flex items-end pb-20 px-8 md:px-16 overflow-hidden">
                <Image
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2564&auto=format&fit=crop"
                    alt="Campaign Hero"
                    fill
                    priority
                    className="object-cover opacity-50 scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#030303] via-[#030303]/30 to-transparent" />

                <div className="relative z-10 max-w-[1400px] mx-auto w-full">
                    <p className="campaign-hero-text uppercase tracking-[0.5em] text-xs text-gray-400 mb-6">
                        Fall · Winter 2025
                    </p>
                    <h1 className="campaign-hero-text font-serif text-[10vw] md:text-[8vw] font-light leading-none mb-6">
                        Ethereal
                        <br />
                        <span className="italic text-gray-400">Shadows</span>
                    </h1>
                    <p className="campaign-hero-text text-sm text-gray-400 max-w-sm leading-relaxed">
                        A meditation on quietude. Shot in the ruins of an abandoned Milanese palazzo at dusk.
                    </p>
                </div>
            </section>

            {/* ── INTRO STATEMENT ── */}
            <section className="py-32 px-8 md:px-16 max-w-[1400px] mx-auto">
                <div className="grid md:grid-cols-2 gap-16 items-center">
                    <div>
                        <p className="uppercase tracking-[0.4em] text-xs text-gray-500 mb-6">
                            The Campaign
                        </p>
                        <h2 className="font-serif text-4xl md:text-5xl font-light leading-tight">
                            In the absence of noise,<br />
                            <span className="italic text-gray-400">form speaks.</span>
                        </h2>
                    </div>
                    <p className="text-gray-400 leading-relaxed text-sm md:text-base border-l border-white/10 pl-8">
                        For our Fall/Winter 2025 campaign, U.S ATELIER retreated to the peripheries of silence.
                        Shot across three days in Northern Italy, the collection was styled not as garments —
                        but as second skins. Each piece breathes with the wearer, moves as shadow moves: deliberately, and without apology.
                    </p>
                </div>
            </section>

            {/* ── CAMPAIGN GRID ── */}
            <section className="px-8 md:px-16 pb-32 max-w-[1400px] mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaignImages.map((img, i) => (
                        <div
                            key={i}
                            className={`campaign-img-block group relative overflow-hidden ${i === 0 || i === 3 ? "md:col-span-2 lg:col-span-2" : ""
                                }`}
                        >
                            <div className={`relative w-full ${i === 0 || i === 3 ? "aspect-[16/9]" : "aspect-[3/4]"} overflow-hidden bg-[#111]`}>
                                <Image
                                    src={img.src}
                                    alt={img.alt}
                                    fill
                                    className="object-cover transition-transform duration-700 group-hover:scale-105 grayscale group-hover:grayscale-0"
                                />
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/0 transition-colors duration-500" />
                            </div>
                            <div className="mt-3 flex items-center justify-between">
                                <p className="text-xs uppercase tracking-widest text-gray-500">{img.label}</p>
                                <span className="text-xs text-gray-600">FW25</span>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* ── QUOTE ── */}
            <section className="py-32 px-8 md:px-32 text-center border-t border-white/10">
                <blockquote className="font-serif text-3xl md:text-5xl font-light leading-relaxed text-gray-300 max-w-4xl mx-auto">
                    &ldquo;We do not dress the body.<br />
                    <span className="italic">We reveal its architecture.&rdquo;</span>
                </blockquote>
                <p className="mt-8 text-xs uppercase tracking-[0.4em] text-gray-500">
                    — Creative Director, U.S ATELIER
                </p>
            </section>

            {/* ── CTA ── */}
            <section className="py-24 px-8 text-center border-t border-white/10">
                <p className="uppercase tracking-[0.4em] text-xs text-gray-500 mb-6">
                    Shop the Collection
                </p>
                <h2 className="font-serif text-4xl font-light mb-10">
                    Wear the Campaign
                </h2>
                <Link
                    href="/shop"
                    className="inline-block px-12 py-5 border border-white/40 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all duration-300"
                >
                    Explore All Pieces
                </Link>
            </section>

            <SiteFooter />
        </div>
    )
}
