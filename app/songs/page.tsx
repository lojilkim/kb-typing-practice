"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../components/SupabaseAuthProvider"
import { useRouter } from "next/navigation"
import TypingSession, { TypingSessionTarget } from "../components/TypingSession"

interface CodeActivity {
  id: string
  activity_number: number
  title: string
  description: string
  code: string
  attemptCount: number
  bestWpm: number
  bestAccuracy: number
  attempts: Array<{ id: string; net_wpm: number | null; wpm: number | null; accuracy: number; errors: number; created_at: string }>
}

export default function CodePracticePage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [activities, setActivities] = useState<CodeActivity[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedActivity, setSelectedActivity] = useState<CodeActivity | null>(null)

  useEffect(() => { if (!authLoading && !profile) router.push("/login") }, [authLoading, profile, router])
  useEffect(() => {
    if (!profile) return
    fetch("/api/code-activities").then((response) => response.json()).then(setActivities).catch(console.error).finally(() => setLoading(false))
  }, [profile])

  if (loading) return <div className="flex items-center justify-center h-64"><p className="text-xl" style={{ color: "var(--text-muted)" }}>Loading code activities...</p></div>
  if (selectedActivity) {
    const target: TypingSessionTarget = { kind: "code", id: selectedActivity.id, title: selectedActivity.title, subtitle: `Activity ${selectedActivity.activity_number} · Java source code`, text: selectedActivity.code }
    return <TypingSession target={target} onBack={() => setSelectedActivity(null)} />
  }

  return <div className="max-w-6xl mx-auto"><div className="mb-8"><p className="eyebrow">Java typing lab</p><h1 className="text-3xl font-bold mb-2">Code Practice</h1><p style={{ color: "var(--text-muted)" }}>Build accuracy with seven Java source-code activities. Spaces, indentation, line breaks, and punctuation count.</p></div><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">{activities.map((activity) => <article key={activity.id} className="card"><div className="flex items-start justify-between gap-3 mb-4"><div><p className="eyebrow">Activity {activity.activity_number}</p><h2 className="text-xl font-bold mt-1">{activity.title}</h2></div>{activity.attemptCount > 0 && <span className="badge badge-success">Completed</span>}</div><p className="text-sm min-h-12" style={{ color: "var(--text-muted)" }}>{activity.description}</p>{activity.attemptCount > 0 && <div className="code-activity-best"><span>Best net WPM <strong>{activity.bestWpm}</strong></span><span>Best accuracy <strong>{activity.bestAccuracy}%</strong></span><span>{activity.attemptCount} attempt{activity.attemptCount === 1 ? "" : "s"}</span><details><summary className="cursor-pointer mt-2">View previous attempts</summary><div className="mt-2 space-y-1">{activity.attempts.map((attempt) => <p key={attempt.id}>{attempt.net_wpm ?? attempt.wpm} WPM · {attempt.accuracy}% · {attempt.errors} errors · {new Date(attempt.created_at).toLocaleDateString()}</p>)}</div></details></div>}<button className="btn-primary w-full mt-5" onClick={() => setSelectedActivity(activity)}>{activity.attemptCount ? "Practice again" : "Start activity"}</button></article>)}</div></div>
}
