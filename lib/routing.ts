import { useGroupStore } from '@/store/useGroupStore'
import { useAuthStore } from '@/store/useAuthStore'

/**
 * Get the appropriate redirect path based on user's group membership
 * - 0 groups: /groups/create
 * - 1 group: /groups/[groupId]
 * - 2+ groups: /dashboard
 */
export async function getPostLoginRedirect(): Promise<string> {
  const { user } = useAuthStore.getState()

  if (!user) {
    return '/login'
  }

  const { groups, fetchUserGroups } = useGroupStore.getState()

  // Fetch groups if not already loaded
  if (groups.length === 0) {
    try {
      await fetchUserGroups(user.id)
    } catch (error) {
      console.error('Failed to fetch groups:', error)
      return '/dashboard'
    }
  }

  // Re-check after fetching
  const currentGroups = useGroupStore.getState().groups

  if (currentGroups.length === 0) {
    // No groups - prompt to create one
    return '/groups/create'
  } else if (currentGroups.length === 1) {
    // Single group - go directly to it
    return `/groups/${currentGroups[0].id}`
  } else {
    // Multiple groups - show dashboard to choose
    return '/dashboard'
  }
}
