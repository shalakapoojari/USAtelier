"use client"

import type React from "react"
import { createContext, useContext, useState, useCallback, useRef } from "react"
import { CheckCircle, Heart, X, AlertTriangle, XCircle, Info, Truck } from "lucide-react"

type ToastType = "cart" | "wishlist" | "info" | "success" | "error" | "warning" | "dispatch"

type Toast = {
    id: string
    message: string
    subtext?: string
    type: ToastType
}

type ConfirmOptions = {
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: "danger" | "default"
}

type ToastContextType = {
    showToast: (message: string, type?: ToastType, subtext?: string) => void
    confirm: (options: ConfirmOptions) => Promise<boolean>
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

const ICON_MAP: Record<ToastType, React.ReactNode> = {
    cart: <CheckCircle size={15} className="text-white/70" />,
    wishlist: <Heart size={15} className="text-red-400 fill-red-400" />,
    info: <Info size={15} className="text-blue-400" />,
    success: <CheckCircle size={15} className="text-green-400" />,
    error: <XCircle size={15} className="text-red-400" />,
    warning: <AlertTriangle size={15} className="text-amber-400" />,
    dispatch: <Truck size={15} className="text-green-400" />,
}

const BORDER_MAP: Record<ToastType, string> = {
    cart: "border-white/10",
    wishlist: "border-red-400/20",
    info: "border-blue-400/20",
    success: "border-green-400/20",
    error: "border-red-400/20",
    warning: "border-amber-400/20",
    dispatch: "border-green-400/20",
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const [confirmState, setConfirmState] = useState<{
        open: boolean
        options: ConfirmOptions
        resolve: ((value: boolean) => void) | null
    }>({ open: false, options: { title: "", message: "" }, resolve: null })

    const showToast = useCallback((message: string, type: ToastType = "cart", subtext?: string) => {
        const id = Date.now().toString() + Math.random().toString(36).slice(2, 5)
        setToasts((prev) => [...prev.slice(-4), { id, message, type, subtext }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 3800)
    }, [])

    const confirm = useCallback((options: ConfirmOptions): Promise<boolean> => {
        return new Promise((resolve) => {
            setConfirmState({ open: true, options, resolve })
        })
    }, [])

    const handleConfirm = (value: boolean) => {
        confirmState.resolve?.(value)
        setConfirmState({ open: false, options: { title: "", message: "" }, resolve: null })
    }

    const dismiss = (id: string) => setToasts((prev) => prev.filter((t) => t.id !== id))

    return (
        <ToastContext.Provider value={{ showToast, confirm }}>
            {children}

            {/* ── Toast stack ── */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map((toast, i) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex items-start gap-3 bg-[#0a0a0a]/95 border ${BORDER_MAP[toast.type]} px-5 py-4 shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl min-w-[280px] max-w-[380px] rounded-sm`}
                        style={{
                            animation: "toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                            WebkitAnimation: "toastSlideIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                    >
                        <div className="mt-0.5 shrink-0">
                            {ICON_MAP[toast.type]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[11px] uppercase tracking-[0.15em] text-white leading-snug font-medium">{toast.message}</p>
                            {toast.subtext && (
                                <p className="text-[10px] text-gray-500 mt-1 leading-relaxed break-words">{toast.subtext}</p>
                            )}
                        </div>
                        <button
                            onClick={() => dismiss(toast.id)}
                            className="text-gray-600 hover:text-white transition-colors shrink-0 mt-0.5"
                        >
                            <X size={12} />
                        </button>
                    </div>
                ))}
            </div>

            {/* ── Confirmation modal ── */}
            {confirmState.open && (
                <div
                    className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
                    style={{
                        animation: "fadeIn 0.2s ease-out",
                        WebkitAnimation: "fadeIn 0.2s ease-out",
                    }}
                >
                    <div
                        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                        onClick={() => handleConfirm(false)}
                    />
                    <div
                        className="relative bg-[#0e0e0e] border border-white/10 p-8 max-w-md w-full shadow-[0_40px_80px_rgba(0,0,0,0.8)]"
                        style={{
                            animation: "modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                            WebkitAnimation: "modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
                        }}
                    >
                        <div className="flex items-start gap-4 mb-6">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                                confirmState.options.variant === "danger"
                                    ? "bg-red-500/10 border border-red-500/20"
                                    : "bg-white/5 border border-white/10"
                            }`}>
                                {confirmState.options.variant === "danger" ? (
                                    <AlertTriangle size={18} className="text-red-400" />
                                ) : (
                                    <Info size={18} className="text-white/60" />
                                )}
                            </div>
                            <div>
                                <h3 className="text-sm font-medium text-white uppercase tracking-widest mb-2">
                                    {confirmState.options.title}
                                </h3>
                                <p className="text-[11px] text-gray-400 leading-relaxed tracking-wide">
                                    {confirmState.options.message}
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={() => handleConfirm(false)}
                                className="px-6 py-3 border border-white/10 text-[10px] uppercase tracking-widest text-gray-400 hover:text-white hover:border-white/30 transition-all"
                            >
                                {confirmState.options.cancelLabel || "Cancel"}
                            </button>
                            <button
                                onClick={() => handleConfirm(true)}
                                className={`px-6 py-3 text-[10px] uppercase tracking-widest transition-all font-medium ${
                                    confirmState.options.variant === "danger"
                                        ? "bg-red-500/80 text-white hover:bg-red-500 border border-red-500/50"
                                        : "bg-white text-black hover:bg-white/90 border border-white/50"
                                }`}
                            >
                                {confirmState.options.confirmLabel || "Confirm"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes toastSlideIn {
                    from { transform: translateX(110%); opacity: 0; }
                    to   { transform: translateX(0);    opacity: 1; }
                }
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to   { opacity: 1; }
                }
                @keyframes modalSlideUp {
                    from { transform: translateY(16px); opacity: 0; }
                    to   { transform: translateY(0);    opacity: 1; }
                }
            `}</style>
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error("useToast must be used within ToastProvider")
    return ctx
}
