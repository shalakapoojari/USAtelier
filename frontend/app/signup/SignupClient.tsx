"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function SignupClient() {
    const router = useRouter()
    const searchParams = useSearchParams()

    useEffect(() => {
        const next = searchParams.get("next")
        const loginUrl = next ? `/login?next=${encodeURIComponent(next)}` : "/login"
        router.replace(loginUrl)
    }, [router, searchParams])

    return null
}