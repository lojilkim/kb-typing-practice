"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"

const keyboardRows = [
  [
    { key: "`", finger: "pinky-left" }, { key: "1", finger: "pinky-left" }, { key: "2", finger: "ring-left" },
    { key: "3", finger: "middle-left" }, { key: "4", finger: "index-left" }, { key: "5", finger: "index-left" },
    { key: "6", finger: "index-right" }, { key: "7", finger: "index-right" }, { key: "8", finger: "middle-right" },
    { key: "9", finger: "ring-right" }, { key: "0", finger: "pinky-right" }, { key: "-", finger: "pinky-right" },
    { key: "=", finger: "pinky-right" },
  ],
  [
    { key: "Tab", finger: "pinky-left", wide: true }, { key: "Q", finger: "pinky-left" }, { key: "W", finger: "ring-left" },
    { key: "E", finger: "middle-left" }, { key: "R", finger: "index-left" }, { key: "T", finger: "index-left" },
    { key: "Y", finger: "index-right" }, { key: "U", finger: "index-right" }, { key: "I", finger: "middle-right" },
    { key: "O", finger: "ring-right" }, { key: "P", finger: "pinky-right" }, { key: "[", finger: "pinky-right" },
    { key: "]", finger: "pinky-right" }, { key: "\\", finger: "pinky-right" },
  ],
  [
    { key: "Caps", finger: "pinky-left", wide: true }, { key: "A", finger: "pinky-left" }, { key: "S", finger: "ring-left" },
    { key: "D", finger: "middle-left" }, { key: "F", finger: "index-left" }, { key: "G", finger: "index-left" },
    { key: "H", finger: "index-right" }, { key: "J", finger: "index-right" }, { key: "K", finger: "middle-right" },
    { key: "L", finger: "ring-right" }, { key: ";", finger: "pinky-right" }, { key: "'", finger: "pinky-right" },
  ],
  [
    { key: "Shift", finger: "pinky-left", wide: true }, { key: "Z", finger: "pinky-left" }, { key: "X", finger: "ring-left" },
    { key: "C", finger: "middle-left" }, { key: "V", finger: "index-left" }, { key: "B", finger: "index-left" },
    { key: "N", finger: "index-right" }, { key: "M", finger: "index-right" }, { key: ",", finger: "middle-right" },
    { key: ".", finger: "ring-right" }, { key: "/", finger: "pinky-right" },
  ],
  [
    { key: "Ctrl", finger: "pinky-left", wide: true }, { key: "Alt", finger: "thumb" },
    { key: "Space", finger: "thumb", wide: true },
    { key: "Alt", finger: "thumb" }, { key: "Ctrl", finger: "pinky-right", wide: true },
  ],
]

const fingerColors: Record<string, string> = {
  "pinky-left": "#ff6b6b",
  "ring-left": "#feca57",
  "middle-left": "#48dbfb",
  "index-left": "#1dd1a1",
  "thumb": "#ff9ff3",
  "index-right": "#1dd1a1",
  "middle-right": "#48dbfb",
  "ring-right": "#feca57",
  "pinky-right": "#ff6b6b",
}

export default function GuidePage() {
  const { status } = useSession()
  const router = useRouter()
  const [activeKey, setActiveKey] = useState<string | null>(null)

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login")
  }, [status, router])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setActiveKey(e.key.toUpperCase())
    }
    const handleKeyUp = () => {
      setActiveKey(null)
    }
    window.addEventListener("keydown", handleKeyDown)
    window.addEventListener("keyup", handleKeyUp)
    return () => {
      window.removeEventListener("keydown", handleKeyDown)
      window.removeEventListener("keyup", handleKeyUp)
    }
  }, [])

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">🖐️ Typing Guide</h1>
        <p style={{ color: "var(--text-muted)" }}>Learn proper finger placement and typing technique</p>
      </div>

      <div className="card mb-6">
        <h2 className="text-xl font-bold mb-4">Interactive Keyboard</h2>
        <p className="text-sm mb-6" style={{ color: "var(--text-muted)" }}>
          Press any key on your keyboard to see which finger should be used. Colors represent different fingers.
        </p>

        <div className="flex flex-col items-center gap-1 mb-6">
          {keyboardRows.map((row, rowIndex) => (
            <div key={rowIndex} className="flex gap-1">
              {row.map((keyData, keyIndex) => (
                <div
                  key={keyIndex}
                  className={`key ${keyData.finger} ${activeKey === keyData.key ? "active" : ""}`}
                  style={{
                    minWidth: keyData.wide ? "60px" : "40px",
                    borderLeftColor: fingerColors[keyData.finger] || "transparent",
                    borderRightColor: fingerColors[keyData.finger] || "transparent",
                    borderBottomColor: fingerColors[keyData.finger] || "transparent",
                  }}
                >
                  <span className="text-xs font-semibold">{keyData.key}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="flex flex-wrap gap-4 justify-center">
          {Object.entries(fingerColors).map(([finger, color]) => (
            <div key={finger} className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ background: color }}></div>
              <span className="text-sm capitalize">{finger.replace("-", " ")}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="card">
          <h2 className="text-xl font-bold mb-4">🖐️ Hand Placement</h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
              <h3 className="font-semibold mb-1">Left Hand</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Place your left fingers on A, S, D, F keys. Your thumb rests on the spacebar.
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
              <h3 className="font-semibold mb-1">Right Hand</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Place your right fingers on J, K, L, ; keys. Your thumb rests on the spacebar.
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
              <h3 className="font-semibold mb-1">Home Row</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Always return to the home row keys after pressing other keys. The F and J keys have small bumps to help you find them without looking.
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <h2 className="text-xl font-bold mb-4">🧘 Proper Posture</h2>
          <div className="space-y-3">
            <div className="p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
              <h3 className="font-semibold mb-1">Sitting Position</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Sit up straight with your feet flat on the floor. Keep your back against the chair.
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
              <h3 className="font-semibold mb-1">Wrist Position</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Keep your wrists straight and floating above the keyboard. Do not rest your wrists on the desk.
              </p>
            </div>
            <div className="p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
              <h3 className="font-semibold mb-1">Screen Distance</h3>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Keep the screen at arm&apos;s length, with the top of the screen at or slightly below eye level.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <h2 className="text-xl font-bold mb-4">💡 Tips for Better Typing</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            "Don't look at the keyboard while typing",
            "Focus on accuracy first, speed will come naturally",
            "Practice regularly, even just 15 minutes a day",
            "Use all fingers, not just your index fingers",
            "Take breaks to avoid strain and fatigue",
            "Keep your nails trimmed for better key contact",
          ].map((tip, index) => (
            <div key={index} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--secondary)" }}>
              <span className="text-lg">✅</span>
              <p className="text-sm">{tip}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
