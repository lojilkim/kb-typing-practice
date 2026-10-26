"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@/app/components/SupabaseAuthProvider"

type Assessment = { wpm: number; net_wpm?: number; raw_wpm?: number; accuracy: number; errors: number; consistency?: number | null; completion_time: number }
type PracticeSession = { id: string; wpm: number; net_wpm: number | null; raw_wpm: number | null; accuracy: number; errors: number; created_at: string; song: { title: string } | null; lesson: { name: string } | null; code_activity: { activity_number: number; title: string } | null }
type AdminData = { user: { username: string; student_id: string; level: number; xp: number }; pre: Assessment | null; post: Assessment | null; practiceSessions: PracticeSession[] }

export default function AdminAssessmentDetail() {
  const { profile, loading } = useAuth()
  const { userId } = useParams<{ userId: string }>()
   const [data, setData] = useState<AdminData | null>(null)
  useEffect(() => { if (profile?.role === "admin") fetch(`/api/admin/assessments/${userId}`).then((r) => r.json()).then(setData) }, [profile, userId])
  if (loading || !data) return <p>Loading...</p>
  if (profile?.role !== "admin") return <div className="card">Admin access required</div>
  const wpmChange = data.pre && data.post ? data.post.wpm - data.pre.wpm : null
  const accuracyChange = data.pre && data.post ? data.post.accuracy - data.pre.accuracy : null
   return <div className="max-w-5xl mx-auto"><Link href="/admin/assessments" style={{ color: "var(--primary)" }}>Back to all users</Link><h1 className="text-3xl font-bold mt-4 mb-2">{data.user.username}</h1><p className="mb-6" style={{ color: "var(--text-muted)" }}>{data.user.student_id} - Level {data.user.level} - {data.user.xp} XP</p><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><ResultCard title="Pre-test" result={data.pre} /><ResultCard title="Post-test" result={data.post} /></div>{wpmChange !== null && accuracyChange !== null && <div className="card mt-6"><h2 className="text-xl font-bold mb-4">Performance comparison</h2><p>WPM improvement: <strong>{wpmChange >= 0 ? "+" : ""}{wpmChange}</strong></p><p>Accuracy improvement: <strong>{accuracyChange >= 0 ? "+" : ""}{accuracyChange.toFixed(2)}%</strong></p></div>}<div className="card mt-6 overflow-x-auto"><h2 className="text-xl font-bold mb-4">Typing sessions</h2><table className="w-full text-left"><thead><tr className="border-b" style={{ borderColor: "var(--card-border)" }}><th className="p-2">Activity</th><th className="p-2">Net WPM</th><th className="p-2">Raw WPM</th><th className="p-2">Accuracy</th><th className="p-2">Errors</th><th className="p-2">Date</th></tr></thead><tbody>{data.practiceSessions.map((session) => <tr key={session.id} className="border-b" style={{ borderColor: "var(--card-border)" }}><td className="p-2">{session.code_activity ? `Activity ${session.code_activity.activity_number}: ${session.code_activity.title}` : session.song?.title || session.lesson?.name || "Practice"}</td><td className="p-2">{session.net_wpm ?? session.wpm}</td><td className="p-2">{session.raw_wpm ?? "-"}</td><td className="p-2">{session.accuracy}%</td><td className="p-2">{session.errors}</td><td className="p-2">{new Date(session.created_at).toLocaleDateString()}</td></tr>)}</tbody></table>{!data.practiceSessions.length && <p style={{ color: "var(--text-muted)" }}>No completed practice sessions.</p>}</div></div>
}

function ResultCard({ title, result }: { title: string; result: Assessment | null }) { return <div className="card"><h2 className="text-xl font-bold mb-4">{title}</h2>{result ? <div className="space-y-2"><p>Net WPM: <strong>{result.net_wpm ?? result.wpm}</strong></p><p>Raw WPM: <strong>{result.raw_wpm ?? "-"}</strong></p><p>Accuracy: <strong>{result.accuracy}%</strong></p><p>Errors: <strong>{result.errors}</strong></p><p>Consistency: <strong>{result.consistency === null || result.consistency === undefined ? "Not enough data" : `${result.consistency}%`}</strong></p><p>Time: <strong>{result.completion_time}s</strong></p></div> : <p style={{ color: "var(--text-muted)" }}>Not completed</p>}</div> }
