# Before & After: Supabase SSR Refactor

## 1. Supabase Client Setup

### BEFORE (Current - localStorage)
```typescript
// lib/supabase/client.ts
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})
```

**Issues:**
- ❌ Single client instance for all contexts
- ❌ localStorage (vulnerable to XSS)
- ❌ No server-side support
- ❌ Manual session management

### AFTER (New - Cookie-based)
```typescript
// lib/supabase/client.ts (Browser)
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// lib/supabase/server.ts (Server)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()
  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {}
        },
      },
    }
  )
}
```

**Benefits:**
- ✅ Separate clients for browser/server
- ✅ HttpOnly cookies (secure)
- ✅ Full Server Component support
- ✅ Automatic session management

---

## 2. Login Page

### BEFORE (Zustand Store)
```typescript
'use client'
import { useAuthStore } from '@/store/useAuthStore'

export default function LoginPage() {
  const { login, isLoading } = useAuthStore()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await login({ email, password })
      router.push('/dashboard')
    } catch (err) {
      setError(err.message)
    }
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

**Issues:**
- ❌ Depends on Zustand store
- ❌ Manual state management
- ❌ Client-side only

### AFTER (Direct Supabase)
```typescript
'use client'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setIsLoading(false)
    } else {
      router.push('/dashboard')
      router.refresh() // Refresh server components
    }
  }

  return <form onSubmit={handleSubmit}>...</form>
}
```

**Benefits:**
- ✅ Direct Supabase API usage
- ✅ No extra state management
- ✅ Simpler code
- ✅ Automatic session handling

---

## 3. Dashboard Page

### BEFORE (Client Component + Zustand)
```typescript
'use client'
import { useAuthStore } from '@/store/useAuthStore'
import { useEffect, useState } from 'react'

export default function DashboardPage() {
  const { user, isInitialized } = useAuthStore()
  const [groups, setGroups] = useState([])

  useEffect(() => {
    if (!isInitialized) return
    if (!user) {
      router.push('/login')
      return
    }

    // Fetch data client-side
    async function fetchGroups() {
      const { data } = await supabase
        .from('groups')
        .select('*')
      setGroups(data || [])
    }
    fetchGroups()
  }, [user, isInitialized])

  if (!isInitialized) return <Loading />

  return <div>...</div>
}
```

**Issues:**
- ❌ Client Component (slower)
- ❌ Multiple useEffect calls
- ❌ Loading states
- ❌ Client-side data fetching
- ❌ Manual auth redirect

### AFTER (Server Component)
```typescript
import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const user = await requireAuth() // Auto-redirects if not logged in
  const supabase = await createClient()

  // Fetch data server-side (parallel)
  const [groupsData, logsData] = await Promise.all([
    supabase.from('groups').select('*'),
    supabase.from('daily_logs').select('*').eq('user_id', user.id),
  ])

  const groups = groupsData.data || []
  const logs = logsData.data || []

  return <div>...</div>
}
```

**Benefits:**
- ✅ Server Component (faster)
- ✅ No loading states needed
- ✅ Server-side data fetching
- ✅ Automatic auth protection
- ✅ Parallel data fetching

---

## 4. Getting Current User

### BEFORE (Zustand Hook)
```typescript
'use client'
import { useAuthStore } from '@/store/useAuthStore'

function MyComponent() {
  const { user, isLoading, isInitialized } = useAuthStore()

  if (!isInitialized || isLoading) return <Loading />
  if (!user) return <LoginPrompt />

  return <div>Hello {user.firstName}</div>
}
```

**Issues:**
- ❌ Client-side only
- ❌ Loading states
- ❌ Initialization checks
- ❌ Can't use in Server Components

### AFTER (Server Helper or Client Hook)

**Option A: Server Component**
```typescript
import { getCurrentUser } from '@/lib/auth/helpers'

async function MyComponent() {
  const user = await getCurrentUser()

  if (!user) return <LoginPrompt />

  return <div>Hello {user.firstName}</div>
}
```

**Option B: Client Component**
```typescript
'use client'
import { useAuth } from '@/hooks/useAuth'

function MyComponent() {
  const { user, loading } = useAuth()

  if (loading) return <Loading />
  if (!user) return <LoginPrompt />

  return <div>Hello {user.email}</div>
}
```

**Benefits:**
- ✅ Works in both contexts
- ✅ Simpler API
- ✅ Server-side validation
- ✅ No manual initialization

---

## 5. Logout

### BEFORE (Client-side with Zustand)
```typescript
'use client'
import { useAuthStore } from '@/store/useAuthStore'

function LogoutButton() {
  const { logout } = useAuthStore()

  const handleLogout = async () => {
    await logout()
    router.push('/login')
  }

  return <button onClick={handleLogout}>Logout</button>
}
```

**Issues:**
- ❌ Client-side state updates
- ❌ Manual navigation
- ❌ Zustand state clearing

### AFTER (Server Action)
```typescript
// app/actions/auth.ts
'use server'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function logout() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

// Component
import { logout } from '@/app/actions/auth'

function LogoutButton() {
  return (
    <form action={logout}>
      <button type="submit">Logout</button>
    </form>
  )
}
```

**Benefits:**
- ✅ Server Action (secure)
- ✅ No client-side state
- ✅ Automatic cookie clearing
- ✅ Progressive enhancement

---

## 6. Route Protection

### BEFORE (Manual Redirects)
```typescript
'use client'
export default function ProtectedPage() {
  const { user, isInitialized } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    if (isInitialized && !user) {
      router.push('/login')
    }
  }, [user, isInitialized])

  if (!isInitialized) return <Loading />
  if (!user) return null // Redirecting...

  return <div>Protected content</div>
}
```

**Issues:**
- ❌ Every page needs auth logic
- ❌ Race conditions
- ❌ Flash of content
- ❌ Client-side only

### AFTER (Middleware + Server Helper)
```typescript
// middleware.ts (automatic for all routes)
export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// Page (simple)
import { requireAuth } from '@/lib/auth/helpers'

export default async function ProtectedPage() {
  const user = await requireAuth() // One line!

  return <div>Protected content for {user.email}</div>
}
```

**Benefits:**
- ✅ Automatic session refresh
- ✅ One-line auth check
- ✅ No flash of content
- ✅ Server-side protection

---

## 7. Data Fetching in Components

### BEFORE (Client-side useEffect)
```typescript
'use client'
import { supabase } from '@/lib/supabase/client'

function GroupsList() {
  const [groups, setGroups] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuthStore()

  useEffect(() => {
    async function fetchGroups() {
      const { data } = await supabase
        .from('group_memberships')
        .select('*, groups(*)')
        .eq('user_id', user?.id)

      setGroups(data || [])
      setLoading(false)
    }

    if (user) fetchGroups()
  }, [user])

  if (loading) return <Loading />

  return <div>{groups.map(...)}</div>
}
```

**Issues:**
- ❌ Client-side fetching (slower)
- ❌ Loading states
- ❌ Dependency on user state
- ❌ Waterfall requests

### AFTER (Server Component)
```typescript
import { requireAuth } from '@/lib/auth/helpers'
import { createClient } from '@/lib/supabase/server'

async function GroupsList() {
  const user = await requireAuth()
  const supabase = await createClient()

  const { data: groups } = await supabase
    .from('group_memberships')
    .select('*, groups(*)')
    .eq('user_id', user.id)

  return <div>{groups?.map(...) || []}</div>
}
```

**Benefits:**
- ✅ Server-side fetching (faster)
- ✅ No loading states
- ✅ Automatic auth
- ✅ Parallel requests possible

---

## 8. Store Updates (useGroupStore example)

### BEFORE
```typescript
import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'

export const useGroupStore = create((set) => ({
  groups: [],
  fetchGroups: async (userId: string) => {
    const { data } = await supabase
      .from('groups')
      .select('*')
    set({ groups: data })
  },
}))
```

**Issues:**
- ❌ Singleton supabase instance
- ❌ No typing on client

### AFTER
```typescript
import { create } from 'zustand'
import { createClient } from '@/lib/supabase/client'

export const useGroupStore = create((set) => ({
  groups: [],
  fetchGroups: async (userId: string) => {
    const supabase = createClient() // Create fresh instance
    const { data } = await supabase
      .from('groups')
      .select('*')
    set({ groups: data })
  },
}))
```

**Benefits:**
- ✅ Fresh client per request
- ✅ Proper typing
- ✅ Better SSR support

---

## Summary

| Aspect | BEFORE | AFTER |
|--------|--------|-------|
| **Auth Storage** | localStorage | HttpOnly Cookies |
| **Client Pattern** | Singleton instance | Factory function |
| **State Management** | Zustand auth store | Supabase built-in |
| **Server Components** | ❌ Not supported | ✅ Fully supported |
| **Route Protection** | Manual per page | Middleware + helper |
| **Data Fetching** | Client-side useEffect | Server-side async |
| **Security** | Client validation only | Server validation |
| **Code Complexity** | Higher | Lower |
| **Loading States** | Manual everywhere | Automatic |
| **Type Safety** | Manual typing | Built-in |

## Migration Effort

- **Lines of Code Changed**: ~500-800
- **Files Modified**: ~15-20
- **New Files Created**: ~5
- **Files Deleted**: ~1-2
- **Time Estimate**: 2-3 hours
- **Risk Level**: Low (well-documented pattern)
