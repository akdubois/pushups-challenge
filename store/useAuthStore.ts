import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase/client'
import type { AuthUser, LoginForm, RegisterForm } from '@/types'
import type { User } from '@supabase/supabase-js'

interface AuthState {
  user: AuthUser | null
  session: any | null
  isLoading: boolean
  isInitialized: boolean

  // Actions
  initialize: () => Promise<void>
  login: (credentials: LoginForm) => Promise<void>
  register: (data: RegisterForm) => Promise<void>
  logout: () => Promise<void>
  // updateUser: (updates: Partial<AuthUser>) => Promise<void>
}

const mapSupabaseUser = (supabaseUser: User, dbUser?: any): AuthUser => ({
  id: supabaseUser.id,
  email: supabaseUser.email || '',
  firstName: dbUser?.first_name || '',
  lastName: dbUser?.last_name || '',
  timezone: dbUser?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
})

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: false,
      isInitialized: false,

      initialize: async () => {
        try {
          console.log('[Auth] Initializing auth state...')

          // Check localStorage availability
          try {
            const testKey = '__storage_test__'
            localStorage.setItem(testKey, 'test')
            localStorage.removeItem(testKey)
            console.log('[Auth] localStorage is working')
          } catch (e) {
            console.error('[Auth] localStorage is NOT working:', e)
          }

          // Check what's in localStorage
          const storageKeys = Object.keys(localStorage)
          console.log('[Auth] Current localStorage keys:', storageKeys.filter(k => k.includes('supabase') || k.includes('sb-')))

          // Get the current session from Supabase (checks localStorage automatically)
          const { data: { session }, error: sessionError } = await supabase.auth.getSession()

          console.log('[Auth] Session retrieved:', session?.user?.email || 'No session')
          if (sessionError) {
            console.error('[Auth] Session error:', sessionError)
          }

          if (session?.user) {
            console.log('[Auth] Session found, fetching user profile...')
            // Fetch user profile from database
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (!profileError && profile) {
              console.log('[Auth] Profile found, setting user state')
              set({
                user: mapSupabaseUser(session.user, profile),
                session,
                isInitialized: true,
              })
            } else {
              console.error('[Auth] Profile not found or error:', profileError)
              // Profile doesn't exist, clear session
              await supabase.auth.signOut()
              set({ user: null, session: null, isInitialized: true })
            }
          } else {
            console.log('[Auth] No session found')
            set({ user: null, session: null, isInitialized: true })
          }

          // Set up auth state listener for future changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('[Auth] State changed:', event, session?.user?.email || 'No user')

            if (event === 'SIGNED_OUT') {
              console.log('[Auth] User signed out')
              set({ user: null, session: null })
            } else if (event === 'TOKEN_REFRESHED') {
              console.log('[Auth] Token refreshed, updating session')
              if (session?.user) {
                const { data: profile } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .single()

                if (profile) {
                  set({
                    user: mapSupabaseUser(session.user, profile),
                    session,
                  })
                }
              }
            } else if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session?.user) {
              console.log('[Auth] User signed in or initial session')
              const { data: profile } = await supabase
                .from('users')
                .select('*')
                .eq('id', session.user.id)
                .single()

              if (profile) {
                set({
                  user: mapSupabaseUser(session.user, profile),
                  session,
                })
              }
            } else {
              console.log('[Auth] No user in session')
              set({ user: null, session: null })
            }
          })
        } catch (error) {
          console.error('Auth initialization error:', error)
          set({ user: null, session: null, isInitialized: true })
        }
      },

      login: async (credentials: LoginForm) => {
        set({ isLoading: true })
        try {
          console.log('[Auth] Attempting login...')
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error) throw error
          console.log('[Auth] Login successful, session:', data.session?.access_token ? 'exists' : 'missing')

          // Check if session was stored in localStorage
          setTimeout(() => {
            const storageKeys = Object.keys(localStorage).filter(k => k.includes('supabase') || k.includes('sb-'))
            console.log('[Auth] LocalStorage keys after login:', storageKeys)
            if (storageKeys.length === 0) {
              console.warn('[Auth] WARNING: No Supabase keys found in localStorage!')
            }
          }, 100)

          // Fetch user profile
          const { data: profile } = await supabase
            .from('users')
            .select('*')
            .eq('id', data.user.id)
            .single()

          set({
            user: mapSupabaseUser(data.user, profile),
            session: data.session,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      register: async (data: RegisterForm) => {
        set({ isLoading: true })
        try {
          const timezone = data.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

          // Create auth user with metadata (trigger will create profile automatically)
          const { data: authData, error: authError } = await supabase.auth.signUp({
            email: data.email,
            password: data.password,
            options: {
              data: {
                first_name: data.firstName,
                last_name: data.lastName,
                timezone,
              },
            },
          })

          if (authError) throw authError
          if (!authData.user) throw new Error('User creation failed')

          // The database trigger automatically creates the user profile
          // No need to manually insert into users table

          set({
            user: {
              id: authData.user.id,
              email: data.email,
              firstName: data.firstName,
              lastName: data.lastName,
              timezone,
            },
            session: authData.session,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      logout: async () => {
        set({ isLoading: true })
        try {
          await supabase.auth.signOut()
          set({
            user: null,
            session: null,
            isLoading: false,
          })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      // updateUser: async (updates: Partial<AuthUser>) => {
      //   const { user } = get()
      //   if (!user) throw new Error('No user logged in')

      //   set({ isLoading: true })
      //   try {
      //     const { error } = await supabase
      //       .from('users')
      //       .update({
      //         first_name: updates.firstName,
      //         last_name: updates.lastName,
      //         timezone: updates.timezone,
      //       })
      //       .eq('id', user.id)

      //     if (error) throw error

      //     set({
      //       user: { ...user, ...updates },
      //       isLoading: false,
      //     })
      //   } catch (error) {
      //     set({ isLoading: false })
      //     throw error
      //   }
      // },
    }),
    {
      name: 'auth-storage',
      // Don't persist session - let Supabase handle it
      // Only persist that we've initialized to prevent flashing
      partialize: (state) => ({
        isInitialized: state.isInitialized,
      }),
    }
  )
)
