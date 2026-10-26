export const TYPING_SESSION_SECONDS = 30

export interface PerformanceSample {
  elapsedMs: number
  wpm: number
  errors: number
}

export interface TypingSessionMetrics {
  rawWpm: number
  netWpm: number
  accuracy: number
  errors: number
  correctCharacters: number
  incorrectCharacters: number
  extraCharacters: number
  missedCharacters: number
  consistency: number | null
  duration: number
  wordsTyped: number
}

export function calculateSessionMetrics(
  expectedText: string,
  typedText: string,
  elapsedSeconds: number,
  samples: PerformanceSample[] = [],
): TypingSessionMetrics {
  const typed = typedText.slice(0, expectedText.length)
  const totalTyped = typedText.length
  const minutes = Math.max(elapsedSeconds, 0.001) / 60
  let correctCharacters = 0
  let incorrectCharacters = 0
  for (let index = 0; index < typed.length; index++) {
    if (typed[index] === expectedText[index]) correctCharacters++
    else incorrectCharacters++
  }
  const extraCharacters = Math.max(totalTyped - expectedText.length, 0)
  incorrectCharacters += extraCharacters
  const consistency = calculateConsistency(samples)

  return {
    rawWpm: Math.round((totalTyped / 5 / minutes) * 10) / 10,
    netWpm: Math.round((correctCharacters / 5 / minutes) * 10) / 10,
    accuracy: totalTyped > 0 ? Math.round((correctCharacters / totalTyped) * 1000) / 10 : 0,
    errors: incorrectCharacters,
    correctCharacters,
    incorrectCharacters,
    extraCharacters,
    missedCharacters: Math.max(expectedText.length - typed.length, 0),
    consistency,
    duration: Math.round(elapsedSeconds),
    wordsTyped: typedText.trim() ? typedText.trim().split(/\s+/).length : 0,
  }
}

export function calculateConsistency(samples: PerformanceSample[]): number | null {
  const speeds = samples.map((sample) => sample.wpm).filter((wpm) => Number.isFinite(wpm))
  if (speeds.length < 2) return null

  const mean = speeds.reduce((sum, value) => sum + value, 0) / speeds.length
  if (mean <= 0) return 0

  const variance = speeds.reduce((sum, value) => sum + (value - mean) ** 2, 0) / speeds.length
  return Math.max(0, Math.round((100 - (Math.sqrt(variance) / mean) * 100) * 10) / 10)
}
