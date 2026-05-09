-- 1. Update handle_new_user to make first user owner and check invitations
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _user_count int;
  _invitation record;
BEGIN
  -- Count existing profiles to determine if this is the first user
  SELECT count(*) INTO _user_count FROM public.profiles;

  -- Create profile
  INSERT INTO public.profiles (user_id, full_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', NEW.raw_user_meta_data->>'picture', '')
  );

  IF _user_count = 0 THEN
    -- First user becomes owner
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    -- Check if user was invited
    SELECT * INTO _invitation FROM public.invitations
      WHERE email = lower(NEW.email)
        AND status = 'pending'
      LIMIT 1;

    IF _invitation IS NULL THEN
      -- Not invited: set enrollment_status to blocked so they can't access anything
      UPDATE public.profiles SET enrollment_status = 'blocked' WHERE user_id = NEW.id;
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
    ELSE
      -- Invited: assign the invited role and mark invitation as accepted
      INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, _invitation.role);
      UPDATE public.invitations SET status = 'accepted' WHERE id = _invitation.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Recreate the trigger on auth.users (drop if exists, then create)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();