"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

export function Preloader() {
  const preloaderRef = useRef<HTMLDivElement | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)
  const percentRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    document.body.style.overflow = "hidden"

    const progress = { value: 0 }

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = "auto"
        try {
          ; (window as any).__PRELOADER_DONE__ = true
          window.dispatchEvent(new CustomEvent("preloader:done"))
        } catch (e) {
          /* ignore */
        }
      },
    })

    tl.to(progress, {
      value: 100,
      duration: 0.8,
      ease: "power2.inOut",
      onUpdate: () => {
        if (barRef.current && percentRef.current) {
          barRef.current.style.width = `${progress.value}%`
          percentRef.current.innerText = `${Math.round(progress.value)}%`
        }
      },
    })
      .to(preloaderRef.current, {
        yPercent: -100,
        duration: 0.8,
        ease: "power4.inOut",
      })
      .set(preloaderRef.current, { display: "none" })

    return () => {
      document.body.style.overflow = "auto"
    }
  }, [])

  return (
    <div
      ref={preloaderRef}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black text-white"
    >
      <div className="text-center">
        <h1 className="text-4xl font-serif tracking-widest mb-4">
          U.S ATELIER
        </h1>

        <div className="w-48 h-px bg-gray-800 overflow-hidden relative">
          <div
            ref={barRef}
            className="absolute top-0 left-0 h-full bg-white"
            style={{ width: "0%" }}
          />
        </div>

        <p
          ref={percentRef}
          className="mt-3 text-xs tracking-widest text-gray-400"
        >
          0%
        </p>
      </div>
    </div>
  )
}
