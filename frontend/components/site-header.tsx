"use client"

import Link from "next/link"
import { useEffect, useState, useRef } from "react"
import { usePathname, useRouter } from "next/navigation"
import gsap from "gsap"
import { ShoppingBag, User, Search, Hexagon, X } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useCart } from "@/lib/cart-context"
import { SearchOverlay } from "./search-overlay"

// Context mapping for the left side panel (Clean Sentence Case)
const panelData = {
  shop: {
    id: 'shop',
    title: 'Our shop',
    desc: 'A curated selection of our latest architectural garments.',
    Icon: ShoppingBag
  },
  about: {
    id: 'about',
    title: 'The atelier',
    desc: 'Exploring our history, meticulous craft, and dark aesthetic vision.',
    Icon: Hexagon
  },
  account: {
    id: 'account',
    title: 'My account',
    desc: 'Access your private profile, saved pieces, and order history.',
    Icon: User
  },
  search: {
    id: 'search',
    title: 'Search',
    desc: 'Find exactly what you seek across the entire U.S Atelier collection.',
    Icon: Search
  }
};

const navLinks = [
  { label: 'Shop now', href: '/view-all', id: 'shop' },
  { label: 'The atelier', href: '/about', id: 'about' },
  { label: 'My account', href: '/account', id: 'account' },
  { label: 'Search', action: 'search', id: 'search' }
];

export function SiteHeader() {
  const pathname = usePathname()
  const router = useRouter()
  const { user } = useAuth()
  const { unseenCount: cartUnseen } = useCart()

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [searchOverlayOpen, setSearchOverlayOpen] = useState(false)
  const [hoveredLink, setHoveredLink] = useState<string>('shop')

  // GSAP Refs
  const menuContainerRef = useRef<HTMLDivElement>(null)
  const sidePanelRef = useRef<HTMLDivElement>(null)
  const timelineRef = useRef<gsap.core.Timeline | null>(null)

  // 1. MAIN REVEAL ANIMATION (Opening the Menu)
  useEffect(() => {
    if (!menuContainerRef.current) return;

    const ctx = gsap.context(() => {
      // Set initial hidden states (hidden above the screen)
      gsap.set(menuContainerRef.current, { yPercent: -100 });
      gsap.set(".reveal-mask-inner", { yPercent: 120, rotate: 3 });
      gsap.set(".reveal-fade", { opacity: 0, y: 15 });

      // Build the standard open timeline
      timelineRef.current = gsap.timeline({ paused: true })
        .to(menuContainerRef.current, {
          yPercent: 0,
          duration: 0.8,
          ease: "expo.inOut" // Buttery drop from top
        })
        .to(".reveal-mask-inner", {
          yPercent: 0,
          rotate: 0,
          duration: 0.9,
          stagger: 0.06,
          ease: "power4.out",
          force3D: true
        }, "-=0.35")
        .to(".reveal-fade", {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.05,
          ease: "power2.out"
        }, "-=0.6");

    }, menuContainerRef);

    return () => ctx.revert();
  }, [isMounted]);

  // 2. SIDE PANEL CROSSFADE (Hovering over links)
  useEffect(() => {
    if (!isMenuOpen || !sidePanelRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(".panel-anim",
        { opacity: 0, y: 10, filter: "blur(4px)" },
        { opacity: 1, y: 0, filter: "blur(0px)", duration: 0.4, ease: "power2.out", stagger: 0.05 }
      );
    }, sidePanelRef);

    return () => ctx.revert();
  }, [hoveredLink, isMenuOpen]);

  // 3. EXPLICIT CONTROLS
  const openMenu = () => {
    document.body.style.overflow = "hidden";
    setIsMenuOpen(true);
    timelineRef.current?.timeScale(1).play();
  };

  const closeMenu = () => {
    // Standard close (slides back UP)
    document.body.style.overflow = "";
    setIsMenuOpen(false);
    timelineRef.current?.timeScale(1.8).reverse();
  };

  // 4. PROGRAMMATIC ROUTING (The "Top-to-Bottom Wipe" Transition)
  const handleNavigation = (e: React.MouseEvent, href?: string, action?: string) => {
    e.preventDefault();

    if (action === 'search') {
      closeMenu();
      setTimeout(() => setSearchOverlayOpen(true), 500);
      return;
    }

    if (href && href === pathname) {
      closeMenu();
      return;
    }

    // Unload page from top to bottom
    document.body.style.overflow = "";

    // Pause the normal timeline so we can hijack the animation
    timelineRef.current?.pause();

    // Step A: Fade out text aggressively
    gsap.to(".reveal-mask-inner, .reveal-fade, .panel-anim", {
      y: 30,
      opacity: 0,
      duration: 0.3,
      stagger: 0.02,
      ease: "power3.in"
    }).then(() => {
      // Step B: Push the new route (Next.js loads it behind the black screen)
      if (href) router.push(href);

      // Step C: Slide the black curtain DOWN to reveal the new page
      setTimeout(() => {
        gsap.to(menuContainerRef.current, {
          yPercent: 100, // Slides off the bottom of the screen
          duration: 0.8,
          ease: "expo.inOut",
          onComplete: () => {
            setIsMenuOpen(false);
            // Instantly reset the menu back to the top for the next time it's opened
            gsap.set(menuContainerRef.current, { yPercent: -100 });
            // Reset text opacities for next time
            gsap.set(".reveal-mask-inner, .reveal-fade, .panel-anim", { clearProps: "all" });
          }
        });
      }, 150); // Tiny buffer to ensure the new route has painted
    });
  };

  const activeData = panelData[hoveredLink as keyof typeof panelData] || panelData.shop;
  const ActiveIcon = activeData.Icon;

  return (
    <>
      {/* ------------------------------------------------------------------ */}
      {/* MAIN HEADER (Z-50) */}
      {/* ------------------------------------------------------------------ */}
      <header className="absolute top-0 left-0 w-full z-[50] bg-transparent text-white mix-blend-difference">
        <div className="w-full max-w-screen-2xl mx-auto flex justify-between items-center px-6 md:px-12 py-6 md:py-8">

          <div className="flex items-center w-1/3">
            <button
              onClick={openMenu}
              className="group flex items-center gap-3 hover:opacity-60 transition-opacity p-2 -ml-2"
              aria-label="Open menu"
            >
              <div className="flex flex-col gap-[5px] justify-center w-6 h-6 relative">
                <span className="w-full h-[1px] bg-white block absolute top-[8px] transition-transform duration-300 group-hover:-translate-x-1"></span>
                <span className="w-full h-[1px] bg-white block absolute top-[16px] transition-transform duration-300 group-hover:translate-x-1"></span>
              </div>
              <span className="hidden sm:block text-[11px] font-sans tracking-[0.1em] mt-0.5">Menu</span>
            </button>
          </div>

          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex justify-center w-1/3 pointer-events-none">
            <Link href="/" className="font-serif text-xl md:text-2xl tracking-wide text-white pointer-events-auto">
              U.S Atelier
            </Link>
          </div>

          <div className="flex items-center justify-end gap-5 md:gap-7 w-1/3">
            <Link href={user ? "/account" : "/login"} className="hidden md:block text-white hover:text-white/60 transition-colors p-2">
              <User size={19} strokeWidth={1} />
            </Link>
            <button onClick={() => router.push('/cart')} className="relative flex items-center gap-2 text-white hover:text-white/60 transition-colors p-2 -mr-2">
              <span className="hidden md:block text-[11px] font-sans tracking-[0.1em] mt-0.5">Cart</span>
              <ShoppingBag size={20} strokeWidth={1} />
              {cartUnseen > 0 && (
                <span className="absolute top-0 right-0 w-3.5 h-3.5 bg-white text-black text-[8px] font-sans flex items-center justify-center rounded-full">
                  {cartUnseen}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* ------------------------------------------------------------------ */}
      {/* FULLSCREEN GSAP OVERLAY MENU (Z-100) */}
      {/* ------------------------------------------------------------------ */}
      <div
        ref={menuContainerRef}
        className="fixed top-0 left-0 w-full h-[100dvh] z-[100] bg-[#050505] flex flex-col justify-between overflow-hidden text-white pointer-events-none"
        style={{ pointerEvents: isMenuOpen ? 'auto' : 'none' }}
      >
        {/* Menu Header */}
        <div className="w-full max-w-screen-2xl mx-auto flex justify-between items-center px-6 md:px-12 py-6 md:py-8 mt-2 flex-shrink-0">
          <div className="w-1/3"></div>

          <div className="w-1/3 flex justify-center">
            <span className="text-center font-serif text-xl md:text-2xl tracking-wide text-white reveal-fade">
              U.S Atelier
            </span>
          </div>

          <div className="w-1/3 flex justify-end">
            <button
              onClick={closeMenu}
              className="group flex items-center gap-2 text-white/60 hover:text-white transition-colors reveal-fade p-2 -mr-2"
            >
              <span className="text-[11px] font-sans tracking-[0.1em] mt-0.5 hidden sm:block">Close</span>
              <X size={26} strokeWidth={1} className="transition-transform group-hover:rotate-90 duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
            </button>
          </div>
        </div>

        {/* Main Body Layout */}
        <div className="flex-1 w-full max-w-screen-2xl mx-auto flex flex-col-reverse md:flex-row items-center px-6 md:px-12 gap-8 md:gap-0 h-full overflow-hidden">

          {/* LEFT COLUMN: Dynamic Side Context Panel (Hidden on Mobile) */}
          <div ref={sidePanelRef} className="hidden md:flex w-1/2 flex-col items-start justify-center h-full reveal-fade">
            <div className="flex flex-col items-start text-left gap-6 max-w-sm">

              <div className="text-white/20 panel-anim">
                <ActiveIcon size={50} strokeWidth={0.5} className="w-[70px] h-[70px]" />
              </div>

              <div className="flex flex-col gap-2">
                <span className="panel-anim font-sans text-[11px] tracking-[0.15em] text-white/40">
                  {activeData.title}
                </span>
                <p className="panel-anim font-serif text-xl text-white/80 italic leading-relaxed h-[70px] flex items-start justify-start">
                  {activeData.desc}
                </p>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Navigation Links (Vertical Roll) */}
          <nav className="w-full md:w-1/2 flex flex-col items-center md:items-end justify-center gap-3 md:gap-4 h-full">
            {navLinks.map((link, index) => {
              const isDimmed = hoveredLink !== null && hoveredLink !== link.id;

              return (
                <div
                  key={link.id}
                  className="w-full flex justify-center md:justify-end reveal-item"
                  onMouseEnter={() => setHoveredLink(link.id)}
                >
                  <button
                    onClick={(e) => handleNavigation(e, link.href, link.action)}
                    className={`group flex items-start gap-4 md:gap-6 cursor-pointer transition-opacity duration-500 w-fit ${isDimmed ? 'opacity-30' : 'opacity-100'}`}
                  >
                    <span className="text-[10px] md:text-[11px] font-sans tracking-[0.1em] text-white/40 mt-1 md:mt-2 hidden md:block">0{index + 1}</span>

                    {/* The Mask Container */}
                    <div className="overflow-hidden p-1">
                      <div className="reveal-mask-inner relative h-[1.1em] leading-none text-4xl sm:text-5xl md:text-6xl font-serif">
                        {/* Vertical Roll Content */}
                        <div className="flex flex-col transition-transform duration-[600ms] ease-[cubic-bezier(0.76,0,0.24,1)] group-hover:-translate-y-1/2 text-left">
                          {/* Normal State */}
                          <span className="h-[1.1em] block text-white/80 tracking-tight">
                            {link.label}
                          </span>
                          {/* Hover State (Italicized with soft glow) */}
                          <span className="h-[1.1em] block text-white italic tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.2)]">
                            {link.label}
                          </span>
                        </div>
                      </div>
                    </div>

                  </button>
                </div>
              );
            })}
          </nav>
        </div>

        {/* Menu Footer */}
        <div className="w-full max-w-screen-2xl mx-auto px-6 md:px-12 pb-8 md:pb-10 flex-shrink-0">
          <div className="reveal-fade h-px w-full bg-white/10 mb-6 md:mb-8" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
            <div className="reveal-fade flex flex-col gap-1.5 md:gap-2">
              <span className="text-[9px] tracking-[0.15em] text-white/40 font-sans">Inquiries</span>
              <a href="mailto:contact@usatelier.in" className="text-[11px] md:text-[12px] font-sans tracking-wide text-white/80 hover:text-white transition-colors">
                contact@usatelier.in
              </a>
            </div>
            <div className="reveal-fade flex flex-col gap-1.5 md:gap-2">
              <span className="text-[9px] tracking-[0.15em] text-white/40 font-sans">Community</span>
              <a href="#" className="text-[11px] md:text-[12px] font-sans tracking-wide text-white/80 hover:text-white transition-colors">
                Instagram
              </a>
            </div>
            <div className="reveal-fade hidden md:flex flex-col gap-1.5 md:gap-2">
              <span className="text-[9px] tracking-[0.15em] text-white/40 font-sans">Legal</span>
              <Link href="/terms" className="text-[11px] md:text-[12px] font-sans tracking-wide text-white/80 hover:text-white transition-colors">
                Terms of service
              </Link>
            </div>
            <div className="reveal-fade hidden md:flex flex-col gap-1.5 md:gap-2 items-end">
              <span className="text-[9px] tracking-[0.15em] text-white/40 font-sans">Studio</span>
              <span className="text-[11px] md:text-[12px] font-sans tracking-wide text-white/50 text-right leading-relaxed">
                Designed in Mumbai.
              </span>
            </div>
          </div>
        </div>
      </div>

      <SearchOverlay
        isOpen={searchOverlayOpen}
        onClose={() => setSearchOverlayOpen(false)}
      />
    </>
  )
}