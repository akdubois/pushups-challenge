'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { useGroupStore } from '@/store/useGroupStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

export default function CreateGroupPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { createGroup, isLoading } = useGroupStore()

  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    dailyPenaltyAmount: '5.00',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user) return

    try {
      const group = await createGroup(user.id, {
        name: formData.name,
        startDate: formData.startDate,
        dailyPenaltyAmount: parseFloat(formData.dailyPenaltyAmount),
      })

      router.push(`/groups/${group.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to create group. Please try again.')
    }
  }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-5xl text-foreground mb-4">
            Create a Group
          </h1>
          <p className="text-lg text-muted">Start your 100-day journey with friends</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="name" className="block text-sm font-medium text-foreground mb-1">
              Group Name
            </label>
            <Input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              placeholder="Summer 2024 Pushups"
              required
              disabled={isLoading}
            />
          </div>

          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-foreground mb-1">
              Start Date
            </label>
            <Input
              id="startDate"
              name="startDate"
              type="date"
              value={formData.startDate}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted mt-1">
              Day 1 of the challenge. Members can join before this date.
            </p>
          </div>

          <div>
            <label htmlFor="dailyPenaltyAmount" className="block text-sm font-medium text-foreground mb-1">
              Daily Miss Penalty ($)
            </label>
            <Input
              id="dailyPenaltyAmount"
              name="dailyPenaltyAmount"
              type="number"
              step="0.01"
              min="0"
              value={formData.dailyPenaltyAmount}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
            <p className="text-xs text-muted mt-1">
              Amount added to the group pot for each missed day
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Creating...' : 'Create Group'}
          </Button>
        </form>

        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-muted">
            Already have a group?{' '}
            <Link
              href="/groups/join"
              className="text-accent hover:underline font-medium"
            >
              Join with invite code
            </Link>
          </p>
          <p className="text-sm text-muted">
            <Link
              href="/dashboard"
              className="text-accent hover:underline font-medium"
            >
              Go to dashboard
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
