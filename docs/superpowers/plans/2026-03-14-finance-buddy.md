# Finance Buddy Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal finance web app with dashboard, budgets, transactions, investments, savings goals, CSV/OCR import — all local-only with SQLite.

**Architecture:** Monorepo with npm workspaces (client/server/shared). React+TS frontend with Vite, Express+TS backend with better-sqlite3. Shared Zod schemas for validation on both sides.

**Tech Stack:** React 18, TypeScript, Vite, TailwindCSS, Recharts, React Query, Express, better-sqlite3, Zod, PapaParse, Tesseract.js

**Spec:** `docs/superpowers/specs/2026-03-14-finance-buddy-design.md`

**Design quality:** Use @frontend-design skill for all UI pages — user explicitly requested polished, non-generic design.

---

## Chunk 1: Foundation

### Task 1: Initialize Monorepo

**Files:**
- Create: `package.json` (root)
- Create: `tsconfig.base.json`
- Create: `.gitignore` (update existing)

- [ ] **Step 1: Create root package.json**

```json
{
  "name": "finance-buddy",
  "private": true,
  "workspaces": ["packages/*"],
  "scripts": {
    "dev": "concurrently -n server,client -c blue,green \"npm run dev -w packages/server\" \"npm run dev -w packages/client\"",
    "build": "npm run build -w packages/shared && npm run build -w packages/server && npm run build -w packages/client"
  },
  "devDependencies": {
    "concurrently": "^9.0.0",
    "typescript": "^5.7.0"
  }
}
```

- [ ] **Step 2: Create tsconfig.base.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  }
}
```

- [ ] **Step 3: Update .gitignore**

```
node_modules/
dist/
data/
.superpowers/
.env
*.db
```

- [ ] **Step 4: Run `npm install` at root**

Run: `npm install`
Expected: `node_modules/` created, workspaces linked (will show warnings about missing workspace packages — that's fine, we create them next)

- [ ] **Step 5: Commit**

```bash
git add package.json tsconfig.base.json .gitignore
git commit -m "feat: initialize monorepo with npm workspaces"
```

### Task 2: Shared Package — Types & Schemas

**Files:**
- Create: `packages/shared/package.json`
- Create: `packages/shared/tsconfig.json`
- Create: `packages/shared/src/index.ts`
- Create: `packages/shared/src/types/category.ts`
- Create: `packages/shared/src/types/transaction.ts`
- Create: `packages/shared/src/types/budget.ts`
- Create: `packages/shared/src/types/investment.ts`
- Create: `packages/shared/src/types/savings-goal.ts`
- Create: `packages/shared/src/types/tag.ts`
- Create: `packages/shared/src/types/recurring.ts`
- Create: `packages/shared/src/types/dashboard.ts`
- Create: `packages/shared/src/schemas/category.schema.ts`
- Create: `packages/shared/src/schemas/transaction.schema.ts`
- Create: `packages/shared/src/schemas/budget.schema.ts`
- Create: `packages/shared/src/schemas/investment.schema.ts`
- Create: `packages/shared/src/schemas/savings-goal.schema.ts`
- Create: `packages/shared/src/schemas/tag.schema.ts`
- Create: `packages/shared/src/schemas/recurring.schema.ts`

- [ ] **Step 1: Create packages/shared/package.json**

```json
{
  "name": "@finance-buddy/shared",
  "version": "1.0.0",
  "private": true,
  "main": "src/index.ts",
  "types": "src/index.ts",
  "scripts": {
    "build": "tsc",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "zod": "^3.24.0"
  }
}
```

- [ ] **Step 2: Create packages/shared/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create type files**

Each type file exports interfaces for the domain entity. Key patterns:
- All amounts are `number` (cents, always positive)
- All dates are `string` (ISO format)
- IDs are `number`

Create all type files per the spec's data model section. Example for `types/category.ts`:

```typescript
export interface Category {
  id: number;
  name: string;
  type: 'income' | 'expense';
  color: string | null;
  icon: string | null;
  is_default: number;
}

export interface CreateCategoryDto {
  name: string;
  type: 'income' | 'expense';
  color?: string;
  icon?: string;
}

export interface UpdateCategoryDto {
  name?: string;
  color?: string;
  icon?: string;
}
```

Follow this pattern for all entities. For `types/transaction.ts`:

```typescript
export interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  notes: string | null;
  category_id: number | null;
  recurring_template_id: number | null;
  csv_import_id: number | null;
  ocr_upload_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface TransactionWithCategory extends Transaction {
  category_name: string | null;
  category_color: string | null;
  category_icon: string | null;
}

export interface CreateTransactionDto {
  type: 'income' | 'expense';
  amount: number;
  date: string;
  description: string;
  notes?: string;
  category_id?: number;
  tag_ids?: number[];
}

export interface UpdateTransactionDto extends Partial<CreateTransactionDto> {}

export interface TransactionFilters {
  type?: 'income' | 'expense';
  category_id?: number;
  tag_id?: number;
  start_date?: string;
  end_date?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

For `types/budget.ts`:

```typescript
export interface Budget {
  id: number;
  category_id: number;
  month: string;
  limit_amount: number;
  warn_threshold: number;
}

export interface BudgetWithSpending extends Budget {
  category_name: string;
  category_color: string | null;
  category_icon: string | null;
  spent: number;
}

export interface CreateBudgetDto {
  category_id: number;
  month: string;
  limit_amount: number;
  warn_threshold?: number;
}
```

For `types/investment.ts`:

```typescript
export interface Investment {
  id: number;
  name: string;
  type: '401k' | 'ira' | 'brokerage' | 'hsa' | 'crypto' | 'other';
  institution: string | null;
  contributions: number;
  current_value: number;
  notes: string | null;
  last_updated: string;
}

export interface InvestmentSnapshot {
  id: number;
  investment_id: number;
  value: number;
  contributions: number;
  recorded_at: string;
}

export interface CreateInvestmentDto {
  name: string;
  type: Investment['type'];
  institution?: string;
  contributions?: number;
  current_value?: number;
  notes?: string;
}

export interface UpdateValueDto {
  currentValue: number;
  contributions?: number;
}

export interface InvestmentSummary {
  total_value: number;
  total_contributions: number;
  total_return: number;
  account_count: number;
}
```

For `types/savings-goal.ts`:

```typescript
export interface SavingsGoal {
  id: number;
  name: string;
  target_amount: number;
  current_amount: number;
  deadline: string | null;
  icon: string | null;
  is_completed: number;
}

export interface SavingsGoalContribution {
  id: number;
  goal_id: number;
  amount: number;
  date: string;
  note: string | null;
  transaction_id: number | null;
}

export interface CreateSavingsGoalDto {
  name: string;
  target_amount: number;
  deadline?: string;
  icon?: string;
}

export interface CreateContributionDto {
  amount: number;
  date: string;
  note?: string;
  transaction_id?: number;
}
```

For `types/tag.ts`:

```typescript
export interface Tag {
  id: number;
  name: string;
  color: string | null;
}

export interface CreateTagDto {
  name: string;
  color?: string;
}
```

For `types/recurring.ts`:

```typescript
export type Frequency = 'weekly' | 'biweekly' | 'monthly' | 'quarterly' | 'yearly';

export interface RecurringTemplate {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category_id: number | null;
  frequency: Frequency;
  start_date: string;
  end_date: string | null;
  last_generated: string | null;
  is_active: number;
}

export interface CreateRecurringDto {
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category_id?: number;
  frequency: Frequency;
  start_date: string;
  end_date?: string;
}
```

For `types/dashboard.ts`:

```typescript
export interface DashboardSummary {
  total_income: number;
  total_expenses: number;
  net: number;
  transaction_count: number;
  prev_month_income: number;
  prev_month_expenses: number;
}

export interface SpendingByCategory {
  category_id: number;
  category_name: string;
  category_color: string | null;
  total: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  income: number;
  expenses: number;
  net: number;
}
```

- [ ] **Step 4: Create Zod schemas**

Each schema file mirrors its type file. Example for `schemas/category.schema.ts`:

```typescript
import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['income', 'expense']),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(10).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  icon: z.string().max(10).optional(),
});
```

For `schemas/transaction.schema.ts`:

```typescript
import { z } from 'zod';

export const createTransactionSchema = z.object({
  type: z.enum(['income', 'expense']),
  amount: z.number().int().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  description: z.string().min(1).max(500),
  notes: z.string().max(2000).optional(),
  category_id: z.number().int().positive().optional(),
  tag_ids: z.array(z.number().int().positive()).optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionFiltersSchema = z.object({
  type: z.enum(['income', 'expense']).optional(),
  category_id: z.coerce.number().int().positive().optional(),
  tag_id: z.coerce.number().int().positive().optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
```

For `schemas/budget.schema.ts`:

```typescript
import { z } from 'zod';

export const createBudgetSchema = z.object({
  category_id: z.number().int().positive(),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  limit_amount: z.number().int().positive(),
  warn_threshold: z.number().int().min(1).max(100).default(80),
});

export const updateBudgetSchema = z.object({
  limit_amount: z.number().int().positive().optional(),
  warn_threshold: z.number().int().min(1).max(100).optional(),
});

export const copyForwardSchema = z.object({
  targetMonth: z.string().regex(/^\d{4}-\d{2}$/),
});
```

Follow same pattern for investment, savings-goal, tag, recurring schemas.

- [ ] **Step 5: Create packages/shared/src/index.ts**

```typescript
export * from './types/category';
export * from './types/transaction';
export * from './types/budget';
export * from './types/investment';
export * from './types/savings-goal';
export * from './types/tag';
export * from './types/recurring';
export * from './types/dashboard';

export * from './schemas/category.schema';
export * from './schemas/transaction.schema';
export * from './schemas/budget.schema';
export * from './schemas/investment.schema';
export * from './schemas/savings-goal.schema';
export * from './schemas/tag.schema';
export * from './schemas/recurring.schema';
```

- [ ] **Step 6: Install deps and verify types compile**

Run: `cd /mnt/c/Users/steve/OneDrive/Desktop/finance-buddy && npm install && npx tsc -p packages/shared --noEmit`
Expected: No errors

- [ ] **Step 7: Commit**

```bash
git add packages/shared/
git commit -m "feat: add shared types and Zod validation schemas"
```

### Task 3: Server Package — Express + SQLite + Migrations

**Files:**
- Create: `packages/server/package.json`
- Create: `packages/server/tsconfig.json`
- Create: `packages/server/src/index.ts`
- Create: `packages/server/src/db/connection.ts`
- Create: `packages/server/src/db/migrate.ts`
- Create: `packages/server/src/db/seed.ts`
- Create: `packages/server/src/migrations/001_initial.sql`
- Create: `packages/server/src/middleware/validate.ts`
- Create: `packages/server/src/middleware/error-handler.ts`

- [ ] **Step 1: Create packages/server/package.json**

```json
{
  "name": "@finance-buddy/server",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  },
  "dependencies": {
    "@finance-buddy/shared": "*",
    "better-sqlite3": "^11.0.0",
    "cors": "^2.8.5",
    "date-fns": "^4.1.0",
    "express": "^4.21.0",
    "multer": "^1.4.5-lts.1",
    "papaparse": "^5.4.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/better-sqlite3": "^7.6.0",
    "@types/cors": "^2.8.0",
    "@types/express": "^5.0.0",
    "@types/multer": "^1.4.0",
    "@types/papaparse": "^5.3.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 2: Create packages/server/tsconfig.json**

```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "dist",
    "rootDir": "src"
  },
  "include": ["src"]
}
```

- [ ] **Step 3: Create packages/server/src/db/connection.ts**

```typescript
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DB_PATH = process.env.DB_PATH || path.resolve(__dirname, '../../../../data/finance-buddy.db');

// Ensure data directory exists
import fs from 'fs';
fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export default db;
```

- [ ] **Step 4: Create packages/server/src/db/migrate.ts**

```typescript
import db from './connection.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

export function runMigrations(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      applied_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  const applied = new Set(
    db.prepare('SELECT name FROM _migrations').all().map((r: any) => r.name)
  );

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    db.exec(sql);
    db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file);
    console.log(`Migration applied: ${file}`);
  }
}
```

- [ ] **Step 5: Create packages/server/src/migrations/001_initial.sql**

Full DDL from the spec — all tables with foreign keys, constraints, indexes:

```sql
CREATE TABLE IF NOT EXISTS categories (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  color TEXT,
  icon TEXT,
  is_default INTEGER NOT NULL DEFAULT 0,
  UNIQUE(name, type)
);

CREATE TABLE IF NOT EXISTS transactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  date TEXT NOT NULL,
  description TEXT NOT NULL,
  notes TEXT,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  recurring_template_id INTEGER,
  csv_import_id INTEGER,
  ocr_upload_id INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_category ON transactions(category_id);

CREATE TABLE IF NOT EXISTS recurring_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
  amount INTEGER NOT NULL CHECK (amount > 0),
  description TEXT NOT NULL,
  category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
  frequency TEXT NOT NULL CHECK (frequency IN ('weekly', 'biweekly', 'monthly', 'quarterly', 'yearly')),
  start_date TEXT NOT NULL,
  end_date TEXT,
  last_generated TEXT,
  is_active INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS budgets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
  month TEXT NOT NULL,
  limit_amount INTEGER NOT NULL CHECK (limit_amount > 0),
  warn_threshold INTEGER NOT NULL DEFAULT 80 CHECK (warn_threshold BETWEEN 1 AND 100),
  UNIQUE(category_id, month)
);

CREATE TABLE IF NOT EXISTS investments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('401k', 'ira', 'brokerage', 'hsa', 'crypto', 'other')),
  institution TEXT,
  contributions INTEGER NOT NULL DEFAULT 0,
  current_value INTEGER NOT NULL DEFAULT 0,
  notes TEXT,
  last_updated TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS investment_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  investment_id INTEGER NOT NULL REFERENCES investments(id) ON DELETE CASCADE,
  value INTEGER NOT NULL,
  contributions INTEGER NOT NULL DEFAULT 0,
  recorded_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS savings_goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  target_amount INTEGER NOT NULL CHECK (target_amount > 0),
  current_amount INTEGER NOT NULL DEFAULT 0,
  deadline TEXT,
  icon TEXT,
  is_completed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS savings_goal_contributions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  goal_id INTEGER NOT NULL REFERENCES savings_goals(id) ON DELETE CASCADE,
  amount INTEGER NOT NULL,
  date TEXT NOT NULL,
  note TEXT,
  transaction_id INTEGER REFERENCES transactions(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  color TEXT
);

CREATE TABLE IF NOT EXISTS transaction_tags (
  transaction_id INTEGER NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (transaction_id, tag_id)
);

CREATE TABLE IF NOT EXISTS csv_imports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  file_hash TEXT,
  row_count INTEGER,
  column_mapping TEXT,
  imported_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ocr_uploads (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  filename TEXT NOT NULL,
  raw_text TEXT,
  extracted_data TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

- [ ] **Step 6: Create packages/server/src/db/seed.ts**

```typescript
import db from './connection.js';

const DEFAULT_CATEGORIES = [
  { name: 'Rent/Mortgage', type: 'expense', color: '#ef4444', icon: '🏠' },
  { name: 'Groceries', type: 'expense', color: '#f97316', icon: '🛒' },
  { name: 'Utilities', type: 'expense', color: '#eab308', icon: '💡' },
  { name: 'Transportation', type: 'expense', color: '#22c55e', icon: '🚗' },
  { name: 'Entertainment', type: 'expense', color: '#3b82f6', icon: '🎬' },
  { name: 'Dining Out', type: 'expense', color: '#8b5cf6', icon: '🍽️' },
  { name: 'Healthcare', type: 'expense', color: '#ec4899', icon: '🏥' },
  { name: 'Insurance', type: 'expense', color: '#6366f1', icon: '🛡️' },
  { name: 'Subscriptions', type: 'expense', color: '#14b8a6', icon: '📱' },
  { name: 'Clothing', type: 'expense', color: '#f43f5e', icon: '👕' },
  { name: 'Education', type: 'expense', color: '#0ea5e9', icon: '📚' },
  { name: 'Personal Care', type: 'expense', color: '#d946ef', icon: '💆' },
  { name: 'Other Expense', type: 'expense', color: '#6b7280', icon: '📦' },
  { name: 'Salary', type: 'income', color: '#4ade80', icon: '💰' },
  { name: 'Freelance', type: 'income', color: '#34d399', icon: '💻' },
  { name: 'Interest/Dividends', type: 'income', color: '#2dd4bf', icon: '📈' },
  { name: 'Gifts', type: 'income', color: '#a78bfa', icon: '🎁' },
  { name: 'Refunds', type: 'income', color: '#67e8f9', icon: '↩️' },
  { name: 'Other Income', type: 'income', color: '#86efac', icon: '💵' },
];

export function seedCategories(): void {
  const existing = db.prepare('SELECT COUNT(*) as count FROM categories').get() as { count: number };
  if (existing.count > 0) return;

  const insert = db.prepare(
    'INSERT INTO categories (name, type, color, icon, is_default) VALUES (?, ?, ?, ?, 1)'
  );

  const insertMany = db.transaction(() => {
    for (const cat of DEFAULT_CATEGORIES) {
      insert.run(cat.name, cat.type, cat.color, cat.icon);
    }
  });

  insertMany();
  console.log(`Seeded ${DEFAULT_CATEGORIES.length} default categories`);
}
```

- [ ] **Step 7: Create middleware files**

`packages/server/src/middleware/validate.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export function validateBody(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid request body', details: result.error.flatten() }
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid query parameters', details: result.error.flatten() }
      });
    }
    (req as any).validatedQuery = result.data;
    next();
  };
}
```

`packages/server/src/middleware/error-handler.ts`:

```typescript
import { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, next: NextFunction) {
  console.error(err.stack);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  });
}
```

- [ ] **Step 8: Create packages/server/src/index.ts**

```typescript
import express from 'express';
import cors from 'cors';
import { runMigrations } from './db/migrate.js';
import { seedCategories } from './db/seed.js';
import { errorHandler } from './middleware/error-handler.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

// Initialize DB
runMigrations();
seedCategories();

app.listen(Number(PORT), '127.0.0.1', () => {
  console.log(`Finance Buddy server running at http://127.0.0.1:${PORT}`);
});
```

- [ ] **Step 9: Install server deps and verify server starts**

Run: `cd /mnt/c/Users/steve/OneDrive/Desktop/finance-buddy && npm install && npm run dev -w packages/server`
Expected: Server starts on port 3001, migrations run, categories seeded. Hit Ctrl+C after verifying.

- [ ] **Step 10: Commit**

```bash
git add packages/server/
git commit -m "feat: add Express server with SQLite, migrations, and seed data"
```

### Task 4: Client Package — Vite + React + TailwindCSS + App Shell

**Files:**
- Create: `packages/client/package.json`
- Create: `packages/client/tsconfig.json`
- Create: `packages/client/vite.config.ts`
- Create: `packages/client/tailwind.config.ts`
- Create: `packages/client/postcss.config.js`
- Create: `packages/client/index.html`
- Create: `packages/client/src/main.tsx`
- Create: `packages/client/src/App.tsx`
- Create: `packages/client/src/index.css`
- Create: `packages/client/src/lib/api.ts`
- Create: `packages/client/src/components/ui/AppShell.tsx`

- [ ] **Step 1: Create packages/client/package.json**

```json
{
  "name": "@finance-buddy/client",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "@finance-buddy/shared": "*",
    "@hookform/resolvers": "^3.9.0",
    "@tanstack/react-query": "^5.60.0",
    "axios": "^1.7.0",
    "date-fns": "^4.1.0",
    "lucide-react": "^0.460.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "react-hook-form": "^7.53.0",
    "react-router-dom": "^6.28.0",
    "recharts": "^2.13.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "autoprefixer": "^10.4.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "vite": "^5.4.0"
  }
}
```

- [ ] **Step 2: Create config files**

`packages/client/tsconfig.json`:
```json
{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "jsx": "react-jsx",
    "outDir": "dist",
    "rootDir": "src",
    "noEmit": true
  },
  "include": ["src"]
}
```

`packages/client/vite.config.ts`:
```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3001',
        changeOrigin: true,
      },
    },
  },
});
```

`packages/client/tailwind.config.ts`:
```typescript
import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: { extend: {} },
  plugins: [],
} satisfies Config;
```

`packages/client/postcss.config.js`:
```javascript
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

- [ ] **Step 3: Create index.html**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Finance Buddy</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Create src/index.css**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 5: Create src/lib/api.ts**

```typescript
import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.error?.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

export default api;
```

- [ ] **Step 6: Create AppShell component**

Use @frontend-design skill for polished sidebar layout. The AppShell wraps all pages with:
- Dark-themed sidebar with nav links (Dashboard, Transactions, Budgets, Investments, Savings Goals, Import, Settings)
- Each nav item uses a Lucide icon
- Active link highlighted
- Main content area with padding

`packages/client/src/components/ui/AppShell.tsx`:

```typescript
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, ArrowLeftRight, PiggyBank, TrendingUp,
  Target, Upload, Settings
} from 'lucide-react';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { to: '/budgets', icon: PiggyBank, label: 'Budgets' },
  { to: '/investments', icon: TrendingUp, label: 'Investments' },
  { to: '/savings-goals', icon: Target, label: 'Savings Goals' },
  { to: '/import', icon: Upload, label: 'Import' },
  { to: '/settings', icon: Settings, label: 'Settings' },
];

export default function AppShell() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <aside className="w-60 bg-gray-900 border-r border-gray-800 flex flex-col">
        <div className="p-5 border-b border-gray-800">
          <h1 className="text-xl font-bold text-blue-400">💰 Finance Buddy</h1>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 font-medium'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`
              }
            >
              <Icon size={18} />
              {label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
```

- [ ] **Step 7: Create src/main.tsx and src/App.tsx**

`src/main.tsx`:
```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>
);
```

`src/App.tsx`:
```typescript
import { Routes, Route } from 'react-router-dom';
import AppShell from './components/ui/AppShell';

function Placeholder({ name }: { name: string }) {
  return <div className="text-gray-400 text-lg">{name} — coming soon</div>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route path="/" element={<Placeholder name="Dashboard" />} />
        <Route path="/transactions" element={<Placeholder name="Transactions" />} />
        <Route path="/transactions/new" element={<Placeholder name="New Transaction" />} />
        <Route path="/transactions/:id/edit" element={<Placeholder name="Edit Transaction" />} />
        <Route path="/budgets" element={<Placeholder name="Budgets" />} />
        <Route path="/investments" element={<Placeholder name="Investments" />} />
        <Route path="/investments/:id" element={<Placeholder name="Investment Detail" />} />
        <Route path="/savings-goals" element={<Placeholder name="Savings Goals" />} />
        <Route path="/import" element={<Placeholder name="Import" />} />
        <Route path="/settings" element={<Placeholder name="Settings" />} />
      </Route>
    </Routes>
  );
}
```

- [ ] **Step 8: Install all deps and verify full stack starts**

Run: `cd /mnt/c/Users/steve/OneDrive/Desktop/finance-buddy && npm install && npm run dev`
Expected: Both server (port 3001) and client (port 5173) start. Navigate to http://localhost:5173 — should see sidebar with nav links and "Dashboard — coming soon" placeholder. Hit http://localhost:5173/api/health — should proxy to server and return `{"status":"ok"}`.

- [ ] **Step 9: Commit**

```bash
git add packages/client/
git commit -m "feat: add React client with Vite, TailwindCSS, routing, and app shell"
```

---

## Chunk 2: Categories + Transactions Server

### Task 5: Category Service & Routes

**Files:**
- Create: `packages/server/src/services/category.service.ts`
- Create: `packages/server/src/routes/categories.ts`
- Modify: `packages/server/src/index.ts` — register routes

- [ ] **Step 1: Create category.service.ts**

```typescript
import db from '../db/connection.js';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '@finance-buddy/shared';

export function getAllCategories(type?: 'income' | 'expense'): Category[] {
  if (type) {
    return db.prepare('SELECT * FROM categories WHERE type = ? ORDER BY is_default DESC, name').all(type) as Category[];
  }
  return db.prepare('SELECT * FROM categories ORDER BY type, is_default DESC, name').all() as Category[];
}

export function getCategoryById(id: number): Category | undefined {
  return db.prepare('SELECT * FROM categories WHERE id = ?').get(id) as Category | undefined;
}

export function createCategory(dto: CreateCategoryDto): Category {
  const result = db.prepare(
    'INSERT INTO categories (name, type, color, icon, is_default) VALUES (?, ?, ?, ?, 0)'
  ).run(dto.name, dto.type, dto.color || null, dto.icon || null);
  return getCategoryById(Number(result.lastInsertRowid))!;
}

export function updateCategory(id: number, dto: UpdateCategoryDto): Category | undefined {
  const cat = getCategoryById(id);
  if (!cat) return undefined;
  db.prepare(
    'UPDATE categories SET name = COALESCE(?, name), color = COALESCE(?, color), icon = COALESCE(?, icon) WHERE id = ?'
  ).run(dto.name || null, dto.color || null, dto.icon || null, id);
  return getCategoryById(id);
}

export function deleteCategory(id: number): boolean {
  const cat = getCategoryById(id);
  if (!cat || cat.is_default) return false;
  db.prepare('DELETE FROM categories WHERE id = ? AND is_default = 0').run(id);
  return true;
}
```

- [ ] **Step 2: Create categories route**

```typescript
import { Router } from 'express';
import { validateBody } from '../middleware/validate.js';
import { createCategorySchema, updateCategorySchema } from '@finance-buddy/shared';
import * as categoryService from '../services/category.service.js';

const router = Router();

router.get('/', (req, res) => {
  const type = req.query.type as 'income' | 'expense' | undefined;
  res.json(categoryService.getAllCategories(type));
});

router.post('/', validateBody(createCategorySchema), (req, res) => {
  try {
    const category = categoryService.createCategory(req.body);
    res.status(201).json(category);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: { code: 'DUPLICATE', message: 'Category already exists' } });
    }
    throw err;
  }
});

router.put('/:id', validateBody(updateCategorySchema), (req, res) => {
  const category = categoryService.updateCategory(Number(req.params.id), req.body);
  if (!category) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Category not found' } });
  res.json(category);
});

router.delete('/:id', (req, res) => {
  const deleted = categoryService.deleteCategory(Number(req.params.id));
  if (!deleted) return res.status(400).json({ error: { code: 'CANNOT_DELETE', message: 'Cannot delete default categories' } });
  res.status(204).end();
});

export default router;
```

- [ ] **Step 3: Register route in index.ts**

Add to `packages/server/src/index.ts` before `errorHandler`:

```typescript
import categoriesRouter from './routes/categories.js';
app.use('/api/categories', categoriesRouter);
```

- [ ] **Step 4: Test with curl**

Run server, then:
```bash
curl http://127.0.0.1:3001/api/categories | jq
curl -X POST http://127.0.0.1:3001/api/categories -H 'Content-Type: application/json' -d '{"name":"Test","type":"expense"}' | jq
```
Expected: GET returns seeded categories. POST creates new category.

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/services/category.service.ts packages/server/src/routes/categories.ts packages/server/src/index.ts
git commit -m "feat: add categories CRUD API"
```

### Task 6: Transaction Service & Routes

**Files:**
- Create: `packages/server/src/services/transaction.service.ts`
- Create: `packages/server/src/routes/transactions.ts`
- Modify: `packages/server/src/index.ts` — register routes

- [ ] **Step 1: Create transaction.service.ts**

```typescript
import db from '../db/connection.js';
import type {
  Transaction, TransactionWithCategory, CreateTransactionDto,
  UpdateTransactionDto, TransactionFilters, PaginatedResult
} from '@finance-buddy/shared';

export function getTransactions(filters: TransactionFilters): PaginatedResult<TransactionWithCategory> {
  const { type, category_id, tag_id, start_date, end_date, search, page = 1, limit = 20 } = filters;

  let where = 'WHERE 1=1';
  const params: any[] = [];

  if (type) { where += ' AND t.type = ?'; params.push(type); }
  if (category_id) { where += ' AND t.category_id = ?'; params.push(category_id); }
  if (start_date) { where += ' AND t.date >= ?'; params.push(start_date); }
  if (end_date) { where += ' AND t.date <= ?'; params.push(end_date); }
  if (search) { where += ' AND (t.description LIKE ? OR t.notes LIKE ?)'; params.push(`%${search}%`, `%${search}%`); }
  if (tag_id) {
    where += ' AND t.id IN (SELECT transaction_id FROM transaction_tags WHERE tag_id = ?)';
    params.push(tag_id);
  }

  const countRow = db.prepare(`SELECT COUNT(*) as total FROM transactions t ${where}`).get(...params) as { total: number };
  const total = countRow.total;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;

  const rows = db.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    ${where}
    ORDER BY t.date DESC, t.created_at DESC
    LIMIT ? OFFSET ?
  `).all(...params, limit, offset) as TransactionWithCategory[];

  return { data: rows, total, page, limit, totalPages };
}

export function getTransactionById(id: number): TransactionWithCategory | undefined {
  return db.prepare(`
    SELECT t.*, c.name as category_name, c.color as category_color, c.icon as category_icon
    FROM transactions t
    LEFT JOIN categories c ON c.id = t.category_id
    WHERE t.id = ?
  `).get(id) as TransactionWithCategory | undefined;
}

export function createTransaction(dto: CreateTransactionDto): Transaction {
  const result = db.prepare(`
    INSERT INTO transactions (type, amount, date, description, notes, category_id)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(dto.type, dto.amount, dto.date, dto.description, dto.notes || null, dto.category_id || null);

  const id = Number(result.lastInsertRowid);

  if (dto.tag_ids?.length) {
    const insertTag = db.prepare('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');
    for (const tagId of dto.tag_ids) {
      insertTag.run(id, tagId);
    }
  }

  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
}

export function updateTransaction(id: number, dto: UpdateTransactionDto): Transaction | undefined {
  const existing = db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction | undefined;
  if (!existing) return undefined;

  db.prepare(`
    UPDATE transactions SET
      type = COALESCE(?, type),
      amount = COALESCE(?, amount),
      date = COALESCE(?, date),
      description = COALESCE(?, description),
      notes = COALESCE(?, notes),
      category_id = COALESCE(?, category_id),
      updated_at = datetime('now')
    WHERE id = ?
  `).run(
    dto.type || null, dto.amount || null, dto.date || null,
    dto.description || null, dto.notes !== undefined ? dto.notes || null : null,
    dto.category_id || null, id
  );

  if (dto.tag_ids !== undefined) {
    db.prepare('DELETE FROM transaction_tags WHERE transaction_id = ?').run(id);
    if (dto.tag_ids.length) {
      const insertTag = db.prepare('INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)');
      for (const tagId of dto.tag_ids) {
        insertTag.run(id, tagId);
      }
    }
  }

  return db.prepare('SELECT * FROM transactions WHERE id = ?').get(id) as Transaction;
}

export function deleteTransaction(id: number): boolean {
  const result = db.prepare('DELETE FROM transactions WHERE id = ?').run(id);
  return result.changes > 0;
}

export function bulkCreateTransactions(
  dtos: CreateTransactionDto[],
  source?: { csv_import_id?: number; ocr_upload_id?: number }
): number {
  const insert = db.prepare(`
    INSERT INTO transactions (type, amount, date, description, notes, category_id, csv_import_id, ocr_upload_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction(() => {
    let count = 0;
    for (const dto of dtos) {
      insert.run(
        dto.type, dto.amount, dto.date, dto.description,
        dto.notes || null, dto.category_id || null,
        source?.csv_import_id || null, source?.ocr_upload_id || null
      );
      count++;
    }
    return count;
  });

  return insertMany();
}
```

- [ ] **Step 2: Create transactions route**

```typescript
import { Router } from 'express';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { createTransactionSchema, updateTransactionSchema, transactionFiltersSchema } from '@finance-buddy/shared';
import * as txService from '../services/transaction.service.js';

const router = Router();

router.get('/', validateQuery(transactionFiltersSchema), (req, res) => {
  const filters = (req as any).validatedQuery;
  res.json(txService.getTransactions(filters));
});

router.get('/:id', (req, res) => {
  const tx = txService.getTransactionById(Number(req.params.id));
  if (!tx) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
  res.json(tx);
});

router.post('/', validateBody(createTransactionSchema), (req, res) => {
  const tx = txService.createTransaction(req.body);
  res.status(201).json(tx);
});

router.put('/:id', validateBody(updateTransactionSchema), (req, res) => {
  const tx = txService.updateTransaction(Number(req.params.id), req.body);
  if (!tx) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
  res.json(tx);
});

router.delete('/:id', (req, res) => {
  const deleted = txService.deleteTransaction(Number(req.params.id));
  if (!deleted) return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Transaction not found' } });
  res.status(204).end();
});

export default router;
```

- [ ] **Step 3: Register in index.ts**

```typescript
import transactionsRouter from './routes/transactions.js';
app.use('/api/transactions', transactionsRouter);
```

- [ ] **Step 4: Test with curl**

```bash
curl -X POST http://127.0.0.1:3001/api/transactions -H 'Content-Type: application/json' \
  -d '{"type":"expense","amount":8240,"date":"2026-03-14","description":"Whole Foods","category_id":2}' | jq
curl 'http://127.0.0.1:3001/api/transactions?page=1&limit=10' | jq
```

- [ ] **Step 5: Commit**

```bash
git add packages/server/src/services/transaction.service.ts packages/server/src/routes/transactions.ts packages/server/src/index.ts
git commit -m "feat: add transactions CRUD API with pagination and filters"
```

---

## Chunk 3: Categories + Transactions Client

### Task 7: API Hooks for Categories & Transactions

**Files:**
- Create: `packages/client/src/hooks/useCategories.ts`
- Create: `packages/client/src/hooks/useTransactions.ts`

- [ ] **Step 1: Create useCategories hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type { Category, CreateCategoryDto, UpdateCategoryDto } from '@finance-buddy/shared';

export function useCategories(type?: 'income' | 'expense') {
  return useQuery({
    queryKey: ['categories', type],
    queryFn: () => api.get<Category[]>('/categories', { params: type ? { type } : {} }).then(r => r.data),
  });
}

export function useCreateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCategoryDto) => api.post<Category>('/categories', dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useUpdateCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateCategoryDto & { id: number }) =>
      api.put<Category>(`/categories/${id}`, dto).then(r => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/categories/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['categories'] }),
  });
}
```

- [ ] **Step 2: Create useTransactions hook**

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import type {
  TransactionWithCategory, CreateTransactionDto, UpdateTransactionDto,
  TransactionFilters, PaginatedResult
} from '@finance-buddy/shared';

export function useTransactions(filters: TransactionFilters) {
  return useQuery({
    queryKey: ['transactions', filters],
    queryFn: () => api.get<PaginatedResult<TransactionWithCategory>>('/transactions', { params: filters }).then(r => r.data),
  });
}

export function useTransaction(id: number) {
  return useQuery({
    queryKey: ['transactions', id],
    queryFn: () => api.get<TransactionWithCategory>(`/transactions/${id}`).then(r => r.data),
    enabled: !!id,
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateTransactionDto) => api.post('/transactions', dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...dto }: UpdateTransactionDto & { id: number }) =>
      api.put(`/transactions/${id}`, dto).then(r => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['transactions'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/client/src/hooks/
git commit -m "feat: add React Query hooks for categories and transactions"
```

### Task 8: Transactions List Page

**Files:**
- Create: `packages/client/src/pages/Transactions.tsx`
- Modify: `packages/client/src/App.tsx` — replace placeholder

Use @frontend-design skill for this page. It should include:
- Header with "Add Transaction" button (links to /transactions/new)
- Filter bar: type toggle (All/Income/Expense), category dropdown, date range, search input
- Transaction table with columns: Date, Description, Category (with color dot), Amount (green/red), Actions
- Pagination controls at bottom

- [ ] **Step 1: Build Transactions page with filters and table**

Create `packages/client/src/pages/Transactions.tsx` using the hooks from Task 7. Wire up filters to useTransactions with state management. Use @frontend-design for polished styling.

- [ ] **Step 2: Update App.tsx to use Transactions page**

Replace the Transactions placeholder import with the real page component.

- [ ] **Step 3: Verify in browser**

Navigate to http://localhost:5173/transactions — should show empty state (no transactions yet), filters should render, pagination should work.

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/pages/Transactions.tsx packages/client/src/App.tsx
git commit -m "feat: add transactions list page with filters and pagination"
```

### Task 9: Transaction Form Page

**Files:**
- Create: `packages/client/src/pages/TransactionForm.tsx`
- Modify: `packages/client/src/App.tsx` — replace placeholder

Use @frontend-design skill. Form fields:
- Type toggle (Income/Expense) — styled toggle buttons
- Amount input (in dollars, convert to cents on submit)
- Category dropdown (filtered by selected type)
- Date picker (default today)
- Description text input
- Notes textarea (optional)
- Tag multi-select (for later, can be empty now)
- Submit button

Handles both create (/transactions/new) and edit (/transactions/:id/edit) via `useParams`.

- [ ] **Step 1: Build TransactionForm page**

Use react-hook-form with Zod resolver. On create: POST then redirect to /transactions. On edit: fetch existing via useTransaction, populate form, PUT on submit.

- [ ] **Step 2: Update App.tsx**

Replace TransactionForm placeholders.

- [ ] **Step 3: Test full CRUD flow**

Create a transaction, see it in the list, edit it, delete it.

- [ ] **Step 4: Commit**

```bash
git add packages/client/src/pages/TransactionForm.tsx packages/client/src/App.tsx
git commit -m "feat: add transaction create/edit form"
```

### Task 10: Settings Page — Categories Tab

**Files:**
- Create: `packages/client/src/pages/Settings.tsx`
- Modify: `packages/client/src/App.tsx`

Simple tabbed settings page (only Categories tab for now, more tabs added later). Lists all categories with add/edit/delete. Default categories show a lock icon and can only have color/icon edited.

- [ ] **Step 1: Build Settings page with categories management**
- [ ] **Step 2: Update App.tsx**
- [ ] **Step 3: Test category CRUD**
- [ ] **Step 4: Commit**

```bash
git add packages/client/src/pages/Settings.tsx packages/client/src/App.tsx
git commit -m "feat: add settings page with categories management"
```

---

## Chunk 4: Dashboard

### Task 11: Dashboard Service & Routes

**Files:**
- Create: `packages/server/src/services/dashboard.service.ts`
- Create: `packages/server/src/routes/dashboard.ts`
- Modify: `packages/server/src/index.ts`

Implement the four aggregation queries from the spec:
- `getSummary(month)` — total income, expenses, net, plus previous month for delta
- `getSpendingByCategory(month)` — expense breakdown with percentages
- `getMonthlyTrends(months)` — last N months income vs expenses
- `getBudgetHealth(month)` — budget progress (reused in Chunk 5)

Also trigger recurring transaction generation on dashboard load.

- [ ] **Step 1: Create dashboard.service.ts with SQL queries**

Use the SQL from the spec review agent's output. Each function runs one focused query.

- [ ] **Step 2: Create dashboard routes**

```typescript
router.get('/summary', ...);
router.get('/spending-by-category', ...);
router.get('/monthly-trends', ...);
router.get('/budget-health', ...);
```

- [ ] **Step 3: Register routes, test with curl**
- [ ] **Step 4: Commit**

### Task 12: Dashboard Client Page

**Files:**
- Create: `packages/client/src/hooks/useDashboard.ts`
- Create: `packages/client/src/pages/Dashboard.tsx`
- Create: `packages/client/src/components/charts/MonthlyTrendChart.tsx`
- Create: `packages/client/src/components/charts/CategoryDonut.tsx`
- Modify: `packages/client/src/App.tsx`

Use @frontend-design skill for the full dashboard. Implement the approved hybrid layout:
- Sidebar shows net income summary + savings goals (placeholder until Phase 7)
- Main area: 4 summary cards → trend chart + donut → budget bars + recent transactions
- Month picker at top for historical viewing

- [ ] **Step 1: Create useDashboard hooks**
- [ ] **Step 2: Create chart wrapper components with Recharts**
- [ ] **Step 3: Build full Dashboard page**
- [ ] **Step 4: Test with sample data**
- [ ] **Step 5: Commit**

---

## Chunk 5: Budgets

### Task 13: Budget Service & Routes

**Files:**
- Create: `packages/server/src/services/budget.service.ts`
- Create: `packages/server/src/routes/budgets.ts`
- Modify: `packages/server/src/index.ts`

CRUD + copy-forward + spending joins per spec.

- [ ] **Steps: service → routes → register → test → commit**

### Task 14: Budgets Client Page

**Files:**
- Create: `packages/client/src/hooks/useBudgets.ts`
- Create: `packages/client/src/pages/Budgets.tsx`
- Modify: `packages/client/src/App.tsx`

Use @frontend-design. Month picker, budget cards with progress bars (green/yellow/red), add/edit budget modal, copy-forward button.

- [ ] **Steps: hooks → page → test → commit**

---

## Chunk 6: Recurring Transactions

### Task 15: Recurring Service & Routes

**Files:**
- Create: `packages/server/src/services/recurring.service.ts`
- Create: `packages/server/src/routes/recurring.ts`
- Modify: `packages/server/src/index.ts` — register + call generate on startup

Key logic: `generateRecurringTransactions()` iterates active templates, calculates due dates using date-fns, creates missing transactions, updates `last_generated`. Called on startup and on `POST /api/recurring/generate`.

- [ ] **Steps: service with date-fns logic → routes → startup hook → test → commit**

### Task 16: Recurring Templates in Settings

**Files:**
- Modify: `packages/client/src/pages/Settings.tsx` — add Recurring tab
- Create: `packages/client/src/hooks/useRecurring.ts`

- [ ] **Steps: hooks → settings tab → test → commit**

---

## Chunk 7: CSV Import

### Task 17: CSV Service & Routes

**Files:**
- Create: `packages/server/src/services/csv.service.ts`
- Create: `packages/server/src/routes/csv.ts`
- Modify: `packages/server/src/index.ts`

Upload: multer + papaparse + file hash. Confirm: column mapping + amount parsing + bulk insert + audit record.

- [ ] **Steps: service → routes with multer → register → test with sample CSV → commit**

### Task 18: CSV Import Wizard Client

**Files:**
- Create: `packages/client/src/pages/Import.tsx`
- Modify: `packages/client/src/App.tsx`

4-step wizard: FileUpload → ColumnMapper → ImportPreview → ConfirmResult. Use @frontend-design for polished stepper UI.

- [ ] **Steps: wizard component → step components → test full flow → commit**

---

## Chunk 8: Investments + Savings Goals

### Task 19: Investment Service, Routes & Client

**Files:**
- Create: `packages/server/src/services/investment.service.ts`
- Create: `packages/server/src/routes/investments.ts`
- Create: `packages/client/src/hooks/useInvestments.ts`
- Create: `packages/client/src/pages/Investments.tsx`
- Create: `packages/client/src/pages/InvestmentDetail.tsx`

CRUD + value updates with snapshots + portfolio summary. Client: overview grid + detail page with Recharts line chart for value history.

- [ ] **Steps: service → routes → hooks → pages → test → commit**

### Task 20: Savings Goals Service, Routes & Client

**Files:**
- Create: `packages/server/src/services/savings-goal.service.ts`
- Create: `packages/server/src/routes/savings-goals.ts`
- Create: `packages/client/src/hooks/useSavingsGoals.ts`
- Create: `packages/client/src/pages/SavingsGoals.tsx`
- Modify: `packages/client/src/components/ui/AppShell.tsx` — sidebar savings widget

Goals CRUD + contributions CRUD. Client: goals page with progress bars + sidebar widget showing top goals.

- [ ] **Steps: service → routes → hooks → page → sidebar widget → test → commit**

---

## Chunk 9: OCR Import + Tags + Data Export + Polish

### Task 21: OCR Import

**Files:**
- Create: `packages/server/src/services/ocr.service.ts`
- Create: `packages/server/src/routes/ocr.ts`
- Modify: `packages/client/src/pages/Import.tsx` — add OCR tab

Server: Tesseract.js + regex parsing. Client: upload → review editable table → confirm.

- [ ] **Steps: service → routes → client OCR tab → test with sample image → commit**

### Task 22: Tags

**Files:**
- Create: `packages/server/src/services/tag.service.ts`
- Create: `packages/server/src/routes/tags.ts`
- Create: `packages/client/src/hooks/useTags.ts`
- Modify: `packages/client/src/pages/Settings.tsx` — add Tags tab
- Modify: `packages/client/src/pages/TransactionForm.tsx` — add tag selector
- Modify: `packages/client/src/pages/Transactions.tsx` — add tag filter

- [ ] **Steps: service → routes → hooks → settings tab → form integration → filter → commit**

### Task 23: Data Export

**Files:**
- Create: `packages/server/src/routes/export.ts`
- Modify: `packages/client/src/pages/Settings.tsx` — add Data Management tab

Three endpoints: CSV export, JSON export, SQLite backup download. Settings tab with download buttons.

- [ ] **Steps: routes → settings tab → test downloads → commit**

### Task 24: Polish Pass

- [ ] **Step 1: Add empty states to all pages** (no transactions, no budgets, etc.)
- [ ] **Step 2: Add loading skeletons** using TailwindCSS animate-pulse
- [ ] **Step 3: Add confirmation dialogs** for delete actions
- [ ] **Step 4: Responsive design pass** — sidebar collapses on mobile
- [ ] **Step 5: Error toast notifications** for failed API calls
- [ ] **Step 6: Final commit**

```bash
git commit -m "feat: add polish — empty states, loading, confirmations, responsive"
```
