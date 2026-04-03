let csrfToken: string | null = null


function normalizeApiBase(raw: string): string {
  const value = raw.trim().replace(/\/+$/, "")
  if (!value) return value

  // Avoid mixed content in production (HTTPS page cannot call HTTP API).
  if (value.startsWith("http://") && !value.includes("localhost") && !value.includes("127.0.0.1")) {
    return `https://${value.slice("http://".length)}`
  }
  return value
}

export function getApiBase(): string {
  const envBase = process.env.NEXT_PUBLIC_API_BASE
  if (envBase) return normalizeApiBase(envBase)

  // Client-side
  if (typeof window !== "undefined") {
    const host = window.location.hostname

    const isLocalHost =
      host === "localhost" ||
      host === "127.0.0.1" ||
      host.startsWith("192.168.") ||
      host.startsWith("10.")

    if (isLocalHost) {
      return "http://localhost:5000"   // ✅ FIXED
    }

    // Production fallback
    return "https://api.usatelier.in"
  }

  // Server-side fallback (Next.js SSR)
  return "http://localhost:5000"   // ✅ FIXED
}

export async function apiFetch(
  API_BASE: string,
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  return fetch(`${API_BASE}${url}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.headers || {}),
      ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    } as HeadersInit,
  })
}

export async function initCSRF(API_BASE: string) {
  try {
    const res = await fetch(`${API_BASE}/api/csrf-token`, {
      credentials: "include",
    })

    const data = await res.json()
    csrfToken = data.csrf_token
  } catch (err) {
    console.error("CSRF init failed:", err)
  }
}


