"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff } from "lucide-react"

export default function SignupPage() {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const { signup } = useAuth()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    // Confirm password check
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // 10-digit validation
    const phoneClean = phone.replace(/\D/g, "")
    if (phoneClean.length !== 10) {
      setError("Please enter a valid 10-digit mobile number")
      return
    }

    setLoading(true)

    try {
      const result = await signup(email, password, firstName, lastName, phoneClean)

      if (result?.success) {
        router.push("/account")
      } else {
        setError(result?.message ?? "Unable to create account")
      }
    } catch {
      setError("An unexpected error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#030303] text-[#e8e8e3] flex items-center justify-center px-6 py-20">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-12">
          <Link href="/" className="text-4xl font-serif font-light tracking-[0.25em]">
            U.S ATELIER
          </Link>
          <p className="mt-4 text-xs uppercase tracking-widest text-gray-500">
            Create Your Account
          </p>
        </div>

        {/* Signup Form */}
        <form onSubmit={handleSubmit} className="space-y-6 border border-white/10 p-10">

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-2 text-xs uppercase tracking-widest text-gray-400">
                First Name
              </label>
              <Input
                type="text"
                placeholder="Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white focus:ring-0"
              />
            </div>
            <div>
              <label className="block mb-2 text-xs uppercase tracking-widest text-gray-400">
                Surname
              </label>
              <Input
                type="text"
                placeholder="Surname"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white focus:ring-0"
              />
            </div>
          </div>

          <div>
            <label className="block mb-2 text-xs uppercase tracking-widest text-gray-400">
              Mobile Number
            </label>
            <Input
              type="tel"
              placeholder="Mobile Number"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white focus:ring-0"
            />
          </div>

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
            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white focus:ring-0 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div>
            <label className="block mb-2 text-xs uppercase tracking-widest text-gray-400">
              Confirm Password
            </label>
            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white focus:ring-0 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                aria-label={showConfirmPassword ? "Hide password" : "Show password"}
              >
                {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs uppercase tracking-widest text-red-500">{error}</p>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-transparent border border-white/40 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all duration-500"
          >
            {loading ? "Creating…" : "Create Account"}
          </Button>
        </form>

        {/* Back to login */}
        <div className="mt-10 text-center">
          <Link
            href="/login"
            className="text-xs uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
          >
            Already have an account? Sign In
          </Link>
        </div>
      </div>
    </div>
  )
}
