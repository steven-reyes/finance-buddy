# Finance Buddy

A personal finance management web application that helps you track income, expenses, investments, and savings goals to maintain a net-positive monthly balance. All data is stored locally on your machine for maximum privacy.

## Features

- **Dashboard** - At-a-glance view of net income, spending by category (donut chart), monthly income vs expense trends (bar chart), budget health, and recent transactions. Month picker for historical viewing.
- **Transaction Management** - Full CRUD for income and expense entries. Filter by type, category, date range, and search text. Paginated list view with color-coded amounts.
- **Budget Tracking** - Set monthly spending limits per category. Visual progress bars turn green/yellow/red as you approach and exceed limits. Copy budgets forward month-to-month.
- **Investment Tracking** - Track investment accounts (401k, IRA, brokerage, HSA, crypto). Update values to create historical snapshots. View portfolio summary and per-account value history charts.
- **Savings Goals** - Create goals with target amounts and deadlines. Track contributions with an audit trail. Progress bars show how close you are.
- **Recurring Transactions** - Define templates for salary, rent, subscriptions, etc. The system auto-generates transactions on server startup and dashboard load.
- **CSV Import** - 4-step wizard: upload file, map columns (supports debit/credit splits, date format detection, amount parsing), preview with duplicate warnings, confirm.
- **Screenshot/OCR Import** - Upload photos of receipts or bank statements. Tesseract OCR extracts text, regex heuristics parse dollar amounts, dates, and descriptions. Review and edit extracted transactions in an editable table before confirming import.
- **Tags** - Create custom tags (e.g., "tax-deductible", "shared-expense") and assign them to transactions. Filter transactions by tag.
- **Data Export** - Export transactions as CSV, full database as JSON, or download the raw SQLite backup file.
- **19 Default Categories** - Pre-seeded expense categories (Rent, Groceries, Utilities, Transportation, Entertainment, Dining Out, Healthcare, Insurance, Subscriptions, Clothing, Education, Personal Care, Other) and income categories (Salary, Freelance, Interest/Dividends, Gifts, Refunds, Other Income). Add your own custom categories.

## Tech Stack

### Backend
| Technology | Purpose |
|-----------|---------|
| Python 3.12+ | Runtime |
| FastAPI 0.115 | Web framework with automatic OpenAPI docs |
| Pydantic 2.10 | Request/response validation |
| SQLite (built-in) | Database with WAL mode and foreign key enforcement |
| Uvicorn 0.32 | ASGI server |
| python-multipart | File upload handling (CSV/image import) |
| pytesseract 0.3.13 | Python wrapper for Tesseract OCR engine |
| Pillow 11.0 | Image processing for OCR input |

### Frontend
| Technology | Purpose |
|-----------|---------|
| React 18 | UI framework |
| TypeScript 5.7 | Type safety |
| Vite 5.4 | Build tool and dev server |
| TailwindCSS 3.4 | Utility-first CSS (dark theme) |
| Recharts 2.13 | Charts (bar, pie, line) |
| React Query 5.60 | Server state management and caching |
| React Router 6.28 | Client-side routing |
| React Hook Form 7.53 | Form state management |
| Zod 3.24 | Frontend validation schemas |
| Lucide React | Icon set |
| Axios | HTTP client |
| date-fns | Date formatting |

## Prerequisites

- **Python 3.12+** - [python.org](https://www.python.org/downloads/)
- **Node.js 18+** - [nodejs.org](https://nodejs.org/)
- **npm** (comes with Node.js)
- **Tesseract OCR** (optional, for screenshot import):
  - Ubuntu/Debian: `sudo apt install tesseract-ocr`
  - macOS: `brew install tesseract`
  - Windows: [Download installer](https://github.com/UB-Mannheim/tesseract/wiki)
  - The app works without Tesseract — the screenshot import tab will show install instructions if it's missing

## Quick Start

### 1. Clone the repository

```bash
git clone <your-repo-url> finance-buddy
cd finance-buddy
```

### 2. Set up the backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Linux/macOS
# venv\Scripts\activate         # Windows
pip install -r requirements.txt
```

### 3. Set up the frontend

```bash
cd frontend
npm install
```

### 4. Run the application

Open **two terminals**:

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 3001 --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

### 5. Open the app

Navigate to **http://localhost:5173** in your browser.

The backend API is available at http://127.0.0.1:3001. The frontend dev server automatically proxies all `/api/*` requests to the backend.

## Project Structure

```
finance-buddy/
├── backend/                          # Python/FastAPI backend
│   ├── requirements.txt              # Python dependencies
│   ├── venv/                         # Python virtual environment (gitignored)
│   └── app/
│       ├── main.py                   # FastAPI app entry, CORS, router registration
│       ├── database.py               # SQLite connection, migrations, seed data
│       ├── migrations/
│       │   ├── 001_initial.sql       # Full database schema (12 tables)
│       │   └── 002_ocr_confirmed_status.sql  # Add 'confirmed' status to ocr_uploads
│       ├── models/                   # Pydantic models for validation
│       │   ├── category.py
│       │   ├── transaction.py
│       │   ├── budget.py
│       │   ├── investment.py
│       │   ├── savings_goal.py
│       │   ├── tag.py
│       │   ├── recurring.py
│       │   └── dashboard.py
│       ├── services/                 # Business logic and SQL queries
│       │   ├── category_service.py
│       │   ├── transaction_service.py
│       │   ├── budget_service.py
│       │   ├── investment_service.py
│       │   ├── savings_goal_service.py
│       │   ├── tag_service.py
│       │   ├── recurring_service.py
│       │   ├── dashboard_service.py
│       │   ├── csv_service.py
│       │   └── ocr_service.py        # Tesseract OCR + regex parsing
│       └── routes/                   # API endpoint definitions
│           ├── categories.py
│           ├── transactions.py
│           ├── budgets.py
│           ├── investments.py
│           ├── savings_goals.py
│           ├── tags.py
│           ├── recurring.py
│           ├── dashboard.py
│           ├── csv_import.py
│           ├── ocr.py                # Screenshot/image OCR import
│           └── export.py
├── frontend/                         # React/TypeScript frontend
│   ├── package.json
│   ├── vite.config.ts                # Vite config with API proxy
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   ├── index.html
│   └── src/
│       ├── main.tsx                  # App entry with React Query + Router
│       ├── App.tsx                   # Route definitions
│       ├── index.css                 # Tailwind imports
│       ├── components/
│       │   └── ui/
│       │       └── AppShell.tsx      # Sidebar layout with navigation (responsive, mobile hamburger menu)
│       ├── hooks/                    # React Query hooks for every API domain
│       │   ├── useCategories.ts
│       │   ├── useTransactions.ts
│       │   ├── useBudgets.ts
│       │   ├── useInvestments.ts
│       │   ├── useSavingsGoals.ts
│       │   ├── useTags.ts
│       │   ├── useRecurring.ts
│       │   └── useDashboard.ts
│       ├── lib/
│       │   ├── api.ts                # Axios instance with error interceptor
│       │   └── format.ts            # formatCents, formatDate, toCents, toDollars
│       ├── types/                    # TypeScript interfaces matching backend models
│       │   ├── index.ts
│       │   ├── category.ts
│       │   ├── transaction.ts
│       │   ├── budget.ts
│       │   ├── investment.ts
│       │   ├── savings.ts
│       │   ├── tag.ts
│       │   ├── recurring.ts
│       │   └── dashboard.ts
│       └── pages/                    # Route-level page components
│           ├── Dashboard.tsx
│           ├── Transactions.tsx
│           ├── TransactionForm.tsx
│           ├── Budgets.tsx
│           ├── Investments.tsx
│           ├── InvestmentDetail.tsx
│           ├── SavingsGoals.tsx
│           ├── Import.tsx
│           └── Settings.tsx
├── data/                             # SQLite database file (gitignored)
│   └── finance-buddy.db
└── docs/
    └── superpowers/
        ├── specs/
        │   └── 2026-03-14-finance-buddy-design.md
        └── plans/
            └── 2026-03-14-finance-buddy.md
```

## Database Schema

SQLite database with 12 tables:

| Table | Purpose |
|-------|---------|
| `categories` | Income/expense categories with color and icon. 19 defaults seeded. UNIQUE(name, type). |
| `transactions` | All income and expense entries. Amounts in cents. Links to category, recurring template, CSV import. |
| `recurring_templates` | Templates for auto-generating transactions. Supports weekly, biweekly, monthly, quarterly, yearly. |
| `budgets` | Monthly spending limits per category. UNIQUE(category_id, month). Default warn threshold at 80%. |
| `investments` | Investment accounts (401k, IRA, brokerage, HSA, crypto, other). Tracks contributions and current value. |
| `investment_snapshots` | Value history for each investment. Created on every value update. CASCADE on delete. |
| `savings_goals` | Target amounts with optional deadlines. Progress computed from contributions. |
| `savings_goal_contributions` | Audit trail for goal deposits/withdrawals. Optional link to transaction. |
| `tags` | Custom labels for transactions. |
| `transaction_tags` | Many-to-many junction. CASCADE on both sides. |
| `csv_imports` | Audit trail for CSV imports with file hash for duplicate detection. |
| `ocr_uploads` | Tracks uploaded images for OCR processing. Stores raw extracted text, parsed transaction data, and processing status (pending/processed/confirmed/failed). |
| `_migrations` | Tracks applied SQL migration files. |

### Conventions
- All monetary amounts stored as **positive integers in cents** (e.g., $19.99 = 1999)
- The `type` field (`income`/`expense`) determines sign in calculations
- Dates stored as ISO strings: `YYYY-MM-DD` for dates, `YYYY-MM` for months
- Foreign keys enforced via `PRAGMA foreign_keys = ON`
- WAL mode enabled for concurrent read performance

## API Reference

The backend exposes a REST API at `http://127.0.0.1:3001/api`. FastAPI auto-generates interactive docs at:

- **Swagger UI:** http://127.0.0.1:3001/docs
- **ReDoc:** http://127.0.0.1:3001/redoc

### Endpoints Summary

#### Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List all (optional `?type=income\|expense`) |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/{id}` | Update category |
| DELETE | `/api/categories/{id}` | Delete (non-default only) |

#### Transactions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions` | List with filters: `type`, `category_id`, `tag_id`, `start_date`, `end_date`, `search`, `page`, `limit` |
| GET | `/api/transactions/{id}` | Get single with category info and tags |
| POST | `/api/transactions` | Create (amount in cents, `tag_ids` optional) |
| PUT | `/api/transactions/{id}` | Update |
| DELETE | `/api/transactions/{id}` | Delete |
| POST | `/api/transactions/bulk` | Bulk create (used by CSV/OCR import) |
| POST | `/api/transactions/{id}/tags` | Set tags for a transaction (replaces existing) |

#### Budgets
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budgets?month=YYYY-MM` | List for month with spending calculations |
| POST | `/api/budgets` | Create budget |
| PUT | `/api/budgets/{id}` | Update limit or threshold |
| DELETE | `/api/budgets/{id}` | Delete |
| POST | `/api/budgets/copy-forward` | Auto-detect most recent month with budgets and copy to `{ target_month }` |

#### Investments
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/investments` | List all accounts |
| GET | `/api/investments/{id}` | Get with recent snapshots |
| POST | `/api/investments` | Create account |
| PUT | `/api/investments/{id}` | Update details |
| PUT | `/api/investments/{id}/value` | Update value (creates snapshot) |
| DELETE | `/api/investments/{id}` | Delete with snapshots |
| GET | `/api/investments/{id}/snapshots` | Value history |
| GET | `/api/investments/summary` | Portfolio totals |

#### Savings Goals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/savings-goals` | List all with computed progress |
| POST | `/api/savings-goals` | Create goal |
| PUT | `/api/savings-goals/{id}` | Update goal |
| DELETE | `/api/savings-goals/{id}` | Delete (cascades contributions) |
| GET | `/api/savings-goals/{id}/contributions` | List contributions |
| POST | `/api/savings-goals/{id}/contributions` | Add contribution |
| DELETE | `/api/savings-goals/{id}/contributions/{cid}` | Remove contribution |

#### Tags
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tags` | List all |
| POST | `/api/tags` | Create tag |
| PUT | `/api/tags/{id}` | Update name/color |
| DELETE | `/api/tags/{id}` | Delete (cascades) |

#### Recurring Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/recurring` | List all templates |
| POST | `/api/recurring` | Create template |
| PUT | `/api/recurring/{id}` | Update template |
| DELETE | `/api/recurring/{id}` | Delete (generated transactions remain) |
| POST | `/api/recurring/generate` | Manually trigger generation |

#### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary?month=YYYY-MM` | Income, expenses, net, transaction count |
| GET | `/api/dashboard/spending-by-category?month=YYYY-MM` | Expense breakdown with percentages |
| GET | `/api/dashboard/monthly-trends?months=6` | Last N months income vs expenses |
| GET | `/api/dashboard/budget-health?month=YYYY-MM` | Budget progress with status |

#### CSV Import
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/csv/upload` | Upload CSV file, returns headers + preview rows |
| POST | `/api/csv/confirm` | Apply column mapping and bulk insert |

#### OCR Import
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ocr/status` | Check if Tesseract OCR is available on the system |
| POST | `/api/ocr/upload` | Upload image (JPG/PNG), run OCR, return extracted transaction candidates |
| POST | `/api/ocr/confirm` | Confirm and import edited transactions from OCR extraction |

#### Data Export
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export/transactions?format=csv` | Export all transactions as CSV |
| GET | `/api/export/all?format=json` | Export entire database as JSON (all tables including csv_imports, ocr_uploads) |
| GET | `/api/export/backup` | Download raw SQLite file |

### Error Response Format

All errors return a consistent envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of what went wrong"
  }
}
```

## Frontend Pages

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Summary cards, monthly trend chart, spending donut, budget health bars, recent transactions |
| `/transactions` | Transactions | Filterable, searchable, paginated transaction list with add/edit/delete |
| `/transactions/new` | Add Transaction | Form with type toggle, dollar amount, category, date, description, notes, tag selector |
| `/transactions/{id}/edit` | Edit Transaction | Same form pre-populated with existing data |
| `/budgets` | Budgets | Month picker, budget cards with color-coded progress bars, add/copy-forward |
| `/investments` | Investments | Portfolio summary banner, investment account cards with gain/loss |
| `/investments/{id}` | Investment Detail | Value history line chart, update value form |
| `/savings-goals` | Savings Goals | Goal cards with progress bars, add contributions, contribution history |
| `/import` | Import | Tabbed: CSV import (4-step wizard) and Screenshot/OCR import (3-step wizard) |
| `/settings` | Settings | Tabbed: Categories, Recurring Templates, Tags, Data Export |

## UX Polish

- **Empty states** - Every page shows a helpful message with a call-to-action button when no data exists (e.g., "No transactions yet. Add your first transaction to get started.")
- **Loading skeletons** - Animated pulse placeholders on Dashboard, Transactions, Budgets, Investments, Savings Goals, and Settings while data loads
- **Error banners** - Red error messages displayed inline when API mutations fail (create, update, delete)
- **Confirm dialogs** - All destructive actions (delete transaction, budget, investment, goal, category, tag) prompt for confirmation
- **Responsive design** - Sidebar collapses on mobile with hamburger menu toggle, backdrop overlay, and auto-close on navigation
- **Dark theme** - Consistent dark UI (gray-950 background, gray-900 cards, blue/green/red accents)

## Security

- Backend binds to `127.0.0.1` only (not accessible from network)
- No authentication (personal local app, not exposed to internet)
- All data stored in a local SQLite file
- No external API calls or cloud services
- No telemetry or analytics

## Data Storage

All financial data is stored in `data/finance-buddy.db` (a single SQLite file). This file is gitignored.

### Backup

- Use the **Settings > Data** tab to download a backup of the SQLite file
- Or manually copy `data/finance-buddy.db` to a safe location
- Export all data as JSON: `GET /api/export/all?format=json`
- Export transactions as CSV: `GET /api/export/transactions?format=csv`

### Reset

To start fresh, delete the database file:

```bash
rm data/finance-buddy.db
```

The next time you start the backend, it will create a fresh database with default categories.

## Development

### Backend

```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 3001 --reload
```

The `--reload` flag enables auto-restart on file changes. API docs available at http://127.0.0.1:3001/docs.

### Frontend

```bash
cd frontend
npm run dev
```

Vite provides hot module replacement (HMR) for instant updates. The proxy in `vite.config.ts` forwards `/api/*` to the backend.

### Adding a Migration

1. Create a new SQL file in `backend/app/migrations/` (e.g., `002_add_column.sql`)
2. Write your DDL/DML statements
3. Restart the backend — migrations run automatically on startup
4. Applied migrations are tracked in the `_migrations` table

### Build for Production

```bash
# Frontend
cd frontend
npm run build    # Output in frontend/dist/

# Backend
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 3001
```

Serve the frontend build with any static file server, or configure the backend to serve it.

## License

This is a personal project, not intended for commercial use.
