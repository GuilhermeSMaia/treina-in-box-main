
CREATE TABLE public.space_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.space_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own space posts"
  ON public.space_posts FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
