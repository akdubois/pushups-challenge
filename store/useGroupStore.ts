import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { supabase } from '@/lib/supabase/client'
import type { Group, GroupWithMembership, CreateGroupForm, JoinGroupForm } from '@/types'

interface GroupState {
  currentGroupId: string | null
  groups: GroupWithMembership[]
  isLoading: boolean

  // Actions
  setCurrentGroup: (groupId: string) => void
  fetchUserGroups: (userId: string) => Promise<void>
  createGroup: (userId: string, form: CreateGroupForm) => Promise<Group>
  joinGroup: (userId: string, form: JoinGroupForm) => Promise<Group>
  leaveGroup: (userId: string, groupId: string) => Promise<void>
}

const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // Removed ambiguous characters
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export const useGroupStore = create<GroupState>()(
  persist(
    (set, get) => ({
      currentGroupId: null,
      groups: [],
      isLoading: false,

      setCurrentGroup: (groupId: string) => {
        set({ currentGroupId: groupId })
      },

      fetchUserGroups: async (userId: string) => {
        set({ isLoading: true })
        try {
          // Fetch groups where user is a member
          const { data: memberships, error } = await supabase
            .from('group_memberships')
            .select(`
              *,
              groups:group_id (*)
            `)
            .eq('user_id', userId)
            .eq('deleted', false)

          if (error) throw error

          const groupsWithMembership: GroupWithMembership[] = memberships
            .filter(m => m.groups)
            .map(m => ({
              ...(m.groups as any),
              membership: {
                id: m.id,
                group_id: m.group_id,
                user_id: m.user_id,
                is_admin: m.is_admin,
                joined_at: m.joined_at,
                deleted: m.deleted,
                created_at: m.created_at,
                updated_at: m.updated_at,
              },
            }))

          set({
            groups: groupsWithMembership,
            isLoading: false,
          })

          // Set first group as current if none selected
          if (!get().currentGroupId && groupsWithMembership.length > 0) {
            set({ currentGroupId: groupsWithMembership[0].id })
          }
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      createGroup: async (userId: string, form: CreateGroupForm) => {
        set({ isLoading: true })
        try {
          const inviteCode = generateInviteCode()
          const timezone = form.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone

          // Create group
          const { data: group, error: groupError } = await supabase
            .from('groups')
            .insert({
              name: form.name,
              invite_code: inviteCode,
              start_date: form.startDate,
              daily_penalty_amount: form.dailyPenaltyAmount,
              timezone,
            })
            .select()
            .single()

          if (groupError) throw groupError

          // Add creator as admin member
          const { error: membershipError } = await supabase
            .from('group_memberships')
            .insert({
              group_id: group.id,
              user_id: userId,
              is_admin: true,
            })

          if (membershipError) throw membershipError

          // Refresh groups list
          await get().fetchUserGroups(userId)

          set({ isLoading: false, currentGroupId: group.id })
          return group
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      joinGroup: async (userId: string, form: JoinGroupForm) => {
        set({ isLoading: true })
        try {
          // Find group by invite code
          const { data: group, error: groupError } = await supabase
            .from('groups')
            .select('*')
            .eq('invite_code', form.inviteCode.toUpperCase())
            .eq('deleted', false)
            .single()

          if (groupError) throw new Error('Invalid invite code')

          // Check if user is already a member
          const { data: existingMembership } = await supabase
            .from('group_memberships')
            .select('*')
            .eq('group_id', group.id)
            .eq('user_id', userId)
            .eq('deleted', false)
            .single()

          if (existingMembership) {
            throw new Error('You are already a member of this group')
          }

          // Add user as member
          const { error: membershipError } = await supabase
            .from('group_memberships')
            .insert({
              group_id: group.id,
              user_id: userId,
              is_admin: false,
            })

          if (membershipError) throw membershipError

          // Refresh groups list
          await get().fetchUserGroups(userId)

          set({ isLoading: false, currentGroupId: group.id })
          return group
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },

      leaveGroup: async (userId: string, groupId: string) => {
        set({ isLoading: true })
        try {
          // Soft delete membership
          const { error } = await supabase
            .from('group_memberships')
            .update({ deleted: true })
            .eq('group_id', groupId)
            .eq('user_id', userId)

          if (error) throw error

          // Refresh groups list
          await get().fetchUserGroups(userId)

          // Clear current group if it was this one
          if (get().currentGroupId === groupId) {
            set({ currentGroupId: null })
          }

          set({ isLoading: false })
        } catch (error) {
          set({ isLoading: false })
          throw error
        }
      },
    }),
    {
      name: 'group-storage',
      partialize: (state) => ({
        currentGroupId: state.currentGroupId,
      }),
    }
  )
)
