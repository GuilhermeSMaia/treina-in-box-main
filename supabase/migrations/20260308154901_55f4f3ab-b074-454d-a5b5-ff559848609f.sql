
-- Plaza posts table
CREATE TABLE public.plaza_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.plaza_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view plaza posts"
  ON public.plaza_posts FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can insert own posts"
  ON public.plaza_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own posts"
  ON public.plaza_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Moderators can delete any post"
  ON public.plaza_posts FOR DELETE TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'mentor'::app_role)
  );

-- User notes table (100% private)
CREATE TABLE public.user_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id text NOT NULL,
  user_id uuid NOT NULL,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(training_id, user_id)
);

ALTER TABLE public.user_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own notes"
  ON public.user_notes FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Trigger for updated_at on plaza_posts
CREATE TRIGGER update_plaza_posts_updated_at
  BEFORE UPDATE ON public.plaza_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Trigger for updated_at on user_notes
CREATE TRIGGER update_user_notes_updated_at
  BEFORE UPDATE ON public.user_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Storage bucket for note images
INSERT INTO storage.buckets (id, name, public) VALUES ('note-images', 'note-images', true);

-- Storage RLS: authenticated users can upload
CREATE POLICY "Authenticated users can upload note images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'note-images');

-- Storage RLS: public read
CREATE POLICY "Public can read note images"
  ON storage.objects FOR SELECT TO public
  USING (bucket_id = 'note-images');

-- Enable realtime for plaza_posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.plaza_posts;
