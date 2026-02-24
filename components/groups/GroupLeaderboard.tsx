'use client'

import { useEffect, useState } from 'react'
import { useStatsStore } from '@/store/useStatsStore'
import { createClient } from '@/lib/supabase/client'
import { parseISO, differenceInDays, startOfDay } from 'date-fns'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import type { GroupLeaderboardEntry } from '@/types'

interface GroupLeaderboardProps {
  groupId: string
  groupName: string
  currentUserId: string
  showMedals?: boolean
  compact?: boolean  // Show only top 3 with expand option
  className?: string
}

interface MemberWithCompletion extends GroupLeaderboardEntry {
  todayCompleted: boolean
}

export default function GroupLeaderboard({
  groupId,
  groupName,
  currentUserId,
  showMedals = true,
  compact = false,
  className = '',
}: GroupLeaderboardProps) {
  const { fetchGroupStats, groupStats, isLoading } = useStatsStore()
  const [membersWithCompletion, setMembersWithCompletion] = useState<MemberWithCompletion[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)

  useEffect(() => {
    const loadLeaderboard = async () => {
      setLoading(true)
      setError(null)

      try {
        // Fetch group stats (leaderboard)
        await fetchGroupStats(groupId)

        // Get current group stats
        const stats = useStatsStore.getState().groupStats
        if (!stats || stats.groupId !== groupId) {
          throw new Error('Failed to load group stats')
        }

        // Fetch group start date to calculate current day number
        const supabase = createClient()
        const { data: group, error: groupError } = await supabase
          .from('groups')
          .select('start_date')
          .eq('id', groupId)
          .single()

        if (groupError) throw groupError

        const startDate = parseISO(group.start_date)
        const currentDayNumber = differenceInDays(startOfDay(new Date()), startDate) + 1

        // For each member, check if they completed today
        const membersWithStatus = await Promise.all(
          stats.leaderboard.map(async (entry) => {
            const { data: todayLog } = await supabase
              .from('daily_logs')
              .select('completed')
              .eq('user_id', entry.user.id)
              .eq('group_id', groupId)
              .eq('day_number', currentDayNumber)
              .eq('deleted', false)
              .maybeSingle()

            return {
              ...entry,
              todayCompleted: todayLog?.completed || false,
            }
          })
        )

        setMembersWithCompletion(membersWithStatus)
      } catch (err) {
        console.error('Error loading leaderboard:', err)
        setError('Unable to load leaderboard')
      } finally {
        setLoading(false)
      }
    }

    loadLeaderboard()
  }, [groupId, fetchGroupStats])

  const getMedalEmoji = (rank: number) => {
    if (!showMedals) return `${rank + 1}.`
    if (rank === 0) return '🥇'
    if (rank === 1) return '🥈'
    if (rank === 2) return '🥉'
    return `${rank + 1}.`
  }

  // Loading skeleton
  if (loading) {
    return (
      <Card className={`mb-6 ${className}`}>
        <h3 className="text-xl text-foreground mb-4">{groupName} Leaderboard</h3>
        <div className="space-y-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-surface/50 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-foreground/10 rounded"></div>
                <div className="w-24 h-4 bg-foreground/10 rounded"></div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-12 h-4 bg-foreground/10 rounded"></div>
                <div className="w-20 h-6 bg-foreground/10 rounded-full"></div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    )
  }

  // Error state
  if (error) {
    return (
      <Card className={`mb-6 ${className}`}>
        <h3 className="text-xl text-foreground mb-4">{groupName} Leaderboard</h3>
        <div className="text-center py-8">
          <p className="text-muted">{error}</p>
        </div>
      </Card>
    )
  }

  // Single member - show invite prompt
  if (membersWithCompletion.length === 1) {
    return (
      <Card className={`mb-6 ${className}`}>
        <h3 className="text-xl text-foreground mb-4">{groupName} Leaderboard</h3>
        <div className="text-center py-8">
          <div className="text-4xl mb-3">🏆</div>
          <p className="text-foreground mb-2">Invite friends to compete!</p>
          <p className="text-sm text-muted">Share your group's invite code to get started</p>
        </div>
      </Card>
    )
  }

  // Determine which members to display
  const displayedMembers = compact && !isExpanded
    ? membersWithCompletion.slice(0, 3)
    : membersWithCompletion

  const hasMore = compact && membersWithCompletion.length > 3

  // Main leaderboard display
  return (
    <Card className={`mb-6 ${className}`}>
      <h3 className="text-xl text-foreground mb-4">{groupName} Leaderboard</h3>
      <div className="space-y-2">
        {displayedMembers.map((entry, index) => {
          const isCurrentUser = entry.user.id === currentUserId

          return (
            <div
              key={entry.user.id}
              className={`flex items-center justify-between p-3 rounded-xl transition-colors ${
                isCurrentUser
                  ? 'bg-accent/5 ring-1 ring-accent/20'
                  : 'bg-surface hover:bg-surface/80'
              }`}
            >
              {/* Left side: Rank + Name */}
              <div className="flex items-center gap-3">
                <span className="text-lg w-8 text-center">
                  {getMedalEmoji(index)}
                </span>
                <div>
                  <span className="text-foreground font-medium">
                    {entry.user.first_name} {entry.user.last_name}
                    {isCurrentUser && (
                      <span className="ml-2 text-xs text-accent">(You)</span>
                    )}
                  </span>
                </div>
              </div>

              {/* Right side: Streak + Badge */}
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="text-xl">🔥</span>
                  <span className="text-foreground font-semibold">
                    {entry.stats.currentStreak}
                  </span>
                </div>
                <Badge variant={entry.todayCompleted ? 'success' : 'default'}>
                  {entry.todayCompleted ? 'Completed' : 'Pending'}
                </Badge>
              </div>
            </div>
          )
        })}

        {/* Expand/Collapse button for compact mode */}
        {hasMore && (
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3 py-2 text-sm text-accent hover:text-accent/80 transition-colors"
          >
            {isExpanded ? (
              <>Show less ↑</>
            ) : (
              <>Show {membersWithCompletion.length - 3} more ↓</>
            )}
          </button>
        )}
      </div>
    </Card>
  )
}
