import { NextResponse } from "next/server"
import { getSession } from "@/lib/session"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getSession()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const songs = await prisma.song.findMany({
      orderBy: { unlockLevel: "asc" },
    })

    const userSongs = await prisma.userSong.findMany({
      where: { userId: session.user.id },
    })

    const userSongMap = new Map(userSongs.map((us) => [us.songId, us]))

    const songsWithProgress = songs.map((song) => ({
      ...song,
      unlocked: user.level >= song.unlockLevel,
      userProgress: userSongMap.get(song.id) || null,
    }))

    return NextResponse.json(songsWithProgress)
  } catch (error) {
    console.error("Fetch songs error:", error)
    return NextResponse.json({ error: "Failed to fetch songs" }, { status: 500 })
  }
}
