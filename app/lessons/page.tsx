"use client"

import { useEffect, useState, useCallback } from "react"
import { useAuth } from "../components/SupabaseAuthProvider"
import { useRouter } from "next/navigation"
import MusicPlayer from "../components/MusicPlayer"
import { calculateTypingStats } from "@/lib/typing-engine"

interface Lesson {
  id: string
  name: string
  category: string
  difficulty: string
  content: string
  unlockLevel: number
  order: number
  unlocked: boolean
  userProgress: {
    bestWpm: number
    bestAccuracy: number
    completed: boolean
    attempts: number
  } | null
}

export default function LessonsPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedLesson, setSelectedLesson] = useState<Lesson | null>(null)

  useEffect(() => {
    if (!authLoading && !profile) router.push("/login")
  }, [authLoading, profile, router])

  useEffect(() => {
    if (profile) {
      const fetchLessons = async () => {
        try {
          const res = await fetch("/api/lessons")
          setLessons(await res.json())
        } catch (error) {
          console.error("Failed to fetch lessons:", error)
        } finally {
          setLoading(false)
        }
      }
      fetchLessons()
    }
  }, [profile])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-xl" style={{ color: "var(--text-muted)" }}>Loading...</div></div>
  }

  if (selectedLesson) {
    return <TypingPractice lesson={selectedLesson} onBack={() => setSelectedLesson(null)} />
  }

  const categories = [...new Set(lessons.map((l) => l.category))]

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">⌨️ Typing Lessons</h1>
        <p style={{ color: "var(--text-muted)" }}>Master the keyboard step by step</p>
      </div>

      {categories.map((category) => (
        <div key={category} className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: "var(--accent)" }}>{category}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {lessons.filter((l) => l.category === category).map((lesson) => (
              <div key={lesson.id} className={`card ${!lesson.unlocked ? "opacity-50" : ""}`}>
                <div className="flex items-start justify-between mb-3">
                  <h3 className="text-lg font-bold">{lesson.name}</h3>
                  <span className="badge badge-primary">{lesson.difficulty}</span>
                </div>
                {lesson.userProgress && (
                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Best: {lesson.userProgress.bestWpm} WPM</span>
                      <span>{lesson.userProgress.bestAccuracy}% accuracy</span>
                    </div>
                    <div className="progress-bar">
                      <div className="progress-bar-fill" style={{ width: `${lesson.userProgress.bestAccuracy}%` }}></div>
                    </div>
                    {lesson.userProgress.completed && (
                      <p className="text-sm mt-2" style={{ color: "var(--success)" }}>✓ Completed</p>
                    )}
                  </div>
                )}
                <button
                  onClick={() => lesson.unlocked && setSelectedLesson(lesson)}
                  disabled={!lesson.unlocked}
                  className={`w-full mt-3 ${lesson.unlocked ? "btn-primary" : "btn-secondary"}`}
                >
                  {lesson.unlocked ? "Start Lesson" : `🔒 Level ${lesson.unlockLevel}`}
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function TypingPractice({ lesson, onBack }: { lesson: Lesson; onBack: () => void }) {
  const [typedText, setTypedText] = useState("")
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [errors, setErrors] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [volume, setVolume] = useState(70)
  const [elapsedTime, setElapsedTime] = useState(0)

  const saveProgress = useCallback(async () => {
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0
    const wordsTyped = typedText.trim().split(/\s+/).length

    const typingStats = calculateTypingStats(lesson.content, typedText)

    await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wpm,
        accuracy,
        errors,
        duration,
        wordsTyped,
        lessonId: lesson.id,
        musicEnabled,
        errorDetails: typingStats.errors,
        fingerStats: typingStats.fingerStats,
        rowAccuracy: typingStats.rowAccuracy,
        handAccuracy: typingStats.handAccuracy,
        correctKeystrokes: typingStats.correctKeystrokes,
        incorrectKeystrokes: typingStats.incorrectKeystrokes,
      }),
    })
  }, [startTime, typedText, wpm, accuracy, errors, lesson.id, lesson.content, musicEnabled])

  useEffect(() => {
    if (typedText.length === lesson.content.length && typedText.length > 0) {
      setEndTime(Date.now())
      setIsComplete(true)
      setShowResults(true)
      saveProgress()
      localStorage.removeItem("unfinishedTypingSession")
    }
  }, [typedText, lesson.content.length, saveProgress])

  useEffect(() => {
    if (startTime && !isComplete) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [startTime, isComplete])

  useEffect(() => {
    if (startTime && typedText.length > 0) {
      const elapsed = (Date.now() - startTime) / 1000 / 60
      const wordsTyped = typedText.trim().split(/\s+/).length
      setWpm(Math.round(wordsTyped / elapsed))
    }
  }, [typedText, startTime])

  useEffect(() => {
    if (typedText.length > 0 && !isComplete) {
      const sessionData = {
        type: "lesson",
        lessonId: lesson.id,
        lessonName: lesson.name,
        typedText,
        startTime,
        wpm,
        accuracy,
        errors,
        musicEnabled,
      }
      localStorage.setItem("unfinishedTypingSession", JSON.stringify(sessionData))
    }
  }, [typedText, isComplete, lesson.id, lesson.name, startTime, wpm, accuracy, errors, musicEnabled])

  const handleBack = () => {
    if (typedText.length > 0 && !isComplete) {
      const sessionData = {
        type: "lesson",
        lessonId: lesson.id,
        lessonName: lesson.name,
        typedText,
        startTime,
        wpm,
        accuracy,
        errors,
        musicEnabled,
      }
      localStorage.setItem("unfinishedTypingSession", JSON.stringify(sessionData))
    } else {
      localStorage.removeItem("unfinishedTypingSession")
    }
    onBack()
  }

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!startTime) setStartTime(Date.now())
    const value = e.target.value
    setTypedText(value)
    let errorCount = 0
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== lesson.content[i]) errorCount++
    }
    setErrors(errorCount)
    setAccuracy(Math.round(((value.length - errorCount) / value.length) * 100) || 100)
  }

  const elapsedSeconds = startTime && endTime ? Math.round((endTime - startTime) / 1000) : 0

  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <h2 className="text-3xl font-bold mb-6">Lesson Complete!</h2>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>WPM</p>
              <p className="text-4xl font-bold" style={{ color: "var(--primary)" }}>{wpm}</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Accuracy</p>
              <p className="text-4xl font-bold" style={{ color: "var(--success)" }}>{accuracy}%</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Errors</p>
              <p className="text-4xl font-bold" style={{ color: "var(--error)" }}>{errors}</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Time</p>
              <p className="text-4xl font-bold">{elapsedSeconds}s</p>
            </div>
          </div>
          <button onClick={onBack} className="btn-primary">Back to Lessons</button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={handleBack} className="btn-secondary mb-6">Back to Lessons</button>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-2xl font-bold mb-2">{lesson.name}</h2>
            <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>{lesson.category} • {lesson.difficulty}</p>
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>WPM</p>
                <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{wpm}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Accuracy</p>
                <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>{accuracy}%</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Errors</p>
                <p className="text-2xl font-bold" style={{ color: "var(--error)" }}>{errors}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Time</p>
                <p className="text-2xl font-bold" style={{ color: "var(--accent)" }}>
                  {Math.floor(elapsedTime / 60)}:{(elapsedTime % 60).toString().padStart(2, '0')}
                </p>
              </div>
            </div>
            <div className="progress-bar mb-6">
              <div className="progress-bar-fill" style={{ width: `${(typedText.length / lesson.content.length) * 100}%` }}></div>
            </div>
            <div className="text-lg leading-relaxed mb-6 font-mono p-4 rounded-lg" style={{ background: "var(--secondary)", fontSize: "1.25rem" }}>
              {lesson.content.split("").map((char, index) => {
                let className = ""
                if (index < typedText.length) {
                  className = typedText[index] === char ? "typing-correct" : "typing-incorrect"
                } else if (index === typedText.length) {
                  className = "typing-current"
                }
                return <span key={index} className={className}>{char}</span>
              })}
            </div>
            <input
              type="text"
              value={typedText}
              onChange={handleInput}
              className="input"
              placeholder="Start typing here..."
              autoFocus
              disabled={isComplete}
            />
          </div>
        </div>

        <div>
          <MusicPlayer
            enabled={musicEnabled}
            onToggle={setMusicEnabled}
            volume={volume}
            onVolumeChange={setVolume}
          />
        </div>
      </div>
    </div>
  )
}
