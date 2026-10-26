import { NextResponse } from "next/server"
import { getSupabase, getUser } from "@/lib/supabase-helpers"
import { assessmentText } from "@/lib/assessment"
import { calculateSessionMetrics, PerformanceSample } from "@/lib/typing-session"

const validKinds = new Set(["pre", "post"])

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const { data, error } = await (await getSupabase())
    .from("assessment_results")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })

  if (error) return NextResponse.json({ error: "Unable to load assessments" }, { status: 503 })
  return NextResponse.json({
    pre: data?.find((item) => item.kind === "pre") || null,
    post: data?.find((item) => item.kind === "post") || null,
    storage: "database",
  })
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  const body = await request.json()
  const kind = body.kind
  const typedText = typeof body.typedText === "string" ? body.typedText : ""
  const duration = typeof body.duration === "number" ? body.duration : 0
  const samples = Array.isArray(body.samples) ? body.samples as PerformanceSample[] : []
  if (!validKinds.has(kind) || typedText.length === 0 || !Number.isFinite(duration) || duration <= 0 || duration > 30) {
    return NextResponse.json({ error: "Invalid assessment result" }, { status: 400 })
  }

  if (kind === "post" && user.level < 2) {
    return NextResponse.json({ error: "Reach Level 2 before taking the post-test" }, { status: 403 })
  }

  const { data: existing } = await (await getSupabase())
    .from("assessment_results")
    .select("id")
    .eq("user_id", user.id)
    .eq("kind", kind)
    .maybeSingle()
  if (existing) return NextResponse.json({ error: "This assessment has already been completed" }, { status: 409 })

  const metrics = calculateSessionMetrics(assessmentText, typedText, duration, samples)
  const result = {
    user_id: user.id,
    kind,
    wpm: Math.round(metrics.netWpm),
    net_wpm: Math.round(metrics.netWpm),
    raw_wpm: Math.round(metrics.rawWpm),
    accuracy: metrics.accuracy,
    correct_characters: metrics.correctCharacters,
    incorrect_characters: metrics.incorrectCharacters,
    extra_characters: metrics.extraCharacters,
    missed_characters: metrics.missedCharacters,
    consistency: metrics.consistency,
    total_characters: typedText.length,
    errors: metrics.errors,
    completion_time: metrics.duration,
    words_typed: metrics.wordsTyped,
    performance_samples: samples,
    status: "completed",
  }
  const { data, error } = await (await getSupabase())
    .from("assessment_results")
    .insert(result)
    .select()
    .single()

  if (error) return NextResponse.json({ error: "Unable to save assessment" }, { status: 500 })
  return NextResponse.json({ result: data, storage: "database" })
}
