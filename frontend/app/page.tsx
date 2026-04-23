"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useCart } from "@/lib/cart-context";
import { getApiBase, apiFetch } from "@/lib/api-base";
import { resolveMediaUrl } from "@/lib/media-url";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";



gsap.registerPlugin(ScrollTrigger);

// ─── Types ──────────────────────────────────────────────────────────────────
interface HeroSlide {
  image: string;
  video_url?: string;
  content: string;
  product_id?: string;
}
interface HomepageData {
  hero_slides?: HeroSlide[];
  manifesto_text?: string;
  season_label?: string;
  featured_product_ids?: string[];
  bestseller_product_ids?: string[];
}

const PLACEHOLDER_PRODUCTS = [
  { id: "p1", name: "Vantablack Coat", price: 2400, images: ["https://images.unsplash.com/photo-1485230405346-71acb9518d9c?q=80&w=2694&auto=format&fit=crop"] },
  { id: "p2", name: "Marble Silk Gown", price: 1850, images: ["https://images.unsplash.com/photo-1529139574466-a302c2d56aee?q=80&w=2576&auto=format&fit=crop"] },
  { id: "p3", name: "Obsidian Trench", price: 3100, images: ["https://images.unsplash.com/photo-1509631179647-0177331693ae?q=80&w=2576&auto=format&fit=crop"] },
  { id: "p4", name: "Smoke Linen Shirt", price: 980, images: ["https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=2400&auto=format&fit=crop"] },
];

// ─── Hero Media ───────────────────────────────────────────────────────────────
function HeroMedia({ slide, fallbackImage }: { slide: HeroSlide | null; fallbackImage: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const hasVideo = !!(slide?.video_url) && !videoFailed;
  const imgSrc = slide?.image ? resolveMediaUrl(slide.image) : fallbackImage;

  useEffect(() => {
    if (hasVideo && videoRef.current) { videoRef.current.load(); setVideoLoaded(false); }
  }, [slide?.video_url]);

  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <img
        src={imgSrc} key={imgSrc}
        className={`w-full h-full object-cover scale-110 hero-bg transition-opacity duration-1000 ${hasVideo && videoLoaded ? "opacity-0" : "opacity-60"}`}
        alt={`U.S Atelier editorial hero — current season`} loading="eager"
      />
      {hasVideo && (
        <video
          ref={videoRef}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${videoLoaded ? "opacity-80" : "opacity-0"}`}
          autoPlay muted loop playsInline
          onLoadedData={() => setVideoLoaded(true)}
          onError={() => setVideoFailed(true)}
        >
          <source src={slide!.video_url} type={slide!.video_url?.endsWith(".webm") ? "video/webm" : "video/mp4"} />
        </video>
      )}
    </div>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────
// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, isPlaceholder }: {
  product: any; isPlaceholder: boolean;
}) {
  const imgs = (() => {
    if (isPlaceholder) return product.images;
    if (Array.isArray(product.images)) return product.images;
    try { return JSON.parse(product.images); } catch { return [product.images]; }
  })();
  const imgUrl = isPlaceholder ? imgs[0] : resolveMediaUrl(imgs?.[0] || "/placeholder.jpg");
  const targetUrl = isPlaceholder ? "/view-all" : `/product/${encodeURIComponent(product.name)}`;

  return (
    <Link href={targetUrl} className="product-card group relative overflow-hidden bg-[#050505] w-full h-full block cursor-pointer">
      <div className="relative w-full h-full aspect-[3/4] overflow-hidden">
        <img
          src={imgUrl} key={imgUrl} alt={product.name}
          className="w-full h-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-105"
        />

        {/* Dark Gradient Overlay (Fades in on hover) */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

        {/* Hover Content: Name, Price, and Actions */}
        <div className="absolute inset-0 z-10 flex flex-col justify-end p-6 md:p-8 opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-500 ease-out pointer-events-none">
          <h3 className="font-serif text-2xl md:text-3xl text-white mb-2 tracking-wide uppercase group-hover:italic transition-all duration-500">{product.name}</h3>

          <div className="flex items-center justify-between w-full mt-2">
            <p className="text-[10px] font-sans uppercase tracking-[0.3em] text-white/60">
              ₹{Number(product.price).toLocaleString("en-IN")}
            </p>
            <span className="text-[9px] font-sans uppercase tracking-widest text-white border-b border-white/30 pb-0.5">
              View Details
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Touch Carousel ───────────────────────────────────────────────────────────
function TouchCarousel({ items, isPlaceholder }: { items: any[] | null; isPlaceholder: boolean }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const posRef = useRef(0);          // current x offset (px)
  const velRef = useRef(0);          // velocity px/frame
  const rafRef = useRef<number>(0);
  const touchRef = useRef<{ startX: number; startPos: number; lastX: number; lastT: number } | null>(null);
  const pausedRef = useRef(false);
  const SPEED = 0.6; // px per frame auto-scroll

  const setTrackX = useCallback((x: number) => {
    if (!trackRef.current) return;
    trackRef.current.style.transform = `translateX(${x}px)`;
  }, []);

  const getTrackWidth = useCallback(() => {
    if (!trackRef.current) return 0;
    return trackRef.current.scrollWidth / 3; // we triple the items
  }, []);

  // Auto-scroll loop
  useEffect(() => {
    if (!items) return;
    const loop = () => {
      if (!pausedRef.current) {
        posRef.current -= SPEED;
        const w = getTrackWidth();
        if (w > 0 && posRef.current < -w) posRef.current += w;
        setTrackX(posRef.current);
      }
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [items, getTrackWidth, setTrackX]);

  const handleDragStart = useCallback((clientX: number) => {
    pausedRef.current = true;
    velRef.current = 0;
    touchRef.current = { startX: clientX, startPos: posRef.current, lastX: clientX, lastT: Date.now() };
  }, []);

  const handleDragMove = useCallback((clientX: number) => {
    if (!touchRef.current) return;
    const dx = clientX - touchRef.current.startX;
    const now = Date.now();
    const dt = now - touchRef.current.lastT;
    if (dt > 0) velRef.current = (clientX - touchRef.current.lastX) / dt * 16;
    touchRef.current.lastX = clientX;
    touchRef.current.lastT = now;
    let next = touchRef.current.startPos + dx;
    const w = getTrackWidth();
    if (w > 0) {
      while (next < -w) next += w;
      while (next > 0) next -= w;
    }
    posRef.current = next;
    setTrackX(next);
  }, [getTrackWidth, setTrackX]);

  const handleDragEnd = useCallback(() => {
    touchRef.current = null;
    pausedRef.current = false;
  }, []);

  if (!items) {
    return (
      <div className="flex gap-6 opacity-20 px-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="min-w-[75vw] md:min-w-[400px] aspect-[3/4] bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const tripled = [...items, ...items, ...items];

  return (
    <div
      className="w-full overflow-hidden cursor-grab active:cursor-grabbing select-none"
      onTouchStart={(e) => handleDragStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleDragMove(e.touches[0].clientX)}
      onTouchEnd={handleDragEnd}
      onMouseDown={(e) => handleDragStart(e.clientX)}
      onMouseMove={(e) => handleDragMove(e.clientX)}
      onMouseUp={handleDragEnd}
      onMouseLeave={handleDragEnd}
    >
      <div
        ref={trackRef}
        className="flex gap-4 md:gap-6 will-change-transform"
        style={{ transform: "translateX(0px)" }}
      >
        {tripled.map((p, i) => (
          <div key={`ft-${p.id}-${i}`} className="w-[75vw] md:w-[400px] flex-none bg-[#050505]">
            <ProductCard product={p} isPlaceholder={isPlaceholder} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function HomePage() {
  const [loadingPercent, setLoadingPercent] = useState(0);
  const { items: cartItems = [] } = useCart() || {};

  const [API_BASE, setApiBase] = useState("");
  const [config, setConfig] = useState<HomepageData | null>(null);
  const [bestsellers, setBestsellers] = useState<any[] | null>(null);
  const [featured, setFeatured] = useState<any[] | null>(null);
  const [enlargedProduct, setEnlargedProduct] = useState<any | null>(null);
  const [featuredScrollPos, setFeaturedScrollPos] = useState(0);
  const featuredRef = useRef<HTMLDivElement>(null);
  const [showPreloader, setShowPreloader] = useState(true);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (sessionStorage.getItem("hasSeenPreloader")) {
        setShowPreloader(false);
      } else {
        sessionStorage.setItem("hasSeenPreloader", "true");
      }
    }
  }, []);

  const router = useRouter();

  useEffect(() => { setApiBase(getApiBase()); }, []);

  // Fetch homepage config + products
  useEffect(() => {
    if (!API_BASE) return;
    const run = async () => {
      try {
        const res = await apiFetch(API_BASE, `/api/homepage?_t=${Date.now()}`);
        const data: HomepageData = res.ok ? await res.json() : {};
        setConfig(data);

        const fetchGroup = async (ids: string[]) => {
          if (!ids?.length) return [];
          const results = await Promise.all(
            ids.map(id => apiFetch(API_BASE, `/api/products/${id}`).then(r => r.ok ? r.json() : null))
          );
          return results.filter(Boolean);
        };

        const [bs, ft] = await Promise.all([
          fetchGroup(data.bestseller_product_ids || []),
          fetchGroup(data.featured_product_ids || []),
        ]);
        setBestsellers(bs.length ? bs : PLACEHOLDER_PRODUCTS);
        setFeatured(ft.length ? ft : PLACEHOLDER_PRODUCTS.slice().reverse());
      } catch {
        setBestsellers(PLACEHOLDER_PRODUCTS);
        setFeatured(PLACEHOLDER_PRODUCTS.slice().reverse());
      }
    };
    run();
  }, [API_BASE]);

  // ─── GSAP Animations ────────────────────────────────────────────────────
  useEffect(() => {
    if (bestsellers === null || featured === null) return;

    const progress = { val: 0 };
    const loadTl = gsap.timeline();
    
    if (showPreloader) {
      loadTl
        .to(progress, { val: 100, duration: 1.8, ease: "power1.inOut", onUpdate: () => setLoadingPercent(Math.round(progress.val)) })
        .to(".js-preloader", {
          yPercent: -100,
          duration: 1.1,
          ease: "expo.inOut",
        }, ">0.25")
        .from(".hero-main-text", { y: 120, duration: 1.4, stagger: 0.16, ease: "expo.out" }, "-=0.5");
    } else {
      loadTl.from(".hero-main-text", { y: 120, duration: 1.4, stagger: 0.16, ease: "expo.out" }, "+=0.2");
    }
    
    loadTl
      .from(".hero-sub-text", { y: 28, opacity: 0, duration: 0.9, ease: "power3.out" }, showPreloader ? "-=1.1" : "-=0.8")
      .to(".hero-cta", { opacity: 1, duration: 0.9 }, showPreloader ? "-=0.7" : "-=0.5");

    // Hero bg parallax
    gsap.fromTo(".hero-bg", { y: 0, scale: 1.12 }, {
      y: 180, scale: 1.06, ease: "none",
      scrollTrigger: { trigger: ".hero-bg", start: "top top", end: "bottom top", scrub: true },
    });

    // Scroll indicator
    gsap.to(".scroll-line", { scaleY: 1.6, repeat: -1, yoyo: true, duration: 1.2, ease: "power1.inOut" });

    // Section headings
    gsap.utils.toArray<HTMLElement>(".reveal-heading").forEach(el => {
      gsap.from(el, {
        opacity: 0, y: 50,
        scrollTrigger: { trigger: el, start: "top 88%", toggleActions: "play none none none" },
        duration: 0.9, ease: "power3.out",
      });
    });

    // Product cards stagger
    gsap.utils.toArray<HTMLElement>(".products-grid").forEach(grid => {
      const cards = grid.querySelectorAll(".product-card");
      gsap.from(cards, {
        opacity: 0, y: 60, stagger: 0.08,
        scrollTrigger: { trigger: grid, start: "top 82%", toggleActions: "play none none none" },
        duration: 0.7, ease: "power3.out",
      });
    });

    // Manifesto words
    const hlText = document.querySelector(".highlight-text") as HTMLElement | null;
    if (hlText && !hlText.dataset.split) {
      hlText.dataset.split = "true";
      const text = hlText.innerText;
      hlText.innerHTML = "";
      text.split(" ").forEach(w => {
        const s = document.createElement("span"); s.innerText = `${w} `; hlText.appendChild(s);
      });
    }
    gsap.to(".highlight-text span", {
      opacity: 1, stagger: 0.08,
      scrollTrigger: { trigger: ".highlight-text", start: "top 80%", end: "bottom 40%", scrub: true },
    });

    // Magnetic
    const magneticWraps = document.querySelectorAll<HTMLElement>(".magnetic-wrap");
    const cleanups: Array<() => void> = [];
    magneticWraps.forEach(wrap => {
      const target = wrap.querySelector<HTMLElement>(".magnetic-target");
      if (!target) return;
      const onMove = (e: MouseEvent) => { const r = wrap.getBoundingClientRect(); gsap.to(target, { x: (e.clientX - r.left - r.width / 2) * 0.3, y: (e.clientY - r.top - r.height / 2) * 0.3, duration: 0.5, ease: "power2.out" }); };
      const onLeave = () => gsap.to(target, { x: 0, y: 0, duration: 0.5, ease: "elastic.out(1,0.3)" });
      wrap.addEventListener("mousemove", onMove);
      wrap.addEventListener("mouseleave", onLeave);
      cleanups.push(() => { wrap.removeEventListener("mousemove", onMove); wrap.removeEventListener("mouseleave", onLeave); });
    });

    const preloaderSafety = window.setTimeout(() => {
      gsap.to(".js-preloader", { yPercent: -100, duration: 0.8, ease: "expo.inOut", overwrite: true });
    }, 5000);

    return () => {
      ScrollTrigger.getAll().forEach(t => t.kill());
      loadTl.kill();
      window.clearTimeout(preloaderSafety);
      cleanups.forEach(fn => fn());
    };
  }, [bestsellers, featured]);

  // ─── Derived values ──────────────────────────────────────────────────────
  const heroSlide = config?.hero_slides?.[0] || null;
  const fallbackHero = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=2564&auto=format&fit=crop";
  const manifesto = config?.manifesto_text || "We believe in the quiet power of silence. In a world of noise, U.S Atelier is the absence of it. We strip away the unnecessary to reveal the essential structure of the human form. This is not just clothing; this is architecture for the soul.";
  const seasonText = config?.season_label || "Fall Winter 2025";
  const isLoading = bestsellers === null || featured === null;

  let title1 = "BE YOU", title2 = "BE BOLD";
  if (heroSlide?.content) {
    const words = heroSlide.content.split(" ");
    if (words.length > 1) {
      title1 = words.slice(0, Math.ceil(words.length / 2)).join(" ");
      title2 = words.slice(Math.ceil(words.length / 2)).join(" ");
    }
  }

  return (
    <div className="antialiased text-[#e8e8e3] bg-[#030303]">
      <style jsx global>{`
        :root { --gold: #d4af37; }

        .grain-overlay {
          position: fixed; top:0; left:0; width:100%; height:100%;
          pointer-events:none; z-index:9000; opacity:0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
        }

        /* Preloader — full viewport curtain */
        .js-preloader {
          position: fixed;
          top: 0; left: 0;
          width: 100vw; height: 100vh;
          background: #050505;
          z-index: 99998;
          display: flex;
          pointer-events: all;
          justify-content: center;
          align-items: center;
          will-change: transform;
        }

        /* Line-mask: hides text until GSAP slides it into view */
        .line-mask { overflow: hidden; }
        .line-mask span { display: block; transform: translateY(100%); }
        .highlight-text span { opacity: 0.15; }

        @keyframes fadein { from{opacity:0;transform:translateY(24px) scale(0.98)} to{opacity:1;transform:none} }
        .animate-fadein { animation: fadein 0.8s cubic-bezier(0.16, 1, 0.3, 1) both; }
      `}</style>

      <div className="grain-overlay" />

      {/* Preloader — curtain wipe panel */}
      {showPreloader && (
        <div className="js-preloader">
          <div className="text-center flex flex-col items-center gap-6">
            <p className="font-serif text-2xl tracking-[0.5em] text-white/80 uppercase select-none">U.S Atelier</p>
            <div className="w-48 h-px bg-gray-800 relative overflow-hidden">
              <div className="absolute top-0 left-0 h-full bg-white" style={{ width: `${loadingPercent}%`, transition: "width 50ms linear" }} />
            </div>
            <p className="text-[10px] font-sans uppercase tracking-[0.4em] text-gray-600">{loadingPercent}%</p>
          </div>
        </div>
      )}


      <SiteHeader />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <header className="relative w-full h-screen overflow-hidden flex items-center justify-center">
        <HeroMedia slide={heroSlide} fallbackImage={fallbackHero} />
        <div className="absolute inset-0 bg-black/20" />

        <div className="z-10 text-center relative mix-blend-difference px-4">
          <div className="line-mask mb-2">
            <h2 className="hero-sub-text text-[10px] font-sans uppercase tracking-[0.6em] text-gray-300">{seasonText}</h2>
          </div>
          <div className="line-mask">
            <h1 className="text-[13vw] md:text-[11vw] leading-[0.85] font-serif text-white hero-main-text">{title1}</h1>
          </div>
          <div className="line-mask">
            <h1 className="text-[13vw] md:text-[11vw] leading-[0.85] font-serif italic text-gray-400 hero-main-text">{title2}</h1>
          </div>
          <div className="mt-12 opacity-0 hero-cta">
            <div className="magnetic-wrap">
              <Link href="/view-all" className="inline-block px-8 py-4 border border-white/50 rounded-full text-[10px] font-sans uppercase tracking-widest hover:bg-white hover:text-black transition-all duration-500 magnetic-target">
                View The Lookbook
              </Link>
            </div>
          </div>
        </div>

        <div className="absolute bottom-10 left-10 hidden md:block">
          <p className="text-[9px] uppercase tracking-widest leading-relaxed opacity-40 font-sans">
            Designed. Crafted.<br />Worn in Darkness.<br />
            <span style={{ opacity: 0.6 }}>Ships from India · Worldwide</span>
          </p>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-10 right-10 hidden md:flex flex-col items-center gap-3 opacity-30">
          <div className="scroll-line w-px h-12 bg-white origin-top" />
          <p className="text-[8px] font-sans uppercase tracking-[0.4em]">Scroll</p>
        </div>
      </header>

      {/* ── MANIFESTO ────────────────────────────────────────────────────── */}
      <section className="py-28 md:py-40 px-6 md:px-32 bg-[#030303]">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-[8px] font-sans uppercase tracking-[0.6em] text-gray-600 mb-12">Our Philosophy</p>
          <p className="highlight-text text-2xl md:text-4xl lg:text-5xl font-serif leading-[1.45] text-gray-300">
            {manifesto}
          </p>
          <div className="mt-16 flex items-center justify-center gap-8">
            <div className="h-px w-20 bg-white/10" />
            <span className="text-[9px] font-sans uppercase tracking-[0.5em] text-gray-600">U.S Atelier</span>
            <div className="h-px w-20 bg-white/10" />
          </div>
        </div>
      </section>

      <div className="section-rule mx-auto max-w-screen-xl px-6 md:px-16" />

      {/* ── FEATURED PIECES ──────────────────────────────────────────────── */}
      <section id="featured" className="py-24 md:py-32 bg-[#050505] overflow-hidden w-full">
        <div className="max-w-screen-2xl mx-auto px-6 md:px-12 mb-10 md:mb-14">
          <div className="flex items-end justify-between reveal-heading">
            <div>
              <p className="text-[10px] font-sans uppercase tracking-[0.3em] text-white/40 mb-3">Editorial Spotlight</p>
              <h2 className="font-serif text-4xl md:text-5xl text-white tracking-wide uppercase">Featured Pieces</h2>
            </div>
            <Link href="/view-all" className="hidden md:block text-[10px] font-sans uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors border-b border-white/20 hover:border-white/60 pb-0.5">
              Explore Collection →
            </Link>
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <TouchCarousel items={featured} isPlaceholder={!config?.featured_product_ids?.length} />
        </div>
      </section>


      <div className="section-rule mx-auto max-w-screen-xl px-6 md:px-16" />

      {/* ── ENLARGE MODAL ────────────────────────────────────────────────── */}
      {enlargedProduct && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4 md:p-12"
          onClick={() => setEnlargedProduct(null)}
        >
          <div className="absolute inset-0 bg-black/95 backdrop-blur-2xl" />
          <div
            className="relative max-w-4xl w-full md:h-[88vh] overflow-hidden bg-black shadow-2xl ring-1 ring-white/10 animate-fadein"
            onClick={e => e.stopPropagation()}
          >
            <img
              src={enlargedProduct.image} key={enlargedProduct.image} alt={enlargedProduct.name}
              className="w-full h-full object-contain md:object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 p-8 md:p-10 bg-gradient-to-t from-black via-black/50 to-transparent">
              <p className="text-[9px] font-sans uppercase tracking-[0.5em] text-gray-500 mb-1">Editorial View</p>
              <h3 className="text-3xl md:text-5xl font-serif italic text-white mb-4">{enlargedProduct.name}</h3>
              <div className="flex items-center justify-between">
                <p className="text-sm font-sans uppercase tracking-widest text-[#d4af37]">₹{Number(enlargedProduct.price).toLocaleString("en-IN")}</p>
                <Link
                  href={`/product/${encodeURIComponent(enlargedProduct.name)}`}
                  className="px-6 py-2 border border-white/20 text-[9px] font-sans uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                >
                  View Details
                </Link>
              </div>
            </div>
            <button
              onClick={() => setEnlargedProduct(null)}
              className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center border border-white/10 bg-black/60 hover:bg-white hover:text-black transition-all group rounded-full"
            >
              <span className="text-lg font-light group-hover:rotate-90 transition-transform inline-block">&times;</span>
            </button>
          </div>
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
