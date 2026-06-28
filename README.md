
  # Lecture Attendance Tracker

  This is a code bundle for Lecture Attendance Tracker. The original project is available at https://www.figma.com/design/HRBAnUwWhKGmDM3VHsLl0y/Lecture-Attendance-Tracker.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Deploying to Vercel with Supabase

  1. Create a free Supabase project.
  2. Add this table in the Supabase SQL editor:

  ```sql
  create table if not exists public.app_state (
    device_id text primary key,
    config jsonb,
    records jsonb not null default '[]'::jsonb,
    notes jsonb not null default '[]'::jsonb,
    updated_at timestamptz not null default now()
  );
  ```

  3. In Vercel, set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
  4. Deploy the Vite app as a static site.

  If the Supabase variables are omitted, the app still runs with browser-only storage.
  