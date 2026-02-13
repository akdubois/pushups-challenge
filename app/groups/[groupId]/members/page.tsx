// @ts-nocheck - Temporary fix for Supabase type issues
'use client'

import { useEffect, useState, use } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { useGroupStore } from '@/store/useGroupStore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import { supabase } from '@/lib/supabase/client'
import { startOfDay } from 'date-fns'

interface MemberProgress {
  userId: string
  firstName: string
  lastName: string
  todayCompleted: boolean
  currentStreak: number
  completionPercentage: number
  completedDays: number
  isAdmin: boolean
}

export default function GroupMembersPage({ params }: { params: Promise<{ groupId: string }> }) {
  const router = useRouter()
  const { user, isInitialized } = useAuthStore()
  const { groups, fetchUserGroups } = useGroupStore()
  const [members, setMembers] = useState<MemberProgress[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [encouragingUserId, setEncouragingUserId] = useState<string | null>(null)
  const [encouragementMessage, setEncouragementMessage] = useState('')

  const { groupId } = use(params)
  const currentGroup = groups.find((g) => g.id === groupId)

  useEffect(() => {
    console.log('[Members] useEffect triggered', { isInitialized, hasUser: !!user, groupId, hasCurrentGroup: !!currentGroup })

    if (isInitialized && !user) {
      console.log('[Members] No user, redirecting to login')
      router.push('/login')
      return
    }

    if (!isInitialized || !user) {
      console.log('[Members] Waiting for auth initialization')
      return
    }

    const loadData = async () => {
      // If groups array is empty, fetch user's groups first
      if (groups.length === 0) {
        console.log('[Members] Fetching user groups first...')
        await fetchUserGroups(user.id)
      }

      // Now load members
      console.log('[Members] Calling loadMembers')
      await loadMembers()
    }

    loadData()
  }, [user, isInitialized, groupId, router])

  const loadMembers = async () => {
    try {
      setIsLoading(true)
      console.log('[Members] Loading members for group:', groupId)

      // Get current group from store
      const { groups: currentGroups } = useGroupStore.getState()
      const group = currentGroups.find((g) => g.id === groupId)

      if (!group) {
        console.error('[Members] Group not found in store')
        throw new Error('Group not found')
      }

      console.log('[Members] Found group:', group.name)

      // Fetch all group memberships
      const { data: memberships, error: membershipsError } = await supabase
        .from('group_memberships')
        .select('user_id, is_admin')
        .eq('group_id', groupId)
        .eq('deleted', false)

      console.log('[Members] Memberships response:', { memberships, error: membershipsError })

      if (membershipsError) throw membershipsError

      if (!memberships || memberships.length === 0) {
        console.log('[Members] No memberships found')
        setMembers([])
        setIsLoading(false)
        return
      }

      // Fetch user details separately (to avoid RLS issues with foreign key joins)
      const userIds = memberships.map((m: any) => m.user_id)
      console.log('[Members] Fetching users for IDs:', userIds)

      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, first_name, last_name')
        .in('id', userIds)

      console.log('[Members] Users response:', { users, usersCount: users?.length, error: usersError })
      console.log('[Members] Full users array:', JSON.stringify(users))

      if (usersError) throw usersError

      // Create a map for quick lookup
      const usersMap = new Map(users?.map((u: any) => [u.id, u]) || [])
      console.log('[Members] UsersMap size:', usersMap.size)

      const today = startOfDay(new Date()).toISOString().split('T')[0]

      // For each member, get their stats
      const memberProgressPromises = memberships.map(async (membership: any) => {
        const userId = membership.user_id
        const userInfo = usersMap.get(userId)

        console.log('[Members] Processing member:', userId, userInfo)

        if (!userInfo) {
          console.error('[Members] No user info for user_id:', userId)
          return null
        }

        // Check if they completed today
        const { data: todayLog } = await supabase
          .from('daily_logs')
          .select('completed')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .eq('log_date', today)
          .eq('deleted', false)
          .maybeSingle()

        // Get all their completed logs for stats
        const { data: allLogs } = await supabase
          .from('daily_logs')
          .select('day_number, completed')
          .eq('group_id', groupId)
          .eq('user_id', userId)
          .eq('completed', true)
          .eq('deleted', false)
          .order('day_number', { ascending: true })

        const completedDays = allLogs?.length || 0
        const completionPercentage = Math.round((completedDays / 100) * 100)

        // Calculate current streak
        let currentStreak = 0
        if (allLogs && allLogs.length > 0) {
          const dayNumbers = allLogs.map((l: any) => l.day_number).sort((a: number, b: number) => b - a)
          const latestDay = dayNumbers[0]

          for (let i = 0; i < dayNumbers.length; i++) {
            if (i === 0 || dayNumbers[i] === dayNumbers[i - 1] - 1) {
              currentStreak++
            } else {
              break
            }
          }
        }

        return {
          userId,
          firstName: userInfo.first_name,
          lastName: userInfo.last_name,
          todayCompleted: todayLog?.completed || false,
          currentStreak,
          completionPercentage,
          completedDays,
          isAdmin: membership.is_admin,
        }
      })

      const memberProgress = (await Promise.all(memberProgressPromises)).filter(m => m !== null)

      console.log('[Members] Final member progress:', memberProgress)

      // Sort: incomplete first, then by name
      memberProgress.sort((a, b) => {
        if (a.todayCompleted !== b.todayCompleted) {
          return a.todayCompleted ? 1 : -1
        }
        return a.firstName.localeCompare(b.firstName)
      })

      setMembers(memberProgress)
    } catch (error) {
      console.error('[Members] Error loading members:', error)
      alert(`Error loading members: ${error.message || 'Unknown error'}`)
      setMembers([])
    } finally {
      console.log('[Members] Setting loading to false')
      setIsLoading(false)
    }
  }

  const sendEncouragement = async (toUserId: string) => {
    if (!user || !encouragementMessage.trim()) return

    try {
      setIsLoading(true)

      // Find today's log for the user
      const today = startOfDay(new Date()).toISOString().split('T')[0]

      const { data: todayLog, error: logError } = await supabase
        .from('daily_logs')
        .select('id')
        .eq('group_id', groupId)
        .eq('user_id', toUserId)
        .eq('log_date', today)
        .eq('deleted', false)
        .maybeSingle()

      if (logError) throw logError

      if (!todayLog) {
        alert('Cannot send encouragement yet - this user needs to create their daily log entry first.')
        setEncouragingUserId(null)
        setIsLoading(false)
        return
      }

      // Add encouragement as a comment
      const { error: commentError } = await supabase
        .from('comments')
        .insert({
          daily_log_id: todayLog.id,
          user_id: user.id,
          content: `💪 ${encouragementMessage}`,
        })

      if (commentError) throw commentError

      setEncouragementMessage('')
      setEncouragingUserId(null)
      alert('Encouragement sent! 🎉')
    } catch (error) {
      console.error('Error sending encouragement:', error)
      alert('Failed to send encouragement. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (!isInitialized || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (!currentGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <div className="text-center py-4">
            <h2 className="text-2xl text-foreground mb-3">Group Not Found</h2>
            <Link href="/dashboard">
              <Button variant="primary" size="lg">Go to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <Link href={`/groups/${groupId}`}>
            <Button variant="ghost" size="sm" className="mb-6">
              ← Back to Group
            </Button>
          </Link>

          <h1 className="text-5xl text-foreground mb-3">
            {currentGroup.name}
          </h1>
          <p className="text-lg text-muted">
            Group Members & Progress
          </p>
        </div>

        {/* Members List */}
        {isLoading ? (
          <Card>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted">Loading members...</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {members.map((member) => (
              <Card key={member.userId} className={member.todayCompleted ? 'bg-surface' : 'bg-accent/5'}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-3xl">
                        {member.todayCompleted ? '✅' : '⭕'}
                      </div>
                      <div>
                        <h3 className="text-xl text-foreground">
                          {member.firstName} {member.lastName}
                          {member.userId === user.id && <span className="text-muted text-sm ml-2">(You)</span>}
                        </h3>
                        <div className="flex gap-2 mt-1">
                          {member.isAdmin && <Badge variant="accent">Admin</Badge>}
                          {member.todayCompleted ? (
                            <Badge variant="success">Completed Today</Badge>
                          ) : (
                            <Badge variant="warning">Pending</Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-muted">Current Streak</p>
                        <p className="text-2xl text-foreground">{member.currentStreak} 🔥</p>
                      </div>
                      <div>
                        <p className="text-muted">Completion</p>
                        <p className="text-2xl text-foreground">{member.completionPercentage}%</p>
                      </div>
                      <div>
                        <p className="text-muted">Days Done</p>
                        <p className="text-2xl text-foreground">{member.completedDays}/100</p>
                      </div>
                    </div>
                  </div>

                  {/* Encouragement Section */}
                  {!member.todayCompleted && member.userId !== user.id && (
                    <div className="flex-shrink-0">
                      {encouragingUserId === member.userId ? (
                        <div className="space-y-2">
                          <textarea
                            value={encouragementMessage}
                            onChange={(e) => setEncouragementMessage(e.target.value)}
                            placeholder="Send some motivation!"
                            rows={2}
                            className="w-64 px-3 py-2 bg-background rounded-2xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent/20 text-sm"
                            maxLength={200}
                          />
                          <div className="flex gap-2">
                            <Button
                              onClick={() => sendEncouragement(member.userId)}
                              variant="secondary"
                              size="sm"
                              disabled={!encouragementMessage.trim()}
                            >
                              Send
                            </Button>
                            <Button
                              onClick={() => {
                                setEncouragingUserId(null)
                                setEncouragementMessage('')
                              }}
                              variant="ghost"
                              size="sm"
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          onClick={() => setEncouragingUserId(member.userId)}
                          variant="secondary"
                          size="sm"
                        >
                          💪 Send Encouragement
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            ))}

            {members.length === 0 && (
              <Card>
                <div className="text-center py-12">
                  <p className="text-muted">No members found in this group.</p>
                </div>
              </Card>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
