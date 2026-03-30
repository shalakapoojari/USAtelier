"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ShoppingCart } from "lucide-react";

import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { getApiBase } from "@/lib/api-base";
import { resolveMediaUrl } from "@/lib/media-url";

gsap.registerPlugin(ScrollTrigger);

const PLACEHOLDER_BESTSELLERS = [
  {
    id: "placeholder-1",
    name: "Essential Crew Tee",
    price: 4500,
    image:
      "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?q=80&w=1480&auto=format&fit=crop",
    badge: "Best Seller",
  },
  {
    id: "placeholder-2",
    name: "Structured Overcoat",
    price: 18900,
    image:
      "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1374&auto=format&fit=crop",
    badge: "Most Loved",
  },
  {
    id: "placeholder-3",
    name: "Tailored Slim Trouser",
    price: 8200,
    image:
      "https://images.unsplash.com/photo-1473966968600-fa801b869a1a?q=80&w=1374&auto=format&fit=crop",
    badge: "",
  },
  {
    id: "placeholder-4",
    name: "Merino Ribbed Knit",
    price: 7600,
    image:
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?q=80&w=1372&auto=format&fit=crop",
    badge: "New Drop",
  },
];

function FeaturedPieceCard({
  product,
  isPlaceholder = false,
}: {
  product: any;
  isPlaceholder?: boolean;
}) {
  const imageUrl = isPlaceholder
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

  const productLink = isPlaceholder ? "/view-all" : `/product/${product.id}`;
  const price = isPlaceholder ? product.price : Number(product.price);

  return (
    <div className="group flex-shrink-0 w-[260px] md:w-[320px] bg-[#0a0a0a] border border-white/5 hover:border-white/10 transition-all duration-500 overflow-hidden">
      <Link href={productLink} className="block relative h-[360px] w-full overflow-hidden bg-[#111]">
        <img
          src={imageUrl}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110 brightness-[0.85] group-hover:brightness-100"
        />
        {product.badge && (
          <span className="absolute top-4 left-4 text-[8px] uppercase tracking-[0.3em] text-white/70 bg-black/60 backdrop-blur-sm px-3 py-1 border border-white/10">
            {product.badge}
          </span>
        )}
        <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors duration-500" />
      </Link>

      <div className="p-6">
        <Link href={productLink} className="block group/title">
          <h3 className="serif text-xl text-white/90 leading-tight mb-2 group-hover/title:text-white transition-colors">
            {product.name}
          </h3>
        </Link>
        <p className="sans text-[11px] uppercase tracking-[0.2em] text-white/40 mb-6">
          ₹{price.toLocaleString("en-IN")}
        </p>

        <button
          onClick={(e) => {
            e.preventDefault();
            // Logic for add to cart handled by the button itself or context
            // For now just prevent link navigation if this was a link
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-4 text-[9px] uppercase tracking-[0.4em] text-white/50 border border-white/10 hover:border-white/40 hover:text-white hover:bg-white/5 transition-all duration-300"
        >
          <ShoppingCart size={12} strokeWidth={1.5} />
          {isPlaceholder ? "Shop Now" : "Add to Cart"}
        </button>
      </div>
    </div>
  );
}

export default function HomePage() {
  const [loadingPercent, setLoadingPercent] = useState(0);
  const pathname = usePathname();

  const [API_BASE, setApiBase] = useState("");
  const [config, setConfig] = useState<any>(null);
  const [featuredItems, setFeaturedItems] = useState<any[] | null>(null);
  const [bestsellers, setBestsellers] = useState<any[] | null>(null);

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
          const b = await fetchCategory(data.bestseller_product_ids);
          setFeaturedItems(f);
          setBestsellers(b);
        } else {
          setFeaturedItems([]);
          setBestsellers([]);
        }
      } catch (err) {
        console.error("Failed to fetch homepage config:", err);
        setFeaturedItems([]);
        setBestsellers([]);
      }
    };
    fetchConfig();
  }, [API_BASE]);

  useEffect(() => {
    if (featuredItems === null) return; // wait for API

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
    mm.add("(min-width: 1024px)", () => {
      const sections = gsap.utils.toArray<HTMLElement>(".panel");
      if (sections.length === 0) return;

      gsap.to(sections, {
        xPercent: -100 * (sections.length - 1),
        ease: "none",
        scrollTrigger: {
          trigger: "#scroll-container",
          pin: true,
          scrub: 1,
          end: () =>
            "+=" +
            (document.querySelector("#scroll-container") as HTMLElement)
              ?.offsetWidth,
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

    gsap.to(".hero-bg", {
      yPercent: 30,
      scale: 1,
      scrollTrigger: {
        trigger: "header",
        start: "top top",
        end: "bottom top",
        scrub: true,
      },
    });

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
  if (heroSlide) {
    const words = (heroSlide.content || "").split(" ");
    if (words.length > 1) {
      title1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
      title2 = words.slice(Math.ceil(words.length / 2)).join(" ");
    }
  }

  const manifesto =
    config?.manifesto_text ||
    "We believe in the quiet power of silence. In a world of noise, U.S ATELIER is the absence of it. We strip away the unnecessary to reveal the essential structure of the human form. This is not just clothing; this is architecture for the soul.";
  const seasonText = config?.season_label || "Fall Winter 2025";

  const displayProducts =
    featuredItems && featuredItems.length > 0
      ? featuredItems
      : PLACEHOLDER_BESTSELLERS;
  const isPlaceholder = !featuredItems || featuredItems.length === 0;

  return (
    <>
      {/* Retained global styles block from user */}
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&family=Cinzel:wght@400;600;800&family=Inter:wght@300;400&display=swap");

        :root {
          --bg-color: #030303;
          --text-color: #e8e8e3;
          --gold: #d4af37;
        }
        body {
          background-color: var(--bg-color);
          color: var(--text-color);
          font-family: "Inter", sans-serif;
          overflow-x: hidden;
          margin: 0;
          padding: 0;
        }
        .serif {
          font-family: "Cinzel", serif;
        }
        .sans {
          font-family: "Space Grotesk", sans-serif;
        }
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
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100vh;
          background: #000;
          z-index: 9999;
          display: flex;
          justify-content: center;
          align-items: center;
          color: white;
        }
        .magnetic-wrap {
          display: inline-block;
          position: relative;
        }
        .horizontal-section {
          width: auto;
          min-width: 100vw;
          height: 100vh;
          display: flex;
          flex-wrap: nowrap;
        }
        .panel {
          width: 100vw;
          height: 100%;
          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;
          border-right: 1px solid rgba(255, 255, 255, 0.1);
          flex-shrink: 0;
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
        .drag-container {
          -ms-overflow-style: none;
          scrollbar-width: none;
          cursor: grab;
        }
        .drag-container::-webkit-scrollbar {
          display: none;
        }
        .drag-container:active {
          cursor: grabbing;
        }
        .skew-img {
          will-change: transform;
        }
        @media (max-width: 1023px) {
          .horizontal-section {
            width: 100%;
            height: auto;
            flex-direction: column;
          }
          .panel {
            width: 100%;
            min-height: 85vh;
            border-right: none;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
          }
        }
      `}</style>

      <div className="grain-overlay" />
      <div className="preloader">
        <div className="text-center">
          <h1 className="serif mb-2 text-4xl tracking-widest">U.S ATELIER</h1>
          <div className="relative mt-4 h-px w-48 overflow-hidden bg-gray-800">
            <div
              className="loading-bar absolute left-0 top-0 h-full bg-white"
              style={{ width: `${loadingPercent}%` }}
            />
          </div>
          <p className="sans loading-percent mt-2 text-xs text-gray-500">{`${loadingPercent}%`}</p>
        </div>
      </div>

      {/* Global navbar instead of local hardcoded one */}
      <SiteHeader />

      <main>
        <header className="relative flex h-screen w-full items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              src={heroImage}
              className="hero-bg h-full w-full scale-110 object-cover opacity-60"
              alt="Hero"
            />
          </div>
          <div className="absolute inset-0 bg-black/20" />
          <div className="relative z-10 px-4 text-center mix-blend-difference">
            <div className="line-mask mb-2">
              <h2 className="reveal-hero sans text-sm uppercase tracking-[0.5em] text-gray-300">
                {seasonText}
              </h2>
            </div>
            <div className="line-mask">
              <h1 className="hero-main-text serif text-[14vw] leading-[0.8] text-white">
                {title1}
              </h1>
            </div>
            <div className="line-mask">
              <h1 className="hero-main-text serif text-[14vw] leading-[0.8] italic text-gray-400">
                {title2}
              </h1>
            </div>
            <div className="hero-cta mt-12 opacity-0">
              <div className="magnetic-wrap">
                <Link
                  href="/view-all"
                  className="magnetic-target inline-block rounded-full border border-white/50 px-8 py-4 text-xs uppercase tracking-widest transition-all duration-500 hover:bg-white hover:text-black"
                >
                  View The Lookbook
                </Link>
              </div>
            </div>
          </div>
          <div className="absolute bottom-10 left-10 hidden md:block">
            <p className="w-32 text-[10px] uppercase tracking-widest opacity-60">
              Designed in Paris.
              <br />
              Crafted in Milan.
              <br />
              Worn in Darkness.
            </p>
          </div>
        </header>

        <section className="flex min-h-screen items-center justify-center bg-[#030303] px-6 py-24 md:px-32">
          <div className="max-w-4xl text-center">
            <p className="highlight-text serif text-3xl leading-relaxed text-gray-300 md:text-5xl">
              {manifesto}
            </p>
          </div>
        </section>

        {/* Dynamic Runway Section */}
        <div id="scroll-container" className="overflow-hidden bg-[#0a0a0a]">
          <div
            className="horizontal-section"
            id="runway"
            style={{ width: `${100 * (displayProducts.length + 2)}vw` }}
          >
            {/* Intro panel */}
            <div className="panel bg-[#0a0a0a]">
              <div className="flex flex-col items-start px-10 md:px-24">
                <span className="serif absolute left-10 top-10 text-9xl opacity-10">
                  01
                </span>
                <h2 className="serif z-10 mb-8 text-4xl md:text-6xl">
                  The Runway
                </h2>
                <p className="sans z-10 mb-8 max-w-sm text-sm uppercase tracking-widest text-gray-400">
                  Featuring raw hems, structured shoulders, and liquid silk
                  drapes.
                </p>
                <span className="border-b border-white pb-1 text-xs text-white">
                  Scroll to Explore →
                </span>
              </div>
              <div className="absolute right-0 top-0 h-full w-1/2 overflow-hidden">
                <img
                  src="https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2576&auto=format&fit=crop"
                  className="h-full w-full object-cover opacity-50 grayscale transition-all duration-700 hover:grayscale-0"
                />
              </div>
            </div>

            {/* Dynamic Product panels */}
            {displayProducts.map((product, idx) => {
              const bgColors = ["#050505", "#080808", "#0a0a0a"];
              const bg = bgColors[idx % bgColors.length];
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

              return (
                <div key={product.id || idx} className={`panel bg-[${bg}]`}>
                  <Link
                    href={isPlaceholder ? "/view-all" : `/product/${product.id}`}
                    className="group relative h-[520px] w-[320px] overflow-hidden md:h-[600px] md:w-[400px] cursor-pointer"
                  >
                    <img
                      src={pImageUrl}
                      className="h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
                    />
                    <div className="absolute bottom-6 left-6 z-10">
                      <h3 className="serif text-3xl italic text-white/95">
                        {product.name}
                      </h3>
                      <p className="sans mt-2 text-xs uppercase text-white/70">
                        ₹{Number(product.price).toLocaleString("en-IN")}
                      </p>
                    </div>
                    <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-all pointer-events-none" />
                  </Link>
                </div>
              );
            })}

            {/* Outro panel */}
            <div className="panel bg-[#030303]">
              <div className="text-center">
                <h2 className="serif mb-6 text-8xl">FIN</h2>
                <div className="magnetic-wrap">
                  <Link
                    href="/view-all"
                    className="magnetic-target inline-block rounded-full border border-white/20 px-12 py-5 text-sm uppercase tracking-widest transition-all hover:bg-white hover:text-black"
                  >
                    Shop The Collection
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Best Sellers Section - Managed by Admin */}
        <section className="bg-[#030303] py-20 md:py-32 overflow-hidden border-t border-white/5">
          <div className="px-8 md:px-20 mb-12">
            <div className="flex items-end justify-between">
              <div>
                <p className="sans text-[10px] uppercase tracking-[0.4em] text-white/30 mb-3">
                  Curated by the Studio
                </p>
                <h2 className="serif text-5xl md:text-7xl font-light text-white/90 leading-none">
                  Best Sellers
                </h2>
              </div>
              <Link
                href="/view-all"
                className="hidden md:inline-flex sans text-[10px] uppercase tracking-[0.3em] text-white/35 hover:text-white transition-colors border-b border-white/15 hover:border-white/50 pb-0.5 mb-2"
              >
                View All →
              </Link>
            </div>
            <div className="mt-8 h-px w-full bg-white/5" />
          </div>

          <div
            className="flex gap-4 md:gap-6 px-8 md:px-20 pb-4 overflow-x-auto no-scrollbar"
            style={{ WebkitOverflowScrolling: "touch" }}
          >
            {(bestsellers && bestsellers.length > 0 ? bestsellers : PLACEHOLDER_BESTSELLERS).map((p: any, idx: number) => (
              <FeaturedPieceCard
                key={!bestsellers || bestsellers.length === 0 ? `ph-${idx}` : `${p.id}-${idx}`}
                product={p}
                isPlaceholder={!bestsellers || bestsellers.length === 0}
              />
            ))}
          </div>

          <div className="md:hidden px-8 mt-8">
            <Link
              href="/view-all"
              className="sans text-[10px] uppercase tracking-[0.3em] text-white/35 hover:text-white transition-colors border-b border-white/15 hover:border-white/50 pb-0.5"
            >
              View All →
            </Link>
          </div>
        </section>

        <section className="relative z-10 bg-[#030303] px-6 py-20 md:px-12 md:py-32">
          <div className="flex flex-col gap-8 md:flex-row">
            <div className="w-full pt-12 md:w-1/3">
              <div className="sticky top-32">
                <span className="mb-4 block text-xs uppercase tracking-widest text-[#d4af37]">
                  The Details
                </span>
                <h3 className="serif mb-6 text-4xl">
                  Obsession with <br />{" "}
                  <span className="italic text-gray-500">Imperfection</span>.
                </h3>
                <p className="mb-8 text-sm leading-7 text-gray-400">
                  Every stitch is calculated. Every tear is intentional. We
                  source our wool from the highlands of Peru and our silk from
                  the forgotten mills of Lyon.
                </p>
                <ul className="space-y-4 border-t border-white/10 pt-8 text-xs uppercase tracking-widest text-gray-500">
                  <li className="flex justify-between text-white">
                    <span>Material</span> <span>100% Cashmere</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Origin</span> <span>Italy</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Year</span> <span>2025</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="grid w-full grid-cols-2 gap-4 md:w-2/3">
              <div className="mt-12 space-y-4">
                <img
                  src="https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=2671&auto=format&fit=crop"
                  className="parallax-img-slow aspect-[3/4] w-full object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1549488344-1f9b8d2bd1f3?q=80&w=2670&auto=format&fit=crop"
                  className="parallax-img-slow aspect-[3/4] w-full object-cover"
                />
              </div>
              <div className="space-y-4">
                <img
                  src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?q=80&w=2670&auto=format&fit=crop"
                  className="parallax-img-fast aspect-[3/4] w-full object-cover"
                />
                <img
                  src="https://images.unsplash.com/photo-1500917293891-ef795e70e1f6?q=80&w=2670&auto=format&fit=crop"
                  className="parallax-img-fast aspect-[3/4] w-full object-cover"
                />
              </div>
            </div>
          </div>
        </section>

        <SiteFooter />
      </main>
    </>
  );
}
