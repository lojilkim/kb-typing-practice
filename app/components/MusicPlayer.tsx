"use client"

import { useState, useRef, useEffect } from "react"

interface MusicPlayerProps {
  enabled: boolean
  onToggle: (enabled: boolean) => void
  volume: number
  onVolumeChange: (volume: number) => void
  audioUrl: string
  trackName: string
  playRequest?: number
}

export default function MusicPlayer({
  enabled,
  onToggle,
  volume,
  onVolumeChange,
  audioUrl,
  trackName,
  playRequest = 0,
}: MusicPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume / 100
  }, [volume])

  useEffect(() => {
    if (!enabled && audioRef.current) audioRef.current.pause()
  }, [enabled])

  useEffect(() => {
    if (playRequest > 0 && enabled && audioRef.current) {
      audioRef.current.play().catch(() => onToggle(false))
    }
  }, [playRequest, enabled, onToggle])

  const togglePlay = async () => {
    if (!audioRef.current) return
    if (isPlaying) {
      audioRef.current.pause()
      onToggle(false)
      return
    }

    try {
      await audioRef.current.play()
      onToggle(true)
    } catch {
      onToggle(false)
    }
  }

  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold flex items-center gap-2">🎵 Song Music</h3>
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
        <p className="text-sm font-medium mb-1">{trackName}</p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          The recording matches the lyrics shown on the left.
        </p>
      </div>

      <audio
        ref={audioRef}
        controls
        loop
        preload="auto"
        src={audioUrl}
        className="w-full mb-3"
        aria-label={`${trackName} audio`}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
      />

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
