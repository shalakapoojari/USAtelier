"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

const sections = [
  {
    id: "no-returns",
    title: "1. Return Policy",
    content:
      "U.S Atelier does not accept returns or issue refunds for change of mind, incorrect size selection, or any other reason unless the item is defective or damaged. All sales are considered final once an order has been dispatched. We strongly encourage consulting our size guide before placing an order.",
  },
  {
    id: "exchange-policy",
    title: "2. Exchange Policy",
    content:
      "Products may be exchanged within 7 days from the date of delivery, provided the item is unused, unwashed, and in its original condition with all tags intact. Exchanges are subject to stock availability. To initiate an exchange, contact us at usatelier08@gmail.com within the 7-day window with your order number and reason for exchange.",
  },
  {
    id: "defective-damaged",
    title: "3. Defective or Damaged Items",
    content:
      "If you receive a damaged, defective, or incorrect item, please contact us within 48 hours of delivery with photographic evidence and your order number. After verification, we will arrange a replacement or issue a full refund at no additional cost to you. Claims made after 48 hours from delivery confirmation may not be accepted.",
  },
  {
    id: "how-to-exchange",
    title: "4. How to Initiate an Exchange",
    content:
      "Step 1: Email usatelier08@gmail.com within 7 days of delivery.\nStep 2: Include your Order Number, the item(s) you wish to exchange, and your preferred size/colour.\nStep 3: Our team will confirm eligibility and provide a return address within 2 business days.\nStep 4: Ship the item(s) back at your own cost using a trackable courier.\nStep 5: Once received and inspected, the exchange item will be dispatched within 3–5 business days.",
  },
  {
    id: "non-exchangeable",
    title: "5. Non-Exchangeable Items",
    content:
      "The following items are not eligible for exchange: items that have been worn, washed, or altered; items returned after the 7-day window; items without original tags; sale items and items purchased using a promotional discount code (unless defective).",
  },
  {
    id: "shipping-costs",
    title: "6. Exchange Shipping Costs",
    content:
      "The customer is responsible for the shipping cost of returning an item for exchange. U.S Atelier will cover the shipping cost of dispatching the exchanged item back to you within India. For international exchanges, additional duties and taxes are the customer's responsibility.",
  },
  {
    id: "cod-orders",
    title: "7. Cash on Delivery (COD) Orders",
    content:
      "COD orders require a ₹150 advance fee paid online via Razorpay at checkout. This advance fee is strictly non-refundable under all circumstances, including:\n\n• Order cancellation (within or outside the 30-minute window)\n• Exchange requests\n• Return of defective/damaged items\n• Any other reason\n\nThe ₹150 COD advance covers handling, logistics coordination, and the cost of reserving your order for cash payment at delivery. By selecting COD, you acknowledge and agree that this fee will not be returned to you regardless of the outcome of your order.\n\nThe remaining balance (order total minus ₹150) is payable in cash to the delivery agent upon receipt. COD exchanges follow the same policy as prepaid orders — the item must be returned in original condition within 7 days of delivery.",
  },
  {
    id: "cancellation-policy",
    title: "9. Order Cancellation Policy",
    content:
      "Orders may be cancelled within 30 minutes of placement, subject to the following:\n\n• Prepaid Orders: A full refund will be initiated to your original payment method (UPI, card, net banking) within 5–10 business days.\n• COD Orders: Cancellation is permitted within 30 minutes, however the ₹150 COD advance fee is non-refundable. No other amount is charged for COD cancellations.\n• Once 30 minutes have elapsed, orders cannot be cancelled through the platform. Contact support at usatelier08@gmail.com if you need assistance.\n• Orders that have already been dispatched (assigned a tracking number) cannot be cancelled under any circumstances.",
  },
  {
    id: "payment-refunds",
    title: "10. Refunds for Defective Items",
    content:
      "In the rare case that a defective item cannot be exchanged (due to stock unavailability), a full refund will be processed to your original payment method within 5–10 business days. For UPI, card, or net banking payments, the refund timeline is subject to your bank's processing period. For COD orders, refunds (excluding the ₹150 advance fee) will be processed via bank transfer — please contact us with your bank details.",
  },
]

export default function RefundPolicyPage() {
  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      <main className="pt-52 pb-28 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-16">
            <p className="text-[9px] uppercase tracking-[0.5em] text-gray-600 mb-6">Legal</p>
            <h1 className="text-5xl md:text-6xl font-serif font-light mb-8 italic text-white">Refund & Exchange Policy</h1>
            <p className="text-gray-500 text-sm tracking-widest max-w-2xl mx-auto leading-relaxed">
              Please read this policy carefully before placing your order. By completing a purchase on usatelier.com, you agree to the terms outlined below.
            </p>
          </section>

          <section className="space-y-8">
            {sections.map((section) => (
              <div id={section.id} key={section.title} className="border border-white/10 bg-white/2 p-6 md:p-8">
                <h2 className="text-[11px] uppercase tracking-[0.25em] text-[#C8A45D] mb-4">{section.title}</h2>
                <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-line">{section.content}</p>
              </div>
            ))}
          </section>

          <p className="mt-12 text-center text-xs uppercase tracking-[0.2em] text-gray-500">
            For any questions regarding returns, exchanges, or refunds — contact us at usatelier08@gmail.com
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
