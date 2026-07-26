import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const achievements = await prisma.achievement.findMany()
    const userAchievements = await prisma.userAchievement.findMany({
      where: { userId: session.user.id },
    })

    const earnedIds = new Set(userAchievements.map((ua) => ua.achievementId))

    const achievementsWithStatus = achievements.map((achievement) => ({
      ...achievement,
      earned: earnedIds.has(achievement.id),
      earnedAt: userAchievements.find((ua) => ua.achievementId === achievement.id)?.earnedAt,
    }))

    return NextResponse.json(achievementsWithStatus)
  } catch (error) {
    console.error("Fetch achievements error:", error)
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
  }
}
