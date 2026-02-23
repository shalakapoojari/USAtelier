"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

const faqs = [
    {
        section: "Orders & Shipping",
        items: [
            {
                q: "How can I track my order?",
                a: "Once your order has been dispatched, you will receive an email confirmation with your tracking switch. You can also view your order status in your Account dashboard under 'Orders'.",
            },
            {
                q: "What are your shipping rates?",
                a: "Complimentary standard shipping is provided on all orders over ₹12,500. For orders below this amount, a standard shipping fee of ₹500 applies. Express shipping options are available at checkout.",
            },
            {
                q: "Do you ship internationally?",
                a: "Yes, ATELIER ships to over 40 countries worldwide. International shipping rates and delivery times vary by location and will be calculated at checkout.",
            },
        ],
    },
    {
        section: "Returns & Exchanges",
        items: [
            {
                q: "What is your return policy?",
                a: "We accept returns within 30 days of delivery. Items must be in their original condition, unworn, unwashed, and with all tags attached. Please note that certain delicate items or custom orders may be final sale.",
            },
            {
                q: "How do I start a return?",
                a: "To initiate a return, please visit the 'Orders' section in your account, select the order you wish to return, and follow the instructions. Alternatively, you can contact our concierge team.",
            },
        ],
    },
    {
        section: "Products & Sizing",
        items: [
            {
                q: "How do I know my size?",
                a: "Each product page features a detailed size guide with specific measurements. Our pieces generally follow a standard European sizing chart unless otherwise noted in the description.",
            },
            {
                q: "How should I care for my ATELIER pieces?",
                a: "Care instructions are provided on the label of each garment and on the product page. Most of our natural fiber pieces (cashmere, silk, wool) require dry cleaning or gentle hand washing to maintain their integrity.",
            },
        ],
    },
    {
        section: "Payments & Security",
        items: [
            {
                q: "What payment methods do you accept?",
                a: "We accept all major credit cards, UPI, and net banking. All transactions are processed through a secure, encrypted payment gateway.",
            },
        ],
    },
]

export default function HelpPage() {
    return (
        <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
            <SiteHeader />

            <main className="pt-40 pb-32 px-6 md:px-12">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <section className="text-center mb-20">
                        <p className="uppercase tracking-[0.5em] text-xs text-gray-400 mb-6">Concierge</p>
                        <h1 className="text-6xl md:text-7xl font-serif font-light mb-8 italic text-white">How can we help?</h1>
                        <p className="text-gray-500 text-sm tracking-widest max-w-xl mx-auto leading-relaxed">
                            Find answers to frequently asked questions or contact our support team for personalized assistance.
                        </p>
                    </section>

                    {/* FAQs */}
                    <div className="space-y-16">
                        {faqs.map((group, idx) => (
                            <div key={idx}>
                                <h2 className="text-[10px] uppercase tracking-[0.4em] text-gray-500 mb-8 border-b border-white/5 pb-4">
                                    {group.section}
                                </h2>
                                <Accordion type="single" collapsible className="w-full">
                                    {group.items.map((item, itemIdx) => (
                                        <AccordionItem key={itemIdx} value={`item-${idx}-${itemIdx}`} className="border-white/10">
                                            <AccordionTrigger className="text-sm uppercase tracking-widest text-left hover:no-underline hover:text-white transition-colors py-6">
                                                {item.q}
                                            </AccordionTrigger>
                                            <AccordionContent className="text-gray-400 leading-relaxed text-sm pb-6">
                                                {item.a}
                                            </AccordionContent>
                                        </AccordionItem>
                                    ))}
                                </Accordion>
                            </div>
                        ))}
                    </div>

                    {/* Contact Section */}
                    <section className="mt-32 p-12 bg-white/[0.02] border border-white/5 text-center">
                        <h3 className="font-serif text-3xl font-light mb-6">Still have questions?</h3>
                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-10">Our team is available Monday &mdash; Friday, 9am &mdash; 6pm CET.</p>
                        <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">Email</p>
                                <p className="text-sm border-b border-white/20 pb-1">concierge@us-atelier.com</p>
                            </div>
                            <div className="hidden sm:block w-px h-8 bg-white/10" />
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">Phone</p>
                                <p className="text-sm border-b border-white/20 pb-1">+39 02 1234 5678</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <SiteFooter />
        </div>
    )
}
