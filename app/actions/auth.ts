'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

/**
 * Server Action: Log out the current user
 * Clears session cookies and redirects to login
 */
export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}

/**
 * Server Action: Sign in with email and password
 */
export async function signIn(email: string, password: string) {
  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { error: null }
}

/**
 * Server Action: Sign up with email and password
 */
export async function signUp(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  timezone?: string
) {
  const supabase = await createClient()

  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        first_name: firstName,
        last_name: lastName,
        timezone: tz,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { error: null }
}
