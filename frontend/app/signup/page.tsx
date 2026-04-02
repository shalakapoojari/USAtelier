"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export const dynamic = "force-dynamic"

export default function SignupPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const next = searchParams.get("next")
    const loginUrl = next ? `/login?next=${encodeURIComponent(next)}` : "/login"
    router.replace(loginUrl)
  }, [router, searchParams])

  return (
    <div className="min-h-screen bg-[#030303] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )
}
