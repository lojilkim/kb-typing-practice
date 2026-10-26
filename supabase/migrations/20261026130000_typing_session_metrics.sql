ALTER TABLE public.practice_sessions
  ADD COLUMN IF NOT EXISTS session_key TEXT,
  ADD COLUMN IF NOT EXISTS raw_wpm INTEGER,
  ADD COLUMN IF NOT EXISTS net_wpm INTEGER,
  ADD COLUMN IF NOT EXISTS extra_characters INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS missed_characters INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consistency DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS performance_samples JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS practice_sessions_user_session_key_idx
  ON public.practice_sessions (user_id, session_key)
  WHERE session_key IS NOT NULL;
