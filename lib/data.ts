export type Product = {
  id: string
  name: string
  price: number
  description: string
  category: string
  images: string[]
  sizes: string[]
  inStock: boolean
  featured?: boolean
  newArrival?: boolean
  bestseller?: boolean
  fabric?: string
  care?: string
  customCategories?: string[]
  subcategory?: string
}

export type Collection = {
  id: string
  name: string
  description: string
  image: string
}

export type Order = {
  id: string
  customerId: string
  customerName: string
  customerEmail: string
  date: string
  status: "pending" | "processing" | "shipped" | "delivered"
  paymentStatus: "pending" | "completed" | "failed" | "refunded"
  paymentMethod: string
  items: {
    productId: string
    productName: string
    size: string
    quantity: number
    price: number
  }[]
  subtotal: number
  shipping: number
  total: number
  shippingAddress: {
    street: string
    city: string
    state: string
    zip: string
    country: string
  }
  borzo_order_id?: string
  borzo_tracking_url?: string
}

// Mock Products Data
// Mock Products Data
export const products: Product[] = [
  {
    id: "1",
    name: "Essential Cashmere Sweater",
    price: 24485,
    description: "Luxuriously soft cashmere sweater with a relaxed fit. Perfect for layering or wearing alone.",
    category: "Knitwear",
    subcategory: "Sweaters",
    images: ["/minimal-beige-cashmere-sweater-on-model.jpg", "/beige-cashmere-sweater-detail-texture-close-up.jpg"],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    featured: true,
    bestseller: true,
    fabric: "100% Cashmere",
    care: "Dry clean only",
  },
  {
    id: "2",
    name: "Tailored Wool Trousers",
    price: 20335,
    description: "Classic tailored trousers crafted from premium wool. Timeless silhouette with a modern fit.",
    category: "Trousers",
    subcategory: "Tailored",
    images: ["/charcoal-grey-wool-trousers-on-model-minimal.jpg", "/grey-tailored-trousers-detail-close-up.jpg"],
    sizes: ["28", "30", "32", "34", "36"],
    inStock: true,
    featured: true,
    bestseller: true,
    fabric: "100% Premium Wool",
    care: "Dry clean recommended",
  },
  {
    id: "3",
    name: "Organic Cotton Tee",
    price: 7055,
    description: "Essential crew neck tee made from premium organic cotton. Soft, breathable, and perfectly fitted.",
    category: "Basics",
    subcategory: "Tees",
    images: ["/white-cotton-t-shirt-on-model-minimal-clean.jpg", "/white-tee-shirt-folded-detail.jpg"],
    sizes: ["XS", "S", "M", "L", "XL"],
    inStock: true,
    newArrival: true,
    fabric: "100% Organic Cotton",
    care: "Machine wash cold",
  },
  {
    id: "4",
    name: "Silk Button-Down Shirt",
    price: 26975,
    description: "Elegant silk shirt with mother-of-pearl buttons. Effortlessly sophisticated.",
    category: "Shirts",
    subcategory: "Formal",
    images: ["/ivory-silk-shirt-on-model-minimal-elegant.jpg", "/silk-shirt-detail-buttons-close-up.jpg"],
    sizes: ["XS", "S", "M", "L"],
    inStock: true,
    newArrival: true,
    fabric: "100% Mulberry Silk",
    care: "Hand wash or dry clean only",
  },
  {
    id: "5",
    name: "Merino Wool Cardigan",
    price: 22825,
    description: "Lightweight merino wool cardigan. Versatile layering piece for any season.",
    category: "Knitwear",
    subcategory: "Cardigans",
    images: ["/navy-merino-wool-cardigan-on-model.jpg", "/navy-cardigan-detail-texture.jpg"],
    sizes: ["S", "M", "L", "XL"],
    inStock: true,
    featured: true,
    fabric: "100% Extra-Fine Merino Wool",
    care: "Machine wash cold, lay flat to dry",
  },
  {
    id: "6",
    name: "Linen Wide-Leg Pants",
    price: 16185,
    description: "Flowing wide-leg pants in breathable linen. Relaxed yet refined.",
    category: "Trousers",
    subcategory: "Casual",
    images: ["/natural-linen-wide-leg-pants-on-model.jpg", "/linen-pants-texture-detail.jpg"],
    sizes: ["XS", "S", "M", "L"],
    inStock: false,
    fabric: "100% European Linen",
    care: "Machine wash cold, tumble dry low",
  },
  {
    id: "7",
    name: "Leather Minimal Tote",
    price: 35275,
    description: "Handcrafted leather tote with clean lines. Spacious interior with magnetic closure.",
    category: "Accessories",
    subcategory: "Bags",
    images: ["/tan-leather-tote-bag-minimal.jpg", "/leather-bag-detail-stitching.jpg"],
    sizes: ["One Size"],
    inStock: true,
    featured: true,
    bestseller: true,
    fabric: "Full-Grain Vegetable-Tanned Leather",
    care: "Wipe clean with a dry cloth. Condition periodically.",
  },
  {
    id: "8",
    name: "Cashmere Scarf",
    price: 13695,
    description: "Soft cashmere scarf in a versatile neutral tone. Essential cold-weather accessory.",
    category: "Accessories",
    subcategory: "Scarf",
    images: ["/beige-cashmere-scarf-styled.jpg", "/beige-cashmere-sweater-detail-texture-close-up.jpg"],
    sizes: ["One Size"],
    inStock: true,
    newArrival: true,
    fabric: "100% Mongolian Cashmere",
    care: "Hand wash cold, dry flat",
  },
]

// Mock Collections Data
// Mock Collections Data
export const collections: Collection[] = [
  {
    id: "essentials",
    name: "Essentials",
    description: "Timeless pieces for everyday elegance",
    image: "/white-cotton-t-shirt-on-model-minimal-clean.jpg",
  },
  {
    id: "knitwear",
    name: "Knitwear",
    description: "Luxurious knits for every season",
    image: "/minimal-beige-cashmere-sweater-on-model.jpg",
  },
  {
    id: "tailoring",
    name: "Tailoring",
    description: "Precision-crafted suiting and trousers",
    image: "/charcoal-grey-wool-trousers-on-model-minimal.jpg",
  },
]

// Mock Orders Data
export const orders: Order[] = []

export let customCategories: string[] = []

export function addCustomCategory(category: string) {
  if (!customCategories.includes(category)) {
    customCategories.push(category)
  }
}

export function deleteCustomCategory(category: string) {
  customCategories = customCategories.filter((c) => c !== category)
}

export function addProduct(product: Product) {
  products.push(product)
}

export function updateProduct(id: string, updates: Partial<Product>) {
  const index = products.findIndex((p) => p.id === id)
  if (index !== -1) {
    products[index] = { ...products[index], ...updates }
  }
}

export function deleteProduct(id: string) {
  const index = products.findIndex((p) => p.id === id)
  if (index !== -1) {
    products.splice(index, 1)
  }
}
