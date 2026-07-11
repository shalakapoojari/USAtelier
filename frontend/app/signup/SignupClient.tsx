"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"

export default function SignupClient() {
    const router = useRouter()

    useEffect(() => {
        const params = new URLSearchParams(window.location.search)
        const next = params.get("next")
        const loginUrl = next ? `/login?next=${encodeURIComponent(next)}` : "/login"
        router.replace(loginUrl)
    }, [router])

    return null
}
