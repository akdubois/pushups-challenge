import { createClient } from '@/lib/supabase/client'

/**
 * Get the appropriate redirect path based on user's group membership
 * - 0 groups: /groups/create
 * - 1 group: /groups/[groupId]
 * - 2+ groups: /dashboard
 */
export async function getPostLoginRedirect(): Promise<string> {
  const supabase = createClient()

  // Get current user
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return '/login'
  }

  // Fetch user's groups
  try {
    const { data: memberships, error } = await supabase
      .from('group_memberships')
      .select(`
        *,
        groups:group_id (*)
      `)
      .eq('user_id', user.id)
      .eq('deleted', false)

    if (error) throw error

    const groups = (memberships as any)?.filter((m: any) => m.groups) || []

    if (groups.length === 0) {
      // No groups - prompt to create one
      return '/groups/create'
    } else if (groups.length === 1) {
      // Single group - go directly to it
      return `/groups/${groups[0].group_id}`
    } else {
      // Multiple groups - show dashboard to choose
      return '/dashboard'
    }
  } catch (error) {
    console.error('Failed to fetch groups:', error)
    return '/dashboard'
  }
}
