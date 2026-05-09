
-- Create trainings table with text id for compatibility with existing tables
CREATE TABLE public.trainings (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title text NOT NULL,
  description text,
  cover_url text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;

-- Authenticated users can view trainings
CREATE POLICY "Authenticated users can view trainings"
  ON public.trainings FOR SELECT
  TO authenticated
  USING (true);

-- Owner/admin can manage trainings
CREATE POLICY "Admins can manage trainings"
  ON public.trainings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'admin'));

-- Mentors can update trainings
CREATE POLICY "Mentors can update trainings"
  ON public.trainings FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'mentor'))
  WITH CHECK (has_role(auth.uid(), 'mentor'));

-- Trigger for updated_at
CREATE TRIGGER set_trainings_updated_at
  BEFORE UPDATE ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Audit trigger
CREATE TRIGGER audit_trainings
  AFTER INSERT OR UPDATE OR DELETE ON public.trainings
  FOR EACH ROW
  EXECUTE FUNCTION log_audit_event();
