"use client"

/**
 * ProductPrice — shared component for displaying product pricing.
 *
 * Case A — Discount active (mrp is set and mrp > sellingPrice):
 *   [~~Rs.MRP~~]  [Rs.SellingPrice]  [XX% OFF]
 *
 * Case B — No discount (mrp is blank, null, or equal to sellingPrice):
 *   [Rs.SellingPrice]
 *   No strikethrough, no badge, no red color.
 */

type ProductPriceProps = {
  sellingPrice: number
  mrp?: number | null
  /** Override the size classes for the selling price. Defaults to "text-sm" */
  className?: string
  /** When true the selling price is rendered in white (for dark card backgrounds) */
  darkBg?: boolean
}

export function ProductPrice({
  sellingPrice,
  mrp,
  className = "text-sm",
  darkBg = false,
}: ProductPriceProps) {
  const hasDiscount = typeof mrp === "number" && mrp > sellingPrice
  const discountPercent = hasDiscount
    ? Math.round(((mrp! - sellingPrice) / mrp!) * 100)
    : 0

  if (hasDiscount) {
    return (
      <span className={`flex items-center gap-1.5 flex-wrap ${className}`}>
        {/* MRP — strikethrough, muted gray */}
        <span
          className="text-[11px] text-[#888] line-through leading-none"
          aria-label={`Original price ₹${mrp!.toLocaleString("en-IN")}`}
        >
          ₹{mrp!.toLocaleString("en-IN")}
        </span>

        {/* Selling Price — bold, red */}
        <span
          className="font-semibold text-[#E12B2B] leading-none"
          aria-label={`Selling price ₹${sellingPrice.toLocaleString("en-IN")}`}
        >
          ₹{sellingPrice.toLocaleString("en-IN")}
        </span>

        {/* % OFF badge */}
        <span className="text-[10px] font-medium text-[#E12B2B] leading-none tracking-wide">
          {discountPercent}% OFF
        </span>
      </span>
    )
  }

  // No discount — plain price, respects dark/light context
  return (
    <span
      className={`${className} leading-none ${darkBg ? "text-white" : "text-gray-400"}`}
      aria-label={`Price ₹${sellingPrice.toLocaleString("en-IN")}`}
    >
      ₹{sellingPrice.toLocaleString("en-IN")}
    </span>
  )
}
