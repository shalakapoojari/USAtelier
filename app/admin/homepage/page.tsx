"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, Image as ImageIcon, Upload, Check, Filter, GripVertical, ChevronUp, ChevronDown } from "lucide-react"
import { useToast } from "@/lib/toast-context"
import Image from "next/image"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog"
import { Search, Plus } from "lucide-react"
import { getApiBase } from "@/lib/api-base"
import { resolveMediaUrl } from "@/lib/media-url"

type HeroSlide = {
    image: string
    content: string
    product_id: string
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
    total,
    products,
    categories,
    onUpdate,
    onRemove,
    onUpload,
    onMove
}: {
    slide: HeroSlide,
    index: number,
    total: number,
    products: any[],
    categories: any[],
    onUpdate: (index: number, data: Partial<HeroSlide>) => void,
    onRemove: (index: number) => void,
    onUpload: (index: number, file: File) => void,
    onMove: (from: number, to: number) => void
}) {
    const [categoryFilter, setCategoryFilter] = useState("all")
    const filteredProducts = categoryFilter === "all"
        ? products
        : products.filter(p => p.category === categoryFilter)

    const [isOpen, setIsOpen] = useState(false)

    return (
        <div className="bg-white/2 border border-white/5 space-y-8 relative group/slide overflow-hidden">
            {/* Slide Header with Sorting & Actions */}
            <div className="flex justify-between items-center bg-white/5 px-8 py-4 border-b border-white/5">
                <div className="flex items-center gap-6">
                    <span className="text-[10px] uppercase tracking-[0.5em] text-gray-400 font-bold">Slide 0{index + 1}</span>
                    <div className="flex items-center gap-2 border-l border-white/10 pl-6 text-gray-600">
                        <GripVertical size={14} />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex border border-white/10">
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === 0}
                            onClick={() => onMove(index, index - 1)}
                            className="size-8 rounded-none border-r border-white/10 hover:bg-white/5 text-gray-500 hover:text-white transition-all disabled:opacity-20"
                        >
                            <ChevronUp size={14} />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            disabled={index === total - 1}
                            onClick={() => onMove(index, index + 1)}
                            className="size-8 rounded-none hover:bg-white/5 text-gray-500 hover:text-white transition-all disabled:opacity-20"
                        >
                            <ChevronDown size={14} />
                        </Button>
                    </div>
                    {index > 0 && (
                        <Button
                            variant="ghost"
                            onClick={() => onRemove(index)}
                            className="text-red-500/50 hover:text-red-500 hover:bg-red-500/10 text-[9px] uppercase tracking-widest h-8 px-4 rounded-none transition-all"
                        >
                            Remove
                        </Button>
                    )}
                </div>
            </div>

            <div className="px-8 pb-8 flex flex-col 2xl:flex-row gap-8">
                <div className="relative w-full 2xl:w-48 aspect-3/4 bg-white/5 border border-white/10 overflow-hidden group/image shadow-lg shrink-0">
                    {slide.image ? (
                        <Image src={resolveMediaUrl(slide.image)} alt="Hero" fill className="object-cover" />
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
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-[9px] uppercase tracking-[0.3em] text-gray-500">Editorial Content</Label>
                            <Textarea
                                value={slide.content}
                                onChange={(e) => onUpdate(index, { content: e.target.value })}
                                className="bg-transparent border-white/10 min-h-25 rounded-none text-xs resize-none"
                                placeholder="e.g. Classical and Royal Finishing Sweatshirt"
                            />
                        </div>

                        <div className="flex flex-wrap gap-4">
                            <Dialog open={isOpen} onOpenChange={setIsOpen}>
                                <DialogTrigger asChild>
                                    <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20 rounded-none uppercase text-[9px] tracking-widest px-6 h-10 transition-all">
                                        <Search size={14} className="mr-2 text-gray-400" /> Select From Products
                                    </Button>
                                </DialogTrigger>
                                <DialogContent className="bg-[#030303] border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto visible-scrollbar">
                                    <DialogHeader>
                                        <DialogTitle className="font-serif text-2xl uppercase tracking-widest mb-6 px-4 pt-4">Select Product Image</DialogTitle>
                                    </DialogHeader>

                                    <div className="px-4 mb-6 sticky top-0 bg-[#030303] pb-4 border-b border-white/5 z-10">
                                        <div className="flex items-center gap-4">
                                            <Label className="text-[9px] uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">Filter By Category</Label>
                                            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                                                <SelectTrigger className="bg-transparent border-white/10 rounded-none text-[10px] uppercase tracking-widest h-10 w-64">
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
                                    </div>

                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                                        {filteredProducts.map(p => {
                                            const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images
                                            const imgUrl = resolveMediaUrl(images?.[0] || "/placeholder.jpg")
                                            return (
                                                <div
                                                    key={p.id}
                                                    onClick={() => {
                                                        onUpdate(index, { image: imgUrl, product_id: p.id })
                                                        setIsOpen(false)
                                                    }}
                                                    className="group cursor-pointer space-y-2"
                                                >
                                                    <div className="relative aspect-3/4 border border-white/5 group-hover:border-white/40 transition-all overflow-hidden bg-white/5">
                                                        <Image src={imgUrl} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                                        <div className="absolute inset-0 bg-black/60 opacity-100 transition-opacity flex items-center justify-center">
                                                            <span className="text-[8px] uppercase tracking-widest">Select</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-[8px] uppercase tracking-widest text-gray-500 truncate">{p.name}</p>
                                                </div>
                                            )
                                        })}
                                        {filteredProducts.length === 0 && (
                                            <div className="col-span-full py-20 text-center border border-dashed border-white/5">
                                                <p className="text-[10px] uppercase tracking-widest text-gray-600">No pieces found in this category</p>
                                            </div>
                                        )}
                                    </div>
                                </DialogContent>
                            </Dialog>

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
                                <Button variant="outline" className="bg-white/5 border-white/10 hover:bg-white/8 hover:border-white/20 rounded-none uppercase text-[9px] tracking-widest px-6 h-10 transition-all">
                                    <Upload size={14} className="mr-2 text-gray-400" /> Custom Upload
                                </Button>
                            </div>
                        </div>

                        {slide.product_id && (
                            <div className="flex items-center gap-2 p-3 bg-white/5 border border-white/5">
                                <Check size={12} className="text-green-500" />
                                <span className="text-[9px] uppercase tracking-widest text-gray-400"> Linked to Product ID: </span>
                                <span className="text-[9px] font-mono text-gray-500">{slide.product_id}</span>
                            </div>
                        )}
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
    onToggle,
    onClear
}: {
    title: string,
    subtitle: string,
    listKey: keyof ConfigType,
    products: any[],
    selectedIds: string[],
    categories: any[],
    onToggle: (id: string, key: keyof ConfigType) => void,
    onClear: (key: keyof ConfigType) => void
}) {
    const [isPickerOpen, setIsPickerOpen] = useState(false)
    const selectedProducts = products.filter(p => selectedIds.includes(String(p.id)))

    return (
        <div className="space-y-4 pb-12 border-b border-white/5 last:border-0 pt-4">
            <div className="px-4 flex justify-between items-end mb-6">
                <div>
                    <h3 className="text-2xl md:text-3xl font-serif mb-2 uppercase tracking-[0.2em] text-[#e8e8e3]">{title}</h3>
                    <p className="text-[9px] text-gray-500 tracking-[0.4em] uppercase">{subtitle}</p>
                </div>
                <div className="flex gap-4">
                    {selectedIds.length > 0 && (
                        <Button
                            variant="ghost"
                            onClick={() => onClear(listKey)}
                            className="text-[9px] uppercase tracking-[0.2em] text-red-500/50 hover:text-red-500 hover:bg-red-500/5 rounded-none px-4 h-8"
                        >
                            Clear All
                        </Button>
                    )}
                </div>
            </div>

            <div className="flex gap-4 scrollbar-hide overflow-x-auto pb-4 px-4 custom-scrollbar scroll-smooth">
                {/* ADD BUTTON CARD */}
                <button
                    onClick={() => setIsPickerOpen(true)}
                    className="relative shrink-0 w-45 md:w-53.75 aspect-3/4 border border-dashed border-white/10 bg-white/2 hover:bg-white/5 hover:border-white/20 transition-all flex flex-col items-center justify-center gap-3 group/add"
                >
                    <div className="size-10 rounded-full border border-white/10 flex items-center justify-center group-hover/add:scale-110 transition-all">
                        <Plus className="text-gray-500 group-hover/add:text-white" size={18} strokeWidth={1} />
                    </div>
                    <span className="text-[10px] uppercase tracking-[0.3em] text-gray-500 group-hover/add:text-gray-300">Add Piece</span>
                </button>

                {selectedProducts.map(p => {
                    const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images
                    const imageUrl = resolveMediaUrl(images && images[0] ? images[0] : "/placeholder.jpg")
                    return (
                        <div
                            key={p.id}
                            className="relative shrink-0 w-45 md:w-53.75 aspect-3/4 border border-white/5 group/card"
                        >
                            <Image
                                src={imageUrl}
                                alt={p.name}
                                fill
                                className="object-cover opacity-80"
                            />
                            <div className="absolute inset-x-0 bottom-0 bg-black/80 p-4 backdrop-blur-sm border-t border-white/5">
                                <p className="text-[10px] uppercase tracking-[0.2em] font-medium truncate mb-1">{p.name}</p>
                                <p className="text-[7px] uppercase tracking-widest text-gray-500 font-mono">ID: {p.id}</p>
                            </div>
                            <button
                                onClick={() => onToggle(String(p.id), listKey)}
                                className="absolute top-4 right-4 bg-black/60 hover:bg-red-500 text-white size-7 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-all"
                            >
                                <Plus size={14} className="rotate-45" />
                            </button>
                        </div>
                    )
                })}

                {selectedIds.length === 0 && (
                    <div className="flex-1 min-w-75 flex items-center justify-center border border-white/5 bg-white/1">
                        <p className="text-[9px] uppercase tracking-[0.4em] text-gray-700 italic">No pieces currently curated in this section</p>
                    </div>
                )}
            </div>

            <ProductPickerDialog 
                isOpen={isPickerOpen}
                onOpenChange={setIsPickerOpen}
                products={products}
                categories={categories}
                selectedIds={selectedIds}
                onToggle={(id) => onToggle(String(id), listKey)}
            />
        </div>
    )
}

function ProductPickerDialog({
    isOpen,
    onOpenChange,
    products,
    categories,
    selectedIds,
    onToggle
}: {
    isOpen: boolean,
    onOpenChange: (open: boolean) => void,
    products: any[],
    categories: any[],
    selectedIds: string[],
    onToggle: (id: string) => void
}) {
    const [categoryFilter, setCategoryFilter] = useState("all")
    const filteredProducts = categoryFilter === "all"
        ? products
        : products.filter(p => p.category === categoryFilter)

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="bg-[#030303] border-white/10 text-white max-w-4xl max-h-[80vh] overflow-y-auto visible-scrollbar">
                <DialogHeader>
                    <DialogTitle className="font-serif text-2xl uppercase tracking-widest mb-6 px-4 pt-4">Select Gallery Pieces</DialogTitle>
                </DialogHeader>

                <div className="px-4 mb-6 sticky top-0 bg-[#030303] pb-4 border-b border-white/5 z-10">
                    <div className="flex items-center gap-4">
                        <Label className="text-[9px] uppercase tracking-[0.2em] text-gray-500 whitespace-nowrap">Filter By Category</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger className="bg-transparent border-white/10 rounded-none text-[10px] uppercase tracking-widest h-10 w-64">
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
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
                    {filteredProducts.map(p => {
                        const isSelected = selectedIds.includes(p.id)
                        const images = typeof p.images === 'string' ? JSON.parse(p.images) : p.images
                        const imgUrl = resolveMediaUrl(images?.[0] || "/placeholder.jpg")
                        return (
                            <div
                                key={p.id}
                                onClick={() => onToggle(p.id)}
                                className={`group cursor-pointer space-y-2 border transition-all ${isSelected ? "border-white" : "border-transparent"}`}
                            >
                                <div className="relative aspect-3/4 border border-white/5 group-hover:border-white/40 transition-all overflow-hidden bg-white/5">
                                    <Image src={imgUrl} alt={p.name} fill className="object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className={`absolute inset-0 bg-black/60 transition-opacity flex items-center justify-center ${isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}>
                                        {isSelected ? (
                                            <div className="bg-white text-black size-6 flex items-center justify-center rounded-full">
                                                <Check size={12} />
                                            </div>
                                        ) : (
                                            <span className="text-[8px] uppercase tracking-widest">Select</span>
                                        )}
                                    </div>
                                </div>
                                <div className="px-2 pb-2">
                                    <p className="text-[8px] uppercase tracking-widest text-gray-300 truncate">{p.name}</p>
                                    <p className="text-[7px] text-gray-500 tracking-widest">₹{p.price.toLocaleString()}</p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </DialogContent>
        </Dialog>
    )
}

export default function HomepageDesignPage() {
    const [API_BASE, setApiBase] = useState("")

    useEffect(() => {
        setApiBase(getApiBase())
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

    useEffect(() => {
        if (API_BASE) fetchData()
    }, [API_BASE])

    const fetchData = async () => {
        try {
            const [configRes, productsRes, catsRes] = await Promise.allSettled([
                fetch(`${API_BASE}/api/homepage`, { credentials: "include" }),
                fetch(`${API_BASE}/api/products`, { credentials: "include" }),
                fetch(`${API_BASE}/api/categories`, { credentials: "include" })
            ])

            let hasAnyFailure = false

            if (configRes.status === "fulfilled" && configRes.value.ok) {
                const data = await configRes.value.json()
                setConfig((prev) => ({ ...prev, ...data }))
            } else {
                hasAnyFailure = true
            }

            if (productsRes.status === "fulfilled" && productsRes.value.ok) {
                const data = await productsRes.value.json()
                setProducts(data)
            } else {
                hasAnyFailure = true
            }

            if (catsRes.status === "fulfilled" && catsRes.value.ok) {
                const data = await catsRes.value.json()
                setCategories(data)
            } else {
                hasAnyFailure = true
            }

            if (hasAnyFailure) {
                showToast("Some settings could not be loaded. Please retry after reload.", "info")
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
                    content: "",
                    product_id: ""
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

    const handleSlideMove = (fromIndex: number, toIndex: number) => {
        if (toIndex < 0 || toIndex >= config.hero_slides.length) return
        setConfig(prev => {
            const newSlides = [...prev.hero_slides]
            const [movedSlide] = newSlides.splice(fromIndex, 1)
            newSlides.splice(toIndex, 0, movedSlide)
            return { ...prev, hero_slides: newSlides }
        })
    }

    const handleFileUpload = async (index: number, file: File) => {
        if (!API_BASE) return
        if (file.size > 10 * 1024 * 1024) {
            showToast("File too large. Max allowed size is 10 MB.", "info")
            return
        }

        const data = new FormData()
        data.append("file", file)

        try {
            const res = await fetch(`${API_BASE}/api/upload`, {
                method: "POST",
                credentials: "include",
                body: data,
            })

            const raw = await res.text()
            let result: any = {}
            try {
                result = raw ? JSON.parse(raw) : {}
            } catch {
                result = { error: raw || "Upload failed" }
            }

            if (res.ok && result.success) {
                const nextImage = typeof result.url === "string" && result.url.startsWith("/")
                    ? `${API_BASE}${result.url}`
                    : result.url
                handleSlideUpdate(index, { image: nextImage })
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
        <div className="bg-[#030303] text-[#e8e8e3] min-h-screen relative overflow-x-hidden">
            {/* STICKY HEADER */}
            <div className="sticky top-0 z-50 bg-[#030303]/80 backdrop-blur-xl border-b border-white/5 py-8 md:py-10 mb-12">
                <div className="max-w-275 pl-10 md:pl-32 pr-8 md:pr-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-8">
                    <div>
                        <p className="uppercase tracking-[0.5em] text-[10px] text-gray-500 mb-3">Admin / Surface</p>
                        <h1 className="font-serif text-4xl md:text-5xl font-light tracking-tight">Homepage Design</h1>
                        <p className="mt-3 text-[10px] tracking-[0.3em] text-gray-500 uppercase">
                            Curate the hero carousel and homepage product rails.
                        </p>
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="bg-[#e8e8e3] text-black hover:bg-white px-10 py-7 md:py-8 uppercase tracking-widest text-xs rounded-none transition-all flex items-center gap-3 w-full md:w-auto shadow-2xl"
                        >
                            {saving ? <Loader2 className="animate-spin size-4" /> : <Save size={18} />}
                            Save Work
                        </Button>
                    </div>
                </div>
            </div>

            <div className="max-w-275 pl-10 md:pl-32 pr-8 md:pr-12 pb-24">
                <div className="space-y-16">
                    {/* HERO CAROUSEL */}
                    <div className="w-full">
                        <section className="space-y-12">
                            <div>
                                <h2 className="text-3xl font-serif mb-4 uppercase tracking-widest">Hero Carousel</h2>
                                <p className="text-[10px] text-gray-500 uppercase tracking-widest">Manage multiple high-impact editorial slides</p>
                            </div>

                            <div className="grid grid-cols-1 gap-10">
                                {config.hero_slides.map((slide, idx) => (
                                    <HeroSlideEditor
                                        key={idx}
                                        index={idx}
                                        total={config.hero_slides.length}
                                        slide={slide}
                                        products={products}
                                        categories={categories}
                                        onUpdate={handleSlideUpdate}
                                        onRemove={handleRemoveSlide}
                                        onUpload={handleFileUpload}
                                        onMove={handleSlideMove}
                                    />
                                ))}

                                <button
                                    onClick={handleAddSlide}
                                    className="w-full flex flex-col items-center justify-center p-8 border border-dashed border-white/10 bg-white/1 hover:bg-white/3 hover:border-white/20 transition-all group/add-card"
                                >
                                    <div className="size-12 rounded-full border border-white/10 flex items-center justify-center mb-4 group-hover/add-card:scale-110 transition-all">
                                        <Plus className="text-gray-500 group-hover/add-card:text-[#e8e8e3]" size={24} strokeWidth={1} />
                                    </div>
                                    <h3 className="font-serif text-xl uppercase tracking-widest text-gray-500 group-hover/add-card:text-[#e8e8e3]">Add Hero Slide</h3>
                                    <p className="text-[8px] uppercase tracking-[0.4em] text-gray-600 mt-2 group-hover/add-card:text-gray-400">Recommended size: 2564 x 1440px</p>
                                </button>
                            </div>
                        </section>
                    </div>

                    {/* GALLERY CURATION */}
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
                            onToggle={toggleProductSelection}
                            onClear={clearSelection}
                        />
                    </div>
                </div>

                <div className="mt-24 pt-12 border-t border-white/10 flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[#e8e8e3] text-black hover:bg-white px-12 py-8 uppercase tracking-widest text-xs rounded-none transition-all flex items-center gap-3 w-full md:w-auto shadow-2xl"
                    >
                        {saving ? <Loader2 className="animate-spin size-4" /> : <Save size={18} />}
                        Save Work
                    </Button>
                </div>
            </div>

            <style jsx global>{`
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
                .visible-scrollbar::-webkit-scrollbar {
                    display: block;
                    width: 4px;
                }
                .visible-scrollbar::-webkit-scrollbar-track {
                    background: rgba(255, 255, 255, 0.05);
                }
                .visible-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(255, 255, 255, 0.2);
                    border-radius: 10px;
                }
                .visible-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(255, 255, 255, 0.3);
                }
                .visible-scrollbar {
                    -ms-overflow-style: auto;
                    scrollbar-width: thin;
                }
            `}</style>
        </div>
    )
}
