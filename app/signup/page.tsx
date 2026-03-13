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
  const [termsAccepted, setTermsAccepted] = useState(false)

  const { signup, loginWithGoogle } = useAuth()
  const router = useRouter()
  const strongPasswordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError("")

    // Confirm password check
    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    // Strong password validation
    if (!strongPasswordRegex.test(password)) {
      setError("Password must be at least 8 characters and include a letter, a number, and a special character")
      return
    }

    // 10-digit validation
    const phoneClean = phone.replace(/\D/g, "")
    if (phoneClean.length !== 10) {
      setError("Please enter a valid 10-digit mobile number")
      return
    }

    if (!termsAccepted) {
      setError("Please accept the Terms & Conditions to continue")
      return
    }

    setLoading(true)

    try {
      const result = await signup(email, password, firstName, lastName, phoneClean, termsAccepted)

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
              type="text"
              placeholder="Email or Username"
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
                placeholder="Min. 8, include letter, number, special"
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

          <label className="flex items-start gap-3 text-xs text-gray-400 leading-relaxed">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={(e) => setTermsAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-white/30 bg-transparent"
              required
            />
            <span>
              I agree to the <Link href="/terms&conditions" className="text-[#C8A45D] hover:text-white underline underline-offset-4">Terms & Conditions</Link>.
            </span>
          </label>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-transparent border border-white/40 uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all duration-500"
          >
            {loading ? "Creating…" : "Create Account"}
          </Button>

          <div className="relative py-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-white/10"></span>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#030303] px-2 text-gray-500 tracking-widest">Or continue with</span>
            </div>
          </div>

          <Button
            type="button"
            onClick={loginWithGoogle}
            className="w-full bg-white text-black hover:bg-gray-200 uppercase tracking-widest text-xs py-6 flex items-center justify-center gap-3 rounded-none transition-all duration-300"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Google
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
