"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./SupabaseAuthProvider"

interface LogoutDialogProps {
  isOpen: boolean
  onClose: () => void
}

export default function LogoutDialog({ isOpen, onClose }: LogoutDialogProps) {
  const router = useRouter()
  const { signOut } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [hasUnfinishedSession, setHasUnfinishedSession] = useState(false)

  // Check for unfinished session when dialog opens
  useState(() => {
    if (isOpen) {
      const unfinishedSession = localStorage.getItem("unfinishedTypingSession")
      setHasUnfinishedSession(!!unfinishedSession)
    }
  })

  const handleLogout = async () => {
    setIsLoggingOut(true)

    try {
      // Auto-save any in-progress data
      const unfinishedSession = localStorage.getItem("unfinishedTypingSession")
      
      if (unfinishedSession) {
        try {
          const sessionData = JSON.parse(unfinishedSession)
          
          // Save the session to the server
          await fetch("/api/practice", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              ...sessionData,
              autoSaved: true,
            }),
          })
          
          // Clear the unfinished session
          localStorage.removeItem("unfinishedTypingSession")
        } catch (error) {
          console.error("Failed to auto-save session:", error)
        }
      }

      // Sign out
      await signOut()
      
      // Redirect to login
      router.push("/login")
    } catch (error) {
      console.error("Logout error:", error)
    } finally {
      setIsLoggingOut(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="card max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold mb-4">Log Out Confirmation</h2>
        
        <div className="mb-6">
          <p className="text-lg mb-2">Are you sure you want to log out?</p>
          <p style={{ color: "var(--text-muted)" }}>
            Your typing progress has been automatically saved.
          </p>
          
          {hasUnfinishedSession && (
            <div className="mt-4 p-3 rounded-lg" style={{ background: "rgba(108, 99, 255, 0.1)", border: "1px solid var(--primary)" }}>
              <p className="text-sm" style={{ color: "var(--primary)" }}>
                💾 Your current session has been saved. You can continue where you left off the next time you log in.
              </p>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoggingOut}
            className="btn-secondary flex-1"
          >
            Cancel
          </button>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="btn-primary flex-1"
            style={{ background: "var(--error)" }}
          >
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>
      </div>
    </div>
  )
}
