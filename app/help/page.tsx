"use client"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

const quickHelp = [
    {
        title: "Track Order",
        description: "Check your latest order status and shipment journey.",
        href: "/account/orders",
    },
    {
        title: "Contact With Us",
        description: "Email our support team for order and policy assistance.",
        href: "mailto:usatelier08@gmail.com",
    },
    {
        title: "Chat With Us",
        description: "Reach us quickly on social channels for fast help.",
        href: "https://www.instagram.com/",
    },
    {
        title: "FAQ",
        description: "Browse detailed answers for shipping, exchange, and payment.",
        href: "#faq",
    },
]

const faqs = [
    {
        section: "Shipping, Order Tracking & Delivery",
        items: [
            {
                q: "How will I know if my order has been successfully placed?",
                a: "Once your order is placed, you will receive a confirmation email with your order details. You will also be notified via email once your order has been dispatched from our warehouse.",
            },
            {
                q: "How can I track my order?",
                a: "After your order has been dispatched, a tracking link will be sent to your registered mobile number. If you are unable to access the tracking details, please contact us at usatelier08@gmail.com or reach out through our social media channels and our team will assist you.",
            },
            {
                q: "Do I need to pay shipping charges for my order?",
                a: "Yes. A shipping fee of Rs.99 will be charged on orders below Rs.999/- and an additional cash handling fee of Rs.150 will be charged on COD orders.",
            },
            {
                q: "How soon will my order be dispatched?",
                a: "We aim to dispatch your order within 2 working days after it is placed. Once your order is dispatched, you will receive a tracking link via email and SMS. Delivery typically takes 5 to 7 working days, depending on your PIN code. For certain locations, delivery may take slightly longer. In case of delay, please write to us at usatelier08@gmail.com and our team will be happy to assist you.",
            },
            {
                q: "What should I do if items are missing from my order?",
                a: "While our automated warehouse system helps minimize errors, if any items are missing from your order, please contact us within 24 hours of delivery via call or email, along with an unboxing video. Our team will review the issue and investigate the matter, which may take 5 to 7 working days to resolve.",
            },
            {
                q: "How do our new drops work?",
                a: "We announce all upcoming designs and collections on our official Instagram account. After the announcement, the products are released and available for purchase directly on our website.",
            },
        ],
    },
    {
        section: "Return and Exchange",
        items: [
            {
                q: "What is the return and refund policy?",
                a: "We currently do not offer returns or refunds. However, you may request an exchange within 7 days of delivery if the product is unused, unwashed, and returned in its original condition with all tags attached. All exchanges are subject to product availability.",
            },
            {
                q: "I want to exchange my order with a different size.",
                a: "You can select the product you would like in exchange directly from our website while placing your exchange request. Once your return order is picked up, we will promptly dispatch your exchange item.",
            },
            {
                q: "I have placed a COD order. How will I receive the refund?",
                a: "You can opt for a coupon code of the product amount, redeemable on your next purchase from the website, or share your bank account details (account number, IFSC code, and account holder name). The product amount will be credited within 5 to 6 working days.",
            },
            {
                q: "Will I have to bear shipping charges if I use my exchange order coupon code?",
                a: "No. The first exchange order is absolutely free.",
            },
            {
                q: "Can I exchange my product for one of higher value?",
                a: "Yes, you can choose a higher-value product in exchange for your existing item. The balance amount must be paid online at the time of placing the exchange request. Cash on Delivery is not available for balance payment.",
            },
        ],
    },
    {
        section: "Cancellation and Modification",
        items: [
            {
                q: "How will I receive a refund for a canceled order?",
                a: "Once the order is canceled, the refund usually gets processed within 2 business days. It may take 5 to 7 working days for the refunded amount to reflect in your account as per standard banking procedures.",
            },
            {
                q: "Can I change the color or size of an order that has already been placed?",
                a: "You cannot change the product size or color once the order is placed. You can cancel the existing order and place a new one before the order gets shipped.",
            },
        ],
    },
    {
        section: "Sizing Help",
        items: [
            {
                q: "How do I determine the correct size for me?",
                a: "While placing your order, you will find a Size Chart option on the product page with detailed information on sizes and fit. If you still need help, please contact us and we will assist you.",
            },
        ],
    },
    {
        section: "Payments",
        items: [
            {
                q: "What are the payment options at U.S Atelier?",
                a: "We offer multiple payment options for your convenience: Net Banking, Credit Card or Debit Card, UPI QR Code, Pay with Paytm, and Cash on Delivery (available in selected PIN codes).",
            },
            {
                q: "My payment failed while making a purchase. What should I do?",
                a: "Mail us your transaction details at usatelier08@gmail.com. We will verify and get back to you at the earliest.",
            },
        ],
    },
]

export default function HelpPage() {
    return (
        <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
            <SiteHeader />

            <main className="pt-52 pb-32 px-6 md:px-12">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <section className="text-center mb-20">
                        <h1 className="text-5xl md:text-6xl font-serif font-light mb-8 italic text-white">Support and Assistance</h1>
                        <p className="text-gray-500 text-sm tracking-widest max-w-xl mx-auto leading-relaxed">
                            Find clear answers for orders, delivery, exchanges, cancellations, sizing, and payments.
                        </p>
                    </section>

                    {/* Quick actions */}
                    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                        {quickHelp.map((item) => (
                            <a
                                key={item.title}
                                href={item.href}
                                className="border border-white/10 bg-white/2 p-5 hover:border-[#C8A45D]/60 hover:bg-[#C8A45D]/5 transition-colors"
                            >
                                <p className="text-[10px] uppercase tracking-[0.25em] text-[#C8A45D] mb-2">{item.title}</p>
                                <p className="text-xs text-gray-400 leading-relaxed">{item.description}</p>
                            </a>
                        ))}
                    </section>

                    {/* FAQs */}
                    <div id="faq" className="space-y-16">
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
                    <section className="mt-32 p-12 bg-white/2 border border-white/5 text-center">
                        <h3 className="font-serif text-3xl font-light mb-6">Still need help?</h3>
                        <p className="text-gray-500 text-xs uppercase tracking-widest mb-10">Reach us and our support team will assist you as quickly as possible.</p>
                        <div className="flex flex-col sm:flex-row gap-8 justify-center items-center">
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">Email</p>
                                <p className="text-sm border-b border-white/20 pb-1">usatelier08@gmail.com</p>
                            </div>
                            <div className="hidden sm:block w-px h-8 bg-white/10" />
                            <div>
                                <p className="text-[10px] uppercase tracking-widest text-gray-600 mb-1">Phone</p>
                                <p className="text-sm border-b border-white/20 pb-1">8888888888</p>
                            </div>
                        </div>
                    </section>
                </div>
            </main>

            <SiteFooter />
        </div>
    )
}
