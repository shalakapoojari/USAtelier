"use client"

import * as React from "react"
import { LogIn, Lock, Mail, Eye, EyeOff } from "lucide-react"

interface SignIn2Props {
  email: string
  setEmail: (val: string) => void
  password: string
  setPassword: (val: string) => void
  error?: string
  loading?: boolean
  onSubmit: (e: React.FormEvent) => void
  onGoogleSignIn: () => void
  showPassword?: boolean
  setShowPassword?: (val: boolean) => void
}

const SignIn2 = ({
  email,
  setEmail,
  password,
  setPassword,
  error,
  loading,
  onSubmit,
  onGoogleSignIn,
  showPassword,
  setShowPassword,
}: SignIn2Props) => {
  return (
    <div className="flex items-center justify-center bg-transparent z-1 antialiased px-4">
      <div className="w-full max-w-[340px] bg-neutral-950/40 backdrop-blur-3xl rounded-3xl p-8 md:p-10 flex flex-col items-center border border-white/5 shadow-2xl relative overflow-hidden group/card">
        {/* Subtle glow effect */}
        <div className="absolute -top-20 -right-20 w-40 h-40 bg-white/5 blur-[80px] pointer-events-none group-hover/card:bg-white/10 transition-all duration-1000" />
        
        <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-white/5 mb-6 border border-white/10 shadow-lg relative z-10 transition-transform duration-700 group-hover/card:scale-105">
          <LogIn className="w-5 h-5 text-zinc-300 font-light" />
        </div>
        
        <h2 className="text-xl mb-2 text-center text-white tracking-[0.3em] serif font-light">
          WELCOME
        </h2>
        <p className="text-zinc-500 text-[8px] mb-8 text-center uppercase tracking-[0.4em] leading-relaxed sans font-medium opacity-70">
          Authorized personnel only
        </p>

        <form onSubmit={onSubmit} className="w-full flex flex-col gap-4 mb-4 relative z-10">
          <div className="relative group">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-700 transition-colors group-focus-within:text-zinc-400">
              <Mail className="w-3 h-3" />
            </span>
            <input
              placeholder="EMAIL ADDRESS"
              type="email"
              value={email}
              required
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-white/5 focus:outline-none focus:ring-[0.5px] focus:ring-white/10 bg-white/[0.01] text-white text-[10px] transition-all placeholder:text-zinc-800 sans tracking-[0.2em] font-light"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative group">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-700 transition-colors group-focus-within:text-zinc-400">
              <Lock className="w-3 h-3" />
            </span>
            <input
              placeholder="PASSWORD"
              type={showPassword ? "text" : "password"}
              value={password}
              required
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-white/5 focus:outline-none focus:ring-[0.5px] focus:ring-white/10 bg-white/[0.01] text-white text-[10px] transition-all placeholder:text-zinc-800 sans tracking-[0.2em] font-light"
              onChange={(e) => setPassword(e.target.value)}
            />
            {setShowPassword && (
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-700 hover:text-zinc-400 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            )}
          </div>

          <div className="w-full flex flex-col gap-2">
            {error && (
              <div className="text-[8px] text-red-500/60 font-medium uppercase tracking-[0.2em] text-center mt-1 sans">
                {error}
              </div>
            )}
            <div className="flex justify-end">
              <button type="button" className="text-[7px] text-zinc-700 hover:text-zinc-400 transition-all uppercase tracking-[0.3em] sans font-medium">
                Forgot password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-semibold py-3.5 rounded-xl shadow-xl hover:bg-zinc-200 active:scale-[0.98] transition-all mb-1 mt-4 text-[9px] uppercase tracking-[0.5em] relative overflow-hidden group/btn"
          >
            {loading ? (
               <span className="flex items-center justify-center gap-2 sans">
                  <span className="w-3 h-3 border border-black/20 border-t-black rounded-full animate-spin" />
                  AUTH...
               </span>
            ) : (
              <span className="relative z-10 sans">SIGN IN</span>
            )}
          </button>
        </form>

        <div className="flex items-center w-full my-4 opacity-20">
          <div className="flex-grow border-t border-white/20"></div>
          <span className="mx-3 text-[7px] text-zinc-500 uppercase tracking-[0.3em] sans">OR</span>
          <div className="flex-grow border-t border-white/20"></div>
        </div>

        <div className="flex w-full mt-1 relative z-10">
          <button
            type="button"
            onClick={onGoogleSignIn}
            className="flex items-center justify-center w-full h-12 rounded-xl border border-white/5 bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/10 transition-all group/google"
          >
            <div className="flex items-center gap-3">
              <svg width="14" height="14" viewBox="0 0 24 24" className="filter grayscale opacity-40 group-hover/google:grayscale-0 group-hover/google:opacity-100 transition-all duration-700">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              <span className="text-zinc-600 text-[8px] uppercase tracking-[0.3em] font-medium group-hover/google:text-zinc-300 transition-all sans">CONTINUE WITH GOOGLE</span>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}

export { SignIn2 }
