ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS unread_count integer DEFAULT 0;

CREATE OR REPLACE FUNCTION increment_unread_count(row_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE chat_sessions
  SET unread_count = COALESCE(unread_count, 0) + 1,
      updated_at = NOW()
  WHERE id = row_id;
END;
$$ LANGUAGE plpgsql;
