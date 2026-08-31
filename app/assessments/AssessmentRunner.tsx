"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { assessmentText, AssessmentKind, AssessmentResult } from "@/lib/assessment"

export default function AssessmentRunner({ kind }: { kind: AssessmentKind }) {
  const router = useRouter()
  const [value, setValue] = useState("")
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [result, setResult] = useState<AssessmentResult | null>(null)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<{ hasPre: boolean; level: number }>({ hasPre: kind === "pre", level: 1 })

  useEffect(() => {
    if (kind === "post") {
      fetch("/api/assessments").then((response) => response.ok ? response.json() : null).then((status) => {
        if (status?.pre) setStatus((current) => ({ ...current, hasPre: true }))
        fetch("/api/user").then((response) => response.json()).then((user) => setStatus((current) => ({ ...current, level: user.level || 1 }))).catch(() => undefined)
      }).catch(() => undefined)
    }
  }, [kind])

  const finish = async () => {
    if (!startedAt || value.trim().length < 10) return
    const duration = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    let correct = 0
    for (let i = 0; i < Math.min(value.length, assessmentText.length); i++) if (value[i] === assessmentText[i]) correct++
    const compared = Math.max(value.length, assessmentText.length)
    const errors = Math.max(0, compared - correct)
    const accuracy = Math.round((correct / compared) * 10000) / 100
    const wordsTyped = value.trim().split(/\s+/).filter(Boolean).length
    const next: AssessmentResult = { kind, wpm: Math.round((wordsTyped / duration) * 60), accuracy, errors, duration, words_typed: wordsTyped }
    setSaving(true)
    try {
      const response = await fetch("/api/assessments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind, typedText: value, duration }) })
      if (!response.ok) throw new Error((await response.json()).error || "Unable to save assessment")
      const saved = await response.json()
      setResult(saved.result)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Unable to save assessment")
    } finally {
      setSaving(false)
    }
  }

  if (kind === "post" && (!status.hasPre || status.level < 2)) return <div className="card max-w-xl mx-auto"><h1 className="text-2xl font-bold mb-3">Post-test locked</h1><p className="mb-5" style={{ color: "var(--text-muted)" }}>{!status.hasPre ? "Complete the pre-test before taking the post-test." : "Complete the required Level 2 activities to unlock the Post Test."}</p><button className="btn-primary" onClick={() => router.push(!status.hasPre ? "/assessment/pre-test" : "/lessons")}>{!status.hasPre ? "Take pre-test" : "Continue practice"}</button></div>
  if (result) return <div className="card max-w-xl mx-auto"><span className="badge badge-success mb-4">Assessment saved</span><h1 className="text-3xl font-bold mb-6">{kind === "pre" ? "Baseline recorded" : "Post-test complete"}</h1><div className="grid grid-cols-3 gap-3 mb-6"><div><p className="text-sm" style={{ color: "var(--text-muted)" }}>WPM</p><p className="text-2xl font-bold">{result.wpm}</p></div><div><p className="text-sm" style={{ color: "var(--text-muted)" }}>Accuracy</p><p className="text-2xl font-bold">{result.accuracy}%</p></div><div><p className="text-sm" style={{ color: "var(--text-muted)" }}>Errors</p><p className="text-2xl font-bold">{result.errors}</p></div></div><p className="mb-5 text-sm" style={{ color: "var(--text-muted)" }}>{saving ? "Saving your result..." : "Your result is ready. You can continue practicing."}</p><button className="btn-primary" onClick={() => router.push(kind === "pre" ? "/dashboard" : "/research")}>Continue</button></div>

  return <div className="max-w-3xl mx-auto"><div className="mb-8"><span className="badge badge-primary mb-3">{kind === "pre" ? "Before practice" : "After practice"}</span><h1 className="text-3xl font-bold mb-2">{kind === "pre" ? "Pre-test" : "Post-test"}</h1><p style={{ color: "var(--text-muted)" }}>Type the passage once, without pasting. This gives you a fair speed and accuracy snapshot.</p></div><div className="card"><p className="text-lg leading-8 mb-6">{assessmentText}</p><textarea className="input min-h-40 resize-y" autoFocus value={value} onChange={(event) => setValue(event.target.value)} onFocus={() => setStartedAt((current) => current || Date.now())} placeholder="Click here and start typing..." /><div className="flex items-center justify-between mt-5"><p className="text-sm" style={{ color: "var(--text-muted)" }}>{value.length} / {assessmentText.length} characters</p><button className="btn-primary" disabled={!startedAt || value.trim().length < 10} onClick={finish}>Finish assessment</button></div></div></div>
}
