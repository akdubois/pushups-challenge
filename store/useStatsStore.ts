// @ts-nocheck - Temporary fix for Supabase type issues
import { create } from 'zustand'
import { supabase } from '@/lib/supabase/client'
import type { UserStats, GroupStats, GroupLeaderboardEntry } from '@/types'
import { parseISO, differenceInDays, startOfDay } from 'date-fns'

interface StatsState {
  userStats: UserStats | null
  groupStats: GroupStats | null
  isLoading: boolean

  // Actions
  fetchUserStats: (groupId: string, userId: string) => Promise<void>
  fetchGroupStats: (groupId: string) => Promise<void>
  calculateStreaks: (userId: string, groupId: string) => Promise<{ current: number; longest: number }>
}

export const useStatsStore = create<StatsState>((set, get) => ({
  userStats: null,
  groupStats: null,
  isLoading: false,

  calculateStreaks: async (userId: string, groupId: string) => {
    try {
      // Fetch all completed logs for this user in this group
      const { data: logs, error } = await supabase
        .from('daily_logs')
        .select('day_number, completed')
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .eq('completed', true)
        .eq('deleted', false)
        .order('day_number', { ascending: true })

      if (error) throw error

      if (!logs || logs.length === 0) {
        return { current: 0, longest: 0 }
      }

      const dayNumbers = logs.map(l => l.day_number).sort((a, b) => a - b)

      // Calculate current streak (from most recent completed day backwards)
      let currentStreak = 0
      const latestDay = dayNumbers[dayNumbers.length - 1]

      for (let i = dayNumbers.length - 1; i >= 0; i--) {
        const expectedDay = latestDay - currentStreak
        if (dayNumbers[i] === expectedDay) {
          currentStreak++
        } else {
          break
        }
      }

      // Calculate longest streak
      let longestStreak = 1
      let tempStreak = 1

      for (let i = 1; i < dayNumbers.length; i++) {
        if (dayNumbers[i] === dayNumbers[i - 1] + 1) {
          tempStreak++
          longestStreak = Math.max(longestStreak, tempStreak)
        } else {
          tempStreak = 1
        }
      }

      return { current: currentStreak, longest: longestStreak }
    } catch (error) {
      console.error('Error calculating streaks:', error)
      return { current: 0, longest: 0 }
    }
  },

  fetchUserStats: async (groupId: string, userId: string) => {
    set({ isLoading: true })
    try {
      // Fetch group to get start date and penalty
      const { data: group, error: groupError } = await supabase
        .from('groups')
        .select('start_date, daily_penalty_amount')
        .eq('id', groupId)
        .single()

      if (groupError) throw groupError

      // Fetch completed logs count
      const { count: completedCount, error: logsError } = await supabase
        .from('daily_logs')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('group_id', groupId)
        .eq('completed', true)
        .eq('deleted', false)

      if (logsError) throw logsError

      // Fetch missed days
      const { data: missedDays, error: missedError } = await supabase
        .from('missed_days')
        .select('penalty_amount')
        .eq('user_id', userId)
        .eq('group_id', groupId)

      if (missedError) throw missedError

      const missedCount = missedDays?.length || 0
      const potContribution = missedDays?.reduce((sum, m) => sum + m.penalty_amount, 0) || 0

      // Calculate streaks
      const { current: currentStreak, longest: longestStreak } = await get().calculateStreaks(userId, groupId)

      // Calculate completion percentage (out of 100 days total)
      const completionPercentage = Math.round(((completedCount || 0) / 100) * 100)

      // Days remaining
      const daysRemaining = Math.max(0, 100 - (completedCount || 0))

      const stats: UserStats = {
        userId,
        groupId,
        currentStreak,
        longestStreak,
        completionPercentage,
        completedDays: completedCount || 0,
        missedDays: missedCount,
        daysRemaining,
        potContribution,
      }

      set({
        userStats: stats,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },

  fetchGroupStats: async (groupId: string) => {
    set({ isLoading: true })
    try {
      // Fetch all group members
      const { data: memberships, error: membershipsError } = await supabase
        .from('group_memberships')
        .select(`
          user_id,
          users:user_id (
            id,
            first_name,
            last_name
          )
        `)
        .eq('group_id', groupId)
        .eq('deleted', false)

      if (membershipsError) throw membershipsError

      // Calculate stats for each member
      const leaderboard: GroupLeaderboardEntry[] = []

      for (const membership of memberships) {
        const userId = membership.user_id

        // Fetch user stats (reuse logic from fetchUserStats)
        const { data: group } = await supabase
          .from('groups')
          .select('start_date, daily_penalty_amount')
          .eq('id', groupId)
          .single()

        const { count: completedCount } = await supabase
          .from('daily_logs')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', userId)
          .eq('group_id', groupId)
          .eq('completed', true)
          .eq('deleted', false)

        const { data: missedDays } = await supabase
          .from('missed_days')
          .select('penalty_amount')
          .eq('user_id', userId)
          .eq('group_id', groupId)

        const { current: currentStreak, longest: longestStreak } = await get().calculateStreaks(userId, groupId)

        const missedCount = missedDays?.length || 0
        const potContribution = missedDays?.reduce((sum, m) => sum + m.penalty_amount, 0) || 0

        // Calculate completion percentage (out of 100 days total)
        const completionPercentage = Math.round(((completedCount || 0) / 100) * 100)
        const daysRemaining = Math.max(0, 100 - (completedCount || 0))

        leaderboard.push({
          user: membership.users as any,
          stats: {
            userId,
            groupId,
            currentStreak,
            longestStreak,
            completionPercentage,
            completedDays: completedCount || 0,
            missedDays: missedCount,
            daysRemaining,
            potContribution,
          },
          rank: 0, // Will be set after sorting
        })
      }

      // Sort by completion percentage (descending)
      leaderboard.sort((a, b) => {
        if (b.stats.completionPercentage !== a.stats.completionPercentage) {
          return b.stats.completionPercentage - a.stats.completionPercentage
        }
        return b.stats.currentStreak - a.stats.currentStreak
      })

      // Assign ranks
      leaderboard.forEach((entry, index) => {
        entry.rank = index + 1
      })

      // Calculate total pot
      const totalPot = leaderboard.reduce((sum, entry) => sum + entry.stats.potContribution, 0)

      // Calculate days remaining for group (until 100 days from start)
      const { data: group } = await supabase
        .from('groups')
        .select('start_date')
        .eq('id', groupId)
        .single()

      const startDate = parseISO(group!.start_date)
      const daysElapsed = differenceInDays(startOfDay(new Date()), startDate) + 1
      const daysRemaining = Math.max(0, 100 - daysElapsed)

      const stats: GroupStats = {
        groupId,
        totalPot,
        daysRemaining,
        totalMembers: memberships.length,
        leaderboard,
      }

      set({
        groupStats: stats,
        isLoading: false,
      })
    } catch (error) {
      set({ isLoading: false })
      throw error
    }
  },
}))
