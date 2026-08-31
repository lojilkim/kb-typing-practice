"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { useAuth } from "@/app/components/SupabaseAuthProvider"

type Result = { wpm: number; accuracy: number; errors: number; created_at: string }
type Account = { id: string; username: string; student_id: string; level: number; xp: number; pre: Result | null; post: Result | null }
type SortKey = "level" | "wpm" | "accuracy" | "improvement"

export default function AdminAssessmentsPage() {
  const { profile, loading } = useAuth()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")
  const [level, setLevel] = useState("all")
  const [status, setStatus] = useState("all")
  const [sort, setSort] = useState<SortKey>("improvement")

  useEffect(() => {
    if (profile?.role !== "admin") return
    fetch("/api/admin/assessments").then(async (response) => {
      if (!response.ok) throw new Error("Unable to load admin data")
      setAccounts(await response.json())
    }).catch((reason: Error) => setError(reason.message))
  }, [profile])

  if (loading) return <p>Loading...</p>
  if (profile?.role !== "admin") return <div className="card"><h1 className="text-2xl font-bold">Admin access required</h1></div>

  const matchesStatus = (account: Account) => status === "all" || (status === "pre" && !!account.pre) || (status === "post" && !!account.post) || (status === "below-level-2" && account.level < 2)
  const filtered = accounts.filter((account) => {
    const haystack = `${account.username} ${account.student_id} ${account.id}`.toLowerCase()
    return (level === "all" || String(account.level) === level) && matchesStatus(account) && haystack.includes(search.toLowerCase())
  }).sort((a, b) => {
    if (sort === "level") return b.level - a.level
    if (sort === "wpm") return (b.post?.wpm || b.pre?.wpm || 0) - (a.post?.wpm || a.pre?.wpm || 0)
    if (sort === "accuracy") return (b.post?.accuracy || b.pre?.accuracy || 0) - (a.post?.accuracy || a.pre?.accuracy || 0)
    return (b.post && b.pre ? b.post.wpm - b.pre.wpm : -Infinity) - (a.post && a.pre ? a.post.wpm - a.pre.wpm : -Infinity)
  })
  const average = (kind: "pre" | "post", field: "wpm" | "accuracy") => {
    const values = accounts.map((account) => account[kind]?.[field]).filter((value): value is number => typeof value === "number")
    return values.length ? (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1) : "0"
  }
  const improved = accounts.filter((account) => account.pre && account.post && account.post.wpm > account.pre.wpm).length

  return <div className="max-w-7xl mx-auto">
    <div className="mb-8"><h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1><p style={{ color: "var(--text-muted)" }}>Monitor student progress and compare assessment performance.</p></div>
    {error ? <div className="card" style={{ color: "var(--error)" }}>{error}</div> : <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Registered users" value={accounts.length} />
        <Stat label="Pre-tests complete" value={accounts.filter((account) => account.pre).length} />
        <Stat label="Reached Level 2" value={accounts.filter((account) => account.level >= 2).length} />
        <Stat label="Post-tests complete" value={accounts.filter((account) => account.post).length} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="card"><h2 className="font-bold mb-3">Average WPM</h2><BarChart pre={Number(average("pre", "wpm"))} post={Number(average("post", "wpm"))} max={Math.max(Number(average("pre", "wpm")), Number(average("post", "wpm")), 1)} /></div>
        <div className="card"><h2 className="font-bold mb-3">Average accuracy</h2><BarChart pre={Number(average("pre", "accuracy"))} post={Number(average("post", "accuracy"))} max={100} suffix="%" /></div>
        <div className="card"><h2 className="font-bold mb-3">Improved WPM</h2><p className="text-3xl font-bold">{improved} <span className="text-base font-normal">of {accounts.length} users</span></p></div>
      </div>
      <div className="card mb-6 grid grid-cols-1 md:grid-cols-4 gap-3">
        <input className="input" placeholder="Search name or ID" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select className="input" value={level} onChange={(event) => setLevel(event.target.value)}><option value="all">All levels</option><option value="1">Level 1</option><option value="2">Level 2+</option></select>
        <select className="input" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="pre">Pre-test complete</option><option value="post">Post-test complete</option><option value="below-level-2">Below Level 2</option></select>
        <select className="input" value={sort} onChange={(event) => setSort(event.target.value as SortKey)}><option value="improvement">Sort by improvement</option><option value="wpm">Sort by WPM</option><option value="accuracy">Sort by accuracy</option><option value="level">Sort by level</option></select>
      </div>
      <div className="card overflow-x-auto"><table className="w-full text-left"><thead><tr className="border-b" style={{ borderColor: "var(--card-border)" }}><th className="p-3">Student</th><th className="p-3">Level</th><th className="p-3">Practice XP</th><th className="p-3">Pre-test</th><th className="p-3">Post-test</th><th className="p-3">Improvement</th></tr></thead><tbody>{filtered.map((account) => <tr key={account.id} className="border-b" style={{ borderColor: "var(--card-border)" }}><td className="p-3"><Link href={`/admin/assessments/${account.id}`} style={{ color: "var(--primary)" }}>{account.username}</Link><br /><span className="text-xs" style={{ color: "var(--text-muted)" }}>{account.student_id}</span></td><td className="p-3">Level {account.level}</td><td className="p-3">{account.xp} XP</td><td className="p-3">{account.pre ? `${account.pre.wpm} WPM / ${account.pre.accuracy}%` : "Not taken"}</td><td className="p-3">{account.post ? `${account.post.wpm} WPM / ${account.post.accuracy}%` : "Pending"}</td><td className="p-3">{account.pre && account.post ? `${account.post.wpm - account.pre.wpm >= 0 ? "+" : ""}${account.post.wpm - account.pre.wpm} WPM` : "-"}</td></tr>)}</tbody></table>{filtered.length === 0 && <p className="p-4" style={{ color: "var(--text-muted)" }}>No users match these filters.</p>}</div>
    </>}
  </div>
}

function Stat({ label, value }: { label: string; value: number }) { return <div className="card"><p className="text-sm" style={{ color: "var(--text-muted)" }}>{label}</p><p className="text-2xl font-bold">{value}</p></div> }
function BarChart({ pre, post, max, suffix = "" }: { pre: number; post: number; max: number; suffix?: string }) { return <div className="space-y-3"><div><div className="flex justify-between text-sm"><span>Pre-test</span><strong>{pre}{suffix}</strong></div><div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${Math.min(100, pre / max * 100)}%` }} /></div></div><div><div className="flex justify-between text-sm"><span>Post-test</span><strong>{post}{suffix}</strong></div><div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${Math.min(100, post / max * 100)}%`, background: "var(--success)" }} /></div></div></div> }
