
CREATE TABLE public.content_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  training_id text NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.content_posts ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read
CREATE POLICY "Authenticated users can view content posts"
  ON public.content_posts FOR SELECT
  TO authenticated
  USING (true);

-- Only staff can insert
CREATE POLICY "Staff can insert content posts"
  ON public.content_posts FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND (
      has_role(auth.uid(), 'owner'::app_role)
      OR has_role(auth.uid(), 'admin'::app_role)
      OR has_role(auth.uid(), 'mentor'::app_role)
    )
  );

-- Only staff can update
CREATE POLICY "Staff can update content posts"
  ON public.content_posts FOR UPDATE
  TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'mentor'::app_role)
  )
  WITH CHECK (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'mentor'::app_role)
  );

-- Only staff can delete
CREATE POLICY "Staff can delete content posts"
  ON public.content_posts FOR DELETE
  TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR has_role(auth.uid(), 'mentor'::app_role)
  );
