import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms & Conditions - U.S ATELIER",
  description: "Terms and Conditions for U.S Atelier",
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
