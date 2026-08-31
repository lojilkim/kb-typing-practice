"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../components/SupabaseAuthProvider"
import { useRouter } from "next/navigation"

interface Challenge {
  id: string
  type: string
  target: number
  description: string
  xpReward: number
  date: string
}

interface UserProgress {
  id: string
  progress: number
  completed: boolean
  completedAt: string | null
}

export default function ChallengesPage() {
  const { profile, loading: authLoading } = useAuth()
  const router = useRouter()
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [userProgress, setUserProgress] = useState<UserProgress | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!authLoading && !profile) router.push("/login")
  }, [authLoading, profile, router])

  useEffect(() => {
    if (profile) {
      const fetchChallenge = async () => {
        try {
          const res = await fetch("/api/challenges")
          const data = await res.json()
          setChallenge(data.challenge)
          setUserProgress(data.userProgress)
        } catch (error) {
          console.error("Failed to fetch challenge:", error)
        } finally {
          setLoading(false)
        }
      }
      fetchChallenge()
    }
  }, [profile])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-xl" style={{ color: "var(--text-muted)" }}>Loading...</div></div>
  }

  const progress = userProgress?.progress || 0
  const target = challenge?.target || 1
  const progressPercent = Math.min((progress / target) * 100, 100)

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🎯 Daily Challenge</h1>
        <p style={{ color: "var(--text-muted)" }}>Complete daily tasks to earn XP and badges</p>
      </div>

      {challenge && (
        <div className="card">
          <div className="text-center mb-6">
            <div className="text-5xl mb-4">
              {challenge.type === "accuracy" ? "🎯" : challenge.type === "words" ? "📝" : challenge.type === "time" ? "⏱️" : "🎵"}
            </div>
            <h2 className="text-2xl font-bold mb-2">{challenge.description}</h2>
            <span className="badge badge-primary">+{challenge.xpReward} XP</span>
          </div>

          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="font-semibold">Progress</span>
              <span>
                {progress} / {target}
                {challenge.type === "time" ? " min" : challenge.type === "accuracy" ? "%" : ""}
              </span>
            </div>
            <div className="progress-bar">
              <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
            </div>
          </div>

          {userProgress?.completed ? (
            <div className="text-center p-4 rounded-lg" style={{ background: "rgba(0, 200, 83, 0.1)" }}>
              <p className="text-xl font-bold" style={{ color: "var(--success)" }}>
                ✓ Challenge Completed!
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                Come back tomorrow for a new challenge
              </p>
            </div>
          ) : (
            <div className="text-center p-4 rounded-lg" style={{ background: "var(--secondary)" }}>
              <p style={{ color: "var(--text-muted)" }}>
                Start practicing to make progress on this challenge!
              </p>
            </div>
          )}
        </div>
      )}

      <div className="card mt-6">
        <h2 className="text-xl font-bold mb-4">Challenge Types</h2>
        <div className="space-y-3">
          {[
            { icon: "🎯", title: "Accuracy Challenge", desc: "Reach a target accuracy percentage" },
            { icon: "📝", title: "Word Count Challenge", desc: "Type a certain number of words" },
            { icon: "⏱️", title: "Time Challenge", desc: "Practice for a set amount of time" },
            { icon: "🎵", title: "Song Challenge", desc: "Complete typing a song" },
          ].map((type, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
              <span className="text-2xl">{type.icon}</span>
              <div>
                <h3 className="font-semibold">{type.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{type.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
