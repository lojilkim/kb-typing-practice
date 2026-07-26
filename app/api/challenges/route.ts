import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const today = new Date().toISOString().split("T")[0]

    let dailyChallenge = await prisma.dailyChallenge.findUnique({
      where: { date: today },
    })

    if (!dailyChallenge) {
      const challengeTypes = [
        { type: "accuracy", target: 95, description: "Reach 95% accuracy in a session", xpReward: 100 },
        { type: "words", target: 500, description: "Type 500 words today", xpReward: 100 },
        { type: "time", target: 20, description: "Practice for 20 minutes", xpReward: 100 },
        { type: "song", target: 1, description: "Complete one song", xpReward: 150 },
      ]

      const randomChallenge = challengeTypes[Math.floor(Math.random() * challengeTypes.length)]

      dailyChallenge = await prisma.dailyChallenge.create({
        data: {
          ...randomChallenge,
          date: today,
        },
      })
    }

    const userChallenge = await prisma.userChallenge.findUnique({
      where: {
        userId_challengeId: {
          userId: session.user.id,
          challengeId: dailyChallenge.id,
        },
      },
    })

    return NextResponse.json({
      challenge: dailyChallenge,
      userProgress: userChallenge,
    })
  } catch (error) {
    console.error("Fetch challenges error:", error)
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { challengeId, progress } = await request.json()

    const challenge = await prisma.dailyChallenge.findUnique({
      where: { id: challengeId },
    })

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 })
    }

    const completed = progress >= challenge.target

    const userChallenge = await prisma.userChallenge.upsert({
      where: {
        userId_challengeId: {
          userId: session.user.id,
          challengeId,
        },
      },
      create: {
        userId: session.user.id,
        challengeId,
        progress,
        completed,
        completedAt: completed ? new Date() : null,
      },
      update: {
        progress,
        completed,
        completedAt: completed ? new Date() : undefined,
      },
    })

    if (completed && !userChallenge.completed) {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { xp: { increment: challenge.xpReward } },
      })
    }

    return NextResponse.json(userChallenge)
  } catch (error) {
    console.error("Update challenge error:", error)
    return NextResponse.json({ error: "Failed to update challenge" }, { status: 500 })
  }
}
