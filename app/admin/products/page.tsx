"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Plus, X, Loader2, Upload, Link as LinkIcon, Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/lib/toast-context"

const getSizesForCategory = (categoryName: string) => {
  const cat = categoryName.toLowerCase();
  
  if (cat.includes("shirt") || cat.includes("top") || cat.includes("basics") || cat.includes("knitwear") || cat.includes("clothing")) {
    return ["XS", "S", "M", "L", "XL", "2XL", "3XL"];
  }
  if (cat.includes("saree") || cat.includes("traditional")) {
    return ["Free Size", "5.5m", "6.3m"];
  }
  if (cat.includes("purse") || cat.includes("bag") || cat.includes("handbag")) {
    return ["Small", "Medium", "Large", "Tote", "Oversized", "Clutch"];
  }
  if (cat.includes("trouser") || cat.includes("pant") || cat.includes("jeans") || cat.includes("bottom")) {
    return ["28", "30", "32", "34", "36", "38", "40"];
  }
  if (cat.includes("shoe") || cat.includes("footwear")) {
    return ["IND 6", "IND 7", "IND 8", "IND 9", "IND 10", "IND 11", "IND 12"];
  }
  
  return ["XS", "S", "M", "L", "XL", "2XL", "One Size"]; // Default fallback
}

type Category = {
  id: string
  name: string
  subcategories: string[]
}

export default function ProductsPage() {
  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5000`

  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { showToast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    subcategory: "",
    description: "",
    images: ["", "", ""],
    sizes: [] as string[],
    stock: "10",
    featured: false,
    newArrival: false,
    bestseller: false,
    fabric: "",
    care: "",
    gender: "Unisex",
    sizeGuideImage: "",
    notifyUsers: false,
  })

  useEffect(() => {
    if (API_BASE) {
      fetchProducts()
      fetchCategories()
    }
  }, [API_BASE])

  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/products`)
      if (res.ok) {
        const data = await res.json()
        setProducts(data)
      }
    } catch (err) {
      console.error("Failed to fetch products:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/categories`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleImageChange = (index: number, value: string) => {
    const newImages = [...formData.images]
    newImages[index] = value
    setFormData(prev => ({ ...prev, images: newImages }))
  }

  const toggleSize = (size: string) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.includes(size)
        ? prev.sizes.filter(s => s !== size)
        : [...prev.sizes, size]
    }))
  }

  const handleFileUpload = async (index: number, file: File) => {
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
        handleImageChange(index, result.url)
        showToast("Image uploaded", "info")
      } else {
        showToast(result.error || "Upload failed", "info")
      }
    } catch {
      showToast("Upload error", "info")
    }
  }
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return

    try {
      const res = await fetch(`${API_BASE}/api/products/${id}`, {
        method: "DELETE",
        credentials: "include",
      })

      if (res.ok) {
        showToast("Product deleted", "info")
        fetchProducts()
      } else {
        const data = await res.json()
        showToast(data.error || "Failed to delete", "info")
      }
    } catch {
      showToast("Network error", "info")
    }
  }

  const handleEditProduct = (product: any) => {
    // Robustly handle images which might be JSON strings or arrays
    const images = (() => {
      if (Array.isArray(product.images)) return product.images
      try {
        const parsed = JSON.parse(product.images)
        return Array.isArray(parsed) ? (parsed.length > 0 ? parsed : ["", "", ""]) : [product.images]
      } catch {
        return [product.images]
      }
    })()

    // Pad images to at least 3
    const paddedImages = [...images]
    while (paddedImages.length < 3) paddedImages.push("")

    // Handle sizes
    const sizes = (() => {
      if (Array.isArray(product.sizes)) return product.sizes
      try {
        const parsed = JSON.parse(product.sizes)
        return Array.isArray(parsed) ? parsed : []
      } catch {
        return []
      }
    })()

    setFormData({
      name: product.name || "",
      price: product.price?.toString() || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      description: product.description || "",
      images: paddedImages,
      sizes: sizes,
      stock: product.stock?.toString() || "0",
      featured: product.is_featured || false,
      newArrival: product.is_new || false,
      bestseller: product.is_bestseller || false,
      fabric: product.fabric || "",
      care: product.care || "",
      gender: product.gender || "Unisex",
      sizeGuideImage: product.sizeGuideImage || "",
      notifyUsers: false,
    })
    setEditingProduct(product)
    setDialogOpen(true)
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)

    const filteredImages = formData.images.filter(img => img.trim() !== "")
    if (filteredImages.length === 0) {
      showToast("At least one image is required", "info")
      setIsAdding(false)
      return
    }

    try {
      const url = editingProduct
        ? `${API_BASE}/api/products/${editingProduct.id}`
        : `${API_BASE}/api/products`
      const method = editingProduct ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          notify_users: formData.notifyUsers,
          images: filteredImages,
        }),
      })

      if (res.ok) {
        showToast(editingProduct ? "Product updated successfully" : "Product added successfully", "info")
        setDialogOpen(false)
        setEditingProduct(null)
        fetchProducts()
        setFormData({
          name: "",
          price: "",
          category: "",
          subcategory: "",
          description: "",
          images: ["", "", ""],
          sizes: [],
          stock: "10",
          featured: false,
          newArrival: false,
          bestseller: false,
          fabric: "",
          care: "",
          gender: "Unisex",
          sizeGuideImage: "",
          notifyUsers: false,
        })
      } else {
        const data = await res.json()
        showToast(data.error || "Failed to save product", "info")
      }
    } catch (err) {
      showToast("Network error", "info")
    } finally {
      setIsAdding(false)
    }
  }

  const getImageUrl = (images: any) => {
    let url = ""
    if (Array.isArray(images)) {
      url = images[0]
    } else {
      try {
        const parsed = JSON.parse(images)
        url = Array.isArray(parsed) ? parsed[0] : images
      } catch {
        url = images
      }
    }
    if (!url) return "/placeholder.jpg"
    if (url.startsWith("http") || url.startsWith("data:")) return url
    if (!url.startsWith("/")) return `/${url}`
    return url
  }

  const selectedCategoryData = categories.find(c => c.name === formData.category)

  const filteredProductsList = products.filter(p => {
    const term = searchTerm.toLowerCase()
    const matchesSearch =
      p.name?.toLowerCase().includes(term) ||
      p.category?.toLowerCase().includes(term) ||
      p.subcategory?.toLowerCase().includes(term) ||
      String(p.id).toLowerCase().includes(term)

    const matchesCategory = categoryFilter === "all" || p.category === categoryFilter
    return matchesSearch && matchesCategory
  })

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-8 py-16">
      <div className="max-w-[1400px] mx-auto mb-20 flex justify-between items-end">
        <div>
          <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4">Admin</p>
          <h1 className="font-serif text-5xl font-light">
            Total Products: <span className="text-xl opacity-50" style={{ fontFamily: 'Times New Roman, serif' }}>({products.length})</span>
          </h1>
          <p className="mt-4 text-sm tracking-widest text-gray-500">
            Editorial product catalog Management.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingProduct(null)
            setFormData({
              name: "",
              price: "",
              category: "",
              subcategory: "",
              description: "",
              images: ["", "", ""],
              sizes: [],
              stock: "10",
              featured: false,
              newArrival: false,
              bestseller: false,
              fabric: "",
              care: "",
              gender: "Unisex",
              sizeGuideImage: "",
              notifyUsers: false,
            })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-white hover:text-black px-8 py-6 uppercase tracking-widest text-xs transition-all rounded-none">
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0a0a0a] border-white/10 text-white max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-3xl font-light tracking-widest uppercase">
                {editingProduct ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription className="text-gray-500 text-xs tracking-widest uppercase">
                Fill in the details below to {editingProduct ? "update" : "add"} a product in the catalog.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleAddProduct} className="space-y-12 py-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                {/* Left Column: Basic Details */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-2">Basic Details</p>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-gray-400">Product Name</Label>
                        <Input
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          required
                          className="bg-transparent border-white/10 focus:border-white/30 rounded-none h-12"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-gray-400">Price (INR)</Label>
                          <Input
                            name="price"
                            type="number"
                            value={formData.price}
                            onChange={handleInputChange}
                            required
                            className="bg-transparent border-white/10 focus:border-white/30 rounded-none h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-gray-400">Stock</Label>
                          <Input
                            name="stock"
                            type="number"
                            value={formData.stock}
                            onChange={handleInputChange}
                            required
                            className="bg-transparent border-white/10 focus:border-white/30 rounded-none h-12"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-gray-400">Gender</Label>
                          <Select
                            value={formData.gender}
                            onValueChange={(v) => setFormData(p => ({ ...p, gender: v }))}
                          >
                            <SelectTrigger className="bg-transparent border-white/10 focus:border-white/30 rounded-none h-12">
                              <SelectValue placeholder="Select" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                              <SelectItem value="Men">Men</SelectItem>
                              <SelectItem value="Women">Women</SelectItem>
                              <SelectItem value="Unisex">Unisex</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-2">Classification</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-gray-400">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(v) => {
                            const allowedForNewCategory = getSizesForCategory(v)
                            setFormData((p) => ({
                              ...p,
                              category: v,
                              subcategory: "",
                              // Keep only sizes valid for the newly selected category.
                              sizes: p.sizes.filter((s) => allowedForNewCategory.includes(s)),
                            }))
                          }}
                        >
                          <SelectTrigger className="bg-transparent border-white/10 focus:border-white/30 rounded-none h-12">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                            {categories.map(c => (
                              <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-gray-400">Subcategory</Label>
                        <Select
                          value={formData.subcategory}
                          onValueChange={(v) => setFormData(p => ({ ...p, subcategory: v }))}
                          disabled={!formData.category}
                        >
                          <SelectTrigger className="bg-transparent border-white/10 focus:border-white/30 rounded-none h-12 disabled:opacity-30">
                            <SelectValue placeholder="Select" />
                          </SelectTrigger>
                          <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
                            {selectedCategoryData?.subcategories.map(s => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-gray-400">Description</Label>
                    <Textarea
                      name="description"
                      value={formData.description}
                      onChange={handleInputChange}
                      required
                      className="bg-transparent border-white/10 focus:border-white/30 rounded-none min-h-[120px]"
                    />
                  </div>
                </div>

                {/* Right Column: Imagery & Variants */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-2">Imagery</p>
                    <div className="space-y-6">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="space-y-3 p-4 border border-white/5 hover:bg-white/[0.02] transition-all">
                          <div className="flex justify-between items-center">
                            <Label className="text-[10px] uppercase tracking-widest text-gray-500">Image {idx + 1} {idx === 0 && "(Primary)"}</Label>
                            {img && (
                              <button type="button" onClick={() => handleImageChange(idx, "")} className="text-gray-600 hover:text-white">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          <div className="flex gap-4">
                            <div className="relative w-16 h-20 bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden">
                              {img ? (
                                <Image src={getImageUrl(img)} alt="Preview" fill className="object-cover" />
                              ) : (
                                <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                                  <Upload size={16} />
                                </div>
                              )}
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex gap-2">
                                <div className="relative flex-1">
                                  <LinkIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                                  <Input
                                    value={img}
                                    onChange={(e) => handleImageChange(idx, e.target.value)}
                                    placeholder="Paste image URL..."
                                    className="bg-transparent border-white/10 h-10 pl-9 text-xs rounded-none"
                                  />
                                </div>
                                <div className="relative">
                                  <Input
                                    type="file"
                                    accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp,.tiff,.jfif"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) handleFileUpload(idx, file)
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-10"
                                  />
                                  <Button type="button" variant="outline" size="icon" className="h-10 w-10 bg-white/5 border-white/10 hover:bg-white/10 rounded-none">
                                    <Upload size={14} />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-[10px] uppercase tracking-widest text-gray-600 hover:text-white"
                        onClick={() => setFormData(prev => ({ ...prev, images: [...prev.images, ""] }))}
                      >
                        <Plus size={12} className="mr-2" /> Add More Image
                      </Button>
                    </div>

                    {/* Size Guide Image */}
                    <div className="pt-6 border-t border-white/5 space-y-4">
                      <div className="flex justify-between items-center">
                        <Label className="text-[10px] uppercase tracking-[0.3em] text-amber-500">Product Size Guide Image</Label>
                        {formData.sizeGuideImage && (
                          <button type="button" onClick={() => setFormData(p => ({ ...p, sizeGuideImage: "" }))} className="text-gray-600 hover:text-white">
                            <X size={12} />
                          </button>
                        )}
                      </div>
                      <div className="flex gap-4 p-4 border border-amber-500/10 bg-amber-500/[0.02] hover:bg-amber-500/[0.04] transition-all">
                        <div className="relative w-16 h-20 bg-white/5 border border-white/10 flex-shrink-0 overflow-hidden">
                          {formData.sizeGuideImage ? (
                            <Image src={getImageUrl(formData.sizeGuideImage)} alt="Size Guide" fill className="object-cover" />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-gray-700">
                              <Upload size={16} />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex gap-2">
                            <div className="relative flex-1">
                              <LinkIcon size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-600" />
                              <Input
                                value={formData.sizeGuideImage}
                                onChange={(e) => setFormData(p => ({ ...p, sizeGuideImage: e.target.value }))}
                                placeholder="Size guide URL..."
                                className="bg-transparent border-white/10 h-10 pl-9 text-xs rounded-none"
                              />
                            </div>
                            <div className="relative">
                              <Input
                                type="file"
                                accept="image/*"
                                onChange={async (e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
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
                                        setFormData(p => ({ ...p, sizeGuideImage: result.url }))
                                        showToast("Size guide uploaded", "info")
                                      }
                                    } catch {
                                      showToast("Upload error", "info")
                                    }
                                  }
                                }}
                                className="absolute inset-0 opacity-0 cursor-pointer w-10"
                              />
                              <Button type="button" variant="outline" size="icon" className="h-10 w-10 bg-white/5 border-white/10 hover:bg-white/10 rounded-none">
                                <Upload size={14} />
                              </Button>
                            </div>
                          </div>
                          <p className="text-[8px] text-gray-500 uppercase tracking-widest">Recommended for shoes or fitted apparel.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-2">Attributes</p>
                    <div className="grid grid-cols-3 gap-4">
                      {[
                        { label: "Featured", key: "featured" },
                        { label: "New", key: "newArrival" },
                        { label: "Best", key: "bestseller" }
                      ].map(item => (
                        <div key={item.key} className="flex flex-col items-center gap-3 p-3 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all">
                          <Label className="text-[8px] uppercase tracking-widest text-gray-500">{item.label}</Label>
                          <Switch
                            checked={(formData as any)[item.key]}
                            onCheckedChange={(v) => setFormData(p => ({ ...p, [item.key]: v }))}
                            className="data-[state=checked]:bg-emerald-500/80 border border-white/10"
                          />
                        </div>
                      ))}
                      <div className="flex flex-col items-center gap-3 p-3 border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all col-span-3">
                        <Label className="text-[8px] uppercase tracking-widest text-[#e8e8e3]">Notify Users via Email</Label>
                        <div className="flex items-center gap-4">
                          <span className="text-[10px] text-gray-500 uppercase tracking-tighter">Off</span>
                          <Switch
                            checked={formData.notifyUsers}
                            onCheckedChange={(v) => setFormData(p => ({ ...p, notifyUsers: v }))}
                            className="data-[state=checked]:bg-emerald-500/80 border border-white/10"
                          />
                          <span className="text-[10px] text-gray-500 uppercase tracking-tighter">On</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-2">
                      Available Sizes for {formData.category || "Selected Category"}
                    </p>
                    {formData.category ? (
                      <div className="flex flex-wrap gap-2">
                        {getSizesForCategory(formData.category).map(size => (
                          <button
                            key={size}
                            type="button"
                            onClick={() => toggleSize(size)}
                            className={`px-4 py-2 text-[10px] uppercase tracking-widest border transition-all ${formData.sizes.includes(size)
                              ? "bg-[#e8e8e3] text-black border-[#e8e8e3]"
                              : "border-white/20 text-gray-500 hover:text-white hover:border-white/40"
                              }`}
                          >
                            {size}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[10px] text-gray-600 italic tracking-widest">
                        Please select a category first to view specific sizes.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-12 border-t border-white/5">
                <Button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-[#e8e8e3] text-black hover:bg-gray-200 uppercase tracking-widest text-xs py-8 rounded-none transition-all"
                >
                  {isAdding ? <Loader2 className="animate-spin" /> : editingProduct ? "Update Catalog Item" : "Publish to Catalog"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filter Bar */}
      <div className="max-w-[1400px] mx-auto mb-12 flex flex-col md:flex-row gap-8 items-end justify-between border-t border-white/5 pt-12">
        <div className="space-y-4 w-full md:w-96">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Search Catalog</p>
          <div className="relative group">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-white transition-colors" />
            <Input
              placeholder="Query by name, id or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-white/10 pl-11 h-12 uppercase tracking-widest text-[10px] rounded-none focus:border-white/30"
            />
          </div>
        </div>

        <div className="space-y-4 w-full md:w-64">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500">Filter Category</p>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="bg-transparent border-white/10 h-12 uppercase tracking-widest text-[10px] rounded-none focus:border-white/30">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent className="bg-[#0a0a0a] border-white/10 text-white">
              <SelectItem value="all" className="uppercase tracking-widest text-[10px]">View All Items</SelectItem>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.name} className="uppercase tracking-widest text-[10px]">{c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto border border-white/10 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {["Product", "Category", "Price", "Tags", "Stock", ""].map(h => (
                <th key={h} className="px-8 py-6 text-left uppercase tracking-widest text-xs text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-8 py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-gray-500" />
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Retrieving Catalog...</p>
                  </div>
                </td>
              </tr>
            ) : filteredProductsList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-8 py-24 text-center">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">No matching pieces available in catalog.</p>
                </td>
              </tr>
            ) : filteredProductsList.map((p, i) => (
              <tr key={p.id} className={`border-b border-white/5 hover:bg-white/[0.04] ${i % 2 === 0 ? "bg-white/[0.02]" : ""}`}>
                <td className="px-8 py-6 flex items-center gap-6">
                  <div className="relative w-16 h-20 bg-white/5">
                    <Image src={getImageUrl(p.images)} alt={p.name} fill className="object-cover opacity-80" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{p.name}</p>
                    <p className="text-[10px] tracking-[0.3em] text-gray-600 uppercase mt-1">ID {String(p.id).slice(-6)}</p>
                  </div>
                </td>
                <td className="px-8 py-6 text-xs tracking-widest">
                  {p.category}
                  {p.subcategory && <span className="text-gray-600 block text-[9px] mt-1 italic">{p.subcategory}</span>}
                </td>
                <td className="px-8 py-6 font-mono text-xs">₹{p.price.toLocaleString('en-IN')}</td>
                <td className="px-8 py-6 text-[10px] tracking-widest text-gray-500 uppercase">
                  {[p.is_featured && "Featured", p.is_new && "New", p.is_bestseller && "Best"].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-8 py-6 text-[10px] tracking-widest uppercase">
                  {p.stock > 0 ? <span className="text-white">In Stock ({p.stock})</span> : <span className="text-red-500/60">Sold Out</span>}
                </td>
                <td className="px-8 py-6 text-right space-x-4">
                  <button onClick={() => handleEditProduct(p)} className="uppercase tracking-widest text-[10px] text-gray-400 hover:text-white transition-colors">
                    Edit
                  </button>
                  <button onClick={() => handleDeleteProduct(p.id)} className="uppercase tracking-widest text-[10px] text-red-400/40 hover:text-red-400 transition-colors">
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
