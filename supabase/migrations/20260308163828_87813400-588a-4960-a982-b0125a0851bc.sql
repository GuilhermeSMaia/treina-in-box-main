
-- 1. Create classes table
CREATE TABLE public.classes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id text NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can manage classes" ON public.classes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated can view classes" ON public.classes FOR SELECT
  TO authenticated
  USING (true);

-- 2. Add class_id to training_enrollments
ALTER TABLE public.training_enrollments
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE CASCADE;

-- 3. Add class_id to invitations
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS class_id uuid REFERENCES public.classes(id) ON DELETE SET NULL;

-- 4. Update handle_new_user to also enroll in class
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _user_count int;
  _invitation record;
BEGIN
  SELECT count(*) INTO _user_count FROM public.profiles;

  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );

  IF _user_count = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    SELECT * INTO _invitation FROM public.invitations
      WHERE email = lower(NEW.email)
        AND status = 'pending'
      LIMIT 1;

    IF _invitation IS NULL THEN
      SELECT * INTO _invitation FROM public.invitations
        WHERE invite_token = (NEW.raw_user_meta_data->>'invite_token')
          AND status = 'pending'
        LIMIT 1;
    END IF;

    IF _invitation IS NULL THEN
      UPDATE public.profiles SET enrollment_status = 'blocked' WHERE user_id = NEW.id;
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
    ELSE
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _invitation.role);
      UPDATE public.invitations SET status = 'accepted' WHERE id = _invitation.id;

      -- Auto-enroll in training
      IF _invitation.training_id IS NOT NULL THEN
        INSERT INTO public.training_enrollments (user_id, training_id, class_id)
        VALUES (NEW.id, _invitation.training_id, _invitation.class_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
