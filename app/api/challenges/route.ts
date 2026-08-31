import { NextResponse } from "next/server"
import { getUser, getSupabase } from "@/lib/supabase-helpers"

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await getSupabase()
    const today = new Date().toISOString().split("T")[0]

    let { data: dailyChallenge } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('date', today)
      .single()

    if (!dailyChallenge) {
      const challengeTypes = [
        { type: "accuracy", target: 95, description: "Reach 95% accuracy in a session", xp_reward: 100 },
        { type: "words", target: 500, description: "Type 500 words today", xp_reward: 100 },
        { type: "time", target: 20, description: "Practice for 20 minutes", xp_reward: 100 },
        { type: "song", target: 1, description: "Complete one song", xp_reward: 150 },
      ]

      const randomChallenge = challengeTypes[Math.floor(Math.random() * challengeTypes.length)]

      const { data: newChallenge } = await supabase
        .from('daily_challenges')
        .insert({ ...randomChallenge, date: today })
        .select()
        .single()

      dailyChallenge = newChallenge
    }

    const { data: userChallenge } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('challenge_id', dailyChallenge!.id)
      .single()

    return NextResponse.json({
      challenge: dailyChallenge,
      userProgress: userChallenge,
    })
  } catch (error) {
    console.error("Fetch challenges error:", error)
    return NextResponse.json({ error: "Failed to fetch challenges" }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { challengeId, progress } = await request.json()
    const supabase = await getSupabase()

    const { data: challenge } = await supabase
      .from('daily_challenges')
      .select('*')
      .eq('id', challengeId)
      .single()

    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 404 })
    }

    const completed = progress >= challenge.target

    const { data: existing } = await supabase
      .from('user_challenges')
      .select('*')
      .eq('user_id', user.id)
      .eq('challenge_id', challengeId)
      .single()

    let userChallenge
    if (existing) {
      const { data } = await supabase
        .from('user_challenges')
        .update({
          progress,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .eq('id', existing.id)
        .select()
        .single()
      userChallenge = data
    } else {
      const { data } = await supabase
        .from('user_challenges')
        .insert({
          user_id: user.id,
          challenge_id: challengeId,
          progress,
          completed,
          completed_at: completed ? new Date().toISOString() : null,
        })
        .select()
        .single()
      userChallenge = data
    }

    if (completed && !existing?.completed) {
      await supabase
        .from('users')
        .update({ xp: user.xp + challenge.xp_reward })
        .eq('id', user.id)
    }

    return NextResponse.json(userChallenge)
  } catch (error) {
    console.error("Update challenge error:", error)
    return NextResponse.json({ error: "Failed to update challenge" }, { status: 500 })
  }
}
