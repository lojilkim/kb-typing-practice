"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

interface Achievement {
  id: string
  name: string
  description: string
  icon: string
  xpReward: number
  condition: string
  earned: boolean
  earnedAt: string | null
}

export default function AchievementsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      const fetchAchievements = async () => {
        try {
          const res = await fetch("/api/achievements")
          setAchievements(await res.json())
        } catch (error) {
          console.error("Failed to fetch achievements:", error)
        } finally {
          setLoading(false)
        }
      }
      fetchAchievements()
    }
  }, [status])

  if (loading) {
    return <div className="flex items-center justify-center h-64"><div className="text-xl" style={{ color: "var(--text-muted)" }}>Loading...</div></div>
  }

  const earnedCount = achievements.filter((a) => a.earned).length

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🏆 Achievements</h1>
        <p style={{ color: "var(--text-muted)" }}>
          {earnedCount} of {achievements.length} achievements earned
        </p>
        <div className="progress-bar mt-3" style={{ maxWidth: "300px" }}>
          <div className="progress-bar-fill" style={{ width: `${(earnedCount / achievements.length) * 100}%` }}></div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {achievements.map((achievement) => (
          <div
            key={achievement.id}
            className={`card ${!achievement.earned ? "opacity-60" : ""}`}
            style={achievement.earned ? { borderColor: "var(--success)" } : {}}
          >
            <div className="flex items-start gap-4">
              <div className="text-4xl">{achievement.icon}</div>
              <div className="flex-1">
                <h3 className="text-lg font-bold">{achievement.name}</h3>
                <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
                  {achievement.description}
                </p>
                <div className="flex items-center justify-between">
                  <span className="badge badge-primary">+{achievement.xpReward} XP</span>
                  {achievement.earned ? (
                    <span className="badge badge-success">✓ Earned</span>
                  ) : (
                    <span className="text-sm" style={{ color: "var(--text-muted)" }}>🔒 Locked</span>
                  )}
                </div>
                {achievement.earned && achievement.earnedAt && (
                  <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                    Earned on {new Date(achievement.earnedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
