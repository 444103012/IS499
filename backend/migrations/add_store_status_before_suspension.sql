ALTER TABLE stores
  ADD COLUMN IF NOT EXISTS status_before_suspension VARCHAR(50);