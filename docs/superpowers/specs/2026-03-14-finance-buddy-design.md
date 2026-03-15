# Finance Buddy — Design Specification

## Overview

Finance Buddy is a personal finance management web application that helps users track income, expenses, investments, and savings goals to maintain a net-positive monthly balance. All data is stored locally for maximum privacy.

## Conventions

- **Amounts**: Always stored as positive integers in cents. The `type` field ('income'/'expense') determines sign in calculations. Validated: amount > 0.
- **Dates**: Stored as ISO text 'YYYY-MM-DD'. Months as 'YYYY-MM'.
- **Currency**: USD hardcoded for MVP. Currency symbol configurable later.
- **Security**: Express binds to `127.0.0.1` only (not `0.0.0.0`). No auth for MVP since local-only.
- **Error responses**: Standard envelope: `{ error: { code: string, message: string, details?: unknown } }` with appropriate HTTP status codes.
- **Foreign key enforcement**: `PRAGMA foreign_keys = ON` set on every connection.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Platform | Web app | Works on any device, rich UI for charts/dashboards |
| Frontend | React + TypeScript (Vite) | Large ecosystem, charting libraries, type safety |
| Backend | Express + TypeScript | Lightweight, pairs well with React, good for local apps |
| Database | SQLite (better-sqlite3) | Local-only, zero config, fast, single file |
| Architecture | Monorepo (npm workspaces) | Clean separation of client/server/shared with shared types |
| Data input | Manual entry + CSV import + Screenshot OCR | Balance of convenience and privacy |
| Storage | Local only | Maximum privacy, zero hosting costs |
| Design quality | High — use frontend-design skill during implementation | User explicitly requested polished, non-generic UI |

## Data Model

### categories
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT NOT NULL | |
| type | TEXT NOT NULL | 'income' or 'expense' |
| color | TEXT | Hex color for charts |
| icon | TEXT | Emoji or icon name |
| is_default | INTEGER | 1 for system defaults, 0 for user-created |
| UNIQUE | (name, type) | Same name allowed across income/expense |

### transactions
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| type | TEXT NOT NULL | 'income' or 'expense' |
| amount | INTEGER NOT NULL | Stored in cents |
| date | TEXT NOT NULL | ISO date YYYY-MM-DD |
| description | TEXT NOT NULL | |
| notes | TEXT | Optional |
| category_id | INTEGER FK | References categories.id ON DELETE SET NULL |
| recurring_template_id | INTEGER FK | NULL if not from recurring, ON DELETE SET NULL |
| csv_import_id | INTEGER FK | NULL if not from CSV import, ON DELETE SET NULL |
| ocr_upload_id | INTEGER FK | NULL if not from OCR, ON DELETE SET NULL |
| created_at | TEXT | ISO timestamp |
| updated_at | TEXT | ISO timestamp |

### recurring_templates
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| type | TEXT NOT NULL | 'income' or 'expense' |
| amount | INTEGER NOT NULL | Cents |
| description | TEXT NOT NULL | |
| category_id | INTEGER FK | References categories.id |
| frequency | TEXT NOT NULL | 'weekly', 'biweekly', 'monthly', 'quarterly', 'yearly' |
| start_date | TEXT NOT NULL | ISO date |
| end_date | TEXT | NULL = no end |
| last_generated | TEXT | Last date a transaction was generated for |
| is_active | INTEGER | 1 or 0 |

### budgets
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| category_id | INTEGER FK | References categories.id |
| month | TEXT NOT NULL | 'YYYY-MM' |
| limit_amount | INTEGER NOT NULL | Cents |
| warn_threshold | INTEGER NOT NULL DEFAULT 80 | Percentage 1-100 to trigger warning |
| UNIQUE | (category_id, month) | One budget per category per month |

### investments
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT NOT NULL | e.g., "Fidelity 401k" |
| type | TEXT NOT NULL | '401k', 'ira', 'brokerage', 'hsa', 'crypto', 'other' |
| institution | TEXT | e.g., "Fidelity" |
| contributions | INTEGER | Total contributions in cents |
| current_value | INTEGER | Current value in cents |
| notes | TEXT | |
| last_updated | TEXT | ISO timestamp |

### investment_snapshots
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| investment_id | INTEGER FK | References investments.id ON DELETE CASCADE |
| value | INTEGER NOT NULL | Cents |
| contributions | INTEGER | Cumulative contributions at this point |
| recorded_at | TEXT NOT NULL | ISO timestamp |

### savings_goals
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT NOT NULL | e.g., "Emergency Fund" |
| target_amount | INTEGER NOT NULL | Cents |
| current_amount | INTEGER NOT NULL | Cents, computed from contributions |
| deadline | TEXT | ISO date, optional |
| icon | TEXT | Emoji |
| is_completed | INTEGER | 1 or 0 |

### savings_goal_contributions
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| goal_id | INTEGER FK | References savings_goals.id ON DELETE CASCADE |
| amount | INTEGER NOT NULL | Cents (positive = deposit, negative = withdrawal) |
| date | TEXT NOT NULL | ISO date |
| note | TEXT | Optional description |
| transaction_id | INTEGER FK | Optional link to a transaction, ON DELETE SET NULL |

### tags
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT NOT NULL | Unique |
| color | TEXT | Hex color |

### transaction_tags
| Column | Type | Notes |
|--------|------|-------|
| transaction_id | INTEGER FK | References transactions.id ON DELETE CASCADE |
| tag_id | INTEGER FK | References tags.id ON DELETE CASCADE |
| PRIMARY KEY | (transaction_id, tag_id) | Junction table |

### csv_imports
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| filename | TEXT NOT NULL | Original filename |
| file_hash | TEXT | SHA-256 of file content for duplicate detection |
| row_count | INTEGER | Number of rows imported |
| column_mapping | TEXT | JSON of the mapping used |
| imported_at | TEXT | ISO timestamp |

### ocr_uploads
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| filename | TEXT NOT NULL | |
| raw_text | TEXT | OCR-extracted text |
| extracted_data | TEXT | JSON of parsed transactions |
| status | TEXT | 'pending', 'processed', 'failed' |
| uploaded_at | TEXT | ISO timestamp |

### _migrations
| Column | Type | Notes |
|--------|------|-------|
| id | INTEGER PK | Auto-increment |
| name | TEXT NOT NULL | Migration filename |
| applied_at | TEXT | ISO timestamp |

## REST API

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/transactions | List with filters (type, category, date range, search, tag) + pagination |
| GET | /api/transactions/:id | Get single |
| POST | /api/transactions | Create |
| PUT | /api/transactions/:id | Update |
| DELETE | /api/transactions/:id | Delete |
| POST | /api/transactions/bulk | Bulk create (from CSV/OCR import) |

### Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/categories | List all (optionally filter by type) |
| POST | /api/categories | Create |
| PUT | /api/categories/:id | Update |
| DELETE | /api/categories/:id | Delete (only non-default) |

### Budgets
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/budgets?month=YYYY-MM | List for month with spending data |
| POST | /api/budgets | Create/upsert |
| PUT | /api/budgets/:id | Update |
| DELETE | /api/budgets/:id | Delete |
| POST | /api/budgets/copy-forward | Copy budgets from most recent month that has them to target month. Body: `{ targetMonth: "YYYY-MM" }`. Skips categories that already have a budget in target month. |

### Investments
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/investments | List all accounts |
| GET | /api/investments/:id | Get with recent snapshots |
| POST | /api/investments | Create |
| PUT | /api/investments/:id | Update |
| PUT | /api/investments/:id/value | Update current value + contributions (creates snapshot with cumulative values). Body: `{ currentValue: number, contributions?: number }` |
| DELETE | /api/investments/:id | Delete with snapshots |
| GET | /api/investments/:id/snapshots | Value history |
| GET | /api/investments/summary | Total portfolio summary |

### Savings Goals
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/savings-goals | List all (with computed current_amount from contributions) |
| POST | /api/savings-goals | Create |
| PUT | /api/savings-goals/:id | Update (name, target, deadline, icon) |
| DELETE | /api/savings-goals/:id | Delete (cascades contributions) |
| GET | /api/savings-goals/:id/contributions | List contributions for a goal |
| POST | /api/savings-goals/:id/contributions | Add a contribution (amount, date, note, optional transaction_id) |
| DELETE | /api/savings-goals/:id/contributions/:cid | Remove a contribution |

### Data Export
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/export/transactions?format=csv | Export all transactions as CSV |
| GET | /api/export/all?format=json | Export entire database as JSON (all tables) |
| GET | /api/export/backup | Download raw SQLite database file |

### Tags
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/tags | List all |
| POST | /api/tags | Create |
| PUT | /api/tags/:id | Update name/color |
| DELETE | /api/tags/:id | Delete (cascades to transaction_tags) |
| POST | /api/transactions/:id/tags | Set tags for a transaction |

### Recurring Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/recurring | List all |
| POST | /api/recurring | Create |
| PUT | /api/recurring/:id | Update |
| DELETE | /api/recurring/:id | Delete (generated transactions remain) |
| POST | /api/recurring/generate | Trigger generation of due transactions |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | /api/dashboard/summary?month=YYYY-MM | Income, expenses, net for month |
| GET | /api/dashboard/spending-by-category?month=YYYY-MM | Category breakdown |
| GET | /api/dashboard/monthly-trends?months=12 | Last N months income vs expenses |
| GET | /api/dashboard/budget-health?month=YYYY-MM | Budget progress for month |

### CSV Import
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/csv/upload | Upload CSV, returns parsed headers + preview rows |
| POST | /api/csv/confirm | Apply column mapping, bulk insert, return summary |

### OCR Import
| Method | Path | Description |
|--------|------|-------------|
| POST | /api/ocr/upload | Upload image, run Tesseract, return extracted data |
| POST | /api/ocr/confirm | Confirm extracted transactions, bulk insert |

## Pages & Routing

```
/                          → Dashboard
/transactions              → Transaction list with filters
/transactions/new          → Add transaction form
/transactions/:id/edit     → Edit transaction form
/budgets                   → Budget management with progress bars
/investments               → Investment accounts overview
/investments/:id           → Investment detail with value history chart
/savings-goals             → Savings goals with progress
/import                    → Multi-step import wizard (CSV + OCR)
/settings                  → Categories, recurring templates, tags, import history, data management
```

## Dashboard Layout

Hybrid layout combining two approaches:

**Sidebar (persistent):**
- App logo and navigation links
- Net income summary card (income, expenses, net)
- Savings goals with progress bars

**Main area:**
- Row 1: 4 summary cards (Income, Expenses, Investments, Total Saved) with month-over-month delta
- Row 2: Monthly trend bar chart (income vs expenses, 6 months) + spending by category donut chart
- Row 3: Budget progress bars (top categories) + recent transactions list

## Key User Flows

### Adding a Transaction
Transactions page → "Add" button → navigates to `/transactions/new` (dedicated page, not modal — supports direct linking and responsive design) → form with type toggle, amount, category, date, description, tags → save → redirect to transactions list → budget progress updates → dashboard refreshes

### CSV Import (4-step wizard)
1. **Upload**: Drag-and-drop or file picker → server parses with PapaParse → checks file_hash against csv_imports for duplicate detection → returns headers + preview rows (+ warning if same file was imported before)
2. **Map Columns**: User maps CSV columns to fields (date, amount, description, category) via dropdowns. Supports: separate debit/credit columns, "invert sign" toggle for banks that export expenses as positive, date format selector (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD auto-detected), amount parsing (strips currency symbols, handles commas, parenthesized negatives)
3. **Preview**: Shows first 20 rows as they'll be imported → highlights potential duplicates (matching date+amount+description) in yellow → user verifies
4. **Confirm**: Bulk insert in single SQLite transaction → success summary with count + duplicate warnings + any validation errors

### Screenshot OCR Import
Scope: Supports single receipts (one total amount + merchant + date) and simple bank statement screenshots (tabular rows of transactions). Not intended for complex multi-page documents.
1. **Upload**: Select image (JPG/PNG) → server runs Tesseract.js → extracts raw text
2. **Parse**: Server applies regex heuristics to extract: dollar amounts (`$X.XX`), dates (common formats), and surrounding text as descriptions. Returns structured candidates.
3. **Review**: Parsed transactions shown in editable table → user corrects/removes/adds entries → each row has type, amount, date, description, category fields
4. **Confirm**: Approved transactions bulk inserted

### Recurring Transaction Generation
- Templates define amount, category, frequency, start date
- On server startup: generates all missed transactions since last generation
- On dashboard load: triggers generation check (handles long-running server)
- Manual trigger via `POST /api/recurring/generate` for on-demand generation
- `last_generated` field ensures idempotency (no duplicates)

### Budget Alerts
- When transaction is added, check category budget for current month
- If spending > warn_threshold% of limit → yellow warning
- If spending > 100% of limit → red over-budget indicator
- Dashboard shows budget health summary

## Tech Stack

### Server (packages/server)
| Library | Purpose |
|---------|---------|
| express | HTTP server |
| better-sqlite3 | SQLite driver |
| multer | File upload handling |
| papaparse | CSV parsing |
| tesseract.js | OCR for screenshot import |
| date-fns | Date arithmetic |
| zod | Request validation |
| cors | CORS middleware (dev) |
| tsx | TypeScript execution (dev) |

### Client (packages/client)
| Library | Purpose |
|---------|---------|
| react + react-dom | UI framework |
| react-router-dom | Client-side routing |
| react-hook-form + @hookform/resolvers | Form management |
| zod | Form validation (shared schemas) |
| recharts | Charts (pie, bar, area, line) |
| @tanstack/react-query | Server state, caching, refetching |
| tailwindcss | Utility-first CSS |
| lucide-react | Icons |
| axios | HTTP client |
| date-fns | Date formatting |

### Shared (packages/shared)
| Library | Purpose |
|---------|---------|
| zod | Validation schemas shared between client and server |

## Project Structure

```
finance-buddy/
├── packages/
│   ├── client/
│   │   ├── src/
│   │   │   ├── components/       # Reusable UI components
│   │   │   │   ├── ui/           # Base components (Button, Card, Modal, etc.)
│   │   │   │   ├── charts/       # Chart wrapper components
│   │   │   │   └── forms/        # Form field components
│   │   │   ├── pages/            # Route-level page components
│   │   │   │   ├── Dashboard.tsx
│   │   │   │   ├── Transactions.tsx
│   │   │   │   ├── TransactionForm.tsx
│   │   │   │   ├── Budgets.tsx
│   │   │   │   ├── Investments.tsx
│   │   │   │   ├── InvestmentDetail.tsx
│   │   │   │   ├── SavingsGoals.tsx
│   │   │   │   ├── Import.tsx
│   │   │   │   └── Settings.tsx
│   │   │   ├── hooks/            # Custom hooks (useTransactions, useBudgets, etc.)
│   │   │   ├── lib/              # API client, utilities
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── index.html
│   │   ├── tailwind.config.ts
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   ├── server/
│   │   ├── src/
│   │   │   ├── db/
│   │   │   │   ├── connection.ts  # SQLite singleton
│   │   │   │   ├── migrate.ts     # Migration runner
│   │   │   │   └── seed.ts        # Default categories
│   │   │   ├── migrations/
│   │   │   │   └── 001_initial.sql
│   │   │   ├── routes/
│   │   │   │   ├── transactions.ts
│   │   │   │   ├── categories.ts
│   │   │   │   ├── budgets.ts
│   │   │   │   ├── investments.ts
│   │   │   │   ├── savings-goals.ts
│   │   │   │   ├── tags.ts
│   │   │   │   ├── recurring.ts
│   │   │   │   ├── dashboard.ts
│   │   │   │   ├── csv.ts
│   │   │   │   └── ocr.ts
│   │   │   ├── services/
│   │   │   │   ├── transaction.service.ts
│   │   │   │   ├── category.service.ts
│   │   │   │   ├── budget.service.ts
│   │   │   │   ├── investment.service.ts
│   │   │   │   ├── savings-goal.service.ts
│   │   │   │   ├── tag.service.ts
│   │   │   │   ├── recurring.service.ts
│   │   │   │   ├── dashboard.service.ts
│   │   │   │   ├── csv.service.ts
│   │   │   │   └── ocr.service.ts
│   │   │   ├── middleware/
│   │   │   │   └── validate.ts    # Zod validation middleware
│   │   │   └── index.ts           # Express app entry
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── shared/
│       ├── src/
│       │   ├── types/             # TypeScript interfaces
│       │   │   ├── transaction.ts
│       │   │   ├── category.ts
│       │   │   ├── budget.ts
│       │   │   ├── investment.ts
│       │   │   ├── savings-goal.ts
│       │   │   ├── tag.ts
│       │   │   ├── recurring.ts
│       │   │   └── dashboard.ts
│       │   ├── schemas/           # Zod validation schemas
│       │   │   ├── transaction.schema.ts
│       │   │   ├── category.schema.ts
│       │   │   ├── budget.schema.ts
│       │   │   ├── investment.schema.ts
│       │   │   ├── savings-goal.schema.ts
│       │   │   ├── tag.schema.ts
│       │   │   └── recurring.schema.ts
│       │   └── index.ts
│       ├── tsconfig.json
│       └── package.json
├── data/                          # SQLite database file (gitignored)
├── .gitignore
├── package.json                   # Workspace root
├── tsconfig.base.json
└── README.md
```

## Implementation Phases

### Phase 1: Foundation
- Initialize monorepo with npm workspaces
- Set up packages/shared with types and Zod schemas
- Set up packages/server: Express, SQLite connection, migration runner, seed default categories
- Set up packages/client: Vite + React + TailwindCSS + React Router, AppShell with sidebar
- Configure Vite proxy to forward /api requests to Express server

### Phase 2: Categories + Transactions
- Server: categories CRUD routes and service
- Server: transactions CRUD with pagination and filters
- Client: Categories management in Settings
- Client: Transactions list page with filters and search
- Client: Transaction add/edit form with react-hook-form

### Phase 3: Dashboard
- Server: Dashboard aggregation endpoints (summary, spending-by-category, monthly-trends)
- Client: Dashboard page with Recharts widgets
- Summary cards, trend chart, category donut, recent transactions

### Phase 4: Budgets
- Server: Budgets CRUD with spending calculation joins
- Client: Budgets page with visual progress bars
- Client: Budget alerts (yellow at threshold, red when over)
- Client: Budget health widget on dashboard

### Phase 5: Recurring Transactions
- Server: Recurring templates CRUD
- Server: Generation logic with date-fns frequency calculations
- Server: Auto-generate on startup
- Client: Recurring templates management in Settings

### Phase 6: CSV Import
- Server: CSV upload endpoint with PapaParse + preview
- Server: CSV confirm endpoint with bulk insert
- Client: 4-step import wizard (upload → map → preview → confirm)
- Import history tracking and undo capability

### Phase 7: Investments + Savings Goals
- Server: Investment accounts CRUD with snapshots
- Client: Investments overview + detail page with value history chart
- Server: Savings goals CRUD
- Client: Savings goals page + sidebar widget
- Dashboard investment summary widget

### Phase 8: OCR Import
- Server: Tesseract.js integration for image processing
- Server: Text parsing to extract amounts, dates, descriptions
- Client: OCR upload + review/edit + confirm flow

### Phase 9: Tags
- Server: Tags CRUD + transaction_tags junction
- Client: Tag management in Settings
- Client: Tag selector in transaction form
- Client: Filter by tag in transaction list

### Phase 10: Polish
- Error handling and user-friendly error messages
- Empty states for all pages
- Confirmation dialogs for destructive actions
- Data export (JSON/CSV)
- Responsive design pass
- Loading states and skeleton screens

## Default Seed Categories

**Expense:** Rent/Mortgage, Groceries, Utilities, Transportation, Entertainment, Dining Out, Healthcare, Insurance, Subscriptions, Clothing, Education, Personal Care, Other Expense

**Income:** Salary, Freelance, Interest/Dividends, Gifts, Refunds, Other Income

## Configuration

- Server port: 3001
- Client dev port: 5173
- Vite proxies /api/* to localhost:3001
- SQLite DB: data/finance-buddy.db
- Dev command: `npm run dev` (uses concurrently to run both)
- Build command: `npm run build` (builds shared → server → client)
