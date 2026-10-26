import { NextResponse } from "next/server"
import { getSupabase, getUser } from "@/lib/supabase-helpers"

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getUser()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (admin.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { userId } = await params
  const supabase = await getSupabase()
  const [{ data: user }, { data: assessments }, { data: practice }] = await Promise.all([
    supabase.from("users").select("id, username, student_id, level, xp, created_at").eq("id", userId).single(),
    supabase.from("assessment_results").select("*").eq("user_id", userId).order("created_at"),
    supabase.from("practice_sessions").select("id, wpm, raw_wpm, net_wpm, accuracy, errors, duration, extra_characters, missed_characters, consistency, created_at, song:songs(title), lesson:lessons(name), code_activity:code_activities(activity_number, title)").eq("user_id", userId).order("created_at", { ascending: false }).limit(100),
  ])
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
  return NextResponse.json({ user, pre: assessments?.find((item) => item.kind === "pre") || null, post: assessments?.find((item) => item.kind === "post") || null, practiceSessions: practice || [] })
}
