import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Get user's overall stats
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        practiceSessions: {
          orderBy: { createdAt: "desc" },
          take: 100,
          include: {
            song: true,
            lesson: true,
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate practice frequency
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentSessions = user.practiceSessions.filter(
      (s) => new Date(s.createdAt) >= thirtyDaysAgo
    )

    const practiceDays = new Set(
      recentSessions.map((s) => new Date(s.createdAt).toDateString())
    ).size

    // Get finger statistics
    const fingerStats = await prisma.fingerStat.findMany({
      where: { userId },
    })

    // Get error patterns
    const errorLogs = await prisma.errorLog.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 500,
    })

    // Analyze errors by row
    const errorsByRow = errorLogs.reduce((acc, log) => {
      const row = log.row || "unknown"
      acc[row] = (acc[row] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Analyze errors by hand
    const errorsByHand = errorLogs.reduce((acc, log) => {
      const hand = log.hand || "unknown"
      acc[hand] = (acc[hand] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate improvement trend
    type SessionData = { wpm: number; accuracy: number; createdAt: Date }
    const sessionsByWeek: Record<string, SessionData[]> = {}
    user.practiceSessions.forEach((session) => {
      const date = new Date(session.createdAt)
      const weekKey = `${date.getFullYear()}-W${Math.floor(date.getDate() / 7)}`
      if (!sessionsByWeek[weekKey]) {
        sessionsByWeek[weekKey] = []
      }
      sessionsByWeek[weekKey].push(session)
    })

    const weeklyAverages = Object.entries(sessionsByWeek).map(([week, sessions]) => {
      const avgWpm = sessions.reduce((sum, s) => sum + s.wpm, 0) / sessions.length
      const avgAccuracy = sessions.reduce((sum, s) => sum + s.accuracy, 0) / sessions.length
      return { week, avgWpm: Math.round(avgWpm), avgAccuracy: Math.round(avgAccuracy * 100) / 100 }
    })

    // Get practice calendar data
    const calendarData = await prisma.practiceCalendar.findMany({
      where: { userId },
      orderBy: { date: "desc" },
      take: 90,
    })

    // Calculate key metrics for research
    const totalSessions = user.practiceSessions.length
    const totalTimeMinutes = Math.round(user.totalPracticeTime / 60)
    const overallAccuracy = user.practiceSessions.length > 0
      ? user.practiceSessions.reduce((sum, s) => sum + s.accuracy, 0) / user.practiceSessions.length
      : 0

    const avgWpm = user.practiceSessions.length > 0
      ? user.practiceSessions.reduce((sum, s) => sum + s.wpm, 0) / user.practiceSessions.length
      : 0

    // Music usage statistics
    const sessionsWithMusic = user.practiceSessions.filter((s) => s.musicEnabled).length
    const musicUsageRate = totalSessions > 0 ? (sessionsWithMusic / totalSessions) * 100 : 0

    return NextResponse.json({
      overview: {
        totalSessions,
        totalTimeMinutes,
        overallAccuracy: Math.round(overallAccuracy * 100) / 100,
        averageWpm: Math.round(avgWpm),
        bestWpm: user.bestWpm,
        bestAccuracy: user.bestAccuracy,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
        practiceDaysLast30: practiceDays,
      },
      musicUsage: {
        sessionsWithMusic,
        totalSessions,
        usageRate: Math.round(musicUsageRate),
      },
      fingerStats: fingerStats.map((stat) => ({
        finger: stat.finger,
        accuracy: Math.round(stat.accuracy * 100) / 100,
        totalKeystrokes: stat.totalKeystrokes,
        correctKeystrokes: stat.correctKeystrokes,
      })),
      errorPatterns: {
        byRow: errorsByRow,
        byHand: errorsByHand,
        totalErrors: errorLogs.length,
        mostCommonErrors: errorLogs.slice(0, 20).map((log) => ({
          expected: log.expectedKey,
          typed: log.typedKey,
          finger: log.finger,
          row: log.row,
          hand: log.hand,
        })),
      },
      improvementTrend: weeklyAverages,
      practiceCalendar: calendarData.map((day) => ({
        date: day.date,
        practiceMinutes: day.practiceMinutes,
        sessionsCount: day.sessionsCount,
        wordsTyped: day.wordsTyped,
        averageWpm: Math.round(day.averageWpm),
        averageAccuracy: Math.round(day.averageAccuracy * 100) / 100,
      })),
      recentSessions: user.practiceSessions.slice(0, 20).map((s) => ({
        date: s.createdAt,
        wpm: s.wpm,
        accuracy: s.accuracy,
        duration: s.duration,
        wordsTyped: s.wordsTyped,
        songTitle: s.song?.title,
        lessonName: s.lesson?.name,
        musicEnabled: s.musicEnabled,
      })),
    })
  } catch (error) {
    console.error("Research analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch research data" }, { status: 500 })
  }
}
