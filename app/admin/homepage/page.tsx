"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, Image as ImageIcon, Plus, X, Upload } from "lucide-react"
import { useToast } from "@/lib/toast-context"
import Image from "next/image"

export default function HomepageDesignPage() {
    const [API_BASE, setApiBase] = useState("")

    useEffect(() => {
        setApiBase(`http://${window.location.hostname}:5000`)
    }, [])

    const [config, setConfig] = useState({
        hero_image: "",
        hero_subtitle: "",
        hero_title_1: "",
        hero_title_2: "",
        hero_cta_text: "",
        hero_cta_link: "",
        manifesto_text: "",
        featured_product_ids: [] as string[]
    })
    const [products, setProducts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const { showToast } = useToast()

    useEffect(() => {
        if (API_BASE) fetchData()
    }, [API_BASE])

    const fetchData = async () => {
        try {
            const [configRes, productsRes] = await Promise.all([
                fetch(`${API_BASE}/api/homepage`),
                fetch(`${API_BASE}/api/products`)
            ])

            if (configRes.ok) {
                const data = await configRes.json()
                setConfig(prev => ({ ...prev, ...data }))
            }

            if (productsRes.ok) {
                const data = await productsRes.json()
                setProducts(data)
            }
        } catch (err) {
            console.error("Failed to fetch data:", err)
            showToast("Failed to load settings", "info")
        } finally {
            setLoading(false)
        }
    }

    const handleFileUpload = async (file: File) => {
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
                setConfig(prev => ({ ...prev, hero_image: result.url }))
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

    const toggleProductSelection = (id: string) => {
        setConfig(prev => {
            const ids = [...prev.featured_product_ids]
            if (ids.includes(id)) {
                return { ...prev, featured_product_ids: ids.filter(i => i !== id) }
            } else {
                // Limit to 3 for the horizontal scroll for better UX? Or let user decide. 
                // Let's allow up to 6.
                if (ids.length >= 6) {
                    showToast("Max 6 products for runway", "info")
                    return prev
                }
                return { ...prev, featured_product_ids: [...ids, id] }
            }
        })
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
        <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-8 py-16">
            <div className="max-w-[1200px] mx-auto">
                <div className="flex justify-between items-end mb-16 pb-12 border-b border-white/5">
                    <div>
                        <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4">Admin / Surface</p>
                        <h1 className="font-serif text-5xl font-light">Homepage Design</h1>
                        <p className="mt-4 text-sm tracking-widest text-gray-500">
                            Curate the primary editorial narrative and visual assembly.
                        </p>
                    </div>
                    <Button
                        onClick={handleSave}
                        disabled={saving}
                        className="bg-[#e8e8e3] text-black hover:bg-white px-10 py-6 uppercase tracking-widest text-xs rounded-none transition-all flex items-center gap-2"
                    >
                        {saving ? <Loader2 className="animate-spin size-4" /> : <Save size={16} />}
                        Synchronize Narrative
                    </Button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-20">
                    {/* HERO CONFIG */}
                    <section className="space-y-12">
                        <div>
                            <h2 className="text-2xl font-serif mb-8 border-l-2 border-[#e8e8e3] pl-6">Hero Narrative</h2>
                            <div className="space-y-6 bg-white/[0.02] p-8 border border-white/5">
                                <div className="space-y-3">
                                    <Label className="text-[10px] uppercase tracking-widest text-gray-500">Background Imagery URL</Label>
                                    <div className="flex gap-4">
                                        <div className="relative size-16 bg-white/5 border border-white/10 flex-shrink-0">
                                            {config.hero_image ? (
                                                <Image src={config.hero_image} alt="Hero" fill className="object-cover" />
                                            ) : (
                                                <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                                                    <ImageIcon size={20} />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="flex gap-2">
                                                <Input
                                                    value={config.hero_image}
                                                    onChange={(e) => setConfig(prev => ({ ...prev, hero_image: e.target.value }))}
                                                    placeholder="Enter imagery URL..."
                                                    className="bg-transparent border-white/10 h-16 rounded-none text-xs flex-1"
                                                />
                                                <div className="relative">
                                                    <Input
                                                        type="file"
                                                        accept="image/*"
                                                        onChange={(e) => {
                                                            const file = e.target.files?.[0]
                                                            if (file) handleFileUpload(file)
                                                        }}
                                                        className="absolute inset-0 opacity-0 cursor-pointer w-16 h-16"
                                                    />
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className="h-16 w-16 bg-white/5 border-white/10 hover:bg-white/10 rounded-none flex items-center justify-center p-0"
                                                    >
                                                        <Upload size={16} />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] uppercase tracking-widest text-gray-500">Season Subtitle</Label>
                                        <Input
                                            value={config.hero_subtitle}
                                            onChange={(e) => setConfig(prev => ({ ...prev, hero_subtitle: e.target.value }))}
                                            placeholder="e.g. Fall Winter 2025"
                                            className="bg-transparent border-white/10 h-12 rounded-none text-xs"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] uppercase tracking-widest text-gray-500">CTA Button Text</Label>
                                        <Input
                                            value={config.hero_cta_text}
                                            onChange={(e) => setConfig(prev => ({ ...prev, hero_cta_text: e.target.value }))}
                                            placeholder="e.g. View Lookbook"
                                            className="bg-transparent border-white/10 h-12 rounded-none text-xs"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-3">
                                        <Label className="text-[10px] uppercase tracking-widest text-gray-500">Editorial Title Part 1</Label>
                                        <Input
                                            value={config.hero_title_1}
                                            onChange={(e) => setConfig(prev => ({ ...prev, hero_title_1: e.target.value }))}
                                            placeholder="e.g. ETHEREAL"
                                            className="bg-transparent border-white/10 h-12 rounded-none text-xs"
                                        />
                                    </div>
                                    <div className="space-y-3">
                                        <Label className="text-[10px] uppercase tracking-widest text-gray-500">Editorial Title Part 2</Label>
                                        <Input
                                            value={config.hero_title_2}
                                            onChange={(e) => setConfig(prev => ({ ...prev, hero_title_2: e.target.value }))}
                                            placeholder="e.g. SHADOWS"
                                            className="bg-transparent border-white/10 h-12 rounded-none text-xs"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* MANIFESTO */}
                        <div>
                            <h2 className="text-2xl font-serif mb-8 border-l-2 border-[#e8e8e3] pl-6">Manifesto Text</h2>
                            <div className="bg-white/[0.02] p-8 border border-white/5 space-y-4">
                                <p className="text-[10px] uppercase tracking-widest text-gray-500">Editorial Script</p>
                                <Textarea
                                    value={config.manifesto_text}
                                    onChange={(e) => setConfig(prev => ({ ...prev, manifesto_text: e.target.value }))}
                                    className="bg-transparent border-white/10 min-h-[200px] rounded-none text-sm leading-relaxed tracking-wider placeholder:text-gray-800"
                                    placeholder="The philosophy of the house..."
                                />
                            </div>
                        </div>
                    </section>

                    {/* RUNWAY CONFIG */}
                    <section className="space-y-12">
                        <div>
                            <h2 className="text-2xl font-serif mb-8 border-l-2 border-[#e8e8e3] pl-6">Runway Assembly</h2>
                            <p className="text-xs text-gray-500 mb-8 tracking-widest leading-relaxed">
                                Select specific pieces to be featured in the horizontal runway progression. Max 6 items recommended.
                            </p>

                            <div className="grid grid-cols-2 gap-4 max-h-[700px] overflow-y-auto pr-4 custom-scrollbar">
                                {products.map(p => {
                                    const isSelected = config.featured_product_ids.includes(p.id)
                                    const imageUrl = p.images ? (typeof p.images === 'string' ? JSON.parse(p.images)[0] : p.images[0]) : ''

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => toggleProductSelection(p.id)}
                                            className={`relative aspect-[3/4] cursor-pointer transition-all border group ${isSelected ? 'border-[#e8e8e3]' : 'border-white/5 hover:border-white/20'}`}
                                        >
                                            <Image
                                                src={imageUrl.startsWith('http') ? imageUrl : `${imageUrl}`}
                                                alt={p.name}
                                                fill
                                                className={`object-cover transition-all ${isSelected ? 'opacity-90' : 'opacity-40 group-hover:opacity-60'}`}
                                            />
                                            <div className="absolute inset-x-0 bottom-0 bg-black/80 p-3 backdrop-blur-sm">
                                                <p className="text-[9px] uppercase tracking-widest font-medium truncate">{p.name}</p>
                                                <p className="text-[8px] text-gray-500 mt-1 uppercase tracking-widest">{p.category}</p>
                                            </div>
                                            {isSelected && (
                                                <div className="absolute top-3 right-3 bg-[#e8e8e3] text-black size-5 flex items-center justify-center rounded-full shadow-lg">
                                                    <Save size={10} />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
