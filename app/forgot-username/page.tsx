"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"

export default function ForgotUsernamePage() {
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setLoading(true); setUsername(null)
    const response = await fetch("/api/auth/recover-username", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) })
    const result = await response.json(); setMessage(result.message || result.error); setUsername(result.username || null); setLoading(false)
  }
  return <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}><div className="card w-full max-w-md"><h1 className="text-2xl font-bold mb-2">Recover your username</h1><p className="mb-6" style={{ color: "var(--text-muted)" }}>Enter the verified email connected to your account.</p><form onSubmit={submit} className="space-y-4"><input className="input w-full" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" /><button className="btn-primary w-full" disabled={loading}>{loading ? "Checking..." : "Recover username"}</button></form>{message && <p className="mt-5" style={{ color: "var(--text-muted)" }}>{message}</p>}{username && <p className="mt-2 text-xl font-bold">{username}</p>}<Link href="/login" className="block text-center mt-5" style={{ color: "var(--primary)" }}>Back to login</Link></div></div>
}
