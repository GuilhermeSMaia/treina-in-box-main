-- Rename full_name to username
ALTER TABLE profiles RENAME COLUMN full_name TO username;

ALTER TABLE profiles ADD COLUMN last_name TEXT;