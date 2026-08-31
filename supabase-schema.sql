-- Supabase SQL Schema for TypeMaster
-- Run this in Supabase SQL Editor to create all tables

-- Users table (extends Supabase auth.users)
CREATE TABLE public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  student_id TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  profile_picture TEXT,
  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_practice_date TEXT,
  total_practice_time INTEGER DEFAULT 0,
  total_words_typed INTEGER DEFAULT 0,
  best_wpm INTEGER DEFAULT 0,
  best_accuracy FLOAT DEFAULT 0,
  theme TEXT DEFAULT 'dark',
  font_size INTEGER DEFAULT 16,
  volume INTEGER DEFAULT 70,
  music_enabled BOOLEAN DEFAULT true,
  posture_reminders BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Songs table
CREATE TABLE public.songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  artist TEXT NOT NULL,
  lyrics TEXT NOT NULL,
  difficulty TEXT DEFAULT 'beginner',
  unlock_level INTEGER DEFAULT 1,
  genre TEXT,
  audio_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User songs progress
CREATE TABLE public.user_songs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  song_id UUID REFERENCES public.songs(id) ON DELETE CASCADE,
  best_wpm INTEGER DEFAULT 0,
  best_accuracy FLOAT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, song_id)
);

-- Lessons table
CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  content TEXT NOT NULL,
  unlock_level INTEGER DEFAULT 1,
  sort_order INTEGER DEFAULT 0
);

-- User lessons progress
CREATE TABLE public.user_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
  best_wpm INTEGER DEFAULT 0,
  best_accuracy FLOAT DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  attempts INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

-- Practice sessions
CREATE TABLE public.practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  wpm INTEGER NOT NULL,
  accuracy FLOAT NOT NULL,
  errors INTEGER NOT NULL,
  duration INTEGER NOT NULL,
  words_typed INTEGER NOT NULL,
  song_id UUID REFERENCES public.songs(id) ON DELETE SET NULL,
  lesson_id UUID REFERENCES public.lessons(id) ON DELETE SET NULL,
  music_enabled BOOLEAN DEFAULT true,
  posture_reminders_acknowledged INTEGER DEFAULT 0,
  home_row_accuracy FLOAT,
  top_row_accuracy FLOAT,
  bottom_row_accuracy FLOAT,
  number_row_accuracy FLOAT,
  left_hand_accuracy FLOAT,
  right_hand_accuracy FLOAT,
  correct_keystrokes INTEGER DEFAULT 0,
  incorrect_keystrokes INTEGER DEFAULT 0,
  average_response_time FLOAT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Achievements
CREATE TABLE public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 50,
  condition TEXT NOT NULL
);

-- User achievements
CREATE TABLE public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  achievement_id UUID REFERENCES public.achievements(id) ON DELETE CASCADE,
  earned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, achievement_id)
);

-- Daily challenges
CREATE TABLE public.daily_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  target INTEGER NOT NULL,
  description TEXT NOT NULL,
  xp_reward INTEGER DEFAULT 100,
  date TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User challenges
CREATE TABLE public.user_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  challenge_id UUID REFERENCES public.daily_challenges(id) ON DELETE CASCADE,
  progress INTEGER DEFAULT 0,
  completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, challenge_id)
);

-- Error logs for research
CREATE TABLE public.error_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  expected_key TEXT NOT NULL,
  typed_key TEXT NOT NULL,
  finger TEXT,
  row TEXT,
  hand TEXT,
  session_id UUID REFERENCES public.practice_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Finger statistics
CREATE TABLE public.finger_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  finger TEXT NOT NULL,
  total_keystrokes INTEGER DEFAULT 0,
  correct_keystrokes INTEGER DEFAULT 0,
  accuracy FLOAT DEFAULT 0,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, finger)
);

-- Practice calendar
CREATE TABLE public.practice_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  date TEXT NOT NULL,
  practice_minutes INTEGER DEFAULT 0,
  sessions_count INTEGER DEFAULT 0,
  words_typed INTEGER DEFAULT 0,
  average_wpm FLOAT DEFAULT 0,
  average_accuracy FLOAT DEFAULT 0,
  UNIQUE(user_id, date)
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_songs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.error_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finger_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_calendar ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users (users can only access their own data)
CREATE POLICY "Users can view own profile" ON public.users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Users cannot promote themselves. Role changes must use the service role.
CREATE OR REPLACE FUNCTION public.prevent_user_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.role IS DISTINCT FROM NEW.role
     AND COALESCE(auth.role(), '') <> 'service_role' THEN
    RAISE EXCEPTION 'Only service_role can change user roles';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_user_role ON public.users;
CREATE TRIGGER protect_user_role
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_user_role_change();

-- RLS Policies for songs (public read)
CREATE POLICY "Anyone can view songs" ON public.songs
  FOR SELECT USING (true);

-- RLS Policies for user_songs
CREATE POLICY "Users can view own song progress" ON public.user_songs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own song progress" ON public.user_songs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own song progress" ON public.user_songs
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for lessons (public read)
CREATE POLICY "Anyone can view lessons" ON public.lessons
  FOR SELECT USING (true);

-- RLS Policies for user_lessons
CREATE POLICY "Users can view own lesson progress" ON public.user_lessons
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own lesson progress" ON public.user_lessons
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own lesson progress" ON public.user_lessons
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for practice_sessions
CREATE POLICY "Users can view own practice sessions" ON public.practice_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice sessions" ON public.practice_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for achievements (public read)
CREATE POLICY "Anyone can view achievements" ON public.achievements
  FOR SELECT USING (true);

-- RLS Policies for user_achievements
CREATE POLICY "Users can view own achievements" ON public.user_achievements
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own achievements" ON public.user_achievements
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for daily_challenges (public read)
CREATE POLICY "Anyone can view daily challenges" ON public.daily_challenges
  FOR SELECT USING (true);

CREATE POLICY "Users can insert daily challenges" ON public.daily_challenges
  FOR INSERT WITH CHECK (true);

-- RLS Policies for user_challenges
CREATE POLICY "Users can view own challenges" ON public.user_challenges
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own challenges" ON public.user_challenges
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own challenges" ON public.user_challenges
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for error_logs
CREATE POLICY "Users can view own error logs" ON public.error_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own error logs" ON public.error_logs
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policies for finger_stats
CREATE POLICY "Users can view own finger stats" ON public.finger_stats
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own finger stats" ON public.finger_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own finger stats" ON public.finger_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for practice_calendar
CREATE POLICY "Users can view own practice calendar" ON public.practice_calendar
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own practice calendar" ON public.practice_calendar
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own practice calendar" ON public.practice_calendar
  FOR UPDATE USING (auth.uid() = user_id);

-- Seed data: Songs
INSERT INTO public.songs (title, artist, lyrics, difficulty, unlock_level, genre) VALUES
('Twinkle Twinkle Little Star', 'Traditional', 'Twinkle twinkle little star, how I wonder what you are. Up above the world so high, like a diamond in the sky. Twinkle twinkle little star, how I wonder what you are.', 'beginner', 1, 'Children'),
('Happy Birthday', 'Traditional', 'Happy birthday to you, happy birthday to you. Happy birthday dear friend, happy birthday to you.', 'beginner', 1, 'Celebration'),
('Jingle Bells', 'James Lord Pierpont', 'Jingle bells, jingle bells, jingle all the way. Oh what fun it is to ride in a one horse open sleigh. Jingle bells, jingle bells, jingle all the way. Oh what fun it is to ride in a one horse open sleigh.', 'beginner', 1, 'Holiday'),
('Imagine', 'John Lennon', 'Imagine there is no heaven, it is easy if you try. No hell below us, above us only sky. Imagine all the people living for today. Imagine there is no countries, it is not hard to do. Nothing to kill or die for, and no religion too. Imagine all the people living life in peace.', 'intermediate', 3, 'Rock'),
('Let It Be', 'The Beatles', 'When I find myself in times of trouble, Mother Mary comes to me. Speaking words of wisdom, let it be. And in my hour of darkness she is standing right in front of me. Speaking words of wisdom, let it be.', 'intermediate', 3, 'Rock'),
('Bohemian Rhapsody', 'Queen', 'Is this the real life, is this just fantasy. Caught in a landslide, no escape from reality. Open your eyes, look up to the skies and see. I am just a poor boy, I need no sympathy. Because I am easy come, easy go, little high, little low.', 'advanced', 5, 'Rock'),
('Hotel California', 'Eagles', 'On a dark desert highway, cool wind in my hair. Warm smell of colitas, rising up through the air. Up ahead in the distance, I saw a shimmering light. My head grew heavy and my sight grew dim, I had to stop for the night.', 'advanced', 5, 'Rock'),
('Shape of You', 'Ed Sheeran', 'The club is not really the best place to be if you are trying to find someone to talk to. The bar is where I go to meet my friends, but tonight I am looking for something else. I am in love with the shape of you.', 'intermediate', 3, 'Pop'),
('Yesterday', 'The Beatles', 'Yesterday, all my troubles seemed so far away. Now it looks as though they are here to stay. Oh, I believe in yesterday. Suddenly, I am not half the man I used to be. There is a shadow hanging over me.', 'intermediate', 3, 'Rock'),
('Counting Stars', 'OneRepublic', 'I need something people can believe. Lately I have been, I have been losing sleep. Dreaming about the things that we could be.', 'advanced', 5, 'Pop');

-- Seed data: Lessons
INSERT INTO public.lessons (name, category, difficulty, content, unlock_level, sort_order) VALUES
('Home Row Basics', 'Home Row', 'beginner', 'asdf jkl; asdf jkl; fdsa lkj; asdf jkl; fdsa lkj; asdf fdsa jkl; lkj; asdf jkl; asdf jkl;', 1, 1),
('Home Row Words', 'Home Row', 'beginner', 'ask fall dad sad lad has gas lass dash fad flask salad fall dash flask salad lass fall dash', 1, 2),
('Top Row Introduction', 'Top Row', 'beginner', 'qwer tyui op qwer tyui op poiu ytrewq qwer tyui op poiu ytrewq qwer poiu ytrewq tyui op', 1, 3),
('Top Row Words', 'Top Row', 'beginner', 'quit wire your type our out you how who what where when why which who whom whose', 1, 4),
('Bottom Row Basics', 'Bottom Row', 'intermediate', 'zxcv bnm, zxcv bnm, mnbvcxz zxcv bnm, mnbvcxz zxcv mnbv cxv bnm mnbvcxz zxcv bnm', 2, 5),
('Bottom Row Words', 'Bottom Row', 'intermediate', 'zone cave mix next very back name come zone cave mix next very back name come zone cave', 2, 6),
('Number Row', 'Numbers', 'intermediate', '1234 5678 90 1234 5678 90 0987 6543 21 1234 5678 90 0987 6543 21 1357 9753 1357', 3, 7),
('Symbols Practice', 'Symbols', 'advanced', '!@#$ %^&* () _+ !@#$ %^&* () _+ =- [] {} ;: '' ,. /? !@#$ %^&* () _+ =- [] {}', 4, 8),
('Full Keyboard', 'Full Keyboard', 'advanced', 'The quick brown fox jumps over the lazy dog. Pack my box with five dozen liquor jugs. How vexingly quick daft zebras jump.', 5, 9),
('Advanced Sentences', 'Full Keyboard', 'advanced', 'Practice makes perfect when you type every day with proper finger placement and posture.', 5, 10);

-- Seed data: Achievements
INSERT INTO public.achievements (name, description, icon, xp_reward, condition) VALUES
('First Practice', 'Complete your first typing practice session', '🎯', 50, 'first_practice'),
('95% Accuracy', 'Achieve 95% or higher accuracy in a session', '🎯', 100, 'accuracy_95'),
('100 WPM Club', 'Reach 100 words per minute', '⚡', 200, 'wpm_100'),
('7-Day Streak', 'Practice for 7 consecutive days', '🔥', 150, 'streak_7'),
('Keyboard Master', 'Complete all typing lessons', '⌨️', 300, 'all_lessons'),
('Song Completion', 'Complete typing a full song', '🎵', 100, 'first_song'),
('Word Warrior', 'Type 10,000 words total', '⚔️', 250, 'words_10000'),
('Speed Demon', 'Reach 80 WPM', '🚀', 150, 'wpm_80'),
('Perfectionist', 'Achieve 100% accuracy in a session', '💎', 200, 'accuracy_100'),
('Dedicated Typist', 'Practice for 10 hours total', '🏆', 200, 'time_10hours');

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, username, student_id, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || substr(NEW.id::text, 1, 8)),
    COALESCE(NEW.raw_user_meta_data->>'student_id', 'STUDENT-' || substr(NEW.id::text, 1, 8)),
    'user'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to automatically create user profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
