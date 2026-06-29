"use client"

import { useEffect, useState } from "react"
import { getApiBase, apiFetch } from "@/lib/api-base"

export function HomepageBanner() {
  const [API_BASE, setAPI_BASE] = useState("")
  const [banner, setBanner] = useState<{ text: string, isActive: boolean } | null>(null)

  useEffect(() => {
    setAPI_BASE(getApiBase())
  }, [])

  useEffect(() => {
    if (!API_BASE) return
    const fetchBanner = async () => {
      try {
        const res = await apiFetch(API_BASE, "/api/settings/banner")
        if (res.ok) {
          const data = await res.json()
          setBanner({
            text: data.text,
            isActive: data.isActive
          })
        }
      } catch (err) {
        console.error("Failed to fetch homepage banner", err)
      }
    }
    fetchBanner()
  }, [API_BASE])

  if (!banner || !banner.isActive || !banner.text) return null

  return (
    <div className="w-full bg-[#111] text-white flex items-center justify-center text-[10px] tracking-widest uppercase font-sans border-b border-white/10" style={{ height: '36px' }}>
      {banner.text}
    </div>
  )
}
