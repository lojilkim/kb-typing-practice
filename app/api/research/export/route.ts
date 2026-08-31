import { getUser, getSupabase } from "@/lib/supabase-helpers"

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return new Response("Unauthorized", { status: 401 })
    }

    const supabase = await getSupabase()

    // Get all practice sessions
    const { data: sessions } = await supabase
      .from('practice_sessions')
      .select('*, song:songs(*), lesson:lessons(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    // Get error logs
    const { data: errorLogs } = await supabase
      .from('error_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    // Get finger stats
    const { data: fingerStats } = await supabase
      .from('finger_stats')
      .select('*')
      .eq('user_id', user.id)

    // Get practice calendar
    const { data: calendar } = await supabase
      .from('practice_calendar')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: true })

    // Build CSV content
    const csvRows: string[] = []

    // User info section
    csvRows.push("=== USER INFORMATION ===")
    csvRows.push("Field,Value")
    csvRows.push(`Username,${user.username}`)
    csvRows.push(`Student ID,${user.student_id}`)
    csvRows.push(`Account Created,${user.created_at}`)
    csvRows.push("")

    // Practice sessions section
    csvRows.push("=== PRACTICE SESSIONS ===")
    csvRows.push("Date,WPM,Accuracy,Errors,Duration (seconds),Words Typed,Activity Type,Activity Name,Music Enabled,Home Row Accuracy,Top Row Accuracy,Bottom Row Accuracy,Left Hand Accuracy,Right Hand Accuracy,Correct Keystrokes,Incorrect Keystrokes")
    
    for (const s of sessions || []) {
      csvRows.push([
        s.created_at,
        s.wpm,
        s.accuracy,
        s.errors,
        s.duration,
        s.words_typed,
        s.song_id ? "Song" : s.lesson_id ? "Lesson" : "Free Practice",
        s.song?.title || s.lesson?.name || "N/A",
        s.music_enabled,
        s.home_row_accuracy || "",
        s.top_row_accuracy || "",
        s.bottom_row_accuracy || "",
        s.left_hand_accuracy || "",
        s.right_hand_accuracy || "",
        s.correct_keystrokes,
        s.incorrect_keystrokes,
      ].join(","))
    }
    csvRows.push("")

    // Error logs section
    csvRows.push("=== ERROR LOGS ===")
    csvRows.push("Date,Expected Key,Typed Key,Finger,Row,Hand")
    
    for (const e of errorLogs || []) {
      csvRows.push([
        e.created_at,
        e.expected_key,
        e.typed_key,
        e.finger || "",
        e.row || "",
        e.hand || "",
      ].join(","))
    }
    csvRows.push("")

    // Finger statistics section
    csvRows.push("=== FINGER STATISTICS ===")
    csvRows.push("Finger,Total Keystrokes,Correct Keystrokes,Accuracy (%)")
    
    for (const f of fingerStats || []) {
      csvRows.push([
        f.finger,
        f.total_keystrokes,
        f.correct_keystrokes,
        f.accuracy.toFixed(2),
      ].join(","))
    }
    csvRows.push("")

    // Practice calendar section
    csvRows.push("=== PRACTICE CALENDAR ===")
    csvRows.push("Date,Practice Minutes,Sessions Count,Words Typed,Average WPM,Average Accuracy")
    
    for (const c of calendar || []) {
      csvRows.push([
        c.date,
        c.practice_minutes,
        c.sessions_count,
        c.words_typed,
        c.average_wpm.toFixed(2),
        c.average_accuracy.toFixed(2),
      ].join(","))
    }

    // Summary statistics
    csvRows.push("")
    csvRows.push("=== SUMMARY STATISTICS ===")
    csvRows.push("Metric,Value")
    
    const totalSessions = (sessions || []).length
    const totalTimeMinutes = (sessions || []).reduce((sum, s) => sum + s.duration, 0) / 60
    const avgWpm = totalSessions > 0 ? (sessions || []).reduce((sum, s) => sum + s.wpm, 0) / totalSessions : 0
    const avgAccuracy = totalSessions > 0 ? (sessions || []).reduce((sum, s) => sum + s.accuracy, 0) / totalSessions : 0
    const totalErrors = (errorLogs || []).length
    const totalWords = (sessions || []).reduce((sum, s) => sum + s.words_typed, 0)
    const sessionsWithMusic = (sessions || []).filter((s) => s.music_enabled).length
    const musicUsageRate = totalSessions > 0 ? (sessionsWithMusic / totalSessions) * 100 : 0

    csvRows.push(`Total Sessions,${totalSessions}`)
    csvRows.push(`Total Practice Time (minutes),${totalTimeMinutes.toFixed(2)}`)
    csvRows.push(`Average WPM,${avgWpm.toFixed(2)}`)
    csvRows.push(`Average Accuracy,${avgAccuracy.toFixed(2)}%`)
    csvRows.push(`Total Errors,${totalErrors}`)
    csvRows.push(`Total Words Typed,${totalWords}`)
    csvRows.push(`Sessions with Music,${sessionsWithMusic}`)
    csvRows.push(`Music Usage Rate,${musicUsageRate.toFixed(2)}%`)
    csvRows.push(`Best WPM,${user.best_wpm || 0}`)
    csvRows.push(`Best Accuracy,${user.best_accuracy || 0}%`)
    csvRows.push(`Current Streak,${user.current_streak || 0} days`)
    csvRows.push(`Longest Streak,${user.longest_streak || 0} days`)

    const csvContent = csvRows.join("\n")

    return new Response(csvContent, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="typing-research-data-${user.student_id}.csv"`,
      },
    })
  } catch (error) {
    console.error("Export error:", error)
    return new Response("Failed to export data", { status: 500 })
  }
}
