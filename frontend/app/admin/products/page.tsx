"use client"
import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import { Plus, X, Loader2, Upload, Link as LinkIcon, Search, Scissors, GripVertical, Save, ArrowUpDown } from "lucide-react"
import ImageCropperDialog from "@/components/image-cropper-dialog"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/lib/toast-context"
import { getApiBase, apiFetch } from "@/lib/api-base"


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


// ─── Sortable table row for drag-and-drop reordering ────────────────────────
function SortableProductRow({ product, index, onEdit, onDelete, getImageUrl }: {
  product: any; index: number; onEdit: (p: any) => void; onDelete: (id: string) => void; getImageUrl: (imgs: any) => string
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: product.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    position: "relative" as const,
    zIndex: isDragging ? 50 : undefined,
  }

  return (
    <tr ref={setNodeRef} style={style} className={`border-b border-white/5 hover:bg-white/4 ${index % 2 === 0 ? "bg-white/2" : ""} ${isDragging ? "!bg-white/10 shadow-2xl" : ""}`}>
      <td className="px-3 md:px-5 py-4 md:py-6">
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-gray-600 hover:text-white transition-colors p-1 touch-none">
          <GripVertical size={16} />
        </button>
      </td>
      <td className="px-4 md:px-8 py-4 md:py-6">
        <div className="flex items-center gap-4 md:gap-6">
          <div className="relative w-16 h-20 bg-white/5 shrink-0">
            <Image src={getImageUrl(product.images)} alt={product.name} fill className="object-contain opacity-80" />
          </div>
          <div>
            <p className="font-medium text-sm">{product.name}</p>
            <p className="text-[10px] tracking-[0.3em] text-gray-600 uppercase mt-1">ID {String(product.id).slice(-6)}</p>
          </div>
        </div>
      </td>
      <td className="px-4 md:px-8 py-4 md:py-6 text-xs tracking-widest">
        {product.category}
        {product.subcategory && <span className="text-gray-600 block text-[9px] mt-1 italic">{product.subcategory}</span>}
      </td>
      <td className="px-4 md:px-8 py-4 md:py-6 font-mono text-xs">₹{product.sellingPrice?.toLocaleString('en-IN')}</td>
      <td className="px-4 md:px-8 py-4 md:py-6 text-[10px] tracking-widest text-gray-500 uppercase">
        {[product.is_featured && "Featured", product.is_new && "New", product.is_bestseller && "Best"].filter(Boolean).join(" · ") || "—"}
      </td>
      <td className="px-4 md:px-8 py-4 md:py-6 text-[10px] tracking-widest uppercase">
        {product.stock > 0 ? <span className="text-white">In Stock ({product.stock})</span> : <span className="text-red-500/60">Sold Out</span>}
      </td>
      <td className="px-4 md:px-8 py-4 md:py-6 text-right space-x-4 whitespace-nowrap">
        <button onClick={() => onEdit(product)} className="uppercase tracking-widest text-[10px] text-gray-400 hover:text-white transition-colors">
          Edit
        </button>
        <button onClick={() => onDelete(product.id)} className="uppercase tracking-widest text-[10px] text-red-400/40 hover:text-red-400 transition-colors">
          Delete
        </button>
      </td>
    </tr>
  )
}


export default function ProductsPage() {
  const API_BASE = getApiBase()

  const [products, setProducts] = useState<any[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdding, setIsAdding] = useState(false)
  const [editingProduct, setEditingProduct] = useState<any>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const { showToast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("all")

  // Image Cropper state
  const [cropperOpen, setCropperOpen] = useState(false)
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null)
  const [pendingCropIndex, setPendingCropIndex] = useState<number>(-1)
  const [isSizeGuideSlot, setIsSizeGuideSlot] = useState(false)

  // Reorder mode
  const [reorderMode, setReorderMode] = useState(false)
  const [reorderProducts, setReorderProducts] = useState<any[]>([])
  const [isSavingOrder, setIsSavingOrder] = useState(false)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const [formData, setFormData] = useState({
    name: "",
    sellingPrice: "",
    mrp: "",
    category: "",
    subcategory: "",
    description: "",
    images: ["", "", ""],
    sizes: {} as Record<string, string>,
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

  // Inline validation errors for price fields
  const [priceErrors, setPriceErrors] = useState({ sellingPrice: "", mrp: "" })

  useEffect(() => {
    if (API_BASE) {
      fetchProducts()
      fetchCategories()
    }
  }, [API_BASE])

  const fetchProducts = async () => {
    try {
      const res = await apiFetch(API_BASE, "/api/products")
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
      const res = await apiFetch(API_BASE, "/api/categories")
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
    setFormData(prev => {
      const newSizes = { ...prev.sizes }
      if (newSizes[size] !== undefined) {
        delete newSizes[size]
      } else {
        newSizes[size] = "10" // Default stock for new size
      }

      // Calculate total stock
      const total = Object.values(newSizes).reduce((acc, val) => acc + (parseInt(val) || 0), 0)

      return {
        ...prev,
        sizes: newSizes,
        stock: total.toString()
      }
    })
  }

  const handleSizeStockChange = (size: string, stock: string) => {
    setFormData(prev => {
      const newSizes = { ...prev.sizes, [size]: stock }
      const total = Object.values(newSizes).reduce((acc, val) => acc + (parseInt(val) || 0), 0)
      return {
        ...prev,
        sizes: newSizes,
        stock: total.toString()
      }
    })
  }

  const handleFileUpload = async (index: number, file: File, isSizeGuide = false) => {
    const data = new FormData()
    data.append("file", file)

    try {
      const res = await apiFetch(API_BASE, "/api/upload", {
        method: "POST",
        body: data,
      })

      const result = await res.json()

      if (res.ok && result.success) {
        if (isSizeGuide) {
          setFormData(p => ({ ...p, sizeGuideImage: result.url }))
          showToast("Size guide uploaded", "info")
        } else {
          handleImageChange(index, result.url)
          showToast("Image uploaded", "info")
        }
      } else {
        showToast(result.error || "Upload failed", "info")
      }
    } catch {
      showToast("Upload error", "info")
    }
  }

  // Opens cropper before uploading
  const openCropperForFile = (file: File, index: number, sizeGuide = false) => {
    setPendingCropFile(file)
    setPendingCropIndex(index)
    setIsSizeGuideSlot(sizeGuide)
    setCropperOpen(true)
  }

  const handleCropConfirm = async (blob: Blob, _previewUrl: string) => {
    setCropperOpen(false)
    const file = new File([blob], `cropped_${Date.now()}.jpg`, { type: "image/jpeg" })
    await handleFileUpload(pendingCropIndex, file, isSizeGuideSlot)
    setPendingCropFile(null)
  }

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Are you sure you want to delete this product?")) return

    try {
      const res = await apiFetch(API_BASE, `/api/products/${id}`, {
        method: "DELETE",
      })

      if (res.ok) {
        showToast("Product deleted", "info")
        fetchProducts()
      } else {
        const data = await res.json()
        showToast(data.error || "Failed to delete", "info")
      }
    } catch (err) {
      console.error(err)
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
      if (typeof product.sizes === "object" && !Array.isArray(product.sizes)) {
        // Already object format
        const record: Record<string, string> = {}
        Object.entries(product.sizes).forEach(([k, v]) => record[k] = String(v))
        return record
      }
      try {
        const parsed = JSON.parse(product.sizes || "[]")
        if (typeof parsed === "object" && !Array.isArray(parsed)) {
          const record: Record<string, string> = {}
          Object.entries(parsed).forEach(([k, v]) => record[k] = String(v))
          return record
        }
        // Legacy array format
        const record: Record<string, string> = {}
        if (Array.isArray(parsed)) {
          parsed.forEach((s: string) => record[s] = String(Math.floor((product.stock || 0) / parsed.length)))
        }
        return record
      } catch {
        return {}
      }
    })()

    setFormData({
      name: product.name || "",
      sellingPrice: product.sellingPrice?.toString() || "",
      mrp: product.mrp != null ? product.mrp.toString() : "",
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
      sizeGuideImage: product.sizeGuideImage || product.size_guide_image || "",
      notifyUsers: false,
    })
    setPriceErrors({ sellingPrice: "", mrp: "" })
    setEditingProduct(product)
    setDialogOpen(true)
  }

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate Selling Price
    const sp = parseFloat(formData.sellingPrice)
    const newPriceErrors = { sellingPrice: "", mrp: "" }
    let hasError = false
    if (!formData.sellingPrice || isNaN(sp) || sp <= 0) {
      newPriceErrors.sellingPrice = "Selling price is required and must be greater than 0"
      hasError = true
    }
    // Validate MRP if provided
    if (formData.mrp.trim() !== "") {
      const mrpVal = parseFloat(formData.mrp)
      if (!isNaN(mrpVal) && !isNaN(sp) && mrpVal < sp) {
        newPriceErrors.mrp = "MRP must be greater than or equal to the Selling Price."
        hasError = true
      }
    }
    setPriceErrors(newPriceErrors)
    if (hasError) return

    setIsAdding(true)

    const filteredImages = formData.images.filter(img => img.trim() !== "")
    if (filteredImages.length === 0) {
      showToast("At least one image is required", "info")
      setIsAdding(false)
      return
    }

    // Build payload — convert mrp to number or null
    const mrpPayload = formData.mrp.trim() !== "" ? parseFloat(formData.mrp) : null

    try {
      const url = editingProduct
        ? `/api/products/${editingProduct.id}`
        : `/api/products`

      const method = editingProduct ? "PUT" : "POST"

      const res = await apiFetch(API_BASE, url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          mrp: mrpPayload,
          notify_users: formData.notifyUsers,
          images: filteredImages,
        }),
      })

      if (res.ok) {
        showToast(
          editingProduct ? "Product updated successfully" : "Product added successfully",
          "info"
        )

        setDialogOpen(false)
        setEditingProduct(null)
        fetchProducts()

        setFormData({
          name: "",
          sellingPrice: "",
          mrp: "",
          category: "",
          subcategory: "",
          description: "",
          images: ["", "", ""],
          sizes: {},
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
        setPriceErrors({ sellingPrice: "", mrp: "" })
      } else {
        const data = await res.json()
        showToast(data.error || "Failed to save product", "info")
      }
    } catch {
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

  // ─── Reorder helpers ──────────────────────────────────────────────────
  const enterReorderMode = useCallback(() => {
    const sorted = [...products].sort((a: any, b: any) => (a.display_order ?? 0) - (b.display_order ?? 0))
    setReorderProducts(sorted)
    setReorderMode(true)
  }, [products])

  const exitReorderMode = () => {
    setReorderMode(false)
    setReorderProducts([])
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    setReorderProducts(prev => {
      const oldIndex = prev.findIndex((p: any) => p.id === active.id)
      const newIndex = prev.findIndex((p: any) => p.id === over.id)
      return arrayMove(prev, oldIndex, newIndex)
    })
  }

  const handleSaveOrder = async () => {
    setIsSavingOrder(true)
    try {
      const orderPayload = reorderProducts.map((p: any, idx: number) => ({
        id: p.id,
        display_order: idx,
      }))
      const res = await apiFetch(API_BASE, "/api/products/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ order: orderPayload }),
      })
      if (res.ok) {
        showToast("Product order saved", "info")
        setReorderMode(false)
        fetchProducts()
      } else {
        const data = await res.json()
        showToast(data.error || "Failed to save order", "info")
      }
    } catch {
      showToast("Network error", "info")
    } finally {
      setIsSavingOrder(false)
    }
  }

  return (
    <>
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-4 sm:px-6 md:px-8 py-10 md:py-16">
      <div className="max-w-350 mx-auto mb-14 md:mb-20 flex flex-col md:flex-row md:justify-between md:items-end gap-6">
        <div>
          <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4">Admin</p>
          <h1 className="font-serif text-3xl sm:text-4xl md:text-5xl font-light">
            Total Products: <span className="text-xl opacity-50" style={{ fontFamily: 'Times New Roman, serif' }}>({products.length})</span>
          </h1>
          <p className="mt-4 text-sm tracking-widest text-gray-500">
            Editorial product catalog Management.
          </p>
        </div>

        {/* Reorder Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {reorderMode ? (
            <>
              <Button
                onClick={exitReorderMode}
                variant="outline"
                className="border-white/20 text-gray-400 hover:text-white hover:bg-white/5 px-6 py-6 uppercase tracking-widest text-xs transition-all rounded-none"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveOrder}
                disabled={isSavingOrder}
                className="bg-emerald-600 text-white hover:bg-emerald-500 px-8 py-6 uppercase tracking-widest text-xs transition-all rounded-none flex items-center gap-2"
              >
                {isSavingOrder ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                Save Order
              </Button>
            </>
          ) : (
            <Button
              onClick={enterReorderMode}
              variant="outline"
              className="border-white/20 text-gray-400 hover:text-white hover:bg-white/5 px-6 py-6 uppercase tracking-widest text-xs transition-all rounded-none flex items-center gap-2"
            >
              <ArrowUpDown size={14} />
              Reorder
            </Button>
          )}
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setEditingProduct(null)
            setFormData({
              name: "",
              sellingPrice: "",
              mrp: "",
              category: "",
              subcategory: "",
              description: "",
              images: ["", "", ""],
              sizes: {},
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
            setPriceErrors({ sellingPrice: "", mrp: "" })
          }
        }}>
          <DialogTrigger asChild>
            <Button className="bg-white text-black hover:bg-white hover:text-black px-8 py-6 uppercase tracking-widest text-xs transition-all rounded-none w-full md:w-auto">
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
                      {/* Price fields: 2-column — Selling Price + MRP */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Selling Price (required) */}
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-gray-400">
                            Selling Price (Rs.) <span className="text-red-400">*</span>
                          </Label>
                          <Input
                            id="sellingPrice"
                            name="sellingPrice"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.sellingPrice}
                            onChange={(e) => {
                              handleInputChange(e)
                              if (priceErrors.sellingPrice) setPriceErrors(prev => ({ ...prev, sellingPrice: "" }))
                            }}
                            placeholder="e.g. 799"
                            className={`bg-transparent border-white/10 focus:border-white/30 rounded-none h-12 ${
                              priceErrors.sellingPrice ? "border-red-500/60" : ""
                            }`}
                          />
                          {priceErrors.sellingPrice && (
                            <p className="text-[10px] text-red-400 tracking-wide">{priceErrors.sellingPrice}</p>
                          )}
                        </div>

                        {/* MRP (optional) */}
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-gray-400">
                            MRP / Original Price (Rs.)
                            <span className="text-gray-600 ml-1">(optional)</span>
                          </Label>
                          <Input
                            id="mrp"
                            name="mrp"
                            type="number"
                            step="0.01"
                            min="0"
                            value={formData.mrp}
                            onChange={(e) => {
                              handleInputChange(e)
                              if (priceErrors.mrp) setPriceErrors(prev => ({ ...prev, mrp: "" }))
                            }}
                            placeholder="e.g. 999 (leave blank if no discount)"
                            className={`bg-transparent border-white/10 focus:border-white/30 rounded-none h-12 ${
                              priceErrors.mrp ? "border-red-500/60" : ""
                            }`}
                          />
                          {priceErrors.mrp && (
                            <p className="text-[10px] text-red-400 tracking-wide">{priceErrors.mrp}</p>
                          )}
                          {!priceErrors.mrp && formData.mrp.trim() !== "" && formData.sellingPrice.trim() !== "" && parseFloat(formData.mrp) > parseFloat(formData.sellingPrice) && (
                            <p className="text-[10px] text-emerald-400 tracking-wide">
                              {Math.round(((parseFloat(formData.mrp) - parseFloat(formData.sellingPrice)) / parseFloat(formData.mrp)) * 100)}% discount will be shown
                            </p>
                          )}
                        </div>

                        {/* Total Stock (read-only) */}
                        <div className="space-y-2">
                          <Label className="text-[10px] uppercase tracking-widest text-gray-400">Total Stock</Label>
                          <Input
                            name="stock"
                            type="number"
                            value={formData.stock}
                            readOnly
                            className="bg-white/5 border-white/10 focus:border-white/30 rounded-none h-12 opacity-80"
                          />
                        </div>

                        {/* Gender */}
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[10px] uppercase tracking-widest text-gray-400">Category</Label>
                        <Select
                          value={formData.category}
                          onValueChange={(v) => {
                            const allowedForNewCategory = getSizesForCategory(v)
                            const newSizes: Record<string, string> = {}
                            Object.entries(formData.sizes).forEach(([s, val]) => {
                              if (allowedForNewCategory.includes(s)) newSizes[s] = val
                            })
                            setFormData((p) => ({
                              ...p,
                              category: v,
                              subcategory: "",
                              sizes: newSizes,
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
                      className="bg-transparent border-white/10 focus:border-white/30 rounded-none min-h-30"
                    />
                  </div>
                </div>

                {/* Right Column: Imagery & Variants */}
                <div className="space-y-8">
                  <div className="space-y-4">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 border-b border-white/5 pb-2">Imagery</p>
                    <div className="space-y-6">
                      {formData.images.map((img, idx) => (
                        <div key={idx} className="space-y-3 p-4 border border-white/5 hover:bg-white/2 transition-all">
                          <div className="flex justify-between items-center">
                            <Label className="text-[10px] uppercase tracking-widest text-gray-500">Image {idx + 1} {idx === 0 && "(Primary)"}</Label>
                            {img && (
                              <button type="button" onClick={() => handleImageChange(idx, "")} className="text-gray-600 hover:text-white">
                                <X size={12} />
                              </button>
                            )}
                          </div>
                          <div className="flex gap-4">
                            <div className="relative w-16 h-20 bg-white/5 border border-white/10 shrink-0 overflow-hidden group/prev">
                              {img ? (
                                <Image src={getImageUrl(img)} alt="Preview" fill className="object-contain" />
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
                                {/* Upload + crop button */}
                                <div className="relative">
                                  <Input
                                    type="file"
                                    accept="image/*,.jpg,.jpeg,.png,.webp,.gif,.avif,.bmp,.tiff,.jfif"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0]
                                      if (file) openCropperForFile(file, idx)
                                      e.target.value = ""
                                    }}
                                    className="absolute inset-0 opacity-0 cursor-pointer w-10"
                                  />
                                  <Button type="button" variant="outline" size="icon" className="h-10 w-10 bg-white/5 border-white/10 hover:bg-white/10 rounded-none" title="Upload & Crop">
                                    <Scissors size={13} />
                                  </Button>
                                </div>
                              </div>
                              <p className="text-[8px] uppercase tracking-widest text-gray-600">Upload opens crop editor</p>
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
                      <div className="flex gap-4 p-4 border border-amber-500/10 bg-amber-500/2 hover:bg-amber-500/4 transition-all">
                        <div className="relative w-16 h-20 bg-white/5 border border-white/10 shrink-0 overflow-hidden">
                          {formData.sizeGuideImage ? (
                            <Image src={getImageUrl(formData.sizeGuideImage)} alt="Size Guide" fill className="object-contain" />
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
                                 onChange={(e) => {
                                   const file = e.target.files?.[0]
                                   if (file) openCropperForFile(file, 0, true)
                                   e.currentTarget.value = ""
                                 }}
                                 className="absolute inset-0 opacity-0 cursor-pointer w-10"
                               />
                               <Button type="button" variant="outline" size="icon" className="h-10 w-10 bg-white/5 border-white/10 hover:bg-white/10 rounded-none" title="Upload &amp; Crop">
                                 <Scissors size={13} />
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {[
                        { label: "Featured", key: "featured" },
                        { label: "New", key: "newArrival" },
                        { label: "Best", key: "bestseller" }
                      ].map(item => (
                        <div key={item.key} className="flex flex-col items-center gap-3 p-3 border border-white/10 bg-white/2 hover:bg-white/5 transition-all">
                          <Label className="text-[8px] uppercase tracking-widest text-gray-500">{item.label}</Label>
                          <Switch
                            checked={(formData as any)[item.key]}
                            onCheckedChange={(v) => setFormData(p => ({ ...p, [item.key]: v }))}
                            className="data-[state=checked]:bg-emerald-500/80 border border-white/10"
                          />
                        </div>
                      ))}
                      <div className="flex flex-col items-center gap-3 p-3 border border-white/10 bg-white/2 hover:bg-white/5 transition-all sm:col-span-3">
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
                      <div className="space-y-6">
                        <div className="flex flex-wrap gap-2">
                          {getSizesForCategory(formData.category).map(size => (
                            <button
                              key={size}
                              type="button"
                              onClick={() => toggleSize(size)}
                              className={`px-4 py-2 text-[10px] uppercase tracking-widest border transition-all ${formData.sizes[size] !== undefined
                                ? "bg-[#e8e8e3] text-black border-[#e8e8e3]"
                                : "border-white/20 text-gray-500 hover:text-white hover:border-white/40"
                                }`}
                            >
                              {size}
                            </button>
                          ))}
                        </div>

                        {Object.keys(formData.sizes).length > 0 && (
                          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-white/5">
                            {Object.keys(formData.sizes).map(size => (
                              <div key={size} className="flex items-center justify-between p-3 border border-white/5 bg-white/2">
                                <span className="text-[10px] uppercase tracking-widest text-gray-400 font-bold">{size}</span>
                                <div className="flex items-center gap-3">
                                  <label className="text-[8px] uppercase tracking-widest text-gray-600">Stock:</label>
                                  <Input
                                    type="number"
                                    min="0"
                                    value={formData.sizes[size]}
                                    onChange={(e) => handleSizeStockChange(size, e.target.value)}
                                    className="w-16 h-8 bg-transparent border-white/10 text-[10px] rounded-none text-center"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
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

      {/* Filter Bar — hidden in reorder mode */}
      {!reorderMode && <div className="max-w-350 mx-auto mb-12 flex flex-col md:flex-row gap-8 items-start md:items-end justify-between border-t border-white/5 pt-12">
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
      </div>}

      {/* Reorder Mode Info Banner */}
      {reorderMode && (
        <div className="max-w-350 mx-auto mb-8 border-t border-white/5 pt-12">
          <div className="flex items-center gap-3 p-4 border border-emerald-500/20 bg-emerald-950/30">
            <ArrowUpDown size={14} className="text-emerald-400 shrink-0" />
            <p className="text-xs uppercase tracking-[0.2em] text-emerald-400/80">
              Drag products to reorder · {reorderProducts.length} products · Click &quot;Save Order&quot; when done
            </p>
          </div>
        </div>
      )}

      {reorderMode ? (
      <div className="max-w-350 mx-auto border border-white/10 overflow-x-auto">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-3 md:px-5 py-4 md:py-6 text-left uppercase tracking-widest text-xs text-gray-500 w-12"></th>
                {["Product", "Category", "Price", "Tags", "Stock", ""].map((h, i) => (
                  <th key={`${h}-${i}`} className="px-4 md:px-8 py-4 md:py-6 text-left uppercase tracking-widest text-xs text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <SortableContext items={reorderProducts.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
              <tbody>
                {reorderProducts.map((p: any, i: number) => (
                  <SortableProductRow
                    key={p.id}
                    product={p}
                    index={i}
                    onEdit={handleEditProduct}
                    onDelete={handleDeleteProduct}
                    getImageUrl={getImageUrl}
                  />
                ))}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
      </div>
      ) : (
      <div className="max-w-350 mx-auto border border-white/10 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-white/10">
              {["Product", "Category", "Price", "Tags", "Stock", ""].map((h, i) => (
                <th key={`${h}-${i}`} className="px-4 md:px-8 py-4 md:py-6 text-left uppercase tracking-widest text-xs text-gray-500">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 md:px-8 py-24 text-center">
                  <div className="flex flex-col items-center gap-4">
                    <Loader2 className="animate-spin text-gray-500" />
                    <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Retrieving Catalog...</p>
                  </div>
                </td>
              </tr>
            ) : filteredProductsList.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 md:px-8 py-24 text-center">
                  <p className="text-xs uppercase tracking-[0.3em] text-gray-500">No matching pieces available in catalog.</p>
                </td>
              </tr>
            ) : filteredProductsList.map((p, i) => (
              <tr key={p.id} className={`border-b border-white/5 hover:bg-white/4 ${i % 2 === 0 ? "bg-white/2" : ""}`}>
                <td className="px-4 md:px-8 py-4 md:py-6">
                  <div className="flex items-center gap-4 md:gap-6">
                    <div className="relative w-16 h-20 bg-white/5 shrink-0">
                      <Image src={getImageUrl(p.images)} alt={p.name} fill className="object-contain opacity-80" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{p.name}</p>
                      <p className="text-[10px] tracking-[0.3em] text-gray-600 uppercase mt-1">ID {String(p.id).slice(-6)}</p>
                    </div>
                  </div>
                </td>
                <td className="px-4 md:px-8 py-4 md:py-6 text-xs tracking-widest">
                  {p.category}
                  {p.subcategory && <span className="text-gray-600 block text-[9px] mt-1 italic">{p.subcategory}</span>}
                </td>
                <td className="px-4 md:px-8 py-4 md:py-6 font-mono text-xs">₹{p.sellingPrice.toLocaleString('en-IN')}</td>
                <td className="px-4 md:px-8 py-4 md:py-6 text-[10px] tracking-widest text-gray-500 uppercase">
                  {[p.is_featured && "Featured", p.is_new && "New", p.is_bestseller && "Best"].filter(Boolean).join(" · ") || "—"}
                </td>
                <td className="px-4 md:px-8 py-4 md:py-6 text-[10px] tracking-widest uppercase">
                  {p.stock > 0 ? <span className="text-white">In Stock ({p.stock})</span> : <span className="text-red-500/60">Sold Out</span>}
                </td>
                <td className="px-4 md:px-8 py-4 md:py-6 text-right space-x-4 whitespace-nowrap">
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
      )}
    </div>

    <ImageCropperDialog
      open={cropperOpen}
      imageFile={pendingCropFile}
      aspectRatio={isSizeGuideSlot ? "free" : "3:4"}
      onConfirm={handleCropConfirm}
      onCancel={() => { setCropperOpen(false); setPendingCropFile(null) }}
    />
  </>
  )
}
