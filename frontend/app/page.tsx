"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCart } from "@/lib/cart-context";
import { getApiBase } from "@/lib/api-base";
import { resolveMediaUrl } from "@/lib/media-url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

gsap.registerPlugin(ScrollTrigger);

const PLACEHOLDER_BESTSELLERS = [
  {
    id: "placeholder-1",
    name: "Vantablack Coat",
    price: 2400,
    image:
      "https://images.unsplash.com/photo-1485230405346-71acb9518d9c?q=80&w=2694&auto=format&fit=crop",
    badge: "",
  },
  {
    id: "placeholder-2",
    name: "Marble Silk",
    price: 1850,
    image:
      "https://images.unsplash.com/photo-1529139574466-a302c2d56aee?q=80&w=2576&auto=format&fit=crop",
    badge: "",
  },
];

export default function HomePage() {
  const [loadingPercent, setLoadingPercent] = useState(0);
  const pathname = usePathname();
  const { items: cartItems = [] } = useCart() || {};
  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const [API_BASE, setApiBase] = useState("");
  const [config, setConfig] = useState<any>(null);
  const [featuredItems, setFeaturedItems] = useState<any[] | null>(null);
  const [enlargedProduct, setEnlargedProduct] = useState<any | null>(null);

  useEffect(() => {
    setApiBase(getApiBase());
  }, []);

  useEffect(() => {
    const fetchConfig = async () => {
      if (!API_BASE) return;
      try {
        const res = await fetch(`${API_BASE}/api/homepage`);
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
          const fetchCategory = async (ids: string[]) => {
            if (!ids || ids.length === 0) return [];
            const promises = ids.map((id) =>
              fetch(`${API_BASE}/api/products/${id}`).then((r) =>
                r.ok ? r.json() : null,
              ),
            );
            const results = await Promise.all(promises);
            return results.filter(Boolean);
          };
          const f = await fetchCategory(data.featured_product_ids);
          setFeaturedItems(f);
        } else {
          setFeaturedItems([]);
        }
      } catch (err) {
        console.error("Failed to fetch homepage config:", err);
        setFeaturedItems([]);
      }
    };
    fetchConfig();
  }, [API_BASE]);

  useEffect(() => {
    if (featuredItems === null) return;

    const progress = { val: 0 };
    const loadTl = gsap.timeline();

    loadTl
      .to(progress, {
        val: 100,
        duration: 2,
        onUpdate: () => setLoadingPercent(Math.round(progress.val)),
      })
      .to(
        ".preloader",
        { yPercent: -100, duration: 1.2, ease: "power3.inOut" },
        ">",
      )
      .from(
        ".hero-main-text",
        { y: 150, duration: 1.5, stagger: 0.2, ease: "power4.out" },
        "-=0.8",
      )
      .to(".hero-cta", { opacity: 1, duration: 1 }, "-=1");

    const mm = gsap.matchMedia();

    mm.add("(min-width: 1px)", () => {
      const sections = gsap.utils.toArray<HTMLElement>(".panel");
      const container = document.querySelector(".horizontal-section") as HTMLElement;
      if (sections.length === 0 || !container) return;

      gsap.to(sections, {
        xPercent: -100 * (sections.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: "#scroll-container",
          pin: true,
          scrub: 1,
          snap: 1 / (sections.length - 1),
          start: "top 10%",
          end: () => "+=" + container.offsetWidth,
        },
      });
    });

    const highlightText = document.querySelector(
      ".highlight-text",
    ) as HTMLElement | null;
    if (highlightText && !highlightText.dataset.split) {
      const textContent = highlightText.innerText;
      highlightText.dataset.split = "true";
      highlightText.innerHTML = "";
      textContent.split(" ").forEach((word) => {
        const span = document.createElement("span");
        span.innerText = `${word} `;
        highlightText.appendChild(span);
      });
    }

    gsap.to(".highlight-text span", {
      opacity: 1,
      stagger: 0.1,
      scrollTrigger: {
        trigger: ".highlight-text",
        start: "top 80%",
        end: "bottom 50%",
        scrub: true,
      },
    });

    gsap.to(".parallax-img-slow", {
      y: -50,
      scrollTrigger: {
        trigger: ".parallax-img-slow",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });

    gsap.to(".parallax-img-fast", {
      y: -100,
      scrollTrigger: {
        trigger: ".parallax-img-fast",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });

    const magneticWraps =
      document.querySelectorAll<HTMLElement>(".magnetic-wrap");
    const cleanups: Array<() => void> = [];

    magneticWraps.forEach((wrap) => {
      const target = wrap.querySelector<HTMLElement>(".magnetic-target");
      if (!target) return;

      const onMove = (e: MouseEvent) => {
        const rect = wrap.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        gsap.to(target, {
          x: x * 0.3,
          y: y * 0.3,
          duration: 0.5,
          ease: "power2.out",
        });
      };

      const onLeave = () => {
        gsap.to(target, {
          x: 0,
          y: 0,
          duration: 0.5,
          ease: "elastic.out(1, 0.3)",
        });
      };

      wrap.addEventListener("mousemove", onMove);
      wrap.addEventListener("mouseleave", onLeave);
      cleanups.push(() => {
        wrap.removeEventListener("mousemove", onMove);
        wrap.removeEventListener("mouseleave", onLeave);
      });
    });

    gsap.fromTo(".hero-bg",
      {
        y: 0,
        scale: 1.12   // 🔥 slightly more zoom at start
      },
      {
        y: 200,       // 🔥 more movement (but still controlled)
        scale: 1.06,  // 🔥 slightly more zoom-out range
        ease: "none",
        scrollTrigger: {
          trigger: ".hero-bg",
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      }
    );

    const preloaderSafety = window.setTimeout(() => {
      gsap.to(".preloader", {
        yPercent: -100,
        duration: 0.6,
        ease: "power2.out",
        overwrite: true,
      });
    }, 4500);

    return () => {
      ScrollTrigger.getAll().forEach((t) => t.kill());
      mm.revert();
      loadTl.kill();
      window.clearTimeout(preloaderSafety);
      cleanups.forEach((fn) => fn());
    };
  }, [featuredItems]);

  const heroSlide = config?.hero_slides?.[0] || null;
  const heroImage = heroSlide?.image
    ? resolveMediaUrl(heroSlide.image)
    : "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2564&auto=format&fit=crop";

  let title1 = "ETHEREAL";
  let title2 = "SHADOWS";
  if (heroSlide && heroSlide.content) {
    const words = heroSlide.content.split(" ");
    if (words.length > 1) {
      title1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
      title2 = words.slice(Math.ceil(words.length / 2)).join(" ");
    }
  }

  const manifesto =
    config?.manifesto_text ||
    "We believe in the quiet power of silence. In a world of noise, U.S Atelier is the absence of it. We strip away the unnecessary to reveal the essential structure of the human form. This is not just clothing; this is architecture for the soul.";
  const seasonText = config?.season_label || "Fall Winter 2025";

  const displayProducts =
    featuredItems && featuredItems.length > 0
      ? featuredItems
      : PLACEHOLDER_BESTSELLERS;
  const isPlaceholder = !featuredItems || featuredItems.length === 0;

  return (
    <div className="antialiased text-[#e8e8e3] bg-[#030303]">
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&family=Cinzel:wght@400;600;800&family=Inter:wght@300;400&display=swap');

        :root {
          --bg-color: #030303;
          --text-color: #e8e8e3;
          --gold: #d4af37;
        }

        .serif { font-family: 'Cinzel', serif; }
        .sans { font-family: 'Space Grotesk', sans-serif; }

        .grain-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 9000;
          opacity: 0.05;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E");
        }

        .preloader {
          position: absolute;
          inset:0;
          background: #000000ff;
          z-index: 9999;
          display: flex;
          pointer-events: none;
          justify-content: center;
          align-items: center;
          color: white;
        }

        /* 4-point star */
        .star-loader {
          display: inline-block;
          font-size: 3rem;
          line-height: 1;
          color: white;
          animation: star-spin 6s linear infinite;
        }
        @keyframes star-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .magnetic-wrap {
          display: inline-block;
          position: relative;
        }
        .magnetic-area {
          position: absolute;
          top: -20px; left: -20px; right: -20px; bottom: -20px;
          z-index: 10;
        }

        /* Horizontal scroll */
        .horizontal-section {
          display: flex;
          flex-wrap: nowrap;
          height: 100vh;
        }
        .panel {
          width: 100vw;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          border-right: 1px solid rgba(255,255,255,0.1);
          flex-shrink: 0;
        }

        /* On mobile, stack panels vertically */
        @media (max-width: 1023px) {
          .horizontal-section {
            flex-direction: row;
            height: auto;
            width: 100% !important;
          }
          .panel {
            width: 100%;
            min-height: 85vh;
            border-right: none;
            border-bottom: 1px solid rgba(255,255,255,0.1);
          }
        }

        .line-mask {
          overflow: hidden;
        }
        .line-mask span {
          display: block;
          transform: translateY(100%);
        }

        .highlight-text span {
          opacity: 0.2;
          transition: opacity 0.3s;
        }
        .highlight-text span.active {
          opacity: 1;
        }

        /* Hide nav on mobile */
        @media (max-width: 767px) {
          .site-nav {
            display: none !important;
          }
        }

        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>

      {/* Grain overlay */}
      <div className="grain-overlay" />

      {/* Preloader — 4-point star + progress bar */}
      <div className="preloader">
        <div className="text-center flex flex-col items-center gap-4">
          {/* 4-point star using ✦ unicode */}
          <span className="star-loader">✦</span>
          <div className="w-48 h-[1px] bg-gray-800 relative overflow-hidden">
            <div
              className="absolute top-0 left-0 h-full bg-white transition-none"
              style={{ width: `${loadingPercent}%` }}
            />
          </div>
          <p className="text-[10px] sans uppercase tracking-[0.4em] text-gray-500">
            {loadingPercent}%
          </p>
        </div>
      </div>

      {/* Navbar — hidden on mobile via CSS */}
      <SiteHeader />

      {/* ─── HERO SECTION (from reference) ─── */}
      <header className="relative w-full h-screen overflow-hidden flex items-center justify-center">
        <div className="absolute inset-0 z-0">
          <img
            src={heroImage}
            className="w-full h-full object-cover opacity-60 scale-110 hero-bg"
            alt="Hero"
          />
        </div>
        <div className="absolute inset-0" />
        <div className="z-10 text-center relative mix-blend-difference px-4">
          <div className="line-mask mb-2">
            <h2 className="text-sm sans uppercase tracking-[0.5em] text-gray-300">
              {seasonText}
            </h2>
          </div>
          <div className="line-mask">
            <h1 className="text-[14vw] leading-[0.8] serif text-white hero-main-text">
              {title1}
            </h1>
          </div>
          <div className="line-mask">
            <h1 className="text-[14vw] leading-[0.8] serif italic text-gray-400 hero-main-text">
              {title2}
            </h1>
          </div>
          <div className="mt-12 opacity-0 hero-cta">
            <div className="magnetic-wrap">
              <Link
                href="/view-all"
                className="inline-block px-8 py-4 border border-white/50 rounded-full text-xs uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-500 magnetic-target"
              >
                View The Lookbook
              </Link>
            </div>
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
      </header>

      {/* ─── MANIFESTO SECTION ─── */}
      <section className="min-h-screen flex items-center justify-center px-6 md:px-32 py-24 bg-[#030303]">
        <div className="max-w-4xl text-center">
          <p className="highlight-text text-3xl md:text-5xl serif leading-relaxed text-gray-300">
            {manifesto}
          </p>
        </div>
      </section>

      {/* ─── RUNWAY HORIZONTAL SCROLL (from reference, desktop-only pin) ─── */}
      <div className="overflow-hidden bg-[#0a0a0a]" id="scroll-container">
        <div
          className="horizontal-section"
          id="runway"
          style={{ width: `${(displayProducts.length + 2) * 100}vw` }}
        >
          {/* Intro panel */}
          <div className="panel bg-[#0a0a0a]">
            <div className="flex flex-col items-start px-10 md:px-24 w-full h-full justify-center relative">
              <span className="text-[16vw] md:text-9xl serif opacity-10 absolute md:top-10 md:left-10 top-5 left-5 pointer-events-none">
                01
              </span>
              <h2 className="text-4xl md:text-6xl serif mb-6 md:mb-8 z-10 text-white">
                The Runway
              </h2>
              <p className="text-xs md:text-sm sans uppercase tracking-widest max-w-sm z-10 text-gray-400 mb-8">
                Featuring raw hems, structured shoulders, and liquid silk
                drapes.
              </p>
              <span className="text-[10px] md:text-xs text-white border-b border-white pb-1">
                Scroll to Explore &rarr;
              </span>
            </div>
            <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden hidden md:block">
              <img
                src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2576&auto=format&fit=crop"
                className="w-full h-full object-cover opacity-50 grayscale hover:grayscale-0 transition-all duration-700"
                alt="Runway"
              />
            </div>
          </div>

          {/* Dynamic product panels */}
          {displayProducts.map((product, i) => {
            const pImageUrl = isPlaceholder
              ? product.image
              : (() => {
                const imgs =
                  typeof product.images === "string"
                    ? (() => {
                      try {
                        return JSON.parse(product.images);
                      } catch {
                        return [product.images];
                      }
                    })()
                    : product.images;
                return resolveMediaUrl(imgs?.[0] || "/placeholder.jpg");
              })();

            const bgColors = ["#050505", "#080808", "#030303"];
            const bg = bgColors[i % bgColors.length];

            return (
              <div
                className="panel"
                style={{ backgroundColor: bg }}
                key={product.id || i}
              >
                <div className="relative w-[320px] md:w-[400px] h-[480px] md:h-[600px] overflow-hidden group">
                  <img
                    src={pImageUrl}
                    className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110 cursor-zoom-in"
                    alt={product.name}
                    onClick={() => setEnlargedProduct({ id: product.id, name: product.name, price: product.price, image: pImageUrl })}
                  />
                  <Link
                    href={isPlaceholder ? "/view-all" : `/product/${product.id}`}
                    className="absolute bottom-6 left-6 z-10 block hover:opacity-70 transition-opacity"
                  >
                    <h3 className="text-3xl serif italic text-white">
                      {product.name}
                    </h3>
                    <p className="text-xs sans uppercase mt-2 text-white/70">
                      ₹{Number(product.price).toLocaleString("en-IN")}
                    </p>
                  </Link>
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent pointer-events-none transition-colors duration-500" />
                </div>
              </div>
            );
          })}

          {/* Outro panel */}
          <div className="panel bg-[#030303]">
            <div className="text-center">
              <h2 className="text-6xl md:text-8xl serif mb-6 text-white">
                FIN
              </h2>
              <div className="magnetic-wrap">
                <Link
                  href="/view-all"
                  className="inline-block px-12 py-5 border border-white/20 rounded-full uppercase text-sm tracking-widest text-white hover:bg-white hover:text-black transition-all magnetic-target"
                >
                  Shop The Collection
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── ENLARGE MODAL ─── */}
      {enlargedProduct && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-10 animate-in fade-in duration-500"
          onClick={() => setEnlargedProduct(null)}
        >
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
          <div
            className="relative max-w-5xl w-full aspect-3/4 md:aspect-auto md:h-[90vh] overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-500 ease-out"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enlargedProduct.image}
              alt={enlargedProduct.name}
              className="w-full h-full object-contain md:object-cover pointer-events-none"
            />
            {/* Overlay Info */}
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12 bg-linear-to-t from-black via-black/40 to-transparent">
              <p className="text-[10px] uppercase tracking-[0.5em] text-gray-500 mb-2">Detailed View</p>
              <h3 className="text-4xl md:text-6xl serif italic text-white mb-4">{enlargedProduct.name}</h3>
              <div className="flex items-center justify-between">
                <p className="text-sm md:text-base sans uppercase tracking-widest text-[#d4af37]">₹{Number(enlargedProduct.price).toLocaleString("en-IN")}</p>
                <Link
                  href={`/product/${enlargedProduct.id}`}
                  className="px-6 py-2 border border-white/20 text-[10px] uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                >
                  View Details
                </Link>
              </div>
            </div>
            {/* Close Button */}
            <button
              onClick={() => setEnlargedProduct(null)}
              className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-full border border-white/10 bg-black/50 hover:bg-white hover:text-black transition-all group"
            >
              <span className="text-xl font-light transform group-hover:rotate-90 transition-transform">&times;</span>
            </button>
          </div>
        </div>
      )}

      {/* ─── FOOTER ─── */}
      <SiteFooter />
    </div>
  );

}
