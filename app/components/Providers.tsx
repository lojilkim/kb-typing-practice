"use client"

import { ThemeProvider } from "./ThemeProvider"
import { SupabaseAuthProvider } from "./SupabaseAuthProvider"

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SupabaseAuthProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SupabaseAuthProvider>
  )
}
