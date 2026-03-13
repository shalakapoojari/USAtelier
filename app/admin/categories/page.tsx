"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Loader2, FolderPlus, X } from "lucide-react"
import { useToast } from "@/lib/toast-context"

type Category = {
  id: string
  name: string
  subcategories: string[]
}

export default function CategoriesPage() {
  const [API_BASE, setApiBase] = useState("")

  useEffect(() => {
    setApiBase(`http://${window.location.hostname}:5000`)
  }, [])

  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [newCategoryName, setNewCategoryName] = useState("")
  const [newSubcategoryName, setNewSubcategoryName] = useState<{ [key: string]: string }>({})
  const { showToast } = useToast()

  useEffect(() => {
    if (API_BASE) fetchCategories()
  }, [API_BASE])

  const fetchCategories = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/categories`)
      if (res.ok) {
        const data = await res.json()
        setCategories(data)
      }
    } catch (err) {
      console.error("Failed to fetch categories:", err)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return
    try {
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: newCategoryName.trim() }),
      })
      if (res.ok) {
        showToast("Category added", "info")
        setNewCategoryName("")
        fetchCategories()
      } else {
        const data = await res.json()
        showToast(data.error || "Failed to add", "info")
      }
    } catch {
      showToast("Network error", "info")
    }
  }

  const handleSubcategorySubmit = async (catName: string) => {
    const subName = newSubcategoryName[catName]
    if (!subName || !subName.trim()) return

    try {
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: catName, subcategory: subName.trim() }),
      })
      if (res.ok) {
        showToast("Subcategory added", "info")
        setNewSubcategoryName(prev => ({ ...prev, [catName]: "" }))
        fetchCategories()
      } else {
        const data = await res.json()
        showToast(data.error || "Failed to add", "info")
      }
    } catch {
      showToast("Network error", "info")
    }
  }

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"? This cannot be undone.`)) return

    try {
      const res = await fetch(`${API_BASE}/api/categories/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (res.ok) {
        showToast("Category deleted", "info")
        fetchCategories()
      } else {
        showToast("Failed to delete", "info")
      }
    } catch {
      showToast("Network error", "info")
    }
  }

  const handleDeleteSubcategory = async (catId: string, subName: string) => {
    if (!confirm(`Delete subcategory "${subName}"?`)) return

    try {
      const res = await fetch(`${API_BASE}/api/categories/${catId}/subcategories`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ subcategory: subName }),
      })
      if (res.ok) {
        showToast("Subcategory deleted", "info")
        fetchCategories()
      } else {
        const data = await res.json()
        showToast(data.error || "Failed to delete", "info")
      }
    } catch {
      showToast("Network error", "info")
    }
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen px-8 py-16">
      <div className="max-w-[1400px] mx-auto mb-20">
        <p className="uppercase tracking-[0.5em] text-xs text-gray-500 mb-4">Admin</p>
        <h1 className="font-serif text-5xl font-light">Categories</h1>
        <p className="mt-4 text-sm tracking-widest text-gray-500 max-w-xl">
          Manage product categories and their subcategories.
        </p>
      </div>

      <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* ADD CATEGORY */}
        <div className="lg:col-span-1">
          <section className="border border-white/10 p-10 sticky top-10 bg-white/[0.02]">
            <h2 className="uppercase tracking-widest text-[10px] text-gray-400 mb-8 border-b border-white/5 pb-4">
              Create New Category
            </h2>
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] uppercase tracking-widest text-gray-500">Name</label>
                <Input
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Outerwear"
                  className="bg-transparent border-white/20 text-white rounded-none h-12"
                />
              </div>
              <Button
                onClick={handleAddCategory}
                className="w-full bg-[#e8e8e3] text-black hover:bg-white uppercase tracking-widest text-xs h-12 rounded-none transition-all"
              >
                <Plus className="h-4 w-4 mr-2" /> Add Category
              </Button>
            </div>
          </section>
        </div>

        {/* CATEGORY LIST */}
        <div className="lg:col-span-2">
          {loading ? (
            <div className="flex flex-col items-center py-20 gap-4">
              <Loader2 className="animate-spin text-gray-500" />
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500">Loading catalog structure...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-8">
              {categories.map((cat) => (
                <div key={cat.id} className="border border-white/10 p-8 hover:bg-white/[0.01] transition-all group">
                  <div className="flex justify-between items-start mb-8">
                    <div>
                      <h3 className="font-serif text-3xl font-light">{cat.name}</h3>
                      <p className="text-[10px] uppercase tracking-[0.3em] text-gray-500 mt-2">
                        {cat.subcategories.length} Subcategories
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteCategory(cat.id, cat.name)}
                      className="text-red-500/40 hover:text-red-500 transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>

                  {/* Subcategories */}
                  <div className="space-y-6">
                    <div className="flex flex-wrap gap-2">
                      {cat.subcategories.map(sub => (
                        <Badge key={sub} variant="outline" className="border-white/10 text-gray-400 py-1 px-3 rounded-none uppercase text-[10px] tracking-widest flex items-center gap-2">
                          {sub}
                          <button
                            onClick={() => handleDeleteSubcategory(cat.id, sub)}
                            className="hover:text-red-500 transition-colors"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                    </div>

                    <div className="flex gap-4 pt-4 border-t border-white/5">
                      <Input
                        value={newSubcategoryName[cat.name] || ""}
                        onChange={(e) => setNewSubcategoryName(prev => ({ ...prev, [cat.name]: e.target.value }))}
                        placeholder="Add subcategory..."
                        className="bg-transparent border-white/10 focus:border-white/30 text-xs rounded-none h-10"
                        onKeyDown={(e) => e.key === "Enter" && handleSubcategorySubmit(cat.name)}
                      />
                      <Button
                        size="sm"
                        onClick={() => handleSubcategorySubmit(cat.name)}
                        className="bg-[#e8e8e3] text-black hover:bg-white rounded-none h-10 px-6 uppercase text-[10px] tracking-widest"
                      >
                        <FolderPlus className="h-3 w-3 mr-2" /> Add
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
