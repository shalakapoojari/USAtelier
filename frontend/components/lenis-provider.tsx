"use client"

import { ReactNode } from "react"

/**
 * Smooth scroll provider.
 * Using native CSS smooth scroll for Safari compatibility
 * and to avoid scroll jank caused by JS-based smooth scroll libraries.
 */
export function LenisProvider({ children }: { children: ReactNode }) {
    return <>{children}</>
}
