"use client"

import { FormEvent, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [confirmation, setConfirmation] = useState("")
  const [error, setError] = useState("")
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setReady(Boolean(data.session)))
  }, [supabase])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (password.length < 6 || password !== confirmation) {
      setError(password.length < 6 ? "Password must be at least 6 characters" : "Passwords do not match")
      return
    }
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) setError("This reset link is invalid or expired.")
    else router.push("/login?reset=success")
  }

  return <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}><div className="card w-full max-w-md"><h1 className="text-2xl font-bold mb-2">Choose a new password</h1>{!ready ? <p style={{ color: "var(--text-muted)" }}>Open this page from the reset email link.</p> : <form onSubmit={submit} className="space-y-4 mt-6"><input className="input w-full" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" /><input className="input w-full" type="password" required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Confirm new password" />{error && <p style={{ color: "var(--error)" }}>{error}</p>}<button className="btn-primary w-full">Save new password</button></form>}<Link href="/login" className="block text-center mt-5" style={{ color: "var(--primary)" }}>Back to login</Link></div></div>
}
