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
          // Get the current session from Supabase (checks localStorage automatically)
          const { data: { session } } = await supabase.auth.getSession()

          if (session?.user) {
            // Fetch user profile from database
            const { data: profile, error: profileError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (!profileError && profile) {
              set({
                user: mapSupabaseUser(session.user, profile),
                session,
                isInitialized: true,
              })
            } else {
              // Profile doesn't exist, clear session
              await supabase.auth.signOut()
              set({ user: null, session: null, isInitialized: true })
            }
          } else {
            set({ user: null, session: null, isInitialized: true })
          }

          // Set up auth state listener for future changes
          supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event, session?.user?.email)

            if (event === 'SIGNED_OUT') {
              set({ user: null, session: null })
            } else if (session?.user) {
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
          const { data, error } = await supabase.auth.signInWithPassword({
            email: credentials.email,
            password: credentials.password,
          })

          if (error) throw error

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
