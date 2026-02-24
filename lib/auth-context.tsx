"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

const API_BASE = "http://localhost:5000"

type User = {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  role: "user" | "admin"
}

type AuthContextType = {
  user: User | null
  login: (email: string, password: string) => Promise<{ success: boolean; user?: User; message?: string }>
  signup: (email: string, password: string, firstName: string, lastName: string, phone: string) => Promise<{ success: boolean; user?: User; message?: string }>
  updateProfile: (data: { firstName: string; lastName: string; phone: string }) => Promise<{ success: boolean; message: string }>
  logout: () => void
  isAuthenticated: boolean
  isAdmin: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  // On mount: restore session from Flask server
  useEffect(() => {
    const restore = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/user`, {
          credentials: "include",
        })
        if (res.ok) {
          const data = await res.json()
          if (data.user) {
            const restored: User = {
              id: data.id || "",
              email: data.user,
              firstName: data.firstName || data.user.split("@")[0],
              lastName: data.lastName || "",
              phone: data.phone || "",
              role: data.isAdmin ? "admin" : "user",
            }
            setUser(restored)
          }
        }
      } catch {
        // Flask not reachable — stay logged out
      }
    }
    restore()
  }, [])

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; user?: User; message?: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        const loggedIn: User = {
          id: data.id || "",
          email: data.user || email,
          firstName: data.firstName || email.split("@")[0],
          lastName: data.lastName || "",
          phone: data.phone || "",
          role: data.isAdmin ? "admin" : "user",
        }
        setUser(loggedIn)
        return { success: true, user: loggedIn }
      }

      return { success: false, message: data.error || "Invalid credentials" }
    } catch {
      return { success: false, message: "Cannot reach server. Is the Flask app running?" }
    }
  }

  const signup = async (
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    phone: string
  ): Promise<{ success: boolean; user?: User; message?: string }> => {
    if (!email || !password) {
      return { success: false, message: "Email and password are required" }
    }
    if (password.length < 6) {
      return { success: false, message: "Password must be at least 6 characters" }
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: email.trim().toLowerCase(), password, firstName, lastName, phone }),
      })

      const data = await res.json()

      if (res.ok && data.success) {
        const newUser: User = {
          id: data.id || "",
          email: data.user || email,
          firstName: firstName,
          lastName: lastName,
          phone: phone || data.phone || "",
          role: "user",
        }
        setUser(newUser)
        return { success: true, user: newUser }
      }

      return { success: false, message: data.error || "Unable to create account" }
    } catch {
      return { success: false, message: "Cannot reach server. Is the Flask app running?" }
    }
  }

  const updateProfile = async (data: { firstName: string; lastName: string; phone: string }): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${API_BASE}/api/auth/user`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      })

      const json = await res.json()
      if (res.ok && json.success) {
        if (user) {
          setUser({ ...user, ...data })
        }
        return { success: true, message: json.message }
      }
      return { success: false, message: json.error || "Update failed" }
    } catch {
      return { success: false, message: "Network error" }
    }
  }

  const logout = async () => {
    try {
      await fetch(`${API_BASE}/api/auth/logout`, {
        method: "POST",
        credentials: "include",
      })
    } catch {
      // Ignore network errors on logout
    }
    setUser(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        login,
        signup,
        updateProfile,
        logout,
        isAuthenticated: !!user,
        isAdmin: user?.role === "admin",
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
