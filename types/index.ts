import type { Database } from './database.types'

// Database table types
export type User = Database['public']['Tables']['users']['Row']
export type Group = Database['public']['Tables']['groups']['Row']
export type GroupMembership = Database['public']['Tables']['group_memberships']['Row']
export type DailyLog = Database['public']['Tables']['daily_logs']['Row']
export type MissedDay = Database['public']['Tables']['missed_days']['Row']
export type Cheer = Database['public']['Tables']['cheers']['Row']
export type Comment = Database['public']['Tables']['comments']['Row']

// Insert types
export type InsertUser = Database['public']['Tables']['users']['Insert']
export type InsertGroup = Database['public']['Tables']['groups']['Insert']
export type InsertGroupMembership = Database['public']['Tables']['group_memberships']['Insert']
export type InsertDailyLog = Database['public']['Tables']['daily_logs']['Insert']
export type InsertMissedDay = Database['public']['Tables']['missed_days']['Insert']
export type InsertCheer = Database['public']['Tables']['cheers']['Insert']
export type InsertComment = Database['public']['Tables']['comments']['Insert']

// Update types
export type UpdateUser = Database['public']['Tables']['users']['Update']
export type UpdateGroup = Database['public']['Tables']['groups']['Update']
export type UpdateDailyLog = Database['public']['Tables']['daily_logs']['Update']

// Extended types with relations
export type DailyLogWithUser = DailyLog & {
  user: Pick<User, 'id' | 'first_name' | 'last_name'>
}

export type DailyLogWithCheersAndComments = DailyLog & {
  user: Pick<User, 'id' | 'first_name' | 'last_name'>
  cheers: (Cheer & { user: Pick<User, 'id' | 'first_name' | 'last_name'> })[]
  comments: (Comment & { user: Pick<User, 'id' | 'first_name' | 'last_name'> })[]
}

export type GroupWithMembership = Group & {
  membership: GroupMembership
}

// Stats types
export interface UserStats {
  userId: string
  groupId: string
  currentStreak: number
  longestStreak: number
  completionPercentage: number
  completedDays: number
  missedDays: number
  daysRemaining: number
  potContribution: number
}

export interface GroupLeaderboardEntry {
  user: Pick<User, 'id' | 'first_name' | 'last_name'>
  stats: UserStats
  rank: number
}

export interface GroupStats {
  groupId: string
  totalPot: number
  daysRemaining: number
  totalMembers: number
  leaderboard: GroupLeaderboardEntry[]
}

// Auth types
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  timezone: string
}

// Form types
export interface RegisterForm {
  email: string
  password: string
  firstName: string
  lastName: string
  timezone?: string
}

export interface LoginForm {
  email: string
  password: string
}

export interface CreateGroupForm {
  name: string
  startDate: string
  dailyPenaltyAmount: number
  timezone?: string
}

export interface JoinGroupForm {
  inviteCode: string
}

export interface LogCompletionForm {
  note?: string
}

// Emoji types for cheers
export type CheerEmoji = '🎉' | '💪' | '🔥' | '👏'
