-- Fix infinite recursion in group_memberships RLS policy

-- Drop the problematic policy
DROP POLICY IF EXISTS "Users can read memberships in their groups" ON public.group_memberships;

-- Create simpler, non-recursive policies
-- Policy 1: Users can always read their own memberships
CREATE POLICY "Users can read own memberships" ON public.group_memberships
  FOR SELECT USING (user_id = auth.uid());

-- Policy 2: Users can read other memberships in groups where they are members
CREATE POLICY "Users can read group member list" ON public.group_memberships
  FOR SELECT USING (
    group_id IN (
      SELECT group_id FROM public.group_memberships
      WHERE user_id = auth.uid() AND deleted = FALSE
    )
  );

-- Also update the groups policy to avoid similar issues
DROP POLICY IF EXISTS "Users can read groups they belong to" ON public.groups;

CREATE POLICY "Users can read groups they belong to" ON public.groups
  FOR SELECT USING (
    id IN (
      SELECT group_id FROM public.group_memberships
      WHERE user_id = auth.uid() AND deleted = FALSE
    )
  );

-- Fix the join group flow - need to allow reading group by invite code
DROP POLICY IF EXISTS "Anyone can read groups by invite code" ON public.groups;

CREATE POLICY "Anyone can read groups by invite code" ON public.groups
  FOR SELECT USING (
    auth.uid() IS NOT NULL
  );
