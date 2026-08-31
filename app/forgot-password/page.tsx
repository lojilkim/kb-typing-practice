"use client"

import { FormEvent, useState } from "react"
import Link from "next/link"
import { createClient } from "@/utils/supabase/client"

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [email, setEmail] = useState("")
  const [message, setMessage] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setLoading(true)
    setError("")
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (resetError) setError("Unable to send the reset email. Check the address and try again.")
    else setMessage("If an account uses that email, a password reset link has been sent.")
    setLoading(false)
  }

  return <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "var(--background)" }}><div className="card w-full max-w-md"><h1 className="text-2xl font-bold mb-2">Reset your password</h1><p className="mb-6" style={{ color: "var(--text-muted)" }}>Enter the email connected to your account.</p>{message && <p className="mb-4" style={{ color: "var(--success)" }}>{message}</p>}{error && <p className="mb-4" style={{ color: "var(--error)" }}>{error}</p>}<form onSubmit={submit} className="space-y-4"><input className="input w-full" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Email address" /><button className="btn-primary w-full" disabled={loading}>{loading ? "Sending..." : "Send reset link"}</button></form><Link href="/login" className="block text-center mt-5" style={{ color: "var(--primary)" }}>Back to login</Link></div></div>
}
