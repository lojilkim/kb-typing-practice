import { NextResponse } from "next/server"
import { getUser, getSupabase } from "@/lib/supabase-helpers"

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await getSupabase()

    // Get practice sessions
    const { data: sessions } = await supabase
      .from('practice_sessions')
      .select('*, song:songs(*), lesson:lessons(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(100)

    // Calculate practice frequency
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const recentSessions = (sessions || []).filter(
      (s) => new Date(s.created_at) >= thirtyDaysAgo
    )

    const practiceDays = new Set(
      recentSessions.map((s) => new Date(s.created_at).toDateString())
    ).size

    // Get finger statistics
    const { data: fingerStats } = await supabase
      .from('finger_stats')
      .select('*')
      .eq('user_id', user.id)

    // Get error patterns
    const { data: errorLogs } = await supabase
      .from('error_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500)

    // Analyze errors by row
    const errorsByRow = (errorLogs || []).reduce((acc, log) => {
      const row = log.row || "unknown"
      acc[row] = (acc[row] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Analyze errors by hand
    const errorsByHand = (errorLogs || []).reduce((acc, log) => {
      const hand = log.hand || "unknown"
      acc[hand] = (acc[hand] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    // Calculate improvement trend
    type SessionData = { wpm: number; accuracy: number; created_at: string }
    const sessionsByWeek: Record<string, SessionData[]> = {}
    ;(sessions || []).forEach((session) => {
      const date = new Date(session.created_at)
      const weekKey = `${date.getFullYear()}-W${Math.floor(date.getDate() / 7)}`
      if (!sessionsByWeek[weekKey]) {
        sessionsByWeek[weekKey] = []
      }
      sessionsByWeek[weekKey].push(session)
    })

    const weeklyAverages = Object.entries(sessionsByWeek).map(([week, weekSessions]) => {
      const avgWpm = weekSessions.reduce((sum, s) => sum + s.wpm, 0) / weekSessions.length
      const avgAccuracy = weekSessions.reduce((sum, s) => sum + s.accuracy, 0) / weekSessions.length
      return { week, avgWpm: Math.round(avgWpm), avgAccuracy: Math.round(avgAccuracy * 100) / 100 }
    })

    // Get practice calendar data
    const { data: calendarData } = await supabase
      .from('practice_calendar')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(90)

    // Calculate key metrics
    const totalSessions = (sessions || []).length
    const totalTimeMinutes = Math.round(user.total_practice_time / 60)
    const overallAccuracy = totalSessions > 0
      ? (sessions || []).reduce((sum, s) => sum + s.accuracy, 0) / totalSessions
      : 0

    const avgWpm = totalSessions > 0
      ? (sessions || []).reduce((sum, s) => sum + s.wpm, 0) / totalSessions
      : 0

    // Music usage statistics
    const sessionsWithMusic = (sessions || []).filter((s) => s.music_enabled).length
    const musicUsageRate = totalSessions > 0 ? (sessionsWithMusic / totalSessions) * 100 : 0

    return NextResponse.json({
      overview: {
        totalSessions,
        totalTimeMinutes,
        overallAccuracy: Math.round(overallAccuracy * 100) / 100,
        averageWpm: Math.round(avgWpm),
        bestWpm: user.best_wpm,
        bestAccuracy: user.best_accuracy,
        currentStreak: user.current_streak,
        longestStreak: user.longest_streak,
        practiceDaysLast30: practiceDays,
      },
      musicUsage: {
        sessionsWithMusic,
        totalSessions,
        usageRate: Math.round(musicUsageRate),
      },
      fingerStats: (fingerStats || []).map((stat) => ({
        finger: stat.finger,
        accuracy: Math.round(stat.accuracy * 100) / 100,
        totalKeystrokes: stat.total_keystrokes,
        correctKeystrokes: stat.correct_keystrokes,
      })),
      errorPatterns: {
        byRow: errorsByRow,
        byHand: errorsByHand,
        totalErrors: (errorLogs || []).length,
        mostCommonErrors: (errorLogs || []).slice(0, 20).map((log) => ({
          expected: log.expected_key,
          typed: log.typed_key,
          finger: log.finger,
          row: log.row,
          hand: log.hand,
        })),
      },
      improvementTrend: weeklyAverages,
      practiceCalendar: (calendarData || []).map((day) => ({
        date: day.date,
        practiceMinutes: day.practice_minutes,
        sessionsCount: day.sessions_count,
        wordsTyped: day.words_typed,
        averageWpm: Math.round(day.average_wpm),
        averageAccuracy: Math.round(day.average_accuracy * 100) / 100,
      })),
      recentSessions: (sessions || []).slice(0, 20).map((s) => ({
        date: s.created_at,
        wpm: s.wpm,
        accuracy: s.accuracy,
        duration: s.duration,
        wordsTyped: s.words_typed,
        songTitle: s.song?.title,
        lessonName: s.lesson?.name,
        musicEnabled: s.music_enabled,
      })),
    })
  } catch (error) {
    console.error("Research analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch research data" }, { status: 500 })
  }
}
