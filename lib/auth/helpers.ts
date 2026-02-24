import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { AuthUser } from '@/types'

/**
 * Get the current authenticated user (Server-side only)
 * Use in Server Components and Server Actions
 *
 * @returns AuthUser if authenticated, null otherwise
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  // Fetch user profile from database
  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    return null
  }

  return {
    id: user.id,
    email: user.email || '',
    firstName: (profile as any).first_name || '',
    lastName: (profile as any).last_name || '',
    timezone: (profile as any).timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

/**
 * Require authentication - redirect to login if not authenticated
 * Use in Server Components that require auth
 *
 * @returns AuthUser (guaranteed to exist or redirects)
 */
export async function requireAuth(): Promise<AuthUser> {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  return user
}

/**
 * Redirect if already authenticated (for login/register pages)
 *
 * @param to - Redirect destination (default: /dashboard)
 */
export async function redirectIfAuthenticated(to: string = '/dashboard') {
  const user = await getCurrentUser()

  if (user) {
    redirect(to)
  }
}
