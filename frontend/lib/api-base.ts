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
  return process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"
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


