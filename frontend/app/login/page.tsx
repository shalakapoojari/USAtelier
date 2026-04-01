"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/lib/auth-context"
import { Eye, EyeOff } from "lucide-react"

import { SignIn2 } from "@/components/ui/clean-minimal-sign-in"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [mounted, setMounted] = useState(false)

  const { login, loginWithGoogle } = useAuth()
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get("error")
    if (!oauthError) return

    const errorMap: Record<string, string> = {
      google_auth_failed: "Google sign-in failed. Please try again.",
      google_state_mismatch: "Google session expired or blocked.",
      google_redirect_uri_mismatch: "Google OAuth redirect mismatch.",
      google_invalid_client: "Google client configuration error.",
      google_invalid_grant: "Google token grant failed.",
      google_token_exchange_failed: "Token exchange failed.",
      google_userinfo_failed: "Failed to fetch user profile.",
      google_access_denied: "Sign-in cancelled.",
      google_email_missing: "No email provided by Google.",
      google_oauth_not_configured: "Google login not configured.",
      db_error: "Account creation failed.",
    }

    setError(errorMap[oauthError] || "Authentication failed.")
  }, [])

  const nextUrl =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("next")
      : null
  const isCheckoutRedirect = nextUrl === "/checkout"

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setLoading(true)

    const result = await login(email, password)

    if (result.success && result.user) {
      const redirectTo = nextUrl || (result.user.role === "admin" ? "/admin" : "/")
      router.push(redirectTo)
    } else {
      setError(result.message || "Invalid email or password")
    }

    setLoading(false)
  }

  if (!mounted) return <div className="min-h-screen bg-[#060608]" />

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500&family=Cinzel:wght@400;600;800&display=swap');

        .login-root {
          min-height: 100svh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          background: #030303;
          font-family: 'Space Grotesk', sans-serif;
          position: relative;
          overflow: hidden;
        }

        .serif { font-family: 'Cinzel', serif; }
        .sans { font-family: 'Space Grotesk', sans-serif; }

        .grain-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          pointer-events: none;
          z-index: 5;
          opacity: 0.04;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='1'/%3E%3C/svg%3E");
        }

        .login-root::before {
          content: '';
          position: fixed;
          inset: 0;
          background:
            radial-gradient(ellipse 70% 55% at 15% 85%, rgba(56,168,157,0.06) 0%, transparent 65%),
            radial-gradient(ellipse 60% 50% at 85% 15%, rgba(184,164,106,0.05) 0%, transparent 65%);
          pointer-events: none;
          z-index: 1;
        }

        .login-container {
          position: relative;
          z-index: 10;
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: fadeIn 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .login-top-nav {
           position: absolute;
           top: 3rem;
           left: 3rem;
           z-index: 20;
        }

        @media (max-width: 768px) {
          .login-top-nav { top: 2rem; left: 2rem; }
        }

        .back-link {
          display: flex;
          align-items: center;
          gap: 0.6rem;
          font-size: 8px;
          text-transform: uppercase;
          letter-spacing: 0.35em;
          color: rgba(255,255,255,0.25);
          text-decoration: none;
          transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
          font-weight: 500;
        }

        .back-link:hover {
          color: white;
          transform: translateX(-4px);
        }

        .brand-logo {
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.7em;
          color: rgba(255,255,255,0.2);
          margin-bottom: 2.5rem;
          text-decoration: none;
          transition: all 0.5s ease;
          font-weight: 400;
        }
        
        .brand-logo:hover {
          color: white;
          letter-spacing: 0.75em;
        }
      `}</style>

      <div className="login-root antialiased">
        <div className="grain-overlay" />
        
        <div className="login-top-nav">
          <Link href="/" className="back-link sans">
            <span className="text-xs">←</span>
            <span>STORE</span>
          </Link>
        </div>

        <div className="login-container">
          <Link href="/" className="brand-logo sans">U.S ATELIER</Link>
          
          <SignIn2
            email={email}
            setEmail={setEmail}
            password={password}
            setPassword={setPassword}
            error={error}
            loading={loading}
            onSubmit={handleSubmit}
            onGoogleSignIn={loginWithGoogle}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
          />

          <div className="mt-8 text-center opacity-0 animate-in fade-in slide-in-from-bottom-2 duration-1000 fill-mode-forwards" style={{ animationDelay: '0.5s' }}>
            <span className="text-[8px] text-zinc-700 uppercase tracking-[0.35em] font-light sans">
              NO ACCOUNT?{" "}
            </span>
            <Link 
              href={`/signup${nextUrl ? `?next=${encodeURIComponent(nextUrl)}` : ""}`}
              className="text-[8px] text-zinc-500 hover:text-white uppercase tracking-[0.4em] font-bold sans transition-all border-b border-white/0 hover:border-white/10 pb-0.5"
            >
              CREATE ONE
            </Link>
          </div>
        </div>
      </div>
    </>
  )
}