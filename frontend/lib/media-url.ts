import { getApiBase } from "@/lib/api-base"

const API_BASE = getApiBase()

export function resolveMediaUrl(url?: string | null): string {
  if (!url) return "/placeholder.jpg"

  const trimmed = url.trim()
  if (!trimmed) return "/placeholder.jpg"

  // 1. Handle absolute URLs (http, https, data, blob)
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    try {
      const parsed = new URL(trimmed)
      // Normalize if it accidentally contains /static/uploads/
      if (parsed.pathname.includes("/static/uploads/")) {
        parsed.pathname = parsed.pathname.replace("/static/uploads/", "/uploads/")
        return parsed.toString()
      }
      return trimmed
    } catch {
      return trimmed
    }
  }

  // 2. Handle paths starting with /uploads/ (most common)
  if (trimmed.startsWith("/uploads/")) {
    return `${API_BASE}${trimmed}`
  }

  // 3. Handle legacy or incorrect paths starting with /static/uploads/
  if (trimmed.startsWith("/static/uploads/")) {
    return `${API_BASE}${trimmed.replace("/static/uploads/", "/uploads/")}`
  }

  // 4. Handle relative uploads/
  if (trimmed.startsWith("uploads/")) {
    return `${API_BASE}/${trimmed}`
  }

  // 5. Normal relative paths
  if (trimmed.startsWith("/")) {
    return trimmed
  }

  return `/${trimmed}`
}