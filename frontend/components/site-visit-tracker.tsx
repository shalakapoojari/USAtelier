"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { apiFetch, getApiBase } from "@/lib/api-base"

const SESSION_KEY = "usa_site_session_id"

function getSessionId() {
  try {
    let sessionId = sessionStorage.getItem(SESSION_KEY)
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      sessionStorage.setItem(SESSION_KEY, sessionId)
    }
    return sessionId
  } catch {
    return ""
  }
}

const SKIPPED_ANALYTICS_PAGES = ["/admin", "/view-all", "/collections", "/new-arrivals"]

function shouldTrackPage(pathname: string | null) {
  if (!pathname) return false
  return !SKIPPED_ANALYTICS_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))
}

export function SiteVisitTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!shouldTrackPage(pathname)) return

    const query = window.location.search.replace(/^\?/, "")
    const page = query ? `${pathname}?${query}` : pathname
    apiFetch(getApiBase(), "/api/track/pageview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        page,
        session_id: getSessionId(),
        referrer: document.referrer || "",
        user_agent: navigator.userAgent || "",
      }),
    }).catch(() => { /* analytics should never interrupt shopping */ })
  }, [pathname])

  return null
}
