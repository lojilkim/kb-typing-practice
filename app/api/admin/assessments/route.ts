import { NextResponse } from "next/server"
import { getSupabase, getUser } from "@/lib/supabase-helpers"

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (user.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })

  const supabase = await getSupabase()
  const [{ data: users, error: usersError }, { data: results, error: resultsError }] = await Promise.all([
    supabase.from("users").select("id, username, student_id, level, xp, created_at, role").order("created_at", { ascending: false }),
    supabase.from("assessment_results").select("id, user_id, kind, wpm, accuracy, correct_characters, incorrect_characters, total_characters, errors, completion_time, status, created_at").order("created_at", { ascending: false }),
  ])
  if (usersError || resultsError) return NextResponse.json({ error: "Unable to load admin assessment data" }, { status: 503 })
  return NextResponse.json((users || []).map((account) => ({
    ...account,
    pre: results?.find((item) => item.user_id === account.id && item.kind === "pre") || null,
    post: results?.find((item) => item.user_id === account.id && item.kind === "post") || null,
  })))
}
