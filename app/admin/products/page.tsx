"use client"

import { useState } from "react"
import {
  products,
  updateProduct,
  deleteProduct,
  addProduct,
  customCategories,
} from "@/lib/data"

import Image from "next/image"

export default function ProductsPage() {
  const [editing, setEditing] = useState<any>(null)

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
            Editorial product catalog.
          </p>
        </div>

        <button className="border border-white/40 px-8 py-4 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all">
          Add Product
        </button>
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
            {products.map((p, i) => (
              <tr
                key={p.id}
                className={`border-b border-white/5 hover:bg-white/[0.04] ${i % 2 === 0 ? "bg-white/[0.02]" : ""
                  }`}
              >
                <td className="px-8 py-6 flex items-center gap-6">
                  <div className="relative w-16 h-20 bg-black">
                    <Image
                      src={p.images[0]}
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
                  {[p.featured && "Featured", p.newArrival && "New", p.bestseller && "Bestseller"]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </td>

                <td className="px-8 py-6 text-xs tracking-widest">
                  {p.inStock ? "In Stock" : "Out of Stock"}
                </td>

                <td className="px-8 py-6 text-right">
                  <button
                    onClick={() => setEditing(p)}
                    className="uppercase tracking-widest text-xs text-gray-400 hover:text-white"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            ))}
            {products.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="px-8 py-24 text-center text-sm tracking-widest text-gray-500"
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
