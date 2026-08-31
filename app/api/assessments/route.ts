import { NextResponse } from "next/server"
import { getSupabase, getUser } from "@/lib/supabase-helpers"
import { assessmentText } from "@/lib/assessment"

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
  if (!validKinds.has(kind) || typedText.length < 10 || !Number.isFinite(duration) || duration <= 0) {
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

  let correctCharacters = 0
  for (let index = 0; index < typedText.length; index += 1) {
    if (typedText[index] === assessmentText[index]) correctCharacters += 1
  }
  const incorrectCharacters = typedText.length - correctCharacters
  const wordsTyped = typedText.trim().split(/\s+/).filter(Boolean).length
  const result = {
    user_id: user.id,
    kind,
    wpm: Math.round((wordsTyped / duration) * 60),
    accuracy: Math.round((correctCharacters / Math.max(typedText.length, 1)) * 10000) / 100,
    correct_characters: correctCharacters,
    incorrect_characters: incorrectCharacters,
    total_characters: typedText.length,
    errors: incorrectCharacters,
    completion_time: Math.round(duration),
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
