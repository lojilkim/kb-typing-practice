"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../components/SupabaseAuthProvider"
import { useRouter } from "next/navigation"
import Sidebar from "../components/Sidebar"

interface ResearchData {
  overview: {
    totalSessions: number
    totalTimeMinutes: number
    overallAccuracy: number
    averageWpm: number
    bestWpm: number
    bestAccuracy: number
    currentStreak: number
    longestStreak: number
    practiceDaysLast30: number
  }
  musicUsage: {
    sessionsWithMusic: number
    totalSessions: number
    usageRate: number
  }
  fingerStats: Array<{
    finger: string
    accuracy: number
    totalKeystrokes: number
    correctKeystrokes: number
  }>
  errorPatterns: {
    byRow: Record<string, number>
    byHand: Record<string, number>
    totalErrors: number
    mostCommonErrors: Array<{
      expected: string
      typed: string
      finger: string | null
      row: string | null
      hand: string | null
    }>
  }
  improvementTrend: Array<{
    week: string
    avgWpm: number
    avgAccuracy: number
  }>
  practiceCalendar: Array<{
    date: string
    practiceMinutes: number
    sessionsCount: number
    wordsTyped: number
    averageWpm: number
    averageAccuracy: number
  }>
  recentSessions: Array<{
    date: string
    wpm: number
    accuracy: number
    duration: number
    wordsTyped: number
    songTitle: string | null
    lessonName: string | null
    musicEnabled: boolean
  }>
}

export default function ResearchPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [data, setData] = useState<ResearchData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !profile) router.push("/login")
  }, [authLoading, profile, router])

  useEffect(() => {
    if (profile) {
      const fetchResearchData = async () => {
        try {
          const res = await fetch("/api/research")
          const result = await res.json()
          setData(result)
        } catch (error) {
          console.error("Failed to fetch research data:", error)
        } finally {
          setLoading(false)
        }
      }
      fetchResearchData()
    }
  }, [profile])

  const exportData = async () => {
    try {
      const res = await fetch("/api/research/export")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "typing-research-data.csv"
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Failed to export data:", error)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 flex items-center justify-center">
          <div className="text-xl" style={{ color: "var(--text-muted)" }}>Loading research data...</div>
        </main>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 p-8 flex items-center justify-center">
          <div className="text-xl" style={{ color: "var(--error)" }}>Failed to load research data</div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">📊 Research Analytics</h1>
              <p style={{ color: "var(--text-muted)" }}>
                Data for &quot;The Relationship Between Keyboard Typing Practice System Use and Typing Accuracy&quot;
              </p>
            </div>
            <button onClick={exportData} className="btn-primary">
              📥 Export Data (CSV)
            </button>
          </div>

          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="card">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>Total Sessions</p>
              <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>{data.overview.totalSessions}</p>
            </div>
            <div className="card">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>Total Practice Time</p>
              <p className="text-3xl font-bold" style={{ color: "var(--primary)" }}>{data.overview.totalTimeMinutes} min</p>
            </div>
            <div className="card">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>Overall Accuracy</p>
              <p className="text-3xl font-bold" style={{ color: "var(--success)" }}>{data.overview.overallAccuracy}%</p>
            </div>
            <div className="card">
              <p className="text-sm mb-1" style={{ color: "var(--text-muted)" }}>Average WPM</p>
              <p className="text-3xl font-bold" style={{ color: "var(--accent)" }}>{data.overview.averageWpm}</p>
            </div>
          </div>

          {/* Music Usage & Streak */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card">
              <h3 className="font-bold mb-3">🎵 Music Usage</h3>
              <p className="text-2xl font-bold mb-1">{data.musicUsage.usageRate}%</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                {data.musicUsage.sessionsWithMusic} of {data.musicUsage.totalSessions} sessions with music
              </p>
              <div className="progress-bar mt-3">
                <div className="progress-bar-fill" style={{ width: `${data.musicUsage.usageRate}%` }}></div>
              </div>
            </div>
            <div className="card">
              <h3 className="font-bold mb-3">🔥 Current Streak</h3>
              <p className="text-2xl font-bold mb-1">{data.overview.currentStreak} days</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Longest: {data.overview.longestStreak} days
              </p>
            </div>
            <div className="card">
              <h3 className="font-bold mb-3">📅 Practice Frequency</h3>
              <p className="text-2xl font-bold mb-1">{data.overview.practiceDaysLast30} days</p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Active in last 30 days
              </p>
            </div>
          </div>

          {/* Finger Statistics */}
          <div className="card mb-8">
            <h2 className="text-xl font-bold mb-4">🖐️ Finger Accuracy Analysis</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              {data.fingerStats.map((stat) => (
                <div key={stat.finger} className="p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
                  <p className="text-sm font-medium capitalize mb-2">{stat.finger}</p>
                  <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>
                    {stat.accuracy}%
                  </p>
                  <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                    {stat.correctKeystrokes}/{stat.totalKeystrokes} keys
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Error Patterns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="card">
              <h2 className="text-xl font-bold mb-4">⌨️ Errors by Row</h2>
              <div className="space-y-3">
                {Object.entries(data.errorPatterns.byRow).map(([row, count]) => (
                  <div key={row}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{row} Row</span>
                      <span>{count} errors</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${(count / data.errorPatterns.totalErrors) * 100}%`,
                          background: "var(--error)",
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="text-xl font-bold mb-4">🤚 Errors by Hand</h2>
              <div className="space-y-3">
                {Object.entries(data.errorPatterns.byHand).map(([hand, count]) => (
                  <div key={hand}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="capitalize">{hand} Hand</span>
                      <span>{count} errors</span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className="progress-bar-fill"
                        style={{
                          width: `${(count / data.errorPatterns.totalErrors) * 100}%`,
                          background: "var(--warning)",
                        }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Improvement Trend */}
          <div className="card mb-8">
            <h2 className="text-xl font-bold mb-4">📈 Improvement Trend</h2>
            {data.improvementTrend.length > 0 ? (
              <div className="space-y-2">
                {data.improvementTrend.map((week) => (
                  <div key={week.week} className="flex items-center gap-4 p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
                    <span className="text-sm font-medium w-20">{week.week}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span>WPM: {week.avgWpm}</span>
                        <span>Accuracy: {week.avgAccuracy}%</span>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1 progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${week.avgWpm}%` }}></div>
                        </div>
                        <div className="flex-1 progress-bar">
                          <div className="progress-bar-fill" style={{ width: `${week.avgAccuracy}%`, background: "var(--success)" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: "var(--text-muted)" }}>No trend data available yet</p>
            )}
          </div>

          {/* Recent Sessions */}
          <div className="card">
            <h2 className="text-xl font-bold mb-4">🕐 Recent Practice Sessions</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm" style={{ color: "var(--text-muted)" }}>
                    <th className="pb-3">Date</th>
                    <th className="pb-3">WPM</th>
                    <th className="pb-3">Accuracy</th>
                    <th className="pb-3">Duration</th>
                    <th className="pb-3">Words</th>
                    <th className="pb-3">Activity</th>
                    <th className="pb-3">Music</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentSessions.map((session, index) => (
                    <tr key={index} className="border-t" style={{ borderColor: "var(--card-border)" }}>
                      <td className="py-3 text-sm">{new Date(session.date).toLocaleDateString()}</td>
                      <td className="py-3 font-semibold" style={{ color: "var(--primary)" }}>{session.wpm}</td>
                      <td className="py-3 font-semibold" style={{ color: "var(--success)" }}>{session.accuracy}%</td>
                      <td className="py-3 text-sm">{Math.round(session.duration / 60)} min</td>
                      <td className="py-3 text-sm">{session.wordsTyped}</td>
                      <td className="py-3 text-sm">{session.songTitle || session.lessonName || "Free Practice"}</td>
                      <td className="py-3">{session.musicEnabled ? "🎵" : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
