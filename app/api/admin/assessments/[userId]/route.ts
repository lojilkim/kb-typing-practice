import { NextResponse } from "next/server"
import { getSupabase, getUser } from "@/lib/supabase-helpers"

export async function GET(_request: Request, { params }: { params: Promise<{ userId: string }> }) {
  const admin = await getUser()
  if (!admin) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  if (admin.role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  const { userId } = await params
  const supabase = await getSupabase()
  const [{ data: user }, { data: assessments }] = await Promise.all([
    supabase.from("users").select("id, username, student_id, level, xp, created_at").eq("id", userId).single(),
    supabase.from("assessment_results").select("*").eq("user_id", userId).order("created_at"),
  ])
  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 })
  return NextResponse.json({ user, pre: assessments?.find((item) => item.kind === "pre") || null, post: assessments?.find((item) => item.kind === "post") || null })
}
