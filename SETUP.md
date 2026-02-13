# 100 Pushups Challenge - Setup Guide

## Overview

This application uses:
- **Frontend**: Next.js 15 with TypeScript
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime
- **State Management**: Zustand
- **Styling**: Tailwind CSS v4

## Prerequisites

- Node.js 18+ installed
- A Supabase account (free tier works great)

## Step 1: Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose an organization (or create one)
4. Fill in project details:
   - **Name**: "pushups-challenge" (or your preferred name)
   - **Database Password**: Choose a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Free tier is perfect for getting started
5. Click "Create new project" and wait ~2 minutes for setup

## Step 2: Set Up the Database Schema

1. In your Supabase project dashboard, go to the **SQL Editor** (left sidebar)
2. Click "New query"
3. Copy the contents of `supabase-schema.sql` from this project
4. Paste it into the SQL editor
5. Click "Run" to execute the SQL

This will create:
- All database tables (users, groups, daily_logs, etc.)
- Indexes for performance
- Row Level Security (RLS) policies for data isolation
- Triggers for automatic timestamp updates
- Real-time subscriptions for live updates

## Step 3: Configure Environment Variables

1. In your Supabase project dashboard, go to **Project Settings** (gear icon)
2. Navigate to **API** section
3. Copy the following values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (under "Project API keys")

4. Create a `.env.local` file in the project root:

```bash
cp .env.local.example .env.local
```

5. Edit `.env.local` and add your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 4: Install Dependencies and Run

```bash
# Install dependencies
npm install

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

## Step 5: Test the Application

### 1. Create an Account
- Click "Get Started" on the landing page
- Fill in registration form
- You'll be redirected to create a group

### 2. Create a Challenge Group
- Enter group name (e.g., "Summer 2024 Challenge")
- Set start date (can be today or future)
- Set daily penalty amount (e.g., $5.00)
- Click "Create Group"
- Save the invite code to share with friends!

### 3. Verify Database
Go to Supabase dashboard → **Table Editor** to see:
- Your user in the `users` table
- Your group in the `groups` table
- Your membership in the `group_memberships` table

## Project Structure

```
pushups-challenge/
├── app/                      # Next.js App Router pages
│   ├── page.tsx             # Landing page
│   ├── login/               # Login page
│   ├── register/            # Registration page
│   ├── dashboard/           # User dashboard
│   └── groups/              # Group management
│       ├── create/          # Create group
│       └── join/            # Join group
├── components/
│   ├── ui/                  # Reusable UI components
│   └── providers/           # React context providers
├── store/                   # Zustand state management
│   ├── useAuthStore.ts      # Authentication state
│   ├── useGroupStore.ts     # Group state
│   ├── useDailyLogsStore.ts # Daily logs state
│   └── useStatsStore.ts     # Statistics state
├── lib/
│   └── supabase/
│       └── client.ts        # Supabase client configuration
├── types/                   # TypeScript type definitions
│   ├── database.types.ts    # Database schema types
│   └── index.ts            # Application types
└── supabase-schema.sql      # Database schema SQL
```

## Next Steps

Now that you have the basic setup working, the next features to implement are:

### Phase 1 MVP (Remaining):
1. **Group Detail Page** (`/groups/[groupId]/page.tsx`)
   - Show group information
   - Display group members
   - Show invite code

2. **Daily Logger Component**
   - Main completion widget
   - Mark daily completion
   - Add optional note

3. **Progress Card Component**
   - Current streak 🔥
   - Longest streak
   - Completion percentage
   - Days remaining
   - Pot contribution

4. **Stats Calculation**
   - Implement streak calculations
   - Show user progress
   - Calculate group totals

### Phase 2: Social Features
- Emoji reactions (cheers)
- Comments on daily logs
- Activity feed with real-time updates
- Supabase Realtime integration

### Phase 3: Leaderboard
- Group leaderboard page
- Rankings by completion %
- Member statistics comparison

### Phase 4: Automated Features
- Miss detection (using Supabase Edge Functions or cron jobs)
- Email notifications (optional)
- Pot calculation tracking

## Supabase Features Used

### Authentication
- Email/password authentication
- Session management
- User profiles in custom `users` table

### Database
- PostgreSQL with all app tables
- Row Level Security (RLS) for data isolation
- Foreign key relationships
- Indexes for performance

### Real-time (Coming in Phase 2)
- Subscribe to `daily_logs` changes
- Subscribe to `cheers` additions
- Subscribe to `comments` additions
- Live updates across all clients in a group

## Deployment (Vercel)

When ready to deploy:

1. Push code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Click "Import Project"
4. Select your GitHub repository
5. Add environment variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
6. Click "Deploy"

Vercel will:
- Build your Next.js app
- Deploy to a production URL
- Auto-deploy on every git push
- Provide preview deployments for PRs

## Troubleshooting

### "Invalid API key" error
- Double-check your `.env.local` file
- Make sure you're using the `anon` public key (not the `service_role` key)
- Restart the dev server after changing env variables

### Database permission errors
- Verify RLS policies are enabled (check `supabase-schema.sql`)
- Ensure you're logged in (check auth state)
- Check Supabase logs: Dashboard → Logs → Postgres Logs

### Real-time not working
- Verify tables are added to publication (check SQL file)
- Check browser console for WebSocket connection errors
- Ensure RLS policies allow SELECT access

## Support

- Supabase Docs: https://supabase.com/docs
- Next.js Docs: https://nextjs.org/docs
- Project Issues: Create an issue in your repo

## License

MIT
