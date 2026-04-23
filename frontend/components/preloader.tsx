"use client"

import { useEffect, useRef } from "react"
import gsap from "gsap"

/* ─── Preloader: spinning geometric logo mark ─── */
export function Preloader() {
  const preloaderRef = useRef<HTMLDivElement | null>(null)
  const barRef = useRef<HTMLDivElement | null>(null)
  const percentRef = useRef<HTMLParagraphElement | null>(null)

  useEffect(() => {
    document.body.style.overflow = "hidden"

    const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms))

    const windowLoadPromise = new Promise<void>((res) => {
      if (document.readyState === "complete") {
        res()
      } else {
        window.addEventListener("load", () => res(), { once: true })
      }
    })

    const minDelayPromise = delay(2800)

    // Animate the progress bar independently
    const progress = { value: 0 }
    const barTween = gsap.to(progress, {
      value: 100,
      duration: 2.6,
      ease: "power1.inOut",
      onUpdate: () => {
        if (barRef.current) barRef.current.style.width = `${progress.value}%`
        if (percentRef.current) percentRef.current.innerText = `${Math.round(progress.value)}%`
      },
    })

    Promise.all([windowLoadPromise, minDelayPromise]).then(() => {
      barTween.kill()
      if (barRef.current) barRef.current.style.width = "100%"
      if (percentRef.current) percentRef.current.innerText = "100%"

      // Short pause at 100%, then exit
      setTimeout(() => {
        const el = preloaderRef.current
        if (!el) return
        gsap.to(el, {
          opacity: 0,
          scale: 1.3,
          duration: 0.6,
          ease: "power2.in",
          onComplete: () => {
            el.style.display = "none"
            document.body.style.overflow = "auto"
            try {
              ;(window as any).__PRELOADER_DONE__ = true
              window.dispatchEvent(new CustomEvent("preloader:done"))
            } catch (_) {}
          },
        })
      }, 120)
    })

    return () => {
      barTween.kill()
      document.body.style.overflow = "auto"
    }
  }, [])

  return (
    <>
      <style>{`
        @keyframes logoSpin {
          0%   { transform: rotate(0deg)   scale(0.95); opacity: 0.7; }
          50%  { transform: rotate(180deg) scale(1.05); opacity: 1;   }
          100% { transform: rotate(360deg) scale(0.95); opacity: 0.7; }
        }
        .loader-logo {
          animation: logoSpin 2.5s cubic-bezier(0.4, 0, 0.2, 1) infinite;
          /* Force white color on the SVG regardless of its internal fill */
          filter: brightness(0) invert(1);
        }
      `}</style>

      <div
        ref={preloaderRef}
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width: "100vw",
          height: "100vh",
          zIndex: 99999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          background: "#000000",
        }}
      >


        {/* Spinning logo mark */}
        <div style={{ position: "relative", marginBottom: 40 }}>
          <img
            src="/logo/us-atelier-wordmark.svg"
            alt="U.S Atelier"
            className="loader-logo"
            style={{
              width: 80,
              height: 80,
              objectFit: "contain",
            }}
          />
        </div>

        {/* Brand label */}
        <p style={{
          fontSize: 10,
          textTransform: "uppercase",
          letterSpacing: "0.18em",
          color: "rgba(240,240,240,0.35)",
          marginBottom: 24,
          fontFamily: "'Geist', 'Inter', sans-serif",
          fontWeight: 300,
        }}>
          U.S Atelier
        </p>

        {/* Monochromatic progress bar */}
        <div
          style={{
            width: 200,
            height: 2,
            background: "rgba(255,255,255,0.15)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            ref={barRef}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              height: "100%",
              width: "0%",
              background: "rgba(255,255,255,0.8)",
              transition: "width 0.05s linear",
            }}
          />
        </div>

        {/* Percentage */}
        <p
          ref={percentRef}
          style={{
            marginTop: 10,
            fontSize: 9,
            letterSpacing: "0.4em",
            color: "rgba(255,255,255,0.5)",
            fontFamily: "'Geist Mono', monospace",
          }}
        >
          0%
        </p>
      </div>
    </>
  )
}
