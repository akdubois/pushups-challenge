# Supabase SSR Refactor Plan

## Overview
Migrate from `@supabase/supabase-js` with localStorage to `@supabase/ssr` with cookie-based authentication following Next.js App Router best practices.

## Goals
- ✅ Cookie-based sessions (more secure than localStorage)
- ✅ Server-side auth validation
- ✅ Middleware for route protection
- ✅ Proper separation of client/server contexts
- ✅ Remove manual Zustand auth state management
- ✅ Enable Server Components and Server Actions

## Phase 1: Setup & Dependencies

### 1.1 Install @supabase/ssr
```bash
npm install @supabase/ssr
```

### 1.2 Update Package Dependencies
- Keep: `@supabase/supabase-js` (used internally by @supabase/ssr)
- Add: `@supabase/ssr`

## Phase 2: Create New Supabase Client Utilities

### 2.1 Create Browser Client (`lib/supabase/client.ts`)
```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database.types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

### 2.2 Create Server Client (`lib/supabase/server.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database.types'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
```

### 2.3 Create Middleware Client (`lib/supabase/middleware.ts`)
```typescript
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database.types'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value)
            supabaseResponse.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Refresh session if expired
  await supabase.auth.getUser()

  return supabaseResponse
}
```

## Phase 3: Add Middleware for Route Protection

### 3.1 Create `middleware.ts` in project root
```typescript
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
```

## Phase 4: Refactor Authentication Logic

### 4.1 Remove Zustand Auth Store
- Delete: `store/useAuthStore.ts`
- This is replaced by Supabase's built-in session management

### 4.2 Create Auth Helpers (`lib/auth/helpers.ts`)
```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { AuthUser } from '@/types'

// Server-side: Get current user (use in Server Components/Actions)
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null

  // Fetch user profile
  const { data: profile } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (!profile) return null

  return {
    id: user.id,
    email: user.email || '',
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    timezone: profile.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
  }
}

// Server-side: Require authentication (redirect if not logged in)
export async function requireAuth() {
  const user = await getCurrentUser()
  if (!user) {
    redirect('/login')
  }
  return user
}

// Server-side: Redirect if already authenticated
export async function redirectIfAuthenticated(to: string = '/dashboard') {
  const user = await getCurrentUser()
  if (user) {
    redirect(to)
  }
}
```

### 4.3 Create Client-Side Auth Hook (`hooks/useAuth.ts`)
```typescript
'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  return { user, loading }
}
```

## Phase 5: Update Pages and Components

### 5.1 Update Login Page (`app/login/page.tsx`)
```typescript
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
// Remove: useAuthStore import
// Use: createClient directly
```

### 5.2 Update Register Page (`app/register/page.tsx`)
```typescript
'use client'

import { createClient } from '@/lib/supabase/client'
// Similar changes to login
```

### 5.3 Update Dashboard (`app/dashboard/page.tsx`)
```typescript
import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'

// Convert to Server Component
export default async function DashboardPage() {
  const user = await requireAuth() // Server-side auth check
  const supabase = await createClient()

  // Fetch data server-side
  // ...
}
```

### 5.4 Create Logout Server Action (`app/actions/auth.ts`)
```typescript
'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
```

## Phase 6: Update All Components Using Auth

### 6.1 Components to Update
- [x] `app/login/page.tsx`
- [x] `app/register/page.tsx`
- [x] `app/dashboard/page.tsx`
- [x] `app/groups/create/page.tsx`
- [x] `app/groups/join/page.tsx`
- [x] `app/groups/[groupId]/page.tsx`
- [x] `app/groups/[groupId]/history/page.tsx`
- [ ] Any component using `useAuthStore`
- [ ] Any component directly importing `supabase` from old client

### 6.2 Search and Replace Pattern
**Find:** `import { useAuthStore } from '@/store/useAuthStore'`
**Replace:** `import { useAuth } from '@/hooks/useAuth'` (for Client Components)
**OR:** `import { getCurrentUser } from '@/lib/auth/helpers'` (for Server Components)

## Phase 7: Update Other Stores

### 7.1 Update Group Store (`store/useGroupStore.ts`)
- Change from: `import { supabase } from '@/lib/supabase/client'`
- Change to: `import { createClient } from '@/lib/supabase/client'`
- Update usage: `const supabase = createClient()`

### 7.2 Update Daily Logs Store (`store/useDailyLogsStore.ts`)
- Same changes as group store

### 7.3 Update Stats Store (`store/useStatsStore.ts`)
- Same changes as group store

## Phase 8: Testing

### 8.1 Test Authentication Flow
- [ ] Login works
- [ ] Register works
- [ ] Logout works
- [ ] Session persists on refresh
- [ ] Protected routes redirect when not logged in
- [ ] Login/register redirect when already logged in

### 8.2 Test All Features
- [ ] Dashboard loads correctly
- [ ] Group creation works
- [ ] Group joining works
- [ ] Daily logger works
- [ ] Group pages load correctly
- [ ] Member lists work
- [ ] History page works

### 8.3 Test Edge Cases
- [ ] Expired session handling
- [ ] Network errors
- [ ] Concurrent tabs
- [ ] Token refresh

## Phase 9: Cleanup

### 9.1 Remove Old Files
- [ ] Delete `store/useAuthStore.ts`
- [ ] Remove old `lib/supabase/client.ts` (after verification)

### 9.2 Update Documentation
- [ ] Update README.md with new auth flow
- [ ] Update SETUP.md if needed
- [ ] Document new auth helpers

## Phase 10: Commit Changes

```bash
git add .
git commit -m "Refactor: Migrate to @supabase/ssr with cookie-based auth

- Install @supabase/ssr package
- Create separate browser/server/middleware clients
- Add Next.js middleware for session refresh
- Remove Zustand auth store (use Supabase sessions)
- Convert auth pages to use new client pattern
- Add server-side auth helpers
- Convert dashboard to Server Component
- Update all stores to use new client pattern
- Add logout Server Action

Benefits:
- Cookie-based sessions (more secure)
- Server-side auth validation
- Better Next.js App Router integration
- Simplified auth state management"
```

## Rollback Plan

If issues arise:
1. Revert to previous commit: `git reset --hard HEAD~1`
2. Keep both implementations temporarily (feature flag)
3. Test in isolation before full migration

## Timeline Estimate
- **Phase 1-3**: 30 minutes (setup + new utilities)
- **Phase 4**: 45 minutes (refactor auth logic)
- **Phase 5-7**: 60 minutes (update pages/components)
- **Phase 8**: 30 minutes (testing)
- **Phase 9-10**: 15 minutes (cleanup + commit)

**Total**: ~3 hours

## Success Criteria
✅ All authentication flows work
✅ Sessions persist correctly
✅ Middleware protects routes
✅ Server Components can access auth state
✅ No console errors
✅ All existing features work as before
