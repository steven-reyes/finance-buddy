import sqlite3
import os
import pathlib

BASE_DIR = pathlib.Path(__file__).resolve().parent.parent
DATA_DIR = BASE_DIR.parent / "data"
DB_PATH = DATA_DIR / "finance-buddy.db"
MIGRATIONS_DIR = BASE_DIR / "app" / "migrations"


def get_connection() -> sqlite3.Connection:
    """Get a new database connection with row factory and pragmas set."""
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode = WAL")
    conn.execute("PRAGMA foreign_keys = ON")
    return conn


def run_migrations():
    """Run all pending SQL migration files."""
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    conn = get_connection()
    try:
        # Ensure _migrations table exists first
        conn.execute(
            "CREATE TABLE IF NOT EXISTS _migrations ("
            "id INTEGER PRIMARY KEY AUTOINCREMENT,"
            "name TEXT NOT NULL UNIQUE,"
            "applied_at TEXT NOT NULL DEFAULT (datetime('now'))"
            ")"
        )
        conn.commit()

        applied = {
            row["name"]
            for row in conn.execute("SELECT name FROM _migrations").fetchall()
        }

        migration_files = sorted(MIGRATIONS_DIR.glob("*.sql"))
        for mf in migration_files:
            if mf.name not in applied:
                sql = mf.read_text()
                conn.executescript(sql)
                conn.execute(
                    "INSERT INTO _migrations (name) VALUES (?)", (mf.name,)
                )
                conn.commit()
                print(f"Applied migration: {mf.name}")
    finally:
        conn.close()


DEFAULT_CATEGORIES = [
    # Expense categories
    ("Rent/Mortgage", "expense", "#EF4444", "\U0001F3E0"),
    ("Groceries", "expense", "#F97316", "\U0001F6D2"),
    ("Utilities", "expense", "#EAB308", "\U0001F4A1"),
    ("Transportation", "expense", "#84CC16", "\U0001F697"),
    ("Entertainment", "expense", "#22C55E", "\U0001F3AC"),
    ("Dining Out", "expense", "#14B8A6", "\U0001F37D\uFE0F"),
    ("Healthcare", "expense", "#06B6D4", "\U0001FA7A"),
    ("Insurance", "expense", "#3B82F6", "\U0001F6E1\uFE0F"),
    ("Subscriptions", "expense", "#6366F1", "\U0001F4F1"),
    ("Clothing", "expense", "#8B5CF6", "\U0001F455"),
    ("Education", "expense", "#A855F7", "\U0001F393"),
    ("Personal Care", "expense", "#D946EF", "\U0001F9F4"),
    ("Other Expense", "expense", "#EC4899", "\U0001F4E6"),
    # Income categories
    ("Salary", "income", "#10B981", "\U0001F4B0"),
    ("Freelance", "income", "#059669", "\U0001F4BB"),
    ("Interest/Dividends", "income", "#047857", "\U0001F4C8"),
    ("Gifts", "income", "#065F46", "\U0001F381"),
    ("Refunds", "income", "#064E3B", "\U0001F4B8"),
    ("Other Income", "income", "#0D9488", "\U0001F4B5"),
]


def seed_categories():
    """Insert default categories if the categories table is empty."""
    conn = get_connection()
    try:
        count = conn.execute("SELECT COUNT(*) as c FROM categories").fetchone()["c"]
        if count == 0:
            conn.executemany(
                "INSERT INTO categories (name, type, color, icon, is_default) VALUES (?, ?, ?, ?, 1)",
                [(name, typ, color, icon) for name, typ, color, icon in DEFAULT_CATEGORIES],
            )
            conn.commit()
            print(f"Seeded {len(DEFAULT_CATEGORIES)} default categories")
    finally:
        conn.close()


def init_db():
    """Full database initialization: migrations + seeds."""
    run_migrations()
    seed_categories()
