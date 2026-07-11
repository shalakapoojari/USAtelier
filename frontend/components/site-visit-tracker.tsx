"use client"

import { useEffect } from "react"
import { usePathname, useSearchParams } from "next/navigation"
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

export function SiteVisitTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    const query = searchParams.toString()
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
  }, [pathname, searchParams])

  return null
}
