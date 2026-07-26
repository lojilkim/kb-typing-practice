import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const lessons = await prisma.lesson.findMany({
      orderBy: { order: "asc" },
    })

    const userLessons = await prisma.userLesson.findMany({
      where: { userId: session.user.id },
    })

    const userLessonMap = new Map(userLessons.map((ul) => [ul.lessonId, ul]))

    const lessonsWithProgress = lessons.map((lesson) => ({
      ...lesson,
      unlocked: user.level >= lesson.unlockLevel,
      userProgress: userLessonMap.get(lesson.id) || null,
    }))

    return NextResponse.json(lessonsWithProgress)
  } catch (error) {
    console.error("Fetch lessons error:", error)
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 })
  }
}
