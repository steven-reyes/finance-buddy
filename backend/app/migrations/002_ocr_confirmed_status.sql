-- Add 'confirmed' as a valid status for ocr_uploads
-- SQLite doesn't support ALTER CHECK, so we recreate the table
CREATE TABLE IF NOT EXISTS ocr_uploads_new (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  raw_text TEXT,
  extracted_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed', 'confirmed')),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO ocr_uploads_new SELECT * FROM ocr_uploads;
DROP TABLE ocr_uploads;
ALTER TABLE ocr_uploads_new RENAME TO ocr_uploads;
