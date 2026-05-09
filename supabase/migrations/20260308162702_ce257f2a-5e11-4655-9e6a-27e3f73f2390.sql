
-- 1. Create training_enrollments table
CREATE TABLE public.training_enrollments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id text NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  enrolled_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(training_id, user_id)
);

ALTER TABLE public.training_enrollments ENABLE ROW LEVEL SECURITY;

-- Staff can manage enrollments
CREATE POLICY "Staff can manage enrollments"
ON public.training_enrollments FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'mentor')
)
WITH CHECK (
  public.has_role(auth.uid(), 'owner') OR 
  public.has_role(auth.uid(), 'admin') OR 
  public.has_role(auth.uid(), 'mentor')
);

-- Students can view own enrollments
CREATE POLICY "Students can view own enrollments"
ON public.training_enrollments FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- 2. Mentor invitation policies
CREATE POLICY "Mentors can insert student invitations"
ON public.invitations FOR INSERT
TO authenticated
WITH CHECK (
  public.has_role(auth.uid(), 'mentor') AND role = 'student'
);

CREATE POLICY "Mentors can view own invitations"
ON public.invitations FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'mentor') AND invited_by = auth.uid()
);

-- 3. Allow admins/owners to view all user_roles (needed for settings page)
CREATE POLICY "Admins can view all roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner') OR 
  public.has_role(auth.uid(), 'admin')
);
