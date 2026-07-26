"use client"

import { useState, useRef, useEffect } from "react"

interface MusicPlayerProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  volume: number
  onVolumeChange: (volume: number) => void
}

const tracks = [
  { id: "lofi-1", name: "Lo-fi Study Beat", url: "/music/lofi-study.mp3" },
  { id: "classical-1", name: "Classical Piano", url: "/music/classical-piano.mp3" },
  { id: "ambient-1", name: "Ambient Focus", url: "/music/ambient-focus.mp3" },
]

export default function MusicPlayer({ enabled, onToggle, volume, onVolumeChange }: MusicPlayerProps) {
  const [currentTrack, setCurrentTrack] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    audioRef.current = new Audio(tracks[currentTrack].url)
    audioRef.current.loop = true
    audioRef.current.volume = volume / 100

    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [currentTrack, volume])

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume / 100
    }
  }, [volume])

  useEffect(() => {
    if (enabled && audioRef.current) {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
    } else if (audioRef.current) {
      audioRef.current.pause()
      setIsPlaying(false)
    }
  }, [enabled])

  const togglePlay = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
      setIsPlaying(false)
      onToggle(false)
    } else {
      audioRef.current.play().catch(() => {})
      setIsPlaying(true)
      onToggle(true)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">
          🎵 Background Music
        </h3>
        <button
          onClick={togglePlay}
          className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${
            isPlaying
              ? "bg-[var(--success)] text-white"
              : "bg-[var(--secondary)] text-[var(--foreground)]"
          }`}
        >
          {isPlaying ? "⏸ Pause" : "▶ Play"}
        </button>
      </div>

      <div className="mb-3">
        <p className="text-sm font-medium mb-1">{tracks[currentTrack].name}</p>
        <div className="flex gap-2">
          {tracks.map((track, index) => (
            <button
              key={track.id}
              onClick={() => setCurrentTrack(index)}
              className={`flex-1 py-1 rounded text-xs transition-all ${
                index === currentTrack
                  ? "bg-[var(--primary)] text-white"
                  : "bg-[var(--secondary)] text-[var(--text-muted)]"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs" style={{ color: "var(--text-muted)" }}>Volume</span>
          <span className="text-xs font-medium">{volume}%</span>
        </div>
        <input
          type="range"
          min="0"
          max="100"
          value={volume}
          onChange={(e) => onVolumeChange(parseInt(e.target.value))}
          className="w-full"
          style={{ accentColor: "var(--primary)" }}
        />
      </div>
    </div>
  )
}
