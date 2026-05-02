export function MarqueeTicker() {
  const items = [
    "New Collection",
    "Crafted In India",
    "Premium Menswear",
    "Free Shipping Above ₹5000",
    "U.S Atelier",
    "Designed For The World",
    "SUMMER COLLECTION 2026",
    "Limited Drops",
  ]

  // Duplicate for seamless loop
  const allItems = [...items, ...items]

  return (
    <div className="relative overflow-hidden border-y border-white/5 bg-black py-4 select-none">
      {/* Top grain line */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "linear-gradient(90deg, black 0%, transparent 8%, transparent 92%, black 100%)" }} />
      <div className="flex items-center animate-marquee whitespace-nowrap gap-0" style={{ width: "max-content" }}>
        {allItems.map((item, i) => (
          <span key={i} className="flex items-center">
            <span className="text-[10px] uppercase tracking-[0.5em] text-white/25 px-8 font-sans">
              {item}
            </span>
            <span className="text-[#c8a45d]/40 text-[8px]">◆</span>
          </span>
        ))}
      </div>
    </div>
  )
}
