'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { useGroupStore } from '@/store/useGroupStore'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'

export default function JoinGroupPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const { joinGroup, isLoading } = useGroupStore()

  const [inviteCode, setInviteCode] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!user) {
      router.push('/login')
    }
  }, [user, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!user) return

    try {
      const group = await joinGroup(user.id, {
        inviteCode: inviteCode.trim().toUpperCase(),
      })

      router.push(`/groups/${group.id}`)
    } catch (err: any) {
      setError(err.message || 'Failed to join group. Please check the invite code.')
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
            Join a Group
          </h1>
          <p className="text-lg text-muted">Enter your invite code to get started</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-4 py-3 rounded-2xl text-sm">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="inviteCode" className="block text-sm font-medium text-foreground mb-1">
              Invite Code
            </label>
            <Input
              id="inviteCode"
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
              placeholder="ABC12345"
              required
              disabled={isLoading}
              className="text-center text-lg tracking-wider font-mono"
              maxLength={8}
            />
            <p className="text-xs text-muted mt-1">
              Enter the 8-character code provided by your group admin
            </p>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="w-full"
            disabled={isLoading || inviteCode.length !== 8}
          >
            {isLoading ? 'Joining...' : 'Join Group'}
          </Button>
        </form>

        <div className="mt-8 text-center space-y-2">
          <p className="text-sm text-muted">
            Don't have an invite code?{' '}
            <Link
              href="/groups/create"
              className="text-accent hover:underline font-medium"
            >
              Create your own group
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
