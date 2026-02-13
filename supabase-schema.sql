-- 100 Pushups Challenge - Supabase Database Schema
-- Run this SQL in your Supabase SQL Editor to create all tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Groups table
CREATE TABLE IF NOT EXISTS public.groups (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  invite_code TEXT UNIQUE NOT NULL,
  start_date DATE NOT NULL,
  daily_penalty_amount NUMERIC(10, 2) NOT NULL DEFAULT 5.00,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Group memberships (join table)
CREATE TABLE IF NOT EXISTS public.group_memberships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id)
);

-- Daily logs
CREATE TABLE IF NOT EXISTS public.daily_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 100),
  log_date DATE NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at TIMESTAMP WITH TIME ZONE,
  note TEXT,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(group_id, user_id, day_number)
);

-- Missed days
CREATE TABLE IF NOT EXISTS public.missed_days (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL CHECK (day_number >= 1 AND day_number <= 100),
  missed_date DATE NOT NULL,
  penalty_amount NUMERIC(10, 2) NOT NULL,
  paid BOOLEAN NOT NULL DEFAULT FALSE,
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Cheers (emoji reactions)
CREATE TABLE IF NOT EXISTS public.cheers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  emoji TEXT NOT NULL CHECK (emoji IN ('🎉', '💪', '🔥', '👏')),
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(daily_log_id, user_id)
);

-- Comments
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  daily_log_id UUID NOT NULL REFERENCES public.daily_logs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  deleted BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_group_memberships_group_id ON public.group_memberships(group_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_group_memberships_user_id ON public.group_memberships(user_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_daily_logs_group_id ON public.daily_logs(group_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_daily_logs_user_id ON public.daily_logs(user_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_daily_logs_log_date ON public.daily_logs(log_date) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_daily_logs_group_user_day ON public.daily_logs(group_id, user_id, day_number) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_missed_days_group_id ON public.missed_days(group_id);
CREATE INDEX IF NOT EXISTS idx_missed_days_user_id ON public.missed_days(user_id);
CREATE INDEX IF NOT EXISTS idx_cheers_daily_log_id ON public.cheers(daily_log_id) WHERE deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_comments_daily_log_id ON public.comments(daily_log_id) WHERE deleted = FALSE;

-- Updated_at triggers (auto-update timestamps)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_groups_updated_at BEFORE UPDATE ON public.groups
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_group_memberships_updated_at BEFORE UPDATE ON public.group_memberships
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_daily_logs_updated_at BEFORE UPDATE ON public.daily_logs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_missed_days_updated_at BEFORE UPDATE ON public.missed_days
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cheers_updated_at BEFORE UPDATE ON public.cheers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_comments_updated_at BEFORE UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.missed_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Users: Can read own profile, insert on signup, update own profile
CREATE POLICY "Users can read own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- Groups: Can read groups they're a member of
CREATE POLICY "Users can read groups they belong to" ON public.groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_id = groups.id
      AND user_id = auth.uid()
      AND deleted = FALSE
    )
  );

CREATE POLICY "Users can create groups" ON public.groups
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update their groups" ON public.groups
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_id = groups.id
      AND user_id = auth.uid()
      AND is_admin = TRUE
      AND deleted = FALSE
    )
  );

-- Group memberships: Can read memberships in groups they belong to
CREATE POLICY "Users can read memberships in their groups" ON public.group_memberships
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships gm
      WHERE gm.group_id = group_memberships.group_id
      AND gm.user_id = auth.uid()
      AND gm.deleted = FALSE
    )
  );

CREATE POLICY "Users can create memberships" ON public.group_memberships
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own membership" ON public.group_memberships
  FOR UPDATE USING (user_id = auth.uid());

-- Daily logs: Can read logs in groups they belong to
CREATE POLICY "Users can read logs in their groups" ON public.daily_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_id = daily_logs.group_id
      AND user_id = auth.uid()
      AND deleted = FALSE
    )
  );

CREATE POLICY "Users can create own logs" ON public.daily_logs
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own logs" ON public.daily_logs
  FOR UPDATE USING (user_id = auth.uid());

-- Missed days: Can read missed days in groups they belong to
CREATE POLICY "Users can read missed days in their groups" ON public.missed_days
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.group_memberships
      WHERE group_id = missed_days.group_id
      AND user_id = auth.uid()
      AND deleted = FALSE
    )
  );

-- Cheers: Can read cheers in groups they belong to
CREATE POLICY "Users can read cheers in their groups" ON public.cheers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.daily_logs dl
      JOIN public.group_memberships gm ON dl.group_id = gm.group_id
      WHERE dl.id = cheers.daily_log_id
      AND gm.user_id = auth.uid()
      AND gm.deleted = FALSE
    )
  );

CREATE POLICY "Users can create cheers" ON public.cheers
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own cheers" ON public.cheers
  FOR UPDATE USING (user_id = auth.uid());

-- Comments: Can read comments in groups they belong to
CREATE POLICY "Users can read comments in their groups" ON public.comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.daily_logs dl
      JOIN public.group_memberships gm ON dl.group_id = gm.group_id
      WHERE dl.id = comments.daily_log_id
      AND gm.user_id = auth.uid()
      AND gm.deleted = FALSE
    )
  );

CREATE POLICY "Users can create comments" ON public.comments
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own comments" ON public.comments
  FOR UPDATE USING (user_id = auth.uid());

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Enable Realtime (for real-time subscriptions)
ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE public.cheers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
