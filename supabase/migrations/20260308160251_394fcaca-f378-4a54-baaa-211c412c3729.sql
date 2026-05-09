-- Allow anonymous users to check if their email has a pending invitation (for signup validation)
CREATE POLICY "Anyone can check pending invitations by email"
ON public.invitations
FOR SELECT
TO anon, authenticated
USING (status = 'pending');