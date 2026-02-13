'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { use } from 'react'
import { useAuthStore } from '@/store/useAuthStore'
import { useGroupStore } from '@/store/useGroupStore'
import { useDailyLogsStore } from '@/store/useDailyLogsStore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import DayHistoryItem from '@/components/groups/DayHistoryItem'
import { differenceInDays, startOfDay, parseISO, addDays, format } from 'date-fns'

export default function GroupHistoryPage({ params }: { params: Promise<{ groupId: string }> }) {
  const router = useRouter()
  const { user } = useAuthStore()
  const { groups } = useGroupStore()
  const { logs, fetchGroupLogs } = useDailyLogsStore()
  const [isLoading, setIsLoading] = useState(true)

  const { groupId } = use(params)
  const currentGroup = groups.find((g) => g.id === groupId)

  useEffect(() => {
    if (!user) {
      router.push('/login')
      return
    }

    if (groupId) {
      fetchGroupLogs(groupId).finally(() => {
        setIsLoading(false)
      })
    }
  }, [user, groupId, router, fetchGroupLogs])

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

  if (!currentGroup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">
              Group Not Found
            </h2>
            <Link href="/dashboard">
              <Button variant="primary">Go to Dashboard</Button>
            </Link>
          </div>
        </Card>
      </div>
    )
  }

  // Calculate all days from start to today (max 100 days)
  const startDate = startOfDay(parseISO(currentGroup.start_date))
  const today = startOfDay(new Date())
  const daysSinceStart = Math.max(0, differenceInDays(today, startDate) + 1)
  const totalDays = Math.min(daysSinceStart, 100)

  // Create array of all days with their completion status
  const allDays = Array.from({ length: totalDays }, (_, index) => {
    const dayNumber = index + 1
    const date = addDays(startDate, index)
    const dateStr = format(date, 'yyyy-MM-dd')

    // Find log for this day
    const userLog = logs.find(
      (log) =>
        log.user_id === user.id &&
        log.day_number === dayNumber &&
        log.deleted === false
    )

    return {
      dayNumber,
      date,
      dateStr,
      log: userLog || null,
      isCompleted: userLog?.completed || false,
      isFuture: date > today,
    }
  }).reverse() // Newest first

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

          <div className="flex justify-between items-start flex-wrap gap-4">
            <div>
              <h1 className="text-4xl text-foreground mb-3">
                {currentGroup.name}
              </h1>
              <p className="text-lg text-muted">
                View and edit your daily completion log
              </p>
            </div>

            <div className="text-right">
              <p className="text-sm text-muted">Started {format(startDate, 'MMM d, yyyy')}</p>
              <p className="text-2xl text-foreground mt-1">Day {totalDays} of 100</p>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <Card className="mb-8 bg-accent/5">
          <div className="flex items-start gap-4">
            <div className="text-3xl">📝</div>
            <div>
              <h3 className="text-lg text-foreground mb-2">
                Edit Your History
              </h3>
              <p className="text-muted">
                Click any day below to mark it as completed or incomplete. Use this to correct any mistakes or catch up on missed entries.
              </p>
            </div>
          </div>
        </Card>

        {/* Days List */}
        {isLoading ? (
          <Card>
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent mx-auto mb-4"></div>
              <p className="text-muted">Loading history...</p>
            </div>
          </Card>
        ) : (
          <Card>
            <h2 className="text-2xl text-foreground mb-6">
              All Days ({totalDays})
            </h2>

            <div className="space-y-3">
              {allDays.map((day) => (
                <DayHistoryItem
                  key={day.dayNumber}
                  groupId={groupId}
                  userId={user.id}
                  day={day}
                />
              ))}
            </div>

            {totalDays === 0 && (
              <div className="text-center py-12">
                <p className="text-muted">
                  The challenge hasn't started yet. Come back on {format(startDate, 'MMM d, yyyy')}!
                </p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
