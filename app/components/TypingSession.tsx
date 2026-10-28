"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { calculateSessionMetrics, PerformanceSample, TYPING_SESSION_SECONDS, TypingSessionMetrics } from "@/lib/typing-session"

export interface TypingSessionTarget {
  kind: "lesson" | "song" | "code" | "assessment"
  id: string
  title: string
  subtitle: string
  text: string
  audioUrl?: string
  artist?: string
  assessmentKind?: "pre" | "post"
}

interface TypingSessionProps {
  target: TypingSessionTarget
  onBack: () => void
}

interface CompletedSession extends TypingSessionMetrics {
  samples: PerformanceSample[]
  completedAt: string
  saved: boolean
  pointsEarned: number
  level: number | null
  levelUp: boolean
}

export default function TypingSession({ target, onBack }: TypingSessionProps) {
  const [typedText, setTypedText] = useState("")
  const [startedAt, setStartedAt] = useState<number | null>(null)
  const [now, setNow] = useState<number | null>(null)
  const [samples, setSamples] = useState<PerformanceSample[]>([])
  const [completed, setCompleted] = useState<CompletedSession | null>(null)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState("")
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const typedTextRef = useRef("")
  const completionRef = useRef(false)

  const elapsedSeconds = startedAt && now ? Math.min(TYPING_SESSION_SECONDS, (now - startedAt) / 1000) : 0
  const remainingSeconds = Math.max(0, TYPING_SESSION_SECONDS - elapsedSeconds)
  const liveMetrics = useMemo(
    () => calculateSessionMetrics(target.text, typedText, Math.max(elapsedSeconds, 1 / 60), samples),
    [elapsedSeconds, samples, target.text, typedText],
  )

  useEffect(() => {
    if (!startedAt || completed) return
    const timer = window.setInterval(() => setNow(Date.now()), 100)
    return () => window.clearInterval(timer)
  }, [completed, startedAt])

  useEffect(() => {
    if (!startedAt || completed) return
    const sampler = window.setInterval(() => {
      const elapsedMs = Date.now() - startedAt
      const metrics = calculateSessionMetrics(target.text, typedTextRef.current, Math.max(elapsedMs / 1000, 1 / 60))
      setSamples((current) => [...current.filter((sample) => sample.elapsedMs !== Math.floor(elapsedMs / 1000) * 1000), {
        elapsedMs: Math.floor(elapsedMs / 1000) * 1000,
        wpm: metrics.netWpm,
        errors: metrics.errors,
      }].slice(-31))
    }, 1000)
    return () => window.clearInterval(sampler)
  }, [completed, startedAt, target.text])

  const finish = useCallback(async (finalText: string, finalElapsedSeconds: number, finalSamples: PerformanceSample[]) => {
    if (completionRef.current) return
    completionRef.current = true
    const metrics = calculateSessionMetrics(target.text, finalText, finalElapsedSeconds, finalSamples)
    setCompleted({ ...metrics, samples: finalSamples, completedAt: new Date().toISOString(), saved: false, pointsEarned: 0, level: null, levelUp: false })
    setSaving(true)
    setSaveError("")

    try {
      const isAssessment = target.kind === "assessment"
      const response = await fetch(isAssessment ? "/api/assessments" : "/api/practice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isAssessment ? {
          sessionKey: crypto.randomUUID(),
          kind: target.assessmentKind,
          typedText: finalText,
          duration: Math.round(finalElapsedSeconds),
          samples: finalSamples,
        } : {
          sessionKey: crypto.randomUUID(),
          typedText: finalText,
          duration: Math.round(finalElapsedSeconds),
          samples: finalSamples,
          songId: target.kind === "song" ? target.id : undefined,
          lessonId: target.kind === "lesson" ? target.id : undefined,
          codeActivityId: target.kind === "code" ? target.id : undefined,
          musicEnabled: true,
        }),
      })
      const savedSession = await response.json()
      if (!response.ok) throw new Error(savedSession.error || "Unable to save this session")
      setCompleted((current) => current ? {
        ...current,
        saved: true,
        pointsEarned: target.kind === "code" || target.kind === "lesson" ? savedSession.pointsEarned || 0 : 0,
        level: savedSession.user?.level ?? null,
        levelUp: !!savedSession.levelUp,
      } : current)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Unable to save this session")
    } finally {
      setSaving(false)
    }
  }, [target.assessmentKind, target.id, target.kind, target.text])

  useEffect(() => {
    if (startedAt && elapsedSeconds >= TYPING_SESSION_SECONDS && !completed) {
      window.setTimeout(() => void finish(typedText, TYPING_SESSION_SECONDS, samples), 0)
    }
  }, [completed, elapsedSeconds, finish, samples, startedAt, typedText])

  const restart = () => {
    completionRef.current = false
    typedTextRef.current = ""
    setTypedText("")
    setStartedAt(null)
    setNow(null)
    setSamples([])
    setCompleted(null)
    setSaveError("")
    window.setTimeout(() => inputRef.current?.focus(), 0)
  }

  const handleChange = (value: string) => {
    if (completed) return
    const nextValue = value.slice(0, target.text.length)
    if (!startedAt && nextValue.length > 0) {
      const start = Date.now()
      setStartedAt(start)
      setNow(start)
    }
    typedTextRef.current = nextValue
    setTypedText(nextValue)
    if (nextValue.length === target.text.length && nextValue.length > 0) {
      const start = startedAt || Date.now()
      void finish(nextValue, Math.min(TYPING_SESSION_SECONDS, (Date.now() - start) / 1000), samples)
    }
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.ctrlKey || event.metaKey) && ["a", "c", "v", "x"].includes(event.key.toLowerCase())) {
      event.preventDefault()
    }
    if (event.key === "Tab") event.preventDefault()
  }

  if (completed) {
    return <ResultsView target={target} result={completed} saving={saving} saveError={saveError} onRestart={restart} onBack={onBack} />
  }

  return (
    <div className="typing-shell">
      <div className="typing-toolbar">
        <button className="btn-secondary" onClick={onBack}>Exit</button>
        <div className="typing-context"><span>{target.kind === "song" ? "Song lyrics" : target.kind === "assessment" ? `${target.assessmentKind === "pre" ? "Pre" : "Post"}-test` : target.kind === "code" ? "Code practice" : "Typing lesson"}</span><strong>{target.title}</strong></div>
        <div className={`typing-countdown ${remainingSeconds <= 5 ? "typing-countdown-warning" : ""}`}>{Math.ceil(remainingSeconds)}<small>s</small></div>
      </div>

      <div className="typing-stat-strip">
        <Stat label="net wpm" value={Math.round(liveMetrics.netWpm)} />
        <Stat label="accuracy" value={`${liveMetrics.accuracy}%`} />
        <Stat label="errors" value={liveMetrics.errors} />
        <Stat label="progress" value={`${typedText.length}/${target.text.length}`} />
      </div>

      <div className="typing-main-card" onClick={() => inputRef.current?.focus()}>
        <p className="typing-instruction">Type the passage below. The clock begins with your first character.</p>
        <div className="typing-passage" aria-label="Typing passage">
          {target.text.split("").map((character, index) => {
            const state = index < typedText.length ? (typedText[index] === character ? "is-correct" : "is-incorrect") : index === typedText.length ? "is-current" : "is-upcoming"
            return <span className={state} key={`${index}-${character}`}>{character === " " ? "\u00a0" : character}</span>
          })}
        </div>
        <textarea
          ref={inputRef}
          value={typedText}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={handleKeyDown}
          className="typing-input-ghost"
          aria-label="Type the passage"
          autoFocus
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <div className="typing-footer"><span>{startedAt ? "Session active" : "Ready when you are"}</span><span>30 second session</span></div>
      </div>

    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div><p className="typing-stat-label">{label}</p><p className="typing-stat-value">{value}</p></div>
}

function ResultsView({ target, result, saving, saveError, onRestart, onBack }: { target: TypingSessionTarget; result: CompletedSession; saving: boolean; saveError: string; onRestart: () => void; onBack: () => void }) {
  return (
    <div className="results-shell">
      <div className="results-heading"><div><p className="eyebrow">Session complete</p><h1>{target.title}</h1><p>{target.subtitle}</p></div><span className="results-duration">{result.duration}s</span></div>
      <div className="results-hero-grid"><div className="result-primary"><span>net wpm</span><strong>{Math.round(result.netWpm)}</strong><small>correct characters / 5 / elapsed minutes</small></div><div className="result-primary"><span>accuracy</span><strong>{result.accuracy}%</strong><small>{result.correctCharacters} correct of {result.correctCharacters + result.incorrectCharacters} typed</small></div></div>
      <PerformanceGraph samples={result.samples} />
      <div className="results-detail-grid"><ResultDetail label="raw wpm" value={Math.round(result.rawWpm)} /><ResultDetail label="errors" value={result.errors} /><ResultDetail label="consistency" value={result.consistency === null ? "Not enough data" : `${result.consistency}%`} /><ResultDetail label="status" value={saving ? "Saving..." : result.saved ? "Saved" : "Not saved"} /></div>
      {(target.kind === "code" || target.kind === "lesson") && result.saved && <div className="card mt-5"><p className="eyebrow">Progress reward</p><h2 className="text-2xl font-bold">+{result.pointsEarned} points</h2><p style={{ color: "var(--text-muted)" }}>{result.levelUp ? `Level up! You are now Level ${result.level}.` : `Keep practicing to reach Level ${result.level ?? "the next"}.`}</p></div>}
      <div className="character-summary"><h2>Character summary</h2><div><ResultDetail label="correct" value={result.correctCharacters} /><ResultDetail label="incorrect" value={result.incorrectCharacters} /><ResultDetail label="extra" value={result.extraCharacters} /><ResultDetail label="missed" value={result.missedCharacters} /></div></div>
      {saveError && <p className="typing-save-error">{saveError}</p>}
      <p className="results-note">{new Date(result.completedAt).toLocaleString()} · {target.kind === "song" ? "Song lyrics" : target.kind === "assessment" ? `${target.assessmentKind === "pre" ? "PRE" : "POST"}-TEST` : target.kind === "code" ? "Code practice" : "Typing lesson"}</p>
      <div className="results-actions">{target.kind !== "assessment" && <button className="btn-primary" onClick={onRestart}>Restart test</button>}<button className={target.kind === "assessment" ? "btn-primary" : "btn-secondary"} onClick={onBack}>Exit</button></div>
    </div>
  )
}

function ResultDetail({ label, value }: { label: string; value: string | number }) {
  return <div className="result-detail"><span>{label}</span><strong>{value}</strong></div>
}

function PerformanceGraph({ samples }: { samples: PerformanceSample[] }) {
  const width = 800
  const height = 180
  const maxWpm = Math.max(20, ...samples.map((sample) => sample.wpm))
  const maxErrors = Math.max(1, ...samples.map((sample) => sample.errors))
  const points = samples.map((sample, index) => `${(samples.length <= 1 ? 0 : index / (samples.length - 1)) * width},${height - (sample.wpm / maxWpm) * (height - 20)}`).join(" ")
  const errorPoints = samples.map((sample, index) => `${(samples.length <= 1 ? 0 : index / (samples.length - 1)) * width},${height - (sample.errors / maxErrors) * (height - 20)}`).join(" ")
  return <div className="performance-card"><div className="performance-heading"><h2>Performance</h2><span><i className="graph-legend-speed" /> speed <i className="graph-legend-errors" /> errors</span></div>{samples.length > 1 ? <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Typing speed and errors graph"><line x1="0" y1={height - 1} x2={width} y2={height - 1} className="graph-axis" /><polyline points={points} className="graph-speed" /><polyline points={errorPoints} className="graph-errors" />{samples.map((sample, index) => <circle key={index} cx={(samples.length <= 1 ? 0 : index / (samples.length - 1)) * width} cy={height - (sample.wpm / maxWpm) * (height - 20)} r="3" className="graph-point" />)}</svg> : <p className="graph-empty">Keep typing to build a speed graph.</p>}</div>
}
