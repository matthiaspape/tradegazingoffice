BEGIN IMMEDIATE;
CREATE TABLE context_entries (
  id TEXT PRIMARY KEY,
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  kind TEXT NOT NULL CHECK(kind IN ('VISION','DECISION','CONSTRAINT','TERM','REFERENCE','QUESTION')),
  topic TEXT NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('PROPOSED','CONFIRMED','OPEN','SUPERSEDED')),
  tags_json TEXT NOT NULL DEFAULT '[]',
  sources_json TEXT NOT NULL,
  confirmation_note TEXT NOT NULL DEFAULT '',
  is_core INTEGER NOT NULL DEFAULT 0 CHECK(is_core IN (0,1)),
  superseded_by TEXT REFERENCES context_entries(id),
  version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK(superseded_by IS NULL OR (status = 'SUPERSEDED' AND superseded_by != id)),
  CHECK(status != 'CONFIRMED' OR length(confirmation_note) > 0),
  CHECK((kind = 'QUESTION' AND status IN ('OPEN','SUPERSEDED')) OR (kind != 'QUESTION' AND status != 'OPEN'))
);
CREATE INDEX idx_context_status_topic ON context_entries(status, topic);
CREATE TABLE context_revisions (
  entry_id TEXT NOT NULL REFERENCES context_entries(id),
  version INTEGER NOT NULL,
  snapshot_json TEXT NOT NULL,
  change_reason TEXT NOT NULL,
  author TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY(entry_id, version)
);
CREATE TRIGGER context_revisions_no_update BEFORE UPDATE ON context_revisions BEGIN SELECT RAISE(ABORT, 'Context history is append-only'); END;
CREATE TRIGGER context_revisions_no_delete BEFORE DELETE ON context_revisions BEGIN SELECT RAISE(ABORT, 'Context history is append-only'); END;
CREATE TRIGGER context_entries_no_delete BEFORE DELETE ON context_entries BEGIN SELECT RAISE(ABORT, 'Retire context entries instead of deleting'); END;
PRAGMA user_version = 2;
COMMIT;
