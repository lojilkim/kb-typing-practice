import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'

export async function getUser() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  return profile
}

export async function getSupabase() {
  const cookieStore = await cookies()
  return createClient(cookieStore)
}
