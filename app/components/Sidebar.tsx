"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "./ThemeProvider"
import { useAuth } from "./SupabaseAuthProvider"
import LogoutDialog from "./LogoutDialog"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
  { href: "/assessment/pre-test", label: "Pre-test", icon: "🧪" },
  { href: "/songs", label: "Song Lyrics", icon: "🎵" },
  { href: "/lessons", label: "Typing Lessons", icon: "⌨️" },
  { href: "/guide", label: "Typing Guide", icon: "🖐️" },
  { href: "/achievements", label: "Achievements", icon: "🏆" },
  { href: "/challenges", label: "Daily Challenges", icon: "🎯" },
  { href: "/research", label: "Research Analytics", icon: "📈" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
]

export default function Sidebar() {
  const pathname = usePathname()
  const { theme, toggleTheme } = useTheme()
  const { profile } = useAuth()
  const [showLogoutDialog, setShowLogoutDialog] = useState(false)

  return (
    <aside className="fixed left-0 top-0 h-full w-64 p-4 flex flex-col" style={{ background: "var(--card-bg)", borderRight: "1px solid var(--card-border)" }}>
      <div className="mb-8 px-2">
        <h1 className="text-2xl font-bold" style={{ color: "var(--primary)" }}>
          ⌨️ TypeMaster
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
          Lemery Senior High School
        </p>
      </div>

      {profile && (
        <div className="mb-6 p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: "var(--primary)" }}>
              {(profile.username as string)?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-semibold text-sm">{profile.username as string}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Level {profile.level as number} • {profile.xp as number} XP
              </p>
            </div>
          </div>
        </div>
      )}

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? "active" : ""}`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </Link>
        ))}
      </nav>

      {profile?.role === "admin" && (
        <Link href="/admin/assessments" className={`sidebar-link ${pathname.startsWith("/admin") ? "active" : ""}`}>
          <span className="text-xl">🛡️</span><span className="font-medium">Admin results</span>
        </Link>
      )}

      <div className="space-y-2">
        <button
          onClick={toggleTheme}
          className="sidebar-link w-full"
        >
          <span className="text-xl">{theme === "dark" ? "☀️" : "🌙"}</span>
          <span className="font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <button
          onClick={() => setShowLogoutDialog(true)}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-semibold transition-all hover:scale-105"
          style={{ 
            background: "var(--error)",
            color: "white"
          }}
        >
          <span className="text-xl">🚪</span>
          <span>Logout</span>
        </button>
      </div>

      <LogoutDialog
        isOpen={showLogoutDialog}
        onClose={() => setShowLogoutDialog(false)}
      />
    </aside>
  )
}
