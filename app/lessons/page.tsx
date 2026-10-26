"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../components/SupabaseAuthProvider"
import { useRouter } from "next/navigation"
import TypingSession, { TypingSessionTarget } from "../components/TypingSession"

interface Lesson {
  id: string
  name: string
  category: string
  difficulty: string
  content: string
  unlockLevel: number
  order: number
  unlocked: boolean
  userProgress: { bestWpm: number; bestAccuracy: number; completed: boolean; attempts: number } | null
}

export default function LessonsPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  useEffect(() => { if (!authLoading && !profile) router.push("/login") }, [authLoading, profile, router])
  useEffect(() => {
    if (!profile) return
    fetch("/api/lessons").then((response) => response.json()).then(setLessons).catch(console.error).finally(() => setLoading(false))
  }, [profile])

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-xl" style={{ color: "var(--text-muted)" }}>Loading...</div></div>
  if (selectedLesson) {
    const target: TypingSessionTarget = { kind: "lesson", id: selectedLesson.id, title: selectedLesson.name, subtitle: `${selectedLesson.category} · ${selectedLesson.difficulty}`, text: selectedLesson.content }
    return <TypingSession target={target} onBack={() => setSelectedLesson(null)} />
  }

  const categories = [...new Set(lessons.map((lesson) => lesson.category))]
  return <div className="max-w-6xl mx-auto"><div className="mb-8"><p className="eyebrow">Build your fundamentals</p><h1 className="text-3xl font-bold mb-2">Typing Lessons</h1><p style={{ color: "var(--text-muted)" }}>Master the keyboard one accurate session at a time.</p></div>{categories.map((category) => <div key={category} className="mb-8"><h2 className="text-xl font-bold mb-4" style={{ color: "var(--accent)" }}>{category}</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">{lessons.filter((lesson) => lesson.category === category).map((lesson) => <div key={lesson.id} className={`card ${!lesson.unlocked ? "opacity-50" : ""}`}><div className="flex items-start justify-between mb-3"><h3 className="text-lg font-bold">{lesson.name}</h3><span className="badge badge-primary">{lesson.difficulty}</span></div>{lesson.userProgress && <div className="mb-3"><div className="flex justify-between text-sm mb-1"><span>Best: {lesson.userProgress.bestWpm} WPM</span><span>{lesson.userProgress.bestAccuracy}% accuracy</span></div><div className="progress-bar"><div className="progress-bar-fill" style={{ width: `${lesson.userProgress.bestAccuracy}%` }} /></div>{lesson.userProgress.completed && <p className="text-sm mt-2" style={{ color: "var(--success)" }}>Completed</p>}</div>}<button onClick={() => lesson.unlocked && setSelectedLesson(lesson)} disabled={!lesson.unlocked} className={`w-full mt-3 ${lesson.unlocked ? "btn-primary" : "btn-secondary"}`}>{lesson.unlocked ? "Start lesson" : `Level ${lesson.unlockLevel}`}</button></div>)}</div></div>)}</div>
}
