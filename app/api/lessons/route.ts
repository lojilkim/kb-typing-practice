import { NextResponse } from "next/server"
import { getUser, getSupabase } from "@/lib/supabase-helpers"

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await getSupabase()

    const { data: lessons } = await supabase
      .from('lessons')
      .select('*')
      .order('sort_order', { ascending: true })

    const { data: userLessons } = await supabase
      .from('user_lessons')
      .select('*')
      .eq('user_id', user.id)

    const userLessonMap = new Map((userLessons || []).map((ul) => [ul.lesson_id, ul]))

    const lessonsWithProgress = (lessons || []).map((lesson) => ({
      id: lesson.id,
      name: lesson.name,
      category: lesson.category,
      difficulty: lesson.difficulty,
      content: lesson.content,
      unlockLevel: lesson.unlock_level,
      order: lesson.sort_order,
      unlocked: user.level >= lesson.unlock_level,
      userProgress: userLessonMap.get(lesson.id)
        ? {
            bestWpm: userLessonMap.get(lesson.id)!.best_wpm,
            bestAccuracy: userLessonMap.get(lesson.id)!.best_accuracy,
            completed: userLessonMap.get(lesson.id)!.completed,
            attempts: userLessonMap.get(lesson.id)!.attempts,
          }
        : null,
    }))

    return NextResponse.json(lessonsWithProgress)
  } catch (error) {
    console.error("Fetch lessons error:", error)
    return NextResponse.json({ error: "Failed to fetch lessons" }, { status: 500 })
  }
}
