import { NextResponse } from "next/server"
import { getSupabase, getUser } from "@/lib/supabase-helpers"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const supabase = await getSupabase()
  const [{ data: activities, error: activitiesError }, { data: sessions, error: sessionsError }] = await Promise.all([
    supabase.from("code_activities").select("id, activity_number, title, description, code").order("activity_number"),
    supabase.from("practice_sessions").select("id, code_activity_id, net_wpm, wpm, accuracy, errors, duration, created_at").eq("user_id", user.id).not("code_activity_id", "is", null).order("created_at", { ascending: false }),
  ])

  if (activitiesError || sessionsError) return NextResponse.json({ error: "Unable to load code activities" }, { status: 503 })

  return NextResponse.json((activities || []).map((activity) => {
    const attempts = (sessions || []).filter((session) => session.code_activity_id === activity.id)
    const best = attempts.reduce<{ wpm: number; accuracy: number } | null>((current, session) => {
      const candidate = { wpm: session.net_wpm ?? session.wpm ?? 0, accuracy: session.accuracy ?? 0 }
      if (!current || candidate.wpm > current.wpm || (candidate.wpm === current.wpm && candidate.accuracy > current.accuracy)) return candidate
      return current
    }, null)
    return { ...activity, attempts, attemptCount: attempts.length, bestWpm: best?.wpm ?? 0, bestAccuracy: best?.accuracy ?? 0 }
  }))
}
