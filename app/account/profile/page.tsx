"use client"

import type React from "react"
import { useState, useEffect } from "react"
import Link from "next/link"

import { SiteHeader } from "@/components/site-header"
import { SiteFooter } from "@/components/site-footer"
import { AccountSidebar } from "@/components/account-sidebar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Eye, EyeOff, User as UserIcon, Camera, Loader2 } from "lucide-react"
import { useToast } from "@/lib/toast-context"

import { useAuth } from "@/lib/auth-context"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:5000"

export default function ProfilePage() {
  const { user, updateProfile } = useAuth()
  const { showToast } = useToast()

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    profilePic: "",
  })

  const [isUploading, setIsUploading] = useState(false)

  // Sync form data when user is loaded/restored
  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || "",
        lastName: user.lastName || "",
        email: user.email || "",
        phone: user.phone || "",
        profilePic: user.profilePic || "",
      })
    }
  }, [user])

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)

    try {
      // Use existing cloudinary upload endpoint if available, but for profile we might need a general one
      // Re-using the /api/upload but that's for admins currently. 
      // Let's create a specific profile pic upload or ensure /api/upload works for users
      const response = await fetch(`${API_BASE}/api/upload/profile`, {
        method: "POST",
        credentials: "include",
        body: formData,
      })

      const data = await response.json()
      if (response.ok) {
        setFormData(prev => ({ ...prev, profilePic: data.url }))
        showToast("Image uploaded. Save changes to finalize.", "info")
      } else {
        showToast(data.error || "Upload failed", "info")
      }
    } catch (err) {
      showToast("Network error", "info")
    } finally {
      setIsUploading(false)
    }
  }

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  })

  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

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
        profilePic: formData.profilePic,
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
      const response = await fetch(`${API_BASE}/api/auth/change-password`, {
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
        showToast(data.message || "Password updated successfully", "info")
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

      <div className="pt-52">
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
                <p className="uppercase tracking-widest text-xs text-gray-400 mb-8">Personal Information</p>

                {/* Profile Picture Upload */}
                <div className="flex items-center gap-8 mb-10">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-full overflow-hidden border border-white/10 bg-white/5 flex items-center justify-center">
                      {formData.profilePic ? (
                        <img src={formData.profilePic} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon size={32} className="text-gray-600" />
                      )}

                      {isUploading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                          <Loader2 className="animate-spin text-white" size={20} />
                        </div>
                      )}
                    </div>

                    <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-white text-black flex items-center justify-center cursor-pointer hover:bg-gray-200 transition-colors shadow-lg">
                      <Camera size={14} />
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploading}
                      />
                    </label>
                  </div>

                  <div>
                    <h3 className="text-sm uppercase tracking-widest mb-1">Your Avatar</h3>
                    <p className="text-[10px] text-gray-500 uppercase tracking-widest">
                      Upload a square image for best results.
                    </p>
                  </div>
                </div>
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
                      <div className="relative">
                        <Input
                          name="currentPassword"
                          type={showCurrentPassword ? "text" : "password"}
                          value={passwordData.currentPassword}
                          onChange={handlePasswordInputChange}
                          required
                          className="bg-transparent border-white/20 text-white focus:border-white/50 pr-10"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                        >
                          {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">New Password</label>
                        <div className="relative">
                          <Input
                            name="newPassword"
                            type={showNewPassword ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={handlePasswordInputChange}
                            required
                            className="bg-transparent border-white/20 text-white focus:border-white/50 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                          >
                            {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[10px] uppercase tracking-widest text-gray-500 mb-1.5">Confirm New Password</label>
                        <div className="relative">
                          <Input
                            name="confirmPassword"
                            type={showConfirmPassword ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={handlePasswordInputChange}
                            required
                            className="bg-transparent border-white/20 text-white focus:border-white/50 pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                          >
                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                          </button>
                        </div>
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
