import { NextResponse } from "next/server"
import { getUser, getSupabase } from "@/lib/supabase-helpers"

export async function GET() {
  try {
    const user = await getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const supabase = await getSupabase()

    const { data: songs } = await supabase
      .from('songs')
      .select('*')
      .order('unlock_level', { ascending: true })

    const { data: userSongs } = await supabase
      .from('user_songs')
      .select('*')
      .eq('user_id', user.id)

    const userSongMap = new Map((userSongs || []).map((us) => [us.song_id, us]))

    const songsWithProgress = (songs || []).map((song) => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      lyrics: song.lyrics,
      difficulty: song.difficulty,
      unlockLevel: song.unlock_level,
      genre: song.genre,
      unlocked: true,
      userProgress: userSongMap.get(song.id)
        ? {
            bestWpm: userSongMap.get(song.id)!.best_wpm,
            bestAccuracy: userSongMap.get(song.id)!.best_accuracy,
            completed: userSongMap.get(song.id)!.completed,
            attempts: userSongMap.get(song.id)!.attempts,
          }
        : null,
    }))

    return NextResponse.json(songsWithProgress)
  } catch (error) {
    console.error("Fetch songs error:", error)
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 })
  }
}
