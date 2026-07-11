"use client"

import { useEffect } from "react"
import { apiFetch, getApiBase } from "@/lib/api-base"

const SESSION_KEY = "usa_site_session_id"
const SKIPPED_ANALYTICS_PAGES = ["/admin", "/view-all", "/collections", "/new-arrivals"]

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

function shouldTrackPage(pathname: string) {
  return !SKIPPED_ANALYTICS_PAGES.some((page) => pathname === page || pathname.startsWith(`${page}/`))
}

function trackCurrentPage() {
  const pathname = window.location.pathname
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
}

export function SiteVisitTracker() {
  useEffect(() => {
    trackCurrentPage()

    const originalPushState = window.history.pushState
    const originalReplaceState = window.history.replaceState
    const emitRouteChange = () => window.dispatchEvent(new Event("usa-route-change"))

    window.history.pushState = function pushState(...args) {
      originalPushState.apply(this, args)
      emitRouteChange()
    }
    window.history.replaceState = function replaceState(...args) {
      originalReplaceState.apply(this, args)
      emitRouteChange()
    }

    window.addEventListener("popstate", trackCurrentPage)
    window.addEventListener("usa-route-change", trackCurrentPage)

    return () => {
      window.history.pushState = originalPushState
      window.history.replaceState = originalReplaceState
      window.removeEventListener("popstate", trackCurrentPage)
      window.removeEventListener("usa-route-change", trackCurrentPage)
    }
  }, [])

  return null
}
