"use client"

import { useState } from "react"
import { useAuth } from "../components/SupabaseAuthProvider"
import { useTheme } from "../components/ThemeProvider"

export default function SettingsPage() {
  const { profile, loading: authLoading } = useAuth()
  const { theme, toggleTheme } = useTheme()
  const [fontSize, setFontSize] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("fontSize")
      return saved ? parseInt(saved) : 16
    }
    return 16
  })
  const [volume, setVolume] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("volume")
      return saved ? parseInt(saved) : 70
    }
    return 70
  })
  const [saved, setSaved] = useState(false)

  const handleFontSizeChange = (value: number) => {
    setFontSize(value)
    localStorage.setItem("fontSize", value.toString())
    document.documentElement.style.fontSize = `${value}px`
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleVolumeChange = (value: number) => {
    setVolume(value)
    localStorage.setItem("volume", value.toString())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">⚙️ Settings</h1>
        <p style={{ color: "var(--text-muted)" }}>Customize your typing experience</p>
      </div>

      {saved && (
        <div className="mb-4 p-3 rounded-lg text-center" style={{ background: "rgba(0, 200, 83, 0.1)", color: "var(--success)" }}>
          ✓ Settings saved
        </div>
      )}

      <div className="space-y-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Appearance</h2>

          <div className="mb-6">
            <label className="block text-sm font-medium mb-3">Theme</label>
            <div className="flex gap-3">
              <button
                onClick={theme === "dark" ? undefined : toggleTheme}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${theme === "dark" ? "border-[var(--primary)]" : "border-[var(--card-border)]"}`}
                style={{ background: "var(--secondary)" }}
              >
                <div className="text-2xl mb-2">🌙</div>
                <p className="font-semibold">Dark Mode</p>
              </button>
              <button
                onClick={theme === "light" ? undefined : toggleTheme}
                className={`flex-1 p-4 rounded-lg border-2 transition-all ${theme === "light" ? "border-[var(--primary)]" : "border-[var(--card-border)]"}`}
                style={{ background: "var(--secondary)" }}
              >
                <div className="text-2xl mb-2">☀️</div>
                <p className="font-semibold">Light Mode</p>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-3">
              Font Size: {fontSize}px
            </label>
            <input
              type="range"
              min="12"
              max="24"
              value={fontSize}
              onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--primary)" }}
            />
            <div className="flex justify-between text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              <span>Small</span>
              <span>Large</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Audio</h2>
          <div>
            <label className="block text-sm font-medium mb-3">
              Background Music Volume: {volume}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={(e) => handleVolumeChange(parseInt(e.target.value))}
              className="w-full"
              style={{ accentColor: "var(--primary)" }}
            />
            <div className="flex justify-between text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              <span>Mute</span>
              <span>Max</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Account</h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Username</p>
              <p className="font-semibold">{profile ? (profile.username as string) : "Loading..."}</p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Student ID</p>
              <p className="font-semibold">LSH-ICT-2024</p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">About</h2>
          <div className="space-y-2 text-sm" style={{ color: "var(--text-muted)" }}>
            <p><strong>TypeMaster</strong> - Keyboard Typing Practice System</p>
            <p>Designed for Grade 12 ICT Students</p>
            <p>Lemery Senior High School</p>
            <p className="mt-4">Version 1.0.0</p>
          </div>
        </div>
      </div>
    </div>
  )
}
