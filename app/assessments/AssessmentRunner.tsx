"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { assessmentText, AssessmentKind } from "@/lib/assessment"
import TypingSession, { TypingSessionTarget } from "../components/TypingSession"

export default function AssessmentRunner({ kind }: { kind: AssessmentKind }) {
  const router = useRouter()
  const [status, setStatus] = useState<{ hasPre: boolean; level: number; completed: boolean }>({ hasPre: kind === "pre", level: 1, completed: false })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch("/api/assessments").then((response) => response.ok ? response.json() : null),
      fetch("/api/user").then((response) => response.ok ? response.json() : null),
    ]).then(([assessments, user]) => {
      setStatus({ hasPre: !!assessments?.pre, level: user?.level || 1, completed: !!assessments?.[kind] })
    }).catch(() => undefined).finally(() => setLoading(false))
  }, [kind])

  if (loading) return <div className="flex items-center justify-center h-64"><p style={{ color: "var(--text-muted)" }}>Loading assessment...</p></div>
  if (kind === "post" && (!status.hasPre || status.level < 2)) return <div className="card max-w-xl mx-auto"><h1 className="text-2xl font-bold mb-3">Post-test locked</h1><p className="mb-5" style={{ color: "var(--text-muted)" }}>{!status.hasPre ? "Complete the pre-test before taking the post-test." : "Complete the required Level 2 activities to unlock the Post Test."}</p><button className="btn-primary" onClick={() => router.push(!status.hasPre ? "/assessment/pre-test" : "/lessons")}>{!status.hasPre ? "Take pre-test" : "Continue practice"}</button></div>
  if (status.completed) return <div className="card max-w-xl mx-auto"><span className="badge badge-success mb-4">Assessment saved</span><h1 className="text-3xl font-bold mb-3">{kind === "pre" ? "PRE-TEST already completed" : "POST-TEST already completed"}</h1><p className="mb-5" style={{ color: "var(--text-muted)" }}>Completed assessments are kept unchanged for research integrity. Review the result on your dashboard.</p><button className="btn-primary" onClick={() => router.push("/dashboard")}>View dashboard</button></div>

  const target: TypingSessionTarget = {
    kind: "assessment",
    id: `${kind}-test`,
    assessmentKind: kind,
    title: kind === "pre" ? "PRE-TEST" : "POST-TEST",
    subtitle: "Java source code · 30 seconds · spaces and line breaks count",
    text: assessmentText,
  }

  return <div><div className="mb-8"><p className="eyebrow">Research assessment</p><h1 className="text-3xl font-bold mb-2">{kind === "pre" ? "Pre-test" : "Post-test"}</h1><p style={{ color: "var(--text-muted)" }}>Type the exact Java sample once. Every character, space, indentation, and line break is scored consistently.</p></div><TypingSession target={target} onBack={() => router.push(kind === "pre" ? "/dashboard" : "/research")} /></div>
}
