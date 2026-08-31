export type AssessmentKind = "pre" | "post"

export interface AssessmentResult {
  id?: string
  user_id?: string
  kind: AssessmentKind
  wpm: number
  accuracy: number
  errors: number
  duration: number
  words_typed: number
  created_at?: string
}

export interface AssessmentStatus {
  pre: AssessmentResult | null
  post: AssessmentResult | null
  storage: "database" | "local"
}

export const assessmentText =
  "Good typing comes from steady practice, correct posture, and accurate finger placement. In 2026, type each sentence carefully: keep a comfortable rhythm, watch the punctuation, and use the correct number row. Try to maintain 95% accuracy while typing commas, periods, colons, semicolons, apostrophes, and question marks. A focused student can improve speed from 25 WPM to 40 WPM with regular practice; small, accurate steps create lasting progress."

export const localAssessmentKey = "typemaster-assessments"

export function readLocalAssessments(): AssessmentStatus {
  if (typeof window === "undefined") return { pre: null, post: null, storage: "local" }
  try {
    const saved = JSON.parse(localStorage.getItem(localAssessmentKey) || "{}") as Partial<AssessmentStatus>
    return { pre: saved.pre || null, post: saved.post || null, storage: "local" }
  } catch {
    return { pre: null, post: null, storage: "local" }
  }
}

export function saveLocalAssessment(result: AssessmentResult): AssessmentStatus {
  const current = readLocalAssessments()
  const next = { ...current, [result.kind]: result, storage: "local" } as AssessmentStatus
  localStorage.setItem(localAssessmentKey, JSON.stringify(next))
  return next
}
