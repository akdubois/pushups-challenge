'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { getPostLoginRedirect } from '@/lib/routing'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function Home() {
  const router = useRouter()
  const { user, isInitialized } = useAuthStore()

  useEffect(() => {
    const redirectIfLoggedIn = async () => {
      if (isInitialized && user) {
        const redirectPath = await getPostLoginRedirect()
        router.push(redirectPath)
      }
    }

    redirectIfLoggedIn()
  }, [user, isInitialized, router])

  if (!isInitialized) {
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
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-16">
          <h1 className="text-7xl mb-6 text-foreground tracking-tight">
            100 Pushups
          </h1>
          <p className="text-2xl text-muted mb-3">
            100 days. One commitment.
          </p>
          <p className="text-lg text-muted/80 max-w-md mx-auto">
            Track your daily progress and stay accountable with friends
          </p>
        </div>

        <Card className="mb-12">
          <div className="space-y-8">
            <div>
              <div className="text-4xl mb-3">🎯</div>
              <h3 className="text-xl mb-2 text-foreground">Set Your Goal</h3>
              <p className="text-muted">
                Commit to 100 pushups every day for 100 days
              </p>
            </div>
            <div>
              <div className="text-4xl mb-3">👥</div>
              <h3 className="text-xl mb-2 text-foreground">Join a Group</h3>
              <p className="text-muted">
                Create or join a challenge group with friends
              </p>
            </div>
            <div>
              <div className="text-4xl mb-3">📊</div>
              <h3 className="text-xl mb-2 text-foreground">Track Progress</h3>
              <p className="text-muted">
                Log completions, view history, and stay motivated
              </p>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3">
          <Link href="/register" className="w-full">
            <Button variant="primary" size="lg" className="w-full">
              Get Started
            </Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button variant="ghost" size="lg" className="w-full">
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
