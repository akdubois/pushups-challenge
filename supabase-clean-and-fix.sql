-- Clean up ALL existing policies and recreate them correctly
-- Run this if you're still getting recursion errors

-- ============================================
-- DISABLE RLS temporarily, drop all policies, then re-enable
-- ============================================

-- GROUP MEMBERSHIPS
ALTER TABLE public.group_memberships DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read memberships in their groups" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can read own memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can read group member list" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can create memberships" ON public.group_memberships;
DROP POLICY IF EXISTS "Users can update own membership" ON public.group_memberships;
DROP POLICY IF EXISTS "Authenticated users can read memberships" ON public.group_memberships;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;

-- GROUPS
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read groups they belong to" ON public.groups;
DROP POLICY IF EXISTS "Anyone can read groups by invite code" ON public.groups;
DROP POLICY IF EXISTS "Users can create groups" ON public.groups;
DROP POLICY IF EXISTS "Admins can update their groups" ON public.groups;
DROP POLICY IF EXISTS "Authenticated users can read groups" ON public.groups;
DROP POLICY IF EXISTS "Users can update groups" ON public.groups;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;

-- DAILY LOGS
ALTER TABLE public.daily_logs DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read logs in their groups" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can create own logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Users can update own logs" ON public.daily_logs;
DROP POLICY IF EXISTS "Authenticated users can read logs" ON public.daily_logs;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;

-- MISSED DAYS
ALTER TABLE public.missed_days DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read missed days in their groups" ON public.missed_days;
DROP POLICY IF EXISTS "Authenticated users can read missed days" ON public.missed_days;
ALTER TABLE public.missed_days ENABLE ROW LEVEL SECURITY;

-- CHEERS
ALTER TABLE public.cheers DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read cheers in their groups" ON public.cheers;
DROP POLICY IF EXISTS "Users can create cheers" ON public.cheers;
DROP POLICY IF EXISTS "Users can update own cheers" ON public.cheers;
DROP POLICY IF EXISTS "Authenticated users can read cheers" ON public.cheers;
ALTER TABLE public.cheers ENABLE ROW LEVEL SECURITY;

-- COMMENTS
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read comments in their groups" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Users can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Authenticated users can read comments" ON public.comments;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- ============================================
-- NOW CREATE SIMPLE, NON-RECURSIVE POLICIES
-- ============================================

-- GROUP MEMBERSHIPS
CREATE POLICY "Authenticated users can read memberships" ON public.group_memberships
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted = FALSE);

CREATE POLICY "Users can create memberships" ON public.group_memberships
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own membership" ON public.group_memberships
  FOR UPDATE USING (user_id = auth.uid());

-- GROUPS
CREATE POLICY "Authenticated users can read groups" ON public.groups
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted = FALSE);

CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update groups" ON public.groups
  FOR UPDATE USING (auth.uid() IS NOT NULL);

-- DAILY LOGS
CREATE POLICY "Authenticated users can read logs" ON public.daily_logs
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted = FALSE);

CREATE POLICY "Users can create own logs" ON public.daily_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own logs" ON public.daily_logs
  FOR UPDATE USING (user_id = auth.uid());

-- MISSED DAYS
CREATE POLICY "Authenticated users can read missed days" ON public.missed_days
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- CHEERS
CREATE POLICY "Authenticated users can read cheers" ON public.cheers
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted = FALSE);

CREATE POLICY "Users can create cheers" ON public.cheers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cheers" ON public.cheers
  FOR UPDATE USING (user_id = auth.uid());

-- COMMENTS
CREATE POLICY "Authenticated users can read comments" ON public.comments
  FOR SELECT USING (auth.uid() IS NOT NULL AND deleted = FALSE);

CREATE POLICY "Users can create comments" ON public.comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (user_id = auth.uid());
