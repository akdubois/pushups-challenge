'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { useGroupStore } from '@/store/useGroupStore'
import { useDailyLogsStore } from '@/store/useDailyLogsStore'
import { useStatsStore } from '@/store/useStatsStore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import DailyLogger from '@/components/groups/DailyLogger'
import ProgressCard from '@/components/groups/ProgressCard'
import { use } from 'react'

export default function GroupDetailPage({ params }: { params: Promise<{ groupId: string }> }) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { groups, setCurrentGroup, fetchUserGroups } = useGroupStore()
  const { todayLog, fetchTodayLog } = useDailyLogsStore()
  const { userStats, fetchUserStats } = useStatsStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Unwrap the params Promise using React.use()
  const { groupId } = use(params)
  const currentGroup = groups.find((g) => g.id === groupId)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    let isMounted = true
    const loadData = async () => {
      if (!groupId) return

      if (isMounted) {
        setIsLoading(true)
        setError(null)
        setCurrentGroup(groupId)
      }

      // Set a timeout to prevent infinite loading
      const timeoutId = setTimeout(() => {
        if (isMounted) {
          console.warn('Data loading timed out')
          setError('Loading timed out. Please refresh the page.')
          setIsLoading(false)
        }
      }, 10000) // 10 second timeout

      try {
        // If groups array is empty, fetch user's groups first
        const hasGroups = groups.length > 0
        if (!hasGroups) {
          console.log('Fetching user groups...')
          await fetchUserGroups(user.id)
        }

        // Fetch today's log and stats
        console.log('Fetching group data for:', groupId)
        await Promise.all([
          fetchTodayLog(groupId, user.id).catch(err => {
            console.error('Failed to fetch today log:', err)
            return null
          }),
          fetchUserStats(groupId, user.id).catch(err => {
            console.error('Failed to fetch user stats:', err)
            return null
          }),
        ])

        clearTimeout(timeoutId)
      } catch (error) {
        console.error('Error loading group data:', error)
        if (isMounted) {
          setError('Failed to load group data. Please try again.')
        }
        clearTimeout(timeoutId)
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadData()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, groupId])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-muted">Loading...</p>
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto"></div>
          <p className="mt-4 text-muted">Loading group...</p>
        </div>
      </div>
    )
  }

  if (!currentGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <div className="text-center py-4">
            <h2 className="text-2xl text-foreground mb-3">
              Group Not Found
            </h2>
            <p className="text-lg text-muted mb-6">
              You don't have access to this group or it doesn't exist.
            </p>
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
      <div className="max-w-6xl mx-auto p-4">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm">
                ← All Groups
              </Button>
            </Link>

            <div className="flex gap-2">
              <Link href="/groups/create">
                <Button variant="secondary" size="sm">
                  + Create
                </Button>
              </Link>
              <Link href="/groups/join">
                <Button variant="ghost" size="sm">
                  Join
                </Button>
              </Link>
            </div>
          </div>

          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-5xl text-foreground mb-3">
                {currentGroup.name}
              </h1>
              <p className="text-lg text-muted">
                Started {new Date(currentGroup.start_date).toLocaleDateString()}
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted mb-2">Share Invite Code</p>
              <code className="text-xl font-mono bg-background px-4 py-2 rounded-full">
                {currentGroup.invite_code}
              </code>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Column - Daily Logger */}
          <div className="space-y-6 order-1">
            <DailyLogger
              groupId={groupId}
              userId={user.id}
              todayLog={todayLog}
            />

            {/* Quick Actions */}
            <Card>
              <h3 className="text-xl text-foreground mb-4">
                Quick Actions
              </h3>
              <div className="space-y-3">
                <Link href={`/groups/${groupId}/history`}>
                  <Button variant="secondary" className="w-full py-3">
                    📅 View & Edit History
                  </Button>
                </Link>
              </div>
            </Card>
          </div>

          {/* Right Column - Progress */}
          <div className="space-y-6 order-2">
            <ProgressCard
              stats={userStats}
              isLoading={isLoading}
            />

            {/* Coming Soon */}
            <Card className="bg-accent/5">
              <div className="text-center py-4">
                <p className="text-sm text-muted mb-4">Coming Soon</p>
                <div className="space-y-2">
                  <p className="text-foreground">📊 Group Leaderboard</p>
                  <p className="text-foreground">🎉 Activity Feed</p>
                  <p className="text-foreground">💪 Cheers & Comments</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Group Info - appears after progress on mobile */}
          <div className="lg:col-span-2 order-3">
            <Card className="bg-surface/50">
              <h3 className="text-sm text-muted mb-3">
                Group Info
              </h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted mb-1">Daily Penalty</p>
                  <p className="text-foreground">
                    ${currentGroup.daily_penalty_amount}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted mb-1">Timezone</p>
                  <p className="text-foreground">
                    {currentGroup.timezone}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted mb-1">Your Role</p>
                  <p className="text-foreground">
                    {currentGroup.membership.is_admin ? 'Admin' : 'Member'}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
