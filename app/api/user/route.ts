import { NextResponse } from "next/server"
import { getUser, getSupabase } from "@/lib/supabase-helpers"

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    return NextResponse.json({
      bestWpm: user.best_wpm,
      bestAccuracy: user.best_accuracy,
      totalPracticeTime: user.total_practice_time,
      totalWordsTyped: user.total_words_typed,
      currentStreak: user.current_streak,
      longestStreak: user.longest_streak,
      level: user.level,
      xp: user.xp,
    })
  } catch (error) {
    console.error("Fetch user error:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}
