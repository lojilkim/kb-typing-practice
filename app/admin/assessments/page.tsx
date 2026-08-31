"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/app/components/SupabaseAuthProvider"

interface AdminResult { id: string; user_id: string; username: string; student_id: string; level: number; xp: number; pre?: Result | null; post?: Result | null }
interface Result { wpm: number; accuracy: number; errors: number; created_at: string }

export default function AdminAssessmentsPage() {
  const { profile, loading } = useAuth()
  const [results, setResults] = useState<AdminResult[]>([])
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState("all")

  useEffect(() => {
    if (profile?.role === "admin") fetch("/api/admin/assessments").then(async (response) => {
      if (!response.ok) throw new Error((await response.json()).error || "Unable to load results")
      setResults(await response.json())
    }).catch((reason: Error) => setError(reason.message))
  }, [profile])

  if (loading) return <p>Loading...</p>
  if (profile?.role !== "admin") return <div className="card"><h1 className="text-2xl font-bold">Admin access required</h1></div>
  const filtered = results.filter((item) => (level === "all" || String(item.level) === level) && `${item.username} ${item.student_id} ${item.user_id}`.toLowerCase().includes(search.toLowerCase()))
  const completedPre = results.filter((item) => item.pre).length
  const completedPost = results.filter((item) => item.post).length
  const average = (kind: "pre" | "post", field: "wpm" | "accuracy") => { const values = results.map((item) => item[kind]?.[field]).filter((value): value is number => typeof value === "number"); return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : "0" }
  return <div className="max-w-6xl mx-auto"><div className="mb-8"><h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1><p style={{ color: "var(--text-muted)" }}>Compare every student&apos;s baseline and post-test performance.</p></div>{error ? <div className="card" style={{ color: "var(--error)" }}>{error}</div> : <><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"><div className="card"><p className="text-sm">Registered users</p><strong className="text-2xl">{results.length}</strong></div><div className="card"><p className="text-sm">Pre-tests</p><strong className="text-2xl">{completedPre}</strong></div><div className="card"><p className="text-sm">Post-tests</p><strong className="text-2xl">{completedPost}</strong></div><div className="card"><p className="text-sm">Avg WPM</p><strong className="text-2xl">{average("pre", "wpm")} → {average("post", "wpm")}</strong></div></div><div className="card mb-6 flex flex-col md:flex-row gap-3"><input className="input flex-1" placeholder="Search name, student ID, or user ID" value={search} onChange={(event) => setSearch(event.target.value)} /><select className="input md:w-40" value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">All levels</option><option value="1">Level 1</option><option value="2">Level 2</option></select></div><div className="card overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b" style={{ borderColor: "var(--card-border)" }}><th className="p-3">Student</th><th className="p-3">Level</th><th className="p-3">Pre-test</th><th className="p-3">Post-test</th><th className="p-3">Improvement</th></tr></thead><tbody>{filtered.map((item) => <tr key={item.id} className="border-b" style={{ borderColor: "var(--card-border)" }}><td className="p-3"><strong>{item.username}</strong><br /><span className="text-xs" style={{ color: "var(--text-muted)" }}>{item.student_id}</span></td><td className="p-3">Level {item.level}</td><td className="p-3">{item.pre ? `${item.pre.wpm} WPM / ${item.pre.accuracy}%` : "Not taken"}</td><td className="p-3">{item.post ? `${item.post.wpm} WPM / ${item.post.accuracy}%` : "Locked / pending"}</td><td className="p-3">{item.pre && item.post ? `+${item.post.wpm - item.pre.wpm} WPM` : "-"}</td></tr>)}</tbody></table>{filtered.length === 0 && <p className="p-3" style={{ color: "var(--text-muted)" }}>No users found.</p>}</div></>}</div>
}
