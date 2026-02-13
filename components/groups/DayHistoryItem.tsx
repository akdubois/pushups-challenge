'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import type { DailyLog } from '@/types'
import { useDailyLogsStore } from '@/store/useDailyLogsStore'

interface DayHistoryItemProps {
  groupId: string
  userId: string
  day: {
    dayNumber: number
    date: Date
    dateStr: string
    log: DailyLog | null
    isCompleted: boolean
    isFuture: boolean
  }
}

export default function DayHistoryItem({ groupId, userId, day }: DayHistoryItemProps) {
  const { updateDayCompletion } = useDailyLogsStore()
  const [isUpdating, setIsUpdating] = useState(false)

  const handleToggle = async () => {
    if (day.isFuture) return // Can't mark future days

    setIsUpdating(true)
    try {
      const newCompletedState = !day.isCompleted

      await updateDayCompletion(
        groupId,
        userId,
        day.dayNumber,
        day.dateStr,
        newCompletedState,
        day.log?.id
      )
    } catch (error) {
      console.error('Failed to toggle day:', error)
      alert('Failed to update day. Please try again.')
    } finally {
      setIsUpdating(false)
    }
  }

  const isToday = format(day.date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')

  return (
    <button
      onClick={handleToggle}
      disabled={day.isFuture || isUpdating}
      className={`w-full text-left p-5 rounded-2xl transition-all shadow-sm ${
        day.isFuture
          ? 'bg-surface/50 opacity-50 cursor-not-allowed'
          : isUpdating
          ? 'bg-surface cursor-wait opacity-70'
          : day.isCompleted
          ? 'bg-green-50 dark:bg-green-900/20 hover:bg-green-100 dark:hover:bg-green-900/30 hover:shadow-md'
          : 'bg-surface hover:bg-surface/80 hover:shadow-md'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Status Icon */}
          <div className="text-3xl">
            {isUpdating ? (
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent"></div>
            ) : day.isFuture ? (
              '⏳'
            ) : day.isCompleted ? (
              '✅'
            ) : (
              '⭕'
            )}
          </div>

          {/* Day Info */}
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h3 className="text-lg text-foreground">
                Day {day.dayNumber}
              </h3>
              {isToday && (
                <span className="text-xs bg-accent text-white px-3 py-1 rounded-full">
                  Today
                </span>
              )}
            </div>
            <p className="text-sm text-muted">
              {format(day.date, 'EEEE, MMM d, yyyy')}
            </p>
            {day.log?.note && (
              <p className="text-sm text-muted italic mt-2">
                "{day.log.note}"
              </p>
            )}
          </div>
        </div>

        {/* Status Label */}
        <div className="text-right">
          {day.isFuture ? (
            <span className="text-sm text-muted">Future</span>
          ) : day.isCompleted ? (
            <span className="text-sm font-medium text-green-600 dark:text-green-400">
              Completed
            </span>
          ) : (
            <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
              Incomplete
            </span>
          )}
          {day.log?.completed_at && (
            <p className="text-xs text-muted mt-1">
              {format(new Date(day.log.completed_at), 'h:mm a')}
            </p>
          )}
        </div>
      </div>

      {!day.isFuture && !isUpdating && (
        <div className="text-xs text-muted mt-2">
          Click to mark as {day.isCompleted ? 'incomplete' : 'completed'}
        </div>
      )}
    </button>
  )
}
