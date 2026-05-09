
-- 1. trainings: replace open SELECT with enrollment-based
DROP POLICY "Authenticated users can view trainings" ON public.trainings;
CREATE POLICY "Users can view authorized trainings"
  ON public.trainings FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.training_enrollments
      WHERE training_enrollments.training_id = trainings.id
        AND training_enrollments.user_id = auth.uid()
    )
  );

-- 2. content_posts: replace open SELECT
DROP POLICY "Authenticated users can view content posts" ON public.content_posts;
CREATE POLICY "Users can view authorized content posts"
  ON public.content_posts FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.training_enrollments
      WHERE training_enrollments.training_id = content_posts.training_id
        AND training_enrollments.user_id = auth.uid()
    )
  );

-- 3. plaza_posts: replace open SELECT
DROP POLICY "Authenticated users can view plaza posts" ON public.plaza_posts;
CREATE POLICY "Users can view authorized plaza posts"
  ON public.plaza_posts FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.training_enrollments
      WHERE training_enrollments.training_id = plaza_posts.training_id
        AND training_enrollments.user_id = auth.uid()
    )
  );

-- 4. live_sessions: replace open SELECT
DROP POLICY "Authenticated users can view live sessions" ON public.live_sessions;
CREATE POLICY "Users can view authorized live sessions"
  ON public.live_sessions FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.training_enrollments
      WHERE training_enrollments.training_id = live_sessions.training_id
        AND training_enrollments.user_id = auth.uid()
    )
  );

-- 5. training_modules: replace open SELECT
DROP POLICY "Authenticated users can view modules" ON public.training_modules;
CREATE POLICY "Users can view authorized modules"
  ON public.training_modules FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.training_enrollments
      WHERE training_enrollments.training_id = training_modules.training_id
        AND training_enrollments.user_id = auth.uid()
    )
  );

-- 6. training_lessons: replace open SELECT (join via module)
DROP POLICY "Authenticated users can view lessons" ON public.training_lessons;
CREATE POLICY "Users can view authorized lessons"
  ON public.training_lessons FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::app_role)
    OR has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (
      SELECT 1 FROM public.training_modules tm
      JOIN public.training_enrollments te ON te.training_id = tm.training_id
      WHERE tm.id = training_lessons.module_id
        AND te.user_id = auth.uid()
    )
  );
