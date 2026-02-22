"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await login(email, password)

    if (result.success && result.user) {
      router.push(result.user.role === "admin" ? "/admin" : "/account")
    } else {
      setError(result.message || "Invalid email or password")
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e3] flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-12">
          <Link href="/" className="text-4xl font-serif font-light tracking-[0.25em]">
            U.S ATELIER
          </Link>
          <p className="mt-4 text-xs uppercase tracking-widest text-gray-500">
            Welcome Back
          </p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-10 border border-white/10 p-10">
          <div>
            <label className="block mb-2 text-xs uppercase tracking-widest text-gray-400">
              Email
            </label>
            <Input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white focus:ring-0"
            />
          </div>

          <div>
            <label className="block mb-2 text-xs uppercase tracking-widest text-gray-400">
              Password
            </label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white focus:ring-0"
            />
          </div>

          {error && (
            <p className="text-xs uppercase tracking-widest text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-transparent border border-white/40 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all duration-500"
          >
            {loading ? "Signing In…" : "Sign In"}
          </Button>
        </form>

        {/* Sign up link */}
        <div className="mt-8 text-center text-xs tracking-widest text-gray-500">
          New to U.S ATELIER?{" "}
          <Link
            href="/signup"
            className="text-white underline underline-offset-4 hover:text-gray-300 transition-colors"
          >
            Create an account
          </Link>
        </div>

        {/* Back */}
        <div className="mt-6 text-center">
          <Link
            href="/"
            className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            Back to Store
          </Link>
        </div>
      </div>
    </div>
  )
}
