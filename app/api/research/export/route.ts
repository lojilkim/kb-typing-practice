import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return new Response("Unauthorized", { status: 401 })
    }

    const userId = session.user.id

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        username: true,
        studentId: true,
        createdAt: true,
        bestWpm: true,
        bestAccuracy: true,
        currentStreak: true,
        longestStreak: true,
      },
    })

    if (!user) {
      return new Response("User not found", { status: 404 })
    }

    // Get all practice sessions
    const sessions = await prisma.practiceSession.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
      include: {
        song: true,
        lesson: true,
      },
    })

    // Get error logs
    const errorLogs = await prisma.errorLog.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    })

    // Get finger stats
    const fingerStats = await prisma.fingerStat.findMany({
      where: { userId },
    })

    // Get practice calendar
    const calendar = await prisma.practiceCalendar.findMany({
      where: { userId },
      orderBy: { date: "asc" },
    })

    // Build CSV content
    const csvRows: string[] = []

    // User info section
    csvRows.push("=== USER INFORMATION ===")
    csvRows.push("Field,Value")
    csvRows.push(`Username,${user.username}`)
    csvRows.push(`Student ID,${user.studentId}`)
    csvRows.push(`Account Created,${user.createdAt.toISOString()}`)
    csvRows.push("")

    // Practice sessions section
    csvRows.push("=== PRACTICE SESSIONS ===")
    csvRows.push("Date,WPM,Accuracy,Errors,Duration (seconds),Words Typed,Activity Type,Activity Name,Music Enabled,Home Row Accuracy,Top Row Accuracy,Bottom Row Accuracy,Left Hand Accuracy,Right Hand Accuracy,Correct Keystrokes,Incorrect Keystrokes")
    
    for (const s of sessions) {
      csvRows.push([
        s.createdAt.toISOString(),
        s.wpm,
        s.accuracy,
        s.errors,
        s.duration,
        s.wordsTyped,
        s.songId ? "Song" : s.lessonId ? "Lesson" : "Free Practice",
        s.song?.title || s.lesson?.name || "N/A",
        s.musicEnabled,
        s.homeRowAccuracy || "",
        s.topRowAccuracy || "",
        s.bottomRowAccuracy || "",
        s.leftHandAccuracy || "",
        s.rightHandAccuracy || "",
        s.correctKeystrokes,
        s.incorrectKeystrokes,
      ].join(","))
    }
    csvRows.push("")

    // Error logs section
    csvRows.push("=== ERROR LOGS ===")
    csvRows.push("Date,Expected Key,Typed Key,Finger,Row,Hand")
    
    for (const e of errorLogs) {
      csvRows.push([
        e.createdAt.toISOString(),
        e.expectedKey,
        e.typedKey,
        e.finger || "",
        e.row || "",
        e.hand || "",
      ].join(","))
    }
    csvRows.push("")

    // Finger statistics section
    csvRows.push("=== FINGER STATISTICS ===")
    csvRows.push("Finger,Total Keystrokes,Correct Keystrokes,Accuracy (%)")
    
    for (const f of fingerStats) {
      csvRows.push([
        f.finger,
        f.totalKeystrokes,
        f.correctKeystrokes,
        f.accuracy.toFixed(2),
      ].join(","))
    }
    csvRows.push("")

    // Practice calendar section
    csvRows.push("=== PRACTICE CALENDAR ===")
    csvRows.push("Date,Practice Minutes,Sessions Count,Words Typed,Average WPM,Average Accuracy")
    
    for (const c of calendar) {
      csvRows.push([
        c.date,
        c.practiceMinutes,
        c.sessionsCount,
        c.wordsTyped,
        c.averageWpm.toFixed(2),
        c.averageAccuracy.toFixed(2),
      ].join(","))
    }

    // Summary statistics
    csvRows.push("")
    csvRows.push("=== SUMMARY STATISTICS ===")
    csvRows.push("Metric,Value")
    
    const totalSessions = sessions.length
    const totalTimeMinutes = sessions.reduce((sum, s) => sum + s.duration, 0) / 60
    const avgWpm = totalSessions > 0 ? sessions.reduce((sum, s) => sum + s.wpm, 0) / totalSessions : 0
    const avgAccuracy = totalSessions > 0 ? sessions.reduce((sum, s) => sum + s.accuracy, 0) / totalSessions : 0
    const totalErrors = errorLogs.length
    const totalWords = sessions.reduce((sum, s) => sum + s.wordsTyped, 0)
    const sessionsWithMusic = sessions.filter((s) => s.musicEnabled).length
    const musicUsageRate = totalSessions > 0 ? (sessionsWithMusic / totalSessions) * 100 : 0

    csvRows.push(`Total Sessions,${totalSessions}`)
    csvRows.push(`Total Practice Time (minutes),${totalTimeMinutes.toFixed(2)}`)
    csvRows.push(`Average WPM,${avgWpm.toFixed(2)}`)
    csvRows.push(`Average Accuracy,${avgAccuracy.toFixed(2)}%`)
    csvRows.push(`Total Errors,${totalErrors}`)
    csvRows.push(`Total Words Typed,${totalWords}`)
    csvRows.push(`Sessions with Music,${sessionsWithMusic}`)
    csvRows.push(`Music Usage Rate,${musicUsageRate.toFixed(2)}%`)
    csvRows.push(`Best WPM,${user.bestWpm || 0}`)
    csvRows.push(`Best Accuracy,${user.bestAccuracy || 0}%`)
    csvRows.push(`Current Streak,${user.currentStreak || 0} days`)
    csvRows.push(`Longest Streak,${user.longestStreak || 0} days`)

    const csvContent = csvRows.join("\n")

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="typing-research-data-${user.studentId}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return new Response("Failed to export data", { status: 500 })
  }
}
