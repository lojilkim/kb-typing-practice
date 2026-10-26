import { NextResponse } from "next/server"
import { getSupabase, getUser } from "@/lib/supabase-helpers"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = await getSupabase()
  const [{ data: users, error: usersError }, { data: results, error: resultsError }, { data: practice, error: practiceError }] = await Promise.all([
    supabase.from("users").select("id, username, student_id, level, xp, created_at, role").order("created_at", { ascending: false }),
    supabase.from("assessment_results").select("id, user_id, kind, wpm, net_wpm, raw_wpm, accuracy, correct_characters, incorrect_characters, extra_characters, missed_characters, total_characters, errors, completion_time, consistency, performance_samples, status, created_at").order("created_at", { ascending: false }),
    supabase.from("practice_sessions").select("id, user_id, wpm, raw_wpm, net_wpm, accuracy, errors, duration, extra_characters, missed_characters, consistency, created_at, song:songs(title), lesson:lessons(name), code_activity:code_activities(activity_number, title)").order("created_at", { ascending: false }).limit(500),
  ])
  if (usersError || resultsError || practiceError) return NextResponse.json({ error: "Unable to load admin assessment data" }, { status: 503 })
  return NextResponse.json((users || []).map((account) => ({
    ...account,
    pre: results?.find((item) => item.user_id === account.id && item.kind === "pre") || null,
    post: results?.find((item) => item.user_id === account.id && item.kind === "post") || null,
    practiceSessions: practice?.filter((item) => item.user_id === account.id) || [],
  })))
}
