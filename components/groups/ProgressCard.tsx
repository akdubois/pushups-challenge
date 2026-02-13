'use client'

import type { UserStats } from '@/types'
import Card from '@/components/ui/Card'

interface ProgressCardProps {
  stats: UserStats | null
  isLoading: boolean
}

export default function ProgressCard({ stats, isLoading }: ProgressCardProps) {
  if (isLoading || !stats) {
    return (
      <Card>
        <h3 className="text-3xl text-foreground mb-6">
          Your Progress
        </h3>
        <div className="space-y-4">
          <div className="animate-pulse">
            <div className="h-4 bg-surface rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-surface rounded"></div>
          </div>
          <div className="animate-pulse">
            <div className="h-4 bg-surface rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-surface rounded"></div>
          </div>
        </div>
      </Card>
    )
  }

  const progressPercentage = Math.round((stats.completedDays / 100) * 100)

  return (
    <Card>
      <div className="space-y-8">
        {/* Header */}
        <h3 className="text-3xl text-foreground">
          Your Progress
        </h3>

        {/* Completion Progress */}
        <div>
          <div className="flex justify-between items-baseline mb-4">
            <span className="text-muted text-sm">Completion</span>
            <span className="text-5xl text-foreground">
              {stats.completionPercentage}%
            </span>
          </div>
          <div className="w-full bg-surface rounded-full h-2 overflow-hidden">
            <div
              className="bg-foreground h-full rounded-full transition-all duration-500"
              style={{ width: `${stats.completionPercentage}%` }}
            ></div>
          </div>
          <p className="text-sm text-muted mt-3">
            {stats.completedDays} of 100 days
          </p>
        </div>

        {/* Stats Grid */}
        <div className="space-y-4">
          {/* Current Streak */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🔥</div>
              <span className="text-muted text-sm">Current streak</span>
            </div>
            <span className="text-2xl text-foreground">
              {stats.currentStreak}
            </span>
          </div>

          {/* Longest Streak */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">⭐</div>
              <span className="text-muted text-sm">Longest streak</span>
            </div>
            <span className="text-2xl text-foreground">
              {stats.longestStreak}
            </span>
          </div>

          {/* Days Remaining */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">📅</div>
              <span className="text-muted text-sm">Days remaining</span>
            </div>
            <span className="text-2xl text-foreground">
              {stats.daysRemaining}
            </span>
          </div>

          {/* Missed Days */}
          {stats.missedDays > 0 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-2xl">⚠️</div>
                <span className="text-muted text-sm">Missed days</span>
              </div>
              <span className="text-2xl text-foreground">
                {stats.missedDays}
              </span>
            </div>
          )}
        </div>

        {/* Pot Contribution */}
        {stats.potContribution > 0 && (
          <div className="flex items-center justify-between py-4 border-t border-foreground/5">
            <span className="text-sm text-muted">Pot contribution</span>
            <span className="text-xl text-accent">
              ${stats.potContribution.toFixed(2)}
            </span>
          </div>
        )}
      </div>
    </Card>
  )
}
