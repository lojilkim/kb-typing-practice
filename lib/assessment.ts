export type AssessmentKind = "pre" | "post"

export interface AssessmentResult {
  id?: string
  user_id?: string
  kind: AssessmentKind
  wpm: number
  net_wpm?: number
  raw_wpm?: number
  accuracy: number
  errors: number
  correct_characters?: number
  incorrect_characters?: number
  extra_characters?: number
  missed_characters?: number
  consistency?: number | null
  performance_samples?: Array<{ elapsedMs: number; wpm: number; errors: number }>
  duration: number
  words_typed: number
  created_at?: string
}

export interface AssessmentStatus {
  pre: AssessmentResult | null
  post: AssessmentResult | null
  storage: "database" | "local"
}

export const assessmentText = [
  "public class Main {",
  "    public static void main(String[] args) {",
  '        String name = "Student";',
  "        int age = 17;",
  "",
  '        System.out.println("Welcome to Java!");',
  '        System.out.println("My name is " + name);',
  '        System.out.println("I am " + age + " years old.");',
  "",
  "        int a = 10;",
  "        int b = 20;",
  "        int sum = a + b;",
  "",
  '        System.out.println("First number: " + a);',
  '        System.out.println("Second number: " + b);',
  '        System.out.println("The sum is: " + sum);',
  "",
  "        if (sum > 20) {",
  '            System.out.println("The sum is greater than 20.");',
  "        } else {",
  '            System.out.println("The sum is 20 or less.");',
  "        }",
  "    }",
  "}",
].join("\n")

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
