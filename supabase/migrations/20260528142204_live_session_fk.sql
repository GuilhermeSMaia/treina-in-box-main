ALTER TABLE live_sessions
ADD CONSTRAINT live_sessions_training_id_fkey
FOREIGN KEY (training_id) REFERENCES trainings(id) ON DELETE CASCADE;