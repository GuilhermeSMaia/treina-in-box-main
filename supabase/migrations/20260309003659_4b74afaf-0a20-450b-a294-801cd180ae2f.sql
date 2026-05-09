-- Add phone column to invitations table for WhatsApp invites
ALTER TABLE public.invitations ADD COLUMN phone text;