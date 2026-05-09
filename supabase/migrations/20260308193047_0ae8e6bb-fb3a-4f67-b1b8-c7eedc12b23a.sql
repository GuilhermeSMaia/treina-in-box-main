
-- Allow author to update own plaza posts
CREATE POLICY "Users can update own posts"
  ON public.plaza_posts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Allow moderators to update any plaza post
CREATE POLICY "Moderators can update any post"
  ON public.plaza_posts FOR UPDATE
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
