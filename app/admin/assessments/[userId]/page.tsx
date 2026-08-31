"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useAuth } from "@/app/components/SupabaseAuthProvider"

export default function AdminAssessmentDetail() {
  const { profile, loading } = useAuth()
  const { userId } = useParams<{ userId: string }>()
  const [data, setData] = useState<any>(null)
  useEffect(() => { if (profile?.role === "admin") fetch(`/api/admin/assessments/${userId}`).then((r) => r.json()).then(setData) }, [profile, userId])
  if (loading || !data) return <p>Loading...</p>
  if (profile?.role !== "admin") return <div className="card">Admin access required</div>
  const wpmChange = data.pre && data.post ? data.post.wpm - data.pre.wpm : null
  const accuracyChange = data.pre && data.post ? data.post.accuracy - data.pre.accuracy : null
  return <div className="max-w-4xl mx-auto"><Link href="/admin/assessments" style={{ color: "var(--primary)" }}>Back to all users</Link><h1 className="text-3xl font-bold mt-4 mb-2">{data.user.username}</h1><p className="mb-6" style={{ color: "var(--text-muted)" }}>{data.user.student_id} - Level {data.user.level} - {data.user.xp} XP</p><div className="grid grid-cols-1 md:grid-cols-2 gap-6"><ResultCard title="Pre-test" result={data.pre} /><ResultCard title="Post-test" result={data.post} /></div>{wpmChange !== null && accuracyChange !== null && <div className="card mt-6"><h2 className="text-xl font-bold mb-4">Performance comparison</h2><p>WPM improvement: <strong>{wpmChange >= 0 ? "+" : ""}{wpmChange}</strong></p><p>Accuracy improvement: <strong>{accuracyChange >= 0 ? "+" : ""}{accuracyChange.toFixed(2)}%</strong></p></div>}</div>
}

function ResultCard({ title, result }: { title: string; result: any }) { return <div className="card"><h2 className="text-xl font-bold mb-4">{title}</h2>{result ? <div className="space-y-2"><p>Speed: <strong>{result.wpm} WPM</strong></p><p>Accuracy: <strong>{result.accuracy}%</strong></p><p>Errors: <strong>{result.errors}</strong></p><p>Time: <strong>{result.completion_time}s</strong></p></div> : <p style={{ color: "var(--text-muted)" }}>Not completed</p>}</div> }
