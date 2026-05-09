
-- Add new columns to invitations
ALTER TABLE public.invitations
  ADD COLUMN IF NOT EXISTS training_id text,
  ADD COLUMN IF NOT EXISTS invite_token text NOT NULL DEFAULT (gen_random_uuid())::text,
  ADD COLUMN IF NOT EXISTS channel text NOT NULL DEFAULT 'email';

-- Unique index on invite_token
CREATE UNIQUE INDEX IF NOT EXISTS invitations_invite_token_key ON public.invitations (invite_token);

-- Update handle_new_user to also create training_enrollment when invitation has training_id
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
      -- Also check by invite_token in raw_user_meta_data (for link-based invites without email match)
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

      -- Auto-enroll in training if invitation has training_id
      IF _invitation.training_id IS NOT NULL THEN
        INSERT INTO public.training_enrollments (user_id, training_id)
        VALUES (NEW.id, _invitation.training_id)
        ON CONFLICT DO NOTHING;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;
