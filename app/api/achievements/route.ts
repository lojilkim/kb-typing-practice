import { NextResponse } from "next/server"
import { getUser, getSupabase } from "@/lib/supabase-helpers"

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await getSupabase()

    const { data: achievements } = await supabase
      .from('achievements')
      .select('*')

    const { data: userAchievements } = await supabase
      .from('user_achievements')
      .select('*')
      .eq('user_id', user.id)

    const earnedIds = new Set((userAchievements || []).map((ua) => ua.achievement_id))

    const achievementsWithStatus = (achievements || []).map((achievement) => ({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      xpReward: achievement.xp_reward,
      condition: achievement.condition,
      earned: earnedIds.has(achievement.id),
      earnedAt: (userAchievements || []).find((ua) => ua.achievement_id === achievement.id)?.earned_at,
    }))

    return NextResponse.json(achievementsWithStatus)
  } catch (error) {
    console.error("Fetch achievements error:", error)
    return NextResponse.json({ error: "Failed to fetch achievements" }, { status: 500 })
  }
}
