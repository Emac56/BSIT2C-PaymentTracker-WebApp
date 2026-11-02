-- Run once on an existing database (adds the notes columns).
ALTER TABLE collections ADD COLUMN IF NOT EXISTS notes VARCHAR(255) NULL;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS notes VARCHAR(255) NULL;
