"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AccountSidebar } from "@/components/account-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/lib/toast-context"

import { useAuth } from "@/lib/auth-context"

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  })

  // Sync form data when user is loaded/restored
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
      })
    }
  }, [user])

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handlePasswordInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { success, message } = await updateProfile({
        firstName: formData.firstName,
        lastName: formData.lastName,
        phone: formData.phone,
      })

      if (success) {
        showToast("Profile updated successfully", "info")
      } else {
        showToast(message || "Failed to update profile", "info")
      }
    } catch (err) {
      showToast("An error occurred", "info")
    }
  }

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      showToast("Passwords do not match", "info")
      return
    }

    if (passwordData.newPassword.length < 6) {
      showToast("Password must be at least 6 characters", "info")
      return
    }

    setIsUpdatingPassword(true)
    try {
      const response = await fetch("http://localhost:5000/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      })

      const data = await response.json()
      if (response.ok) {
        showToast("Password updated successfully", "info")
        setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" })
      } else {
        showToast(data.error || "Failed to update password", "info")
      }
    } catch (err) {
      showToast("Network error. Please try again.", "info")
    } finally {
      setIsUpdatingPassword(false)
    }
  }

  return (
    <div className="bg-[#030303] text-[#e8e8e3] min-h-screen">
      <SiteHeader />

      <div className="pt-[72px]">
        <AccountSidebar>
          <div className="p-10 max-w-xl">
            {/* Header */}
            <div className="mb-10 pb-8 border-b border-white/10">
              <p className="uppercase tracking-[0.4em] text-xs text-gray-500 mb-2">Account</p>
              <h1 className="font-serif text-4xl font-light">Settings</h1>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-8">
              <div>
                <p className="uppercase tracking-widest text-xs text-gray-400 mb-5">Personal Information</p>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">First Name</label>
                      <Input
                        name="firstName"
                        value={formData.firstName}
                        onChange={handleInputChange}
                        required
                        className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white/50"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Last Name</label>
                      <Input
                        name="lastName"
                        value={formData.lastName}
                        onChange={handleInputChange}
                        required
                        className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white/50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Email Address</label>
                    <Input
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      required
                      className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white/50"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Phone (Optional)</label>
                    <Input
                      name="phone"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="bg-transparent border-white/20 text-white placeholder:text-gray-600 focus:border-white/50"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <Button
                  type="submit"
                  className="border border-white/40 bg-transparent uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all"
                >
                  Save Changes
                </Button>
                <Link
                  href="/account"
                  className="inline-flex items-center px-6 py-2 border border-white/10 uppercase tracking-widest text-xs text-gray-500 hover:text-white transition-colors"
                >
                  Cancel
                </Link>
              </div>
            </form>

            {/* Password Section */}
            <div className="mt-16 pt-10 border-t border-white/10">
              <form onSubmit={handlePasswordSubmit} className="space-y-8">
                <div>
                  <p className="uppercase tracking-widest text-xs text-gray-400 mb-5">Security</p>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Current Password</label>
                      <Input
                        name="currentPassword"
                        type="password"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordInputChange}
                        required
                        className="bg-transparent border-white/20 text-white focus:border-white/50"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">New Password</label>
                        <Input
                          name="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={handlePasswordInputChange}
                          required
                          className="bg-transparent border-white/20 text-white focus:border-white/50"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Confirm New Password</label>
                        <Input
                          name="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordInputChange}
                          required
                          className="bg-transparent border-white/20 text-white focus:border-white/50"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <Button
                    type="submit"
                    disabled={isUpdatingPassword}
                    className="border border-white/40 bg-transparent uppercase tracking-widest text-xs hover:bg-white hover:text-black transition-all disabled:opacity-50"
                  >
                    {isUpdatingPassword ? "Updating..." : "Update Password"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </AccountSidebar>
      </div>

      <SiteFooter />
    </div>
  )
}
