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
  "Good typing comes from steady practice, correct posture, and accurate finger placement. Type this passage carefully and keep a comfortable rhythm."

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
