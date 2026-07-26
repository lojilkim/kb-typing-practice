export interface KeyMapping {
  finger: string
  row: string
  hand: string
}

const keyMappings: Record<string, KeyMapping> = {
  // Number row
  "`": { finger: "pinky", row: "numbers", hand: "left" },
  "1": { finger: "pinky", row: "numbers", hand: "left" },
  "2": { finger: "ring", row: "numbers", hand: "left" },
  "3": { finger: "middle", row: "numbers", hand: "left" },
  "4": { finger: "index", row: "numbers", hand: "left" },
  "5": { finger: "index", row: "numbers", hand: "left" },
  "6": { finger: "index", row: "numbers", hand: "right" },
  "7": { finger: "index", row: "numbers", hand: "right" },
  "8": { finger: "middle", row: "numbers", hand: "right" },
  "9": { finger: "ring", row: "numbers", hand: "right" },
  "0": { finger: "pinky", row: "numbers", hand: "right" },
  "-": { finger: "pinky", row: "numbers", hand: "right" },
  "=": { finger: "pinky", row: "numbers", hand: "right" },

  // Top row
  "q": { finger: "pinky", row: "top", hand: "left" },
  "w": { finger: "ring", row: "top", hand: "left" },
  "e": { finger: "middle", row: "top", hand: "left" },
  "r": { finger: "index", row: "top", hand: "left" },
  "t": { finger: "index", row: "top", hand: "left" },
  "y": { finger: "index", row: "top", hand: "right" },
  "u": { finger: "index", row: "top", hand: "right" },
  "i": { finger: "middle", row: "top", hand: "right" },
  "o": { finger: "ring", row: "top", hand: "right" },
  "p": { finger: "pinky", row: "top", hand: "right" },
  "[": { finger: "pinky", row: "top", hand: "right" },
  "]": { finger: "pinky", row: "top", hand: "right" },
  "\\": { finger: "pinky", row: "top", hand: "right" },

  // Home row
  "a": { finger: "pinky", row: "home", hand: "left" },
  "s": { finger: "ring", row: "home", hand: "left" },
  "d": { finger: "middle", row: "home", hand: "left" },
  "f": { finger: "index", row: "home", hand: "left" },
  "g": { finger: "index", row: "home", hand: "left" },
  "h": { finger: "index", row: "home", hand: "right" },
  "j": { finger: "index", row: "home", hand: "right" },
  "k": { finger: "middle", row: "home", hand: "right" },
  "l": { finger: "ring", row: "home", hand: "right" },
  ";": { finger: "pinky", row: "home", hand: "right" },
  "'": { finger: "pinky", row: "home", hand: "right" },

  // Bottom row
  "z": { finger: "pinky", row: "bottom", hand: "left" },
  "x": { finger: "ring", row: "bottom", hand: "left" },
  "c": { finger: "middle", row: "bottom", hand: "left" },
  "v": { finger: "index", row: "bottom", hand: "left" },
  "b": { finger: "index", row: "bottom", hand: "left" },
  "n": { finger: "index", row: "bottom", hand: "right" },
  "m": { finger: "index", row: "bottom", hand: "right" },
  ",": { finger: "middle", row: "bottom", hand: "right" },
  ".": { finger: "ring", row: "bottom", hand: "right" },
  "/": { finger: "pinky", row: "bottom", hand: "right" },

  // Space
  " ": { finger: "thumb", row: "bottom", hand: "both" },
}

export function getKeyMapping(key: string): KeyMapping | null {
  return keyMappings[key.toLowerCase()] || null
}

export interface TypingStats {
  correctKeystrokes: number
  incorrectKeystrokes: number
  errors: Array<{
    expected: string
    typed: string
    finger: string | null
    row: string | null
    hand: string | null
  }>
  fingerStats: Array<{
    finger: string
    total: number
    correct: number
  }>
  rowAccuracy: {
    home: number
    top: number
    bottom: number
    numbers: number
  }
  handAccuracy: {
    left: number
    right: number
  }
}

export function calculateTypingStats(
  expectedText: string,
  typedText: string
): TypingStats {
  const errors: TypingStats["errors"] = []
  const fingerMap = new Map<string, { total: number; correct: number }>()
  const rowStats = {
    home: { total: 0, correct: 0 },
    top: { total: 0, correct: 0 },
    bottom: { total: 0, correct: 0 },
    numbers: { total: 0, correct: 0 },
  }
  const handStats = {
    left: { total: 0, correct: 0 },
    right: { total: 0, correct: 0 },
  }

  let correctKeystrokes = 0
  let incorrectKeystrokes = 0

  const maxLength = Math.max(expectedText.length, typedText.length)

  for (let i = 0; i < maxLength; i++) {
    const expected = expectedText[i] || ""
    const typed = typedText[i] || ""

    if (!expected) break

    const mapping = getKeyMapping(expected)
    const finger = mapping?.finger || "unknown"
    const row = mapping?.row || "unknown"
    const hand = mapping?.hand || "unknown"

    // Update finger stats
    if (!fingerMap.has(finger)) {
      fingerMap.set(finger, { total: 0, correct: 0 })
    }
    const fingerStat = fingerMap.get(finger)!
    fingerStat.total++

    // Update row stats
    if (row in rowStats) {
      rowStats[row as keyof typeof rowStats].total++
    }

    // Update hand stats
    if (hand in handStats) {
      handStats[hand as keyof typeof handStats].total++
    }

    if (expected === typed) {
      correctKeystrokes++
      fingerStat.correct++
      if (row in rowStats) {
        rowStats[row as keyof typeof rowStats].correct++
      }
      if (hand in handStats) {
        handStats[hand as keyof typeof handStats].correct++
      }
    } else {
      incorrectKeystrokes++
      errors.push({
        expected,
        typed,
        finger,
        row,
        hand,
      })
    }
  }

  const fingerStats = Array.from(fingerMap.entries()).map(([finger, stats]) => ({
    finger,
    total: stats.total,
    correct: stats.correct,
  }))

  const rowAccuracy = {
    home: rowStats.home.total > 0 ? (rowStats.home.correct / rowStats.home.total) * 100 : 0,
    top: rowStats.top.total > 0 ? (rowStats.top.correct / rowStats.top.total) * 100 : 0,
    bottom: rowStats.bottom.total > 0 ? (rowStats.bottom.correct / rowStats.bottom.total) * 100 : 0,
    numbers: rowStats.numbers.total > 0 ? (rowStats.numbers.correct / rowStats.numbers.total) * 100 : 0,
  }

  const handAccuracy = {
    left: handStats.left.total > 0 ? (handStats.left.correct / handStats.left.total) * 100 : 0,
    right: handStats.right.total > 0 ? (handStats.right.correct / handStats.right.total) * 100 : 0,
  }

  return {
    correctKeystrokes,
    incorrectKeystrokes,
    errors,
    fingerStats,
    rowAccuracy,
    handAccuracy,
  }
}
