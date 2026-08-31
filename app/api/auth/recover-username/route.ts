import { NextResponse } from "next/server"
import { getSupabase } from "@/lib/supabase-helpers"

export async function POST(request: Request) {
  const { email } = await request.json().catch(() => ({ email: "" }))
  if (typeof email !== "string" || !email.includes("@")) return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
  const { data, error } = await (await getSupabase()).rpc("recover_username", { account_email: email })
  if (error) return NextResponse.json({ message: "If an account uses that email, recovery instructions are available." })
  return NextResponse.json({ username: data || null, message: data ? "Your username is shown below." : "If an account uses that email, recovery instructions are available." })
}
