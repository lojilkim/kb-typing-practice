"use client"

import { useEffect, useState, useCallback } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import MusicPlayer from "../components/MusicPlayer"
import { calculateTypingStats } from "@/lib/typing-engine"

interface Song {
  id: string
  title: string
  artist: string
  lyrics: string
  difficulty: string
  unlockLevel: number
  genre: string | null
  unlocked: boolean
  userProgress: {
    bestWpm: number
    bestAccuracy: number
    completed: boolean
    attempts: number
  } | null
}

export default function SongsPage() {
  const { status } = useSession()
  const router = useRouter()
  const [songs, setSongs] = useState<Song[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSong, setSelectedSong] = useState<Song | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
    }
  }, [status, router])

  useEffect(() => {
    if (status === "authenticated") {
      const fetchSongs = async () => {
        try {
          const res = await fetch("/api/songs")
          const data = await res.json()
          setSongs(data)
        } catch (error) {
          console.error("Failed to fetch songs:", error)
        } finally {
          setLoading(false)
        }
      }
      fetchSongs()
    }
  }, [status])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-xl" style={{ color: "var(--text-muted)" }}>Loading...</div>
      </div>
    )
  }

  if (selectedSong) {
    return <TypingPractice song={selectedSong} onBack={() => setSelectedSong(null)} />
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🎵 Song Lyrics Typing</h1>
        <p style={{ color: "var(--text-muted)" }}>Choose a song and type along with the lyrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {songs.map((song) => (
          <div key={song.id} className={`card ${!song.unlocked ? "opacity-50" : ""}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold">{song.title}</h3>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>{song.artist}</p>
              </div>
              <span className="badge badge-primary">{song.difficulty}</span>
            </div>

            {song.genre && (
              <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
                Genre: {song.genre}
              </p>
            )}

            {song.userProgress ? (
              <div className="mb-3">
                <div className="flex justify-between text-sm mb-1">
                  <span>Best: {song.userProgress.bestWpm} WPM</span>
                  <span>{song.userProgress.bestAccuracy}% accuracy</span>
                </div>
                <div className="progress-bar">
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${song.userProgress.bestAccuracy}%` }}
                  ></div>
                </div>
                {song.userProgress.completed && (
                  <p className="text-sm mt-2" style={{ color: "var(--success)" }}>✓ Completed</p>
                )}
              </div>
            ) : null}

            <button
              onClick={() => song.unlocked && setSelectedSong(song)}
              disabled={!song.unlocked}
              className={`w-full mt-3 ${song.unlocked ? "btn-primary" : "btn-secondary"}`}
            >
              {song.unlocked ? "Start Typing" : `🔒 Unlock at Level ${song.unlockLevel}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

function TypingPractice({ song, onBack }: { song: Song; onBack: () => void }) {
  const [typedText, setTypedText] = useState("")
  const [startTime, setStartTime] = useState<number | null>(null)
  const [endTime, setEndTime] = useState<number | null>(null)
  const [wpm, setWpm] = useState(0)
  const [accuracy, setAccuracy] = useState(100)
  const [errors, setErrors] = useState(0)
  const [isComplete, setIsComplete] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const [musicEnabled, setMusicEnabled] = useState(true)
  const [volume, setVolume] = useState(70)

  const words = song.lyrics.split(" ")
  const typedWords = typedText.split(" ")

  const saveProgress = useCallback(async () => {
    const duration = startTime ? Math.round((Date.now() - startTime) / 1000) : 0
    const wordsTyped = typedText.trim().split(/\s+/).length

    const typingStats = calculateTypingStats(song.lyrics, typedText)

    await fetch("/api/practice", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wpm,
        accuracy,
        errors,
        duration,
        wordsTyped,
        songId: song.id,
        musicEnabled,
        errorDetails: typingStats.errors,
        fingerStats: typingStats.fingerStats,
        rowAccuracy: typingStats.rowAccuracy,
        handAccuracy: typingStats.handAccuracy,
        correctKeystrokes: typingStats.correctKeystrokes,
        incorrectKeystrokes: typingStats.incorrectKeystrokes,
      }),
    })
  }, [startTime, typedText, wpm, accuracy, errors, song.id, song.lyrics, musicEnabled])

  useEffect(() => {
    if (typedText.length === song.lyrics.length && typedText.length > 0) {
      setEndTime(Date.now())
      setIsComplete(true)
      setShowResults(true)
      saveProgress()
    }
  }, [typedText, song.lyrics.length, saveProgress])

  useEffect(() => {
    if (startTime && typedText.length > 0) {
      const elapsed = (Date.now() - startTime) / 1000 / 60
      const wordsTyped = typedText.trim().split(/\s+/).length
      setWpm(Math.round(wordsTyped / elapsed))
    }
  }, [typedText, startTime])

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!startTime) {
      setStartTime(Date.now())
    }

    const value = e.target.value
    setTypedText(value)

    let errorCount = 0
    for (let i = 0; i < value.length; i++) {
      if (value[i] !== song.lyrics[i]) {
        errorCount++
      }
    }
    setErrors(errorCount)
    setAccuracy(Math.round(((value.length - errorCount) / value.length) * 100) || 100)
  }

  const getWordClass = (index: number) => {
    if (index >= typedWords.length) return ""
    if (typedWords[index] === words[index]) return "typing-correct"
    return "typing-incorrect"
  }

  const elapsedSeconds = startTime && endTime ? Math.round((endTime - startTime) / 1000) : 0

  if (showResults) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center">
          <h2 className="text-3xl font-bold mb-6">Song Complete!</h2>
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>WPM</p>
              <p className="text-4xl font-bold" style={{ color: "var(--primary)" }}>{wpm}</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Accuracy</p>
              <p className="text-4xl font-bold" style={{ color: "var(--success)" }}>{accuracy}%</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Errors</p>
              <p className="text-4xl font-bold" style={{ color: "var(--error)" }}>{errors}</p>
            </div>
            <div>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>Time</p>
              <p className="text-4xl font-bold">{elapsedSeconds}s</p>
            </div>
          </div>
          <button onClick={onBack} className="btn-primary">
            Back to Songs
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button onClick={onBack} className="btn-secondary mb-4">
          Back to Songs
        </button>
        <h1 className="text-2xl font-bold">{song.title}</h1>
        <p style={{ color: "var(--text-muted)" }}>{song.artist}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <div className="card mb-6">
            <div className="flex justify-between mb-4">
              <div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>WPM</p>
                <p className="text-2xl font-bold" style={{ color: "var(--primary)" }}>{wpm}</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Accuracy</p>
                <p className="text-2xl font-bold" style={{ color: "var(--success)" }}>{accuracy}%</p>
              </div>
              <div>
                <p className="text-sm" style={{ color: "var(--text-muted)" }}>Errors</p>
                <p className="text-2xl font-bold" style={{ color: "var(--error)" }}>{errors}</p>
              </div>
            </div>

            <div className="progress-bar mb-6">
              <div
                className="progress-bar-fill"
                style={{ width: `${(typedText.length / song.lyrics.length) * 100}%` }}
              ></div>
            </div>

            <div className="text-lg leading-relaxed mb-6 font-mono" style={{ fontSize: "1.25rem" }}>
              {words.map((word, index) => (
                <span key={index} className={getWordClass(index)}>
                  {word}{" "}
                </span>
              ))}
            </div>

            <input
              type="text"
              value={typedText}
              onChange={handleInput}
              className="input"
              placeholder="Start typing here..."
              autoFocus
              disabled={isComplete}
            />
          </div>
        </div>

        <div>
          <MusicPlayer
            enabled={musicEnabled}
            onToggle={setMusicEnabled}
            volume={volume}
            onVolumeChange={setVolume}
          />
        </div>
      </div>
    </div>
  )
}
