"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useTheme } from "./ThemeProvider"
import { signOut, useSession } from "next-auth/react"

interface ExtendedUser {
  id: string
  username: string
  studentId: string
  profilePicture: string | null
  level: number
  xp: number
}

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: "📊" },
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
  const { data: session } = useSession()

  const user = session?.user as ExtendedUser | undefined

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

      {user && (
        <div className="mb-6 p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-lg" style={{ background: "var(--primary)" }}>
              {user.username?.[0]?.toUpperCase() || "U"}
            </div>
            <div>
              <p className="font-semibold text-sm">{user.username}</p>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Level {user.level} • {user.xp} XP
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

      <div className="space-y-2">
        <button
          onClick={toggleTheme}
          className="sidebar-link w-full"
        >
          <span className="text-xl">{theme === "dark" ? "☀️" : "🌙"}</span>
          <span className="font-medium">{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </button>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="sidebar-link w-full"
        >
          <span className="text-xl">🚪</span>
          <span className="font-medium">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
