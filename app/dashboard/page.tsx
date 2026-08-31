"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "../components/SupabaseAuthProvider"
import Link from "next/link"
import { AssessmentStatus } from "@/lib/assessment"

interface Stats {
  bestWpm: number
  bestAccuracy: number
  totalPracticeTime: number
  totalWordsTyped: number
  currentStreak: number
  longestStreak: number
  level: number
  xp: number
}

interface Session {
  id: string
  wpm: number
  accuracy: number
  duration: number
  words_typed: number
  created_at: string
}

export default function DashboardPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [stats, setStats] = useState<Stats | null>(null)
  const [recentSessions, setRecentSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [assessments, setAssessments] = useState<AssessmentStatus>({ pre: null, post: null, storage: "local" })

  useEffect(() => {
    if (!authLoading && !profile) {
      router.push("/login")
    }
  }, [authLoading, profile, router])

  async function fetchDashboardData() {
    try {
      const sessionsRes = await fetch("/api/practice")
      const sessions: Session[] = await sessionsRes.json()
      setRecentSessions(sessions.slice(0, 5))

      const userRes = await fetch("/api/user")
      if (userRes.ok) {
        const userData = await userRes.json()
        setStats(userData)
      }
      const assessmentRes = await fetch("/api/assessments")
      const remoteAssessments = assessmentRes.ok ? await assessmentRes.json() : null
       setAssessments({
         pre: remoteAssessments?.pre || null,
         post: remoteAssessments?.post || null,
         storage: remoteAssessments?.storage === "database" ? "database" : "local",
      })
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (profile) Promise.resolve().then(fetchDashboardData)
  }, [profile])

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    )
  }

  const xpForNextLevel = (stats?.level || 1) * 500
  const xpProgress = ((stats?.xp || 0) % 500) / 5

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome back, {(profile?.username as string)}!</h1>
        <p style={{ color: "var(--text-muted)" }}>Here&apos;s your typing progress overview</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ background: "rgba(108, 99, 255, 0.15)" }}>
              ⚡
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Best WPM</p>
              <p className="text-2xl font-bold">{stats?.bestWpm || 0}</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ background: "rgba(0, 200, 83, 0.15)" }}>
              🎯
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Best Accuracy</p>
              <p className="text-2xl font-bold">{stats?.bestAccuracy || 0}%</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ background: "rgba(255, 179, 0, 0.15)" }}>
              🔥
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Current Streak</p>
              <p className="text-2xl font-bold">{stats?.currentStreak || 0} days</p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl" style={{ background: "rgba(0, 217, 255, 0.15)" }}>
              ⌨️
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Total Words</p>
              <p className="text-2xl font-bold">{stats?.totalWordsTyped || 0}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold">Level {stats?.level || 1}</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {stats?.xp || 0} / {xpForNextLevel} XP
            </p>
          </div>
          <div className="text-4xl">🏅</div>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${xpProgress}%` }}></div>
        </div>
      </div>

      <div className="card mb-8" style={{ borderColor: assessments.pre ? "var(--success)" : "var(--warning)" }}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold mb-1">Assessment checkpoint</h2>
            <p className="text-sm" style={{ color: "var(--text-muted)" }}>
              {assessments.pre ? "Pre-test complete. Practice is unlocked." : "Take a short pre-test before starting practice."}
            </p>
          </div>
          <div className="flex gap-3">
            {!assessments.pre && <Link href="/assessment/pre-test" className="btn-primary">Take pre-test</Link>}
            {assessments.pre && !assessments.post && (stats?.level || 1) >= 2 && <Link href="/assessment/post-test" className="btn-secondary">Post-test unlocked</Link>}
            {assessments.pre && !assessments.post && (stats?.level || 1) < 2 && <span className="badge">Reach Level 2 to unlock post-test</span>}
            {assessments.post && <span className="badge badge-success">Both complete</span>}
          </div>
        </div>
      </div>

      {assessments.pre && assessments.post && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Pre-test vs Post-test</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div><p className="text-sm" style={{ color: "var(--text-muted)" }}>WPM improvement</p><p className="text-2xl font-bold">{assessments.post.wpm - assessments.pre.wpm >= 0 ? "+" : ""}{assessments.post.wpm - assessments.pre.wpm}</p></div>
            <div><p className="text-sm" style={{ color: "var(--text-muted)" }}>Accuracy improvement</p><p className="text-2xl font-bold">{(assessments.post.accuracy - assessments.pre.accuracy).toFixed(2)}%</p></div>
            <div><p className="text-sm" style={{ color: "var(--text-muted)" }}>Errors reduced</p><p className="text-2xl font-bold">{assessments.pre.errors - assessments.post.errors}</p></div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">Recent Activity</h2>
          {recentSessions.length === 0 ? (
            <p style={{ color: "var(--text-muted)" }}>No practice sessions yet. Start typing!</p>
          ) : (
            <div className="space-y-3">
              {recentSessions.map((session) => (
                <div key={session.id} className="flex items-center justify-between p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
                  <div>
                    <p className="font-semibold">{session.wpm} WPM</p>
                    <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                      {session.accuracy}% accuracy • {session.words_typed} words
                    </p>
                  </div>
                  <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                    {new Date(session.created_at).toLocaleDateString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link href="/songs" aria-disabled={!assessments.pre} className={`btn-primary w-full text-center block ${!assessments.pre ? "pointer-events-none opacity-50" : ""}`}>
              🎵 Practice Songs
            </Link>
            <Link href="/lessons" aria-disabled={!assessments.pre} className={`btn-secondary w-full text-center block ${!assessments.pre ? "pointer-events-none opacity-50" : ""}`}>
              ⌨️ Typing Lessons
            </Link>
            <Link href="/challenges" aria-disabled={!assessments.pre} className={`btn-secondary w-full text-center block ${!assessments.pre ? "pointer-events-none opacity-50" : ""}`}>
              🎯 Daily Challenge
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
