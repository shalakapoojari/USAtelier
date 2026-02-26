"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, Image as ImageIcon, Upload, Check, Filter } from "lucide-react"
import { useToast } from "@/lib/toast-context"
import Image from "next/image"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

type HeroSlide = {
    image: string
    subtitle: string
    title1: string
    title2: string
    cta_text: string
    cta_link: string
}

type ConfigType = {
    hero_slides: HeroSlide[]
    manifesto_text: string
    bestseller_product_ids: string[]
    featured_product_ids: string[]
    new_arrival_product_ids: string[]
}

function HeroSlideEditor({
    slide,
    index,
    onUpdate,
    onRemove,
    onUpload
}: {
    slide: HeroSlide,
    index: number,
    onUpdate: (index: number, data: Partial<HeroSlide>) => void,
    onRemove: (index: number) => void,
    onUpload: (index: number, file: File) => void
}) {
    return (
        <div className="bg-white/[0.02] p-8 border border-white/5 space-y-8 relative group/slide">
            <div className="flex justify-between items-start">
                <span className="text-[10px] uppercase tracking-[0.5em] text-gray-600 font-bold">Slide 0{index + 1}</span>
                {index > 0 && (
                    <Button
                        variant="ghost"
                        onClick={() => onRemove(index)}
                        className="text-red-500/50 hover:text-red-500 hover:bg-red-500/10 text-[9px] uppercase tracking-widest h-8 px-3 rounded-none transition-all"
                    >
                        Remove Slide
                    </Button>
                )}
            </div>

            <div className="flex flex-col 2xl:flex-row gap-8">
                <div className="relative w-full 2xl:w-48 aspect-[3/4] bg-white/5 border border-white/10 overflow-hidden group/image shadow-lg shrink-0">
                    {slide.image ? (
                        <Image src={slide.image} alt="Hero" fill className="object-cover" />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                            <ImageIcon size={32} />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/image:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="relative">
                            <Input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    const file = e.target.files?.[0]
                                    if (file) onUpload(index, file)
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                            />
                            <Button size="sm" className="bg-white text-black hover:bg-gray-200 rounded-none uppercase text-[10px] tracking-widest px-6 h-10">
                                <Upload size={14} className="mr-2" /> Upload
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 space-y-6">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-[9px] uppercase tracking-[0.3em] text-gray-500">Subtitle</Label>
                            <Input
                                value={slide.subtitle}
                                onChange={(e) => onUpdate(index, { subtitle: e.target.value })}
                                className="bg-transparent border-white/10 h-10 rounded-none text-xs"
                                placeholder="Subtitle"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] uppercase tracking-[0.3em] text-gray-500">CTA Link</Label>
                            <Input
                                value={slide.cta_link}
                                onChange={(e) => onUpdate(index, { cta_link: e.target.value })}
                                className="bg-transparent border-white/10 h-10 rounded-none text-xs"
                                placeholder="Link"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] uppercase tracking-[0.3em] text-gray-500">Title 1 (Bold)</Label>
                            <Input
                                value={slide.title1}
                                onChange={(e) => onUpdate(index, { title1: e.target.value })}
                                className="bg-transparent border-white/10 h-10 rounded-none text-xs"
                                placeholder="Title 1"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-[9px] uppercase tracking-[0.3em] text-gray-500">Title 2 (Italic)</Label>
                            <Input
                                value={slide.title2}
                                onChange={(e) => onUpdate(index, { title2: e.target.value })}
                                className="bg-transparent border-white/10 h-10 rounded-none text-xs"
                                placeholder="Title 2"
                            />
                        </div>
                        <div className="space-y-2 lg:col-span-2">
                            <Label className="text-[9px] uppercase tracking-[0.3em] text-gray-500">CTA Text</Label>
                            <Input
                                value={slide.cta_text}
                                onChange={(e) => onUpdate(index, { cta_text: e.target.value })}
                                className="bg-transparent border-white/10 h-10 rounded-none text-xs"
                                placeholder="CTA Text"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

function ProductSelectionRow({
    title,
    subtitle,
    listKey,
    products,
    selectedIds,
    categories,
    filter,
    onFilterChange,
    onToggle,
    onClear
}: {
    title: string,
    subtitle: string,
    listKey: keyof ConfigType,
    products: any[],
    selectedIds: string[],
    categories: any[],
    filter: string,
    onFilterChange: (v: string) => void,
    onToggle: (id: string, key: keyof ConfigType) => void,
    onClear: (key: keyof ConfigType) => void
}) {
    const filteredProducts = filter === "all" ? products : products.filter(p => p.category === filter)

    return (
        <div className="space-y-4 pb-8 border-b border-white/5 last:border-0 pt-4">
            <div className="px-4">
                {/* Section Title & Subtitle clearly at the top-left */}
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h3 className="text-2xl md:text-4xl font-serif mb-2 uppercase tracking-[0.2em] text-[#e8e8e3]">{title}</h3>
                        <p className="text-[10px] text-gray-500 tracking-[0.4em] uppercase">{subtitle}</p>
                    </div>
                    <Button
                        variant="ghost"
                        onClick={() => onClear(listKey)}
                        className="text-[9px] uppercase tracking-[0.2em] text-gray-500 hover:text-white hover:bg-white/5 rounded-none px-4"
                    >
                        Clear Selection
                    </Button>
                </div>

                <div className="flex flex-col md:flex-row md:items-center gap-6">
                    {/* Category Filter below the heading */}
                    <div className="flex items-center gap-4 min-w-[280px]">
                        <Label className="text-[9px] uppercase tracking-[0.2em] text-gray-400 whitespace-nowrap flex items-center gap-2">
                            <Filter size={12} /> Filter Category
                        </Label>
                        <Select value={filter} onValueChange={onFilterChange}>
                            <SelectTrigger className="bg-transparent border-white/10 rounded-none text-[10px] uppercase tracking-widest h-10 flex-1">
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#030303] border-white/10 text-[#e8e8e3]">
                                <SelectItem value="all">ALL CATEGORIES</SelectItem>
                                {categories.map(c => (
                                    <SelectItem key={c.id} value={c.name}>{c.name.toUpperCase()}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="h-px bg-white/5 flex-1 hidden md:block" />
                </div>
            </div>

            <div className="relative group">
                <div className="flex gap-4 scrollbar-hide overflow-x-auto pb-4 pt-4 px-4 custom-scrollbar scroll-smooth">
                    {filteredProducts.length > 0 ? (
                        filteredProducts.map(p => {
                            const isSelected = selectedIds.includes(p.id)
                            const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images
                            const imageUrl = images && images[0] ? images[0] : "/placeholder.jpg"
                            return (
                                <div
                                    key={p.id}
                                    onClick={() => onToggle(p.id, listKey)}
                                    className={`relative flex-shrink-0 w-[180px] md:w-[240px] aspect-[3/4] cursor-pointer transition-all border group/card ${isSelected ? 'border-[#e8e8e3]' : 'border-white/5 hover:border-white/20'}`}
                                >
                                    <Image
                                        src={imageUrl}
                                        alt={p.name}
                                        fill
                                        className={`object-cover transition-all duration-500 ${isSelected ? 'opacity-90' : 'opacity-40 group-hover/card:opacity-60'}`}
                                    />
                                    <div className="absolute inset-x-0 bottom-0 bg-black/80 p-4 backdrop-blur-sm border-t border-white/5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                                        <p className="text-[10px] uppercase tracking-[0.2em] font-medium truncate mb-1">{p.name}</p>
                                        <p className="text-[8px] uppercase tracking-widest text-gray-500">₹{p.price.toLocaleString()}</p>
                                    </div>
                                    {isSelected && (
                                        <div className="absolute top-4 right-4 bg-[#e8e8e3] text-black size-6 flex items-center justify-center rounded-full shadow-2xl scale-110 z-10">
                                            <Check size={12} strokeWidth={3} />
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    ) : (
                        <div className="w-full flex items-center justify-center py-20 border border-dashed border-white/5 bg-white/[0.01]">
                            <p className="text-[10px] uppercase tracking-[0.5em] text-gray-600">No pieces found in this category</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default function HomepageDesignPage() {
    const [API_BASE, setApiBase] = useState("")

    useEffect(() => {
        setApiBase(`http://${window.location.hostname}:5000`)
    }, [])

    const [config, setConfig] = useState<ConfigType>({
        hero_slides: [],
        manifesto_text: "",
        bestseller_product_ids: [],
        featured_product_ids: [],
        new_arrival_product_ids: []
    })
    const [products, setProducts] = useState<any[]>([])
    const [categories, setCategories] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { showToast } = useToast()

    // Filters for each section
    const [filters, setFilters] = useState({
        bestseller: "all",
        featured: "all",
        newArrival: "all"
    })

    useEffect(() => {
        if (API_BASE) fetchData()
    }, [API_BASE])

    const fetchData = async () => {
        try {
            const [configRes, productsRes, catsRes] = await Promise.all([
                fetch(`${API_BASE}/api/homepage`),
                fetch(`${API_BASE}/api/products`),
                fetch(`${API_BASE}/api/categories`)
            ])

            if (configRes.ok) {
                const data = await configRes.json()
                setConfig(prev => ({ ...prev, ...data }))
            }

            if (productsRes.ok) {
                const data = await productsRes.json()
                setProducts(data)
            }

            if (catsRes.ok) {
                const data = await catsRes.json()
                setCategories(data)
            }
        } catch (err) {
            console.error("Failed to fetch data:", err)
            showToast("Failed to load settings", "info")
        } finally {
            setLoading(false)
        }
    }

    const handleSlideUpdate = (index: number, data: Partial<HeroSlide>) => {
        setConfig(prev => {
            const newSlides = [...prev.hero_slides]
            newSlides[index] = { ...newSlides[index], ...data }
            return { ...prev, hero_slides: newSlides }
        })
    }

    const handleAddSlide = () => {
        setConfig(prev => ({
            ...prev,
            hero_slides: [
                ...prev.hero_slides,
                {
                    image: "",
                    subtitle: "New Collection",
                    title1: "NEW",
                    title2: "SEASON",
                    cta_text: "Shop Now",
                    cta_link: "/view-all"
                }
            ]
        }))
    }

    const handleRemoveSlide = (index: number) => {
        setConfig(prev => ({
            ...prev,
            hero_slides: prev.hero_slides.filter((_, i) => i !== index)
        }))
    }

    const handleFileUpload = async (index: number, file: File) => {
        if (!API_BASE) return
        const data = new FormData()
        data.append("file", file)

        try {
            const res = await fetch(`${API_BASE}/api/upload`, {
                method: "POST",
                credentials: "include",
                body: data,
            })
            const result = await res.json()
            if (res.ok && result.success) {
                handleSlideUpdate(index, { image: result.url })
                showToast("Image uploaded", "info")
            } else {
                showToast(result.error || "Upload failed", "info")
            }
        } catch {
            showToast("Upload error", "info")
        }
    }

    const handleSave = async () => {
        if (!API_BASE) {
            showToast("Connection initialization in progress...", "info")
            return
        }
        setSaving(true)
        try {
            const res = await fetch(`${API_BASE}/api/homepage`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                credentials: "include",
                body: JSON.stringify(config)
            })

            if (res.ok) {
                showToast("Homepage updated successfully", "info")
            } else {
                showToast("Failed to update homepage", "info")
            }
        } catch (err) {
            showToast("Network error", "info")
        } finally {
            setSaving(false)
        }
    }

    const toggleProductSelection = (id: string, listKey: keyof ConfigType) => {
        setConfig(prev => {
            const currentList = prev[listKey] as string[]
            const newList = currentList.includes(id)
                ? currentList.filter(i => i !== id)
                : [...currentList, id]

            return { ...prev, [listKey]: newList }
        })
    }

    const clearSelection = (listKey: keyof ConfigType) => {
        setConfig(prev => ({ ...prev, [listKey]: [] }))
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Loader2 className="animate-spin text-gray-500" />
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Constructing Design Suite...</p>
            </div>
        )
    }

    return (
        <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 md:px-12 py-16 overflow-x-hidden relative">
            <div className="max-w-[1700px] mx-auto">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-16 pb-12 border-b border-white/5 gap-8">
                    <div>
                        <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4">Admin / Surface</p>
                        <h1 className="font-serif text-5xl md:text-6xl font-light">Homepage Design</h1>
                        <p className="mt-4 text-sm tracking-widest text-gray-500">
                            Curate the primary editorial narrative and visual assembly.
                        </p>
                    </div>

                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[#e8e8e3] text-black hover:bg-white px-10 py-7 md:py-8 uppercase tracking-widest text-xs rounded-none transition-all flex items-center gap-3 w-full md:w-auto"
                    >
                        {saving ? <Loader2 className="animate-spin size-4" /> : <Save size={18} />}
                        Save Work
                    </Button>
                </div>

                <div className="space-y-16">
                    {/* HERO CAROUSEL */}
                    <div className="max-w-[1400px]">
                        <section className="space-y-12">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h2 className="text-3xl font-serif mb-4 uppercase tracking-widest">Hero Carousel</h2>
                                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">Manage multiple high-impact editorial slides</p>
                                </div>
                                <Button
                                    onClick={handleAddSlide}
                                    className="bg-transparent border border-white/20 hover:bg-white/5 text-[#e8e8e3] px-8 py-6 rounded-none uppercase text-[10px] tracking-widest transition-all"
                                >
                                    + Add New Slide
                                </Button>
                            </div>

                            <div className="grid grid-cols-1 gap-10">
                                {config.hero_slides.map((slide, idx) => (
                                    <HeroSlideEditor
                                        key={idx}
                                        index={idx}
                                        slide={slide}
                                        onUpdate={handleSlideUpdate}
                                        onRemove={handleRemoveSlide}
                                        onUpload={handleFileUpload}
                                    />
                                ))}
                            </div>
                        </section>
                    </div>

                    {/* HORIZONTAL PRODUCT SELECTION SECTIONS */}
                    <div className="space-y-12">
                        <div className="flex items-center gap-8 mb-12">
                            <h2 className="text-3xl font-serif uppercase tracking-[0.3em] whitespace-nowrap">Gallery Curation</h2>
                            <div className="h-px bg-white/10 flex-1" />
                        </div>

                        <ProductSelectionRow
                            title="Best Selling"
                            subtitle="Signature silhouettes and seasonal staples"
                            listKey="bestseller_product_ids"
                            products={products}
                            selectedIds={config.bestseller_product_ids}
                            categories={categories}
                            filter={filters.bestseller}
                            onFilterChange={(v) => setFilters(prev => ({ ...prev, bestseller: v }))}
                            onToggle={toggleProductSelection}
                            onClear={clearSelection}
                        />

                        <ProductSelectionRow
                            title="Featured Pieces"
                            subtitle="Editorial spotlight and campaign highlights"
                            listKey="featured_product_ids"
                            products={products}
                            selectedIds={config.featured_product_ids}
                            categories={categories}
                            filter={filters.featured}
                            onFilterChange={(v) => setFilters(prev => ({ ...prev, featured: v }))}
                            onToggle={toggleProductSelection}
                            onClear={clearSelection}
                        />

                        <ProductSelectionRow
                            title="New Arrivals"
                            subtitle="The latest arrivals from the current season"
                            listKey="new_arrival_product_ids"
                            products={products}
                            selectedIds={config.new_arrival_product_ids}
                            categories={categories}
                            filter={filters.newArrival}
                            onFilterChange={(v) => setFilters(prev => ({ ...prev, newArrival: v }))}
                            onToggle={toggleProductSelection}
                            onClear={clearSelection}
                        />
                    </div>
                </div>
            </div>

            <style jsx global>{`
                /* Prevent page-level horizontal movement */
                html, body {
                    overflow-x: hidden !important;
                    position: relative;
                }
                
                .custom-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .custom-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                
                .no-scrollbar::-webkit-scrollbar {
                    display: none;
                }
                .no-scrollbar {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
            `}</style>
        </div>
    )
}
