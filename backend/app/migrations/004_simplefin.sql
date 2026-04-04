CREATE TABLE IF NOT EXISTS simplefin_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  access_url TEXT NOT NULL,
  setup_token TEXT,
  institution_name TEXT,
  last_synced TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'error', 'disconnected')),
  error_message TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS linked_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  connection_id INTEGER NOT NULL REFERENCES simplefin_connections(id) ON DELETE CASCADE,
  simplefin_account_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  institution TEXT,
  balance_cents INTEGER,
  available_balance_cents INTEGER,
  currency TEXT DEFAULT 'USD',
  account_type TEXT,
  last_synced TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS synced_transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES linked_accounts(id) ON DELETE CASCADE,
  simplefin_transaction_id TEXT NOT NULL UNIQUE,
  amount_cents INTEGER NOT NULL,
  description TEXT NOT NULL,
  posted_date TEXT,
  transacted_date TEXT,
  pending INTEGER NOT NULL DEFAULT 0,
  category TEXT,
  imported INTEGER NOT NULL DEFAULT 0,
  imported_transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_linked_accounts_connection ON linked_accounts(connection_id);
CREATE INDEX IF NOT EXISTS idx_synced_transactions_account ON synced_transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_synced_transactions_imported ON synced_transactions(imported);
