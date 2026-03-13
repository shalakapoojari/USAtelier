"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"

const termsSections = [
  {
    title: "1. Privacy Policy",
    content:
      "Your privacy is extremely important to us. We are committed to protecting the personal information you share and ensuring your experience on www.usatelier.com is secure, respectful, and transparent. This policy explains how we collect, use, disclose, and safeguard your personal data.",
  },
  {
    title: "2. Products",
    content:
      "All products listed on our website are subject to availability. We reserve the right to modify or discontinue any product without prior notice.",
  },
  {
    title: "3. Pricing",
    content:
      "All prices displayed on the website are in INR and may change without prior notice. We aim to keep all product information accurate.",
  },
  {
    title: "4. Product Colors",
    content:
      "We have done our best to display as accurately as possible the colors of the products shown on this website. However, because the colors you see depend on your monitor, we cannot guarantee that your monitor display of any color will be fully accurate.",
  },
  {
    title: "5. Orders",
    content:
      "Once an order is placed and confirmed, it cannot be canceled after processing. We reserve the right to cancel any order in case of product unavailability or other issues.",
  },
  {
    title: "6. Shipping",
    content:
      "We aim to dispatch your order within 2 working days after it is placed. Once your order is dispatched, you will receive a tracking link via email and SMS. Delivery typically takes 5 to 7 working days, depending on your PIN code. For certain locations, delivery may take slightly longer. Please call Customer Service and quote your tracking number to trace your package.",
  },
  {
    title: "7. Exchange Policy",
    content:
      "We do not provide returns or refunds. Products can only be exchanged within 7 days from the date on which these goods are delivered if they are unused, unwashed, and in original condition with tags. Exchange is subject to product availability.",
  },
  {
    title: "8. Cash on Delivery (COD)",
    content:
      "Cash on Delivery orders will include an additional Rs.150 COD handling charge.",
  },
  {
    title: "9. Intellectual Property",
    content:
      "All images, designs, logos, and content on this website are the property of U.S Atelier and may not be copied, reproduced, or used without prior permission.",
  },
  {
    title: "10. Changes to Terms",
    content:
      "We reserve the right to update or modify these Terms and Conditions at any time without prior notice.",
  },
]

export default function TermsAndConditionsPage() {
  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      <main className="pt-52 pb-28 px-6 md:px-12">
        <div className="max-w-4xl mx-auto">
          <section className="text-center mb-16">
            
            <h1 className="text-5xl md:text-6xl font-serif font-light mb-8 italic text-white">Terms & Conditions</h1>
            <p className="text-gray-500 text-sm tracking-widest max-w-2xl mx-auto leading-relaxed">
              Welcome to U.S Atelier. By accessing or purchasing from our website, you agree to the following terms and conditions.
            </p>    
          </section>

          <section className="space-y-8">
            {termsSections.map((section) => (
              <div key={section.title} className="border border-white/10 bg-white/2 p-6 md:p-8">
                <h2 className="text-[11px] uppercase tracking-[0.25em] text-[#C8A45D] mb-4">{section.title}</h2>
                <p className="text-sm text-gray-300 leading-relaxed">{section.content}</p>
              </div>
            ))}
          </section>

          <p className="mt-12 text-center text-xs uppercase tracking-[0.2em] text-gray-500">
            By using this website and placing an order, you agree to these Terms and Conditions.
          </p>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
