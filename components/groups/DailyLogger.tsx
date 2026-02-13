'use client'

import { useState } from 'react'
import { useDailyLogsStore } from '@/store/useDailyLogsStore'
import type { DailyLog } from '@/types'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

interface DailyLoggerProps {
  groupId: string
  userId: string
  todayLog: DailyLog | null
}

export default function DailyLogger({ groupId, userId, todayLog }: DailyLoggerProps) {
  const { logCompletion, fetchGroupLogs, isLoading } = useDailyLogsStore()
  const [note, setNote] = useState('')
  const [error, setError] = useState('')

  const handleLogCompletion = async () => {
    setError('')
    try {
      await logCompletion(groupId, userId, note.trim() || undefined)
      setNote('') // Clear note after successful submission

      // Refresh group logs so history page has latest data
      await fetchGroupLogs(groupId)
    } catch (err: any) {
      setError(err.message || 'Failed to log completion. Please try again.')
    }
  }

  const isCompleted = todayLog?.completed || false

  if (isCompleted) {
    return (
      <Card>
        <div className="text-center space-y-6">
          <div className="text-6xl">🎉</div>
          <div>
            <h2 className="text-3xl mb-2 text-foreground">
              Complete
            </h2>
            <p className="text-muted">
              Day {todayLog?.day_number} logged
            </p>
          </div>

          {todayLog?.note && (
            <div className="bg-background rounded-2xl p-4">
              <p className="text-foreground italic">"{todayLog.note}"</p>
            </div>
          )}

          <p className="text-sm text-muted">
            {new Date(todayLog?.completed_at || '').toLocaleTimeString([], {
              hour: 'numeric',
              minute: '2-digit'
            })}
          </p>
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl mb-2 text-foreground">
            Day {todayLog?.day_number || '1'}
          </h2>
          <p className="text-muted">
            Complete 100 pushups
          </p>
        </div>

        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label htmlFor="note" className="block text-sm text-muted mb-2">
              Add a note (optional)
            </label>
            <textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How did it go?"
              rows={3}
              disabled={isLoading}
              className="w-full px-4 py-3 bg-background rounded-2xl text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-foreground/10 transition-all resize-none"
              maxLength={500}
            />
            <p className="text-xs text-muted mt-2">
              {note.length}/500
            </p>
          </div>

          <Button
            onClick={handleLogCompletion}
            variant="primary"
            disabled={isLoading}
            className="w-full py-4 text-base"
          >
            {isLoading ? 'Saving...' : 'Mark Complete'}
          </Button>
        </div>
      </div>
    </Card>
  )
}
