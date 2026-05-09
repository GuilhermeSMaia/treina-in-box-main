
-- Create tables
CREATE TABLE public.live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id text NOT NULL,
  title text NOT NULL,
  meeting_url text,
  scheduled_at timestamptz,
  is_active boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.training_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id text NOT NULL,
  title text NOT NULL,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.training_lessons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  module_id uuid REFERENCES public.training_modules(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  content_url text,
  position int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.lesson_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id uuid REFERENCES public.training_lessons(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lesson_id, user_id)
);

-- Enable RLS
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.training_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_completions ENABLE ROW LEVEL SECURITY;

-- live_sessions policies
CREATE POLICY "Authenticated users can view live sessions"
ON public.live_sessions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and mentors can manage live sessions"
ON public.live_sessions FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'))
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

-- training_modules policies
CREATE POLICY "Authenticated users can view modules"
ON public.training_modules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and mentors can manage modules"
ON public.training_modules FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'))
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

-- training_lessons policies
CREATE POLICY "Authenticated users can view lessons"
ON public.training_lessons FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and mentors can manage lessons"
ON public.training_lessons FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'))
WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'mentor'));

-- lesson_completions policies
CREATE POLICY "Users can view own completions"
ON public.lesson_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own completions"
ON public.lesson_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own completions"
ON public.lesson_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime for lesson_completions
ALTER PUBLICATION supabase_realtime ADD TABLE public.lesson_completions;
