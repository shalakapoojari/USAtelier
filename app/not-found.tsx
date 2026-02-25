"use client"

import Link from "next/link"
import { useEffect, useRef } from "react"
import gsap from "gsap"
import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

export default function NotFound() {
    const rootRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const ctx = gsap.context(() => {
            gsap.from(".nf-line", {
                y: 60,
                opacity: 0,
                duration: 1,
                ease: "power3.out",
                stagger: 0.15,
            })
        }, rootRef)
        return () => ctx.revert()
    }, [])

    return (
        <div ref={rootRef} className="bg-[#030303] text-[#e8e8e3] min-h-screen flex flex-col">
            <SiteHeader />

            <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
                {/* Big 404 */}
                <p className="nf-line font-serif text-[25vw] font-bold leading-none text-white/[0.03] select-none pointer-events-none">
                    404
                </p>

                {/* Text stacked over */}
                <div className="-mt-[8vw] relative z-10">
                    <p className="nf-line uppercase tracking-[0.5em] text-xs text-gray-500 mb-6">
                        Page Not Found
                    </p>
                    <h1 className="nf-line font-serif text-5xl md:text-7xl font-light mb-6">
                        Lost in the Atelier
                    </h1>
                    <p className="nf-line text-sm text-gray-400 max-w-md mx-auto leading-relaxed mb-14">
                        The page you&apos;re looking for doesn&apos;t exist — or has been quietly retired,
                        like last season&apos;s collection.
                    </p>

                    <div className="nf-line flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href="/"
                            className="px-12 py-5 border border-white/40 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all duration-300"
                        >
                            Return Home
                        </Link>
                        <Link
                            href="/view-all"
                            className="px-12 py-5 border border-white/10 uppercase tracking-widest text-xs text-gray-400 hover:text-white hover:border-white/30 transition-all duration-300"
                        >
                            Shop the Collection
                        </Link>
                    </div>
                </div>
            </main>

            <SiteFooter />
        </div>
    )
}
