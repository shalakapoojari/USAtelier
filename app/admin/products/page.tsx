"use client"

import { useState, useEffect } from "react"
import Image from "next/image"
import { Plus, X, Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/lib/toast-context"

const API_BASE = "http://127.0.0.1:5000"

const AVAILABLE_SIZES = ["XS", "S", "M", "L", "XL", "2XL", "One Size"]

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    name: "",
    price: "",
    category: "",
    description: "",
    images: ["", "", ""],
    sizes: [] as string[],
    stock: "100",
    featured: false,
    newArrival: false,
    bestseller: false,
    fabric: "",
    care: "",
  })

  useEffect(() => {
    fetchProducts()
  }, [])

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
    const formData = new FormData()
    formData.append("file", file)

    try {
      const res = await fetch(`${API_BASE}/api/upload`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })
      const data = await res.json()
      if (res.ok && data.success) {
        handleImageChange(index, data.url)
        showToast("Image uploaded", "info")
      } else {
        showToast(data.error || "Upload failed", "info")
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

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsAdding(true)

    // Clean images array
    const filteredImages = formData.images.filter(img => img.trim() !== "")
    if (filteredImages.length === 0) {
      showToast("At least one image URL is required", "info")
      setIsAdding(false)
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/products`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          ...formData,
          images: filteredImages,
        }),
      })

      if (res.ok) {
        showToast("Product added successfully", "info")
        setDialogOpen(false)
        fetchProducts()
        // Reset form
        setFormData({
          name: "",
          price: "",
          category: "",
          description: "",
          images: ["", "", ""],
          sizes: [],
          stock: "100",
          featured: false,
          newArrival: false,
          bestseller: false,
          fabric: "",
          care: "",
        })
      } else {
        const data = await res.json()
        showToast(data.error || "Failed to add product", "info")
      }
    } catch (err) {
      showToast("Network error", "info")
    } finally {
      setIsAdding(false)
    }
  }

  // Robustly handle image paths
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

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-8 py-16">
      {/* HEADER */}
      <div className="max-w-[1400px] mx-auto mb-20 flex justify-between items-end">
        <div>
          <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4">
            Admin
          </p>
          <h1 className="font-serif text-5xl font-light">
            Products
          </h1>
          <p className="mt-4 text-sm tracking-widest text-gray-500">
            Editorial product catalog Management.
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="border border-white/40 bg-transparent px-8 py-6 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all rounded-none">
              Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-[#0a0a0a] border-white/10 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="font-serif text-3xl font-light tracking-widest uppercase">Add New Product</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleAddProduct} className="space-y-8 py-4">
              {/* Basic Info */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-2">Basic Details</p>
                <div className="grid grid-cols-2 gap-4">
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
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-gray-400">Category</Label>
                    <Input
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      required
                      placeholder="e.g. Knitwear, Trousers"
                      className="bg-transparent border-white/10 focus:border-white/30 rounded-none h-12"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] uppercase tracking-widest text-gray-400">Stock Quantity</Label>
                    <Input
                      name="stock"
                      type="number"
                      value={formData.stock}
                      onChange={handleInputChange}
                      className="bg-transparent border-white/10 focus:border-white/30 rounded-none h-12"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] uppercase tracking-widest text-gray-400">Description</Label>
                  <Textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    required
                    className="bg-transparent border-white/10 focus:border-white/30 rounded-none min-h-[100px]"
                  />
                </div>
              </div>

              {/* Images */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-2">Product Imagery (URLs)</p>
                <div className="space-y-3">
                  {formData.images.map((img, idx) => (
                    <div key={idx} className="space-y-1">
                      <Label className="text-[10px] uppercase tracking-widest text-gray-500">Image {idx + 1} {idx === 0 && "(Cover)"}</Label>
                      <div className="flex gap-2">
                        <Input
                          value={img}
                          onChange={(e) => handleImageChange(idx, e.target.value)}
                          placeholder="/uploads/filename.jpg"
                          className="bg-transparent border-white/10 focus:border-white/30 rounded-none h-10 flex-1"
                        />
                        <div className="relative">
                          <Input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) handleFileUpload(idx, file)
                            }}
                            className="absolute inset-0 opacity-0 cursor-pointer w-10"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="bg-white/5 border-white/10 hover:bg-white/10 w-10 h-10 p-0"
                          >
                            <Plus size={14} />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-[10px] uppercase tracking-widest text-gray-500 hover:text-white"
                    onClick={() => setFormData(prev => ({ ...prev, images: [...prev.images, ""] }))}
                  >
                    <Plus size={12} className="mr-2" /> Add More Image Slot
                  </Button>
                </div>
              </div>

              {/* Sizes */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-2">Available Sizes</p>
                <div className="flex flex-wrap gap-4">
                  {AVAILABLE_SIZES.map(size => (
                    <div key={size} className="flex items-center space-x-2">
                      <Checkbox
                        id={`size-${size}`}
                        checked={formData.sizes.includes(size)}
                        onCheckedChange={() => toggleSize(size)}
                        className="border-white/20 data-[state=checked]:bg-white data-[state=checked]:text-black"
                      />
                      <Label htmlFor={`size-${size}`} className="text-xs tracking-widest cursor-pointer uppercase">{size}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attributes */}
              <div className="space-y-4">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-2">Product Status</p>
                <div className="grid grid-cols-3 gap-6">
                  <div className="flex items-center justify-between p-3 border border-white/5">
                    <Label className="text-[10px] uppercase tracking-widest text-gray-400">Featured</Label>
                    <Switch
                      checked={formData.featured}
                      onCheckedChange={(v) => setFormData(p => ({ ...p, featured: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border border-white/5">
                    <Label className="text-[10px] uppercase tracking-widest text-gray-400">New</Label>
                    <Switch
                      checked={formData.newArrival}
                      onCheckedChange={(v) => setFormData(p => ({ ...p, newArrival: v }))}
                    />
                  </div>
                  <div className="flex items-center justify-between p-3 border border-white/5">
                    <Label className="text-[10px] uppercase tracking-widest text-gray-400">Bestseller</Label>
                    <Switch
                      checked={formData.bestseller}
                      onCheckedChange={(v) => setFormData(p => ({ ...p, bestseller: v }))}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-8">
                <Button
                  type="submit"
                  disabled={isAdding}
                  className="w-full bg-white text-black hover:bg-gray-200 uppercase tracking-widest text-xs py-6 rounded-none"
                >
                  {isAdding ? <Loader2 className="animate-spin" /> : "Publish Product"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* TABLE */}
      <div className="max-w-[1400px] mx-auto border border-white/10 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {["Product", "Category", "Price", "Tags", "Status", ""].map(h => (
                <th
                  key={h}
                  className="px-8 py-6 text-left uppercase tracking-widest text-xs text-gray-500"
                >
                  {h}
                </th>
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
            ) : products.map((p, i) => (
              <tr
                key={p.id}
                className={`border-b border-white/5 hover:bg-white/[0.04] ${i % 2 === 0 ? "bg-white/[0.02]" : ""
                  }`}
              >
                <td className="px-8 py-6 flex items-center gap-6">
                  <div className="relative w-16 h-20 bg-white/5">
                    <Image
                      src={getImageUrl(p.images) || "/placeholder.jpg"}
                      alt={p.name}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div>
                    <p className="font-medium">{p.name}</p>
                    <p className="text-xs tracking-widest text-gray-500">
                      ID {p.id}
                    </p>
                  </div>
                </td>

                <td className="px-8 py-6 text-sm">{p.category}</td>
                <td className="px-8 py-6 font-medium">₹{p.price.toLocaleString('en-IN')}</td>

                <td className="px-8 py-6 text-xs tracking-widest text-gray-500">
                  {[p.is_featured && "Featured", p.is_new && "New", p.is_bestseller && "Bestseller"]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>

                <td className="px-8 py-6 text-xs tracking-widest">
                  {p.stock > 0 ? "In Stock" : "Out of Stock"}
                </td>

                <td className="px-8 py-6 text-right flex justify-end gap-4">
                  <button className="uppercase tracking-widest text-xs text-gray-400 hover:text-white">
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteProduct(p.id)}
                    className="uppercase tracking-widest text-xs text-red-400/60 hover:text-red-400"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
            {!loading && products.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-8 py-24 text-center text-sm tracking-widest text-gray-500 uppercase"
                >
                  No products in catalog.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
