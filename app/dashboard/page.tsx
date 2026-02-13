'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuthStore } from '@/store/useAuthStore'
import { useGroupStore } from '@/store/useGroupStore'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'

export default function DashboardPage() {
  const router = useRouter()
  const { user, logout } = useAuthStore()
  const { currentGroupId, groups, fetchUserGroups } = useGroupStore()

  useEffect(() => {
    if (!user) {
      router.push('/login')
    } else {
      fetchUserGroups(user.id)
    }
  }, [user, router, fetchUserGroups])

  const handleLogout = async () => {
    await logout()
    router.push('/')
  }

  const handleSelectGroup = (groupId: string) => {
    router.push(`/groups/${groupId}`)
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
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-5xl text-foreground mb-3">
              Welcome back, {user.firstName}
            </h1>
            <p className="text-lg text-muted">
              Ready to log today's pushups?
            </p>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Groups Section */}
        <Card className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl text-foreground">
              Your Challenge Groups
            </h2>
            {groups.length > 0 && (
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
            )}
          </div>

          {groups.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-lg text-muted mb-6">
                You're not part of any groups yet.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/groups/create">
                  <Button variant="primary" size="lg">
                    Create a Group
                  </Button>
                </Link>
                <Link href="/groups/join">
                  <Button variant="ghost" size="lg">
                    Join a Group
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <>
              {groups.length === 1 && (
                <div className="bg-accent/5 rounded-2xl p-4 mb-6">
                  <p className="text-sm text-foreground text-center">
                    👉 Click your group below to start logging, or create/join more groups above
                  </p>
                </div>
              )}
              <div className="space-y-3">
              {groups.map((group) => (
                <div
                  key={group.id}
                  className={`p-5 rounded-2xl cursor-pointer transition-all shadow-sm ${
                    currentGroupId === group.id
                      ? 'bg-accent/5 ring-2 ring-accent/20'
                      : 'bg-surface hover:bg-surface/80 hover:shadow-md'
                  }`}
                  onClick={() => handleSelectGroup(group.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg text-foreground mb-1">
                        {group.name}
                      </h3>
                      <p className="text-sm text-muted">
                        Started: {new Date(group.start_date).toLocaleDateString()}
                      </p>
                      {group.membership.is_admin && (
                        <span className="inline-block mt-2 text-xs bg-accent text-white px-3 py-1 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted mb-2">Invite Code</p>
                      <code className="text-sm font-mono bg-background px-3 py-1.5 rounded-full">
                        {group.invite_code}
                      </code>
                    </div>
                  </div>
                </div>
              ))}
              </div>
            </>
          )}
        </Card>

        {/* Info Card */}
        <Card className="bg-accent/5">
          <div className="flex items-start gap-4">
            <div className="text-3xl">💡</div>
            <div>
              <h3 className="text-lg text-foreground mb-2">
                Next Steps
              </h3>
              <p className="text-muted">
                Select a group above to view your progress, log today's completion, and see how your teammates are doing!
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
