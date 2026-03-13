export function getApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_BASE) return process.env.NEXT_PUBLIC_API_BASE

  if (typeof window !== "undefined") {
    return `http://${window.location.hostname}:5000`
  }

  return "http://localhost:5000"
}

