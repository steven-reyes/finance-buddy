# Finance Buddy

A personal finance management web application that helps you track income, expenses, investments, and savings goals to maintain a net-positive monthly balance. All data is stored locally on your machine for maximum privacy.

## Features

- **Dashboard** - At-a-glance view of net income, spending by category (donut chart), monthly income vs expense trends (bar chart), budget health, and recent transactions. Month picker for historical viewing. **Spending alerts** banner for near/over-budget categories. **Monthly insights** with auto-generated tips (spending changes, net status, goal progress). **Quick add** inline transaction form. **Upcoming bills** widget showing recurring expenses due in the next 7 days. **Month-over-month comparison** per-category spending deltas.
- **Transaction Management** - Full CRUD for income and expense entries. Filter by type, category, tag, date range, and search text. Paginated list view with color-coded amounts. **Auto-categorize** suggests categories based on past transactions as you type descriptions. **Duplicate detection** warns when a similar transaction already exists (same amount within 3 days).
- **Budget Tracking** - Set monthly spending limits per category. Visual progress bars turn green/yellow/red as you approach and exceed limits. Copy budgets forward month-to-month. **Smart Budget Wizard** auto-detects your income (from recurring templates or transaction history) and allocates budgets using proven frameworks (50/30/20, 70/20/10, 60/20/20, or custom percentages). Categories are pre-sorted into Needs/Wants/Savings tiers with editable amounts. Budget Summary Bar shows income vs budgeted vs remaining at a glance. **Auto-rebalancing** detects when your income changes (>5%) and offers one-click proportional scaling of all budgets. **Auto-budget for new months** — navigating to a month with no budgets auto-creates them using your saved framework, so you only need to set up once.
- **Investment Tracking** - Track investment accounts (401k, IRA, brokerage, HSA, crypto). Update values to create historical snapshots. View portfolio summary and per-account value history charts.
- **Savings Goals** - Create goals with target amounts and deadlines. Track contributions with an audit trail. Progress bars show how close you are. 10 preset goal categories (Emergency Fund, Vacation, Down Payment, Car, Education, Wedding, Home Improvement, Debt Payoff, Retirement, Custom) with auto-assigned icons and colors.
- **Recurring Transactions** - Define templates for salary, rent, subscriptions, etc. The system auto-generates transactions on server startup and dashboard load. **Quick Setup Wizard** guides you through common income sources (salary, freelance) and expenses (rent, utilities, insurance, subscriptions like Netflix/Spotify with pre-filled prices) in a 3-step checklist flow. Shows net income summary before creating all templates at once.
- **Debt Tracker** - Track all debts: cash advances (Chime, Dave), personal loans (friends, family), credit cards, overdue bills (rent, utilities), medical, and other. Auto-assigns priority (housing=1, advance=2, loan=3, credit card=4, personal=5). Log payments to reduce balances — auto-marks as paid off when balance reaches zero. **Paycheck Planner** shows a waterfall visualization of where every dollar goes in priority order (auto-deductions first, then housing, utilities, minimums, essentials for food/transport, extra debt payment, buffer) with shortfall warnings when the paycheck doesn't cover all obligations. **Payoff calculator** with avalanche (highest interest first) and snowball (smallest balance first) strategies showing estimated debt-free date. **Smart insights**: debt-to-income ratio, advance cycle cost, housing risk alerts. **Interactive**: expenses auto-match to debt creditors for one-click payment logging, "What if" simulator for exploring extra payment scenarios, paycheck arrival prompts on dashboard, due date alerts with urgency color-coding. **Motivational**: debt balance over time chart (see the line go down), progress banner with payoff percentage, celebration banners when debts hit $0, debt-free countdown ("X months until debt-free"), exportable/printable debt report for sharing with case workers or personal records.
- **CSV Import** - 4-step wizard: upload file, map columns (supports debit/credit splits, date format detection, amount parsing), preview with duplicate warnings, confirm.
- **Screenshot/OCR Import** - Upload photos of receipts, bank statements, or banking app screenshots. Tesseract OCR extracts text with image preprocessing (auto-rotate, contrast enhancement, dark mode inversion, upscaling). Smart parsing detects document type (receipt vs statement), filters totals/subtotals/tax/balance lines, handles round dollar amounts ($12, $1,200), signed amounts (-$82.40, +$2,600), and parenthesized negatives (82.40). Auto-detects income (deposits, "paid you") vs expenses. Deduplicates against existing transactions. Auto-suggests categories from history. Review and edit in an editable table before confirming.
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
| Pillow 11.0 | Image processing (grayscale, contrast, rotation, dark mode inversion) |
| numpy | Pixel brightness analysis for dark mode detection |

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
│       │   ├── 002_ocr_confirmed_status.sql  # Add 'confirmed' status to ocr_uploads
│       │   └── 003_debts.sql                # Debts + debt_payments tables
│       ├── models/                   # Pydantic models for validation
│       │   ├── category.py
│       │   ├── transaction.py
│       │   ├── budget.py
│       │   ├── investment.py
│       │   ├── savings_goal.py
│       │   ├── tag.py
│       │   ├── recurring.py
│       │   ├── dashboard.py
│       │   └── debt.py               # Debt + DebtPayment + PaycheckAllocation models
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
│       │   ├── ocr_service.py        # Tesseract OCR + image preprocessing + smart parsing
│       │   └── debt_service.py       # Debt CRUD, payoff calculator, paycheck allocator
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
│           ├── debts.py              # Debt tracker + paycheck planner
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
│       │   ├── useDashboard.ts
│       │   └── useDebts.ts           # Debt CRUD, payments, summary, payoff, allocate hooks
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
│       │   ├── dashboard.ts
│       │   └── debt.ts               # Debt, DebtPayment, DebtSummary, PayoffPlan, PaycheckAllocation
│       └── pages/                    # Route-level page components
│           ├── Dashboard.tsx
│           ├── Transactions.tsx
│           ├── TransactionForm.tsx
│           ├── Budgets.tsx
│           ├── Investments.tsx
│           ├── InvestmentDetail.tsx
│           ├── SavingsGoals.tsx
│           ├── Import.tsx
│           ├── Debts.tsx              # Debt tracker, paycheck planner, payoff strategy
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
| `debts` | Tracks all debts: advance, personal, credit card, loan, bill arrears, medical. Priority 1-10 (1=housing critical). Includes creditor, balance, minimum payment, interest rate, auto-deduct flag, status (active/paid_off/paused). |
| `debt_payments` | Payment log for debts. Each payment reduces the debt balance. CASCADE on delete. Links optionally to a transaction. |
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
| GET | `/api/transactions/suggest-category?description=...` | Auto-suggest category based on past transactions with similar descriptions. Returns category with confidence level (high/medium) |
| GET | `/api/transactions/check-duplicates?amount=&description=&date=` | Check for potential duplicate transactions (same amount + similar description within 3 days) |

#### Budgets
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budgets?month=YYYY-MM` | List for month with spending calculations |
| POST | `/api/budgets` | Create budget |
| PUT | `/api/budgets/{id}` | Update limit or threshold |
| DELETE | `/api/budgets/{id}` | Delete |
| POST | `/api/budgets/bulk` | Bulk create budgets for a month (used by Smart Budget Wizard). Body: `{ month, budgets: [{ category_id, limit_amount }] }` |
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
| POST | `/api/recurring/bulk` | Bulk create templates (used by Quick Setup Wizard). Body: `{ templates: [{ type, amount, description, category_id, frequency, start_date }] }` |

#### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary?month=YYYY-MM` | Income, expenses, net, transaction count |
| GET | `/api/dashboard/spending-by-category?month=YYYY-MM` | Expense breakdown with percentages |
| GET | `/api/dashboard/monthly-trends?months=6` | Last N months income vs expenses |
| GET | `/api/dashboard/budget-health?month=YYYY-MM` | Budget progress with status |
| GET | `/api/dashboard/detect-income` | Auto-detect monthly income from recurring templates (monthly/biweekly/weekly/yearly) or average of last 3 months of income transactions |
| GET | `/api/dashboard/month-comparison?month=YYYY-MM` | Per-category spending comparison vs previous month with change amounts and percentages |
| GET | `/api/dashboard/insights?month=YYYY-MM` | Auto-generated insights: net status, category spending changes, budget tracking, savings goal progress |

#### CSV Import
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/csv/upload` | Upload CSV file, returns headers + preview rows |
| POST | `/api/csv/confirm` | Apply column mapping and bulk insert |

#### Debts
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/debts` | List all debts (optional `?status=active\|paid_off\|paused`), ordered by priority |
| GET | `/api/debts/summary` | Total owed, minimum monthly, interest cost, debts by priority |
| GET | `/api/debts/payoff-plan?strategy=avalanche\|snowball` | Payoff timeline with estimated debt-free date per strategy |
| POST | `/api/debts/allocate` | Paycheck allocation in priority order. Body: `{ paycheck_amount, pay_date }`. Returns waterfall with shortfall warnings |
| GET | `/api/debts/insights` | Smart tips: debt-to-income ratio, advance cycle cost, housing risk alerts |
| GET | `/api/debts/match-creditor?description=...` | Match expense description to active debt creditor for auto-linking payments |
| GET | `/api/debts/simulate?extra_monthly=X&strategy=Y` | "What if" payoff simulation with extra monthly payment |
| GET | `/api/debts/upcoming-due?days=7` | Debts with due dates in the next N days, sorted by urgency |
| GET | `/api/debts/balance-history` | Total debt balance over time (for progress chart) |
| GET | `/api/debts/progress` | Payoff progress: total paid, percentage, paid-off count, countdown, recently paid-off |
| GET | `/api/debts/report` | Full exportable report: summary, progress, payoff plan, all debts with payment histories |
| GET | `/api/debts/{id}` | Single debt with payment history |
| POST | `/api/debts` | Create debt (auto-assigns priority from type) |
| PUT | `/api/debts/{id}` | Update debt (balance, status, priority, etc.) |
| DELETE | `/api/debts/{id}` | Delete debt (cascades payments) |
| POST | `/api/debts/{id}/payments` | Log a payment (reduces balance, auto-marks paid_off at zero) |
| GET | `/api/debts/{id}/payments` | List payment history for a debt |

#### OCR Import
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/ocr/status` | Check if Tesseract OCR is available on the system |
| POST | `/api/ocr/upload` | Upload image (JPG/PNG). Preprocesses (grayscale, contrast, auto-rotate, dark mode invert), runs OCR, detects document type (receipt/statement), parses amounts with dedup, auto-categorizes, flags duplicates |
| POST | `/api/ocr/confirm` | Confirm and import edited transactions from OCR extraction |

**Supported screenshot formats:**
- Banking app screenshots (Chase, BofA, Wells Fargo, etc.) — handles `Mar 14` dates without year, +/- signed amounts, round dollars
- Credit card statements — detects "Payment - Thank You" as income
- Store receipts — filters subtotals/tax/totals, keeps line items only
- Venmo/Cash App — "paid you" = income, "You paid" = expense
- Dark mode screenshots — auto-inverts for OCR readability
- Rotated phone photos — auto-corrects via EXIF data

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
| `/` | Dashboard | Summary cards, spending alerts, monthly insights, quick add form, monthly trend chart, spending donut, month-over-month comparison, budget health bars, recent transactions, upcoming bills, paycheck arrival prompt for debt allocation, debt due date alerts |
| `/transactions` | Transactions | Filterable, searchable, paginated transaction list with add/edit/delete |
| `/transactions/new` | Add Transaction | Form with type toggle, dollar amount, category, date, description, notes, tag selector, auto-categorize suggestions, duplicate detection warnings, debt creditor matching with one-click payment logging |
| `/transactions/{id}/edit` | Edit Transaction | Same form pre-populated with existing data |
| `/budgets` | Budgets | Month picker, budget cards with color-coded progress bars, add/copy-forward, Smart Setup Wizard (income detection + framework selection + auto-allocation), Budget Summary Bar, income change alert with one-click rebalance, auto-budget for new months |
| `/investments` | Investments | Portfolio summary banner, investment account cards with gain/loss |
| `/investments/{id}` | Investment Detail | Value history line chart, update value form |
| `/savings-goals` | Savings Goals | Goal cards with progress bars, add contributions, contribution history |
| `/debts` | Debts | Progress banner with payoff %, celebrations, debt-free countdown, balance over time chart, summary cards, paycheck planner waterfall, debt cards with payments, payoff strategy (avalanche/snowball), "What if" simulator, export/print report, download JSON |
| `/import` | Import | Tabbed: CSV import (4-step wizard for bank statement CSVs) and Screenshot/OCR import (3-step wizard for photos of receipts, bank screenshots, credit card statements) |
| `/settings` | Settings | Tabbed: Categories, Recurring Templates (with Quick Setup Wizard), Tags, Data Export |

## Debt Tracker & Paycheck Planner

Designed for users in debt cycles — where paychecks are consumed by obligations before they arrive.

### Debt Types & Auto-Priority

| Type | Label | Auto-Priority | Example |
|------|-------|---------------|---------|
| `bill_arrears` | Overdue Bill | 1 (Critical) | Back rent, overdue ConEd |
| `advance` | Cash Advance | 2 | Chime SpotMe, Dave |
| `loan` | Loan | 3 | Auto loan, student loan |
| `credit_card` | Credit Card | 4 | Capital One, Chase |
| `personal` | Personal Loan | 5 | Money owed to friends/family |
| `medical` | Medical Debt | 6 | Hospital bills |
| `other` | Other | 7 | Miscellaneous |

Priority 1 = pay first (affects housing stability). Users can override priorities.

### Paycheck Planner

Enter your next paycheck amount and see a waterfall allocation:

1. **Auto-deductions** (taken before you see the money — Chime advances)
2. **Housing/Critical** (priority 1 debts — rent arrears)
3. **Utility arrears** (priority 2 — ConEd, phone, internet)
4. **Minimum payments** (all other active debts)
5. **Essentials** (food + transport — from budget data or $400 default)
6. **Extra payment** (toward highest-interest debt)
7. **Buffer** (what's left)

If the paycheck doesn't cover all obligations, shows a shortfall warning with the deficit amount and advice to prioritize housing and food.

### Payoff Strategies

- **Avalanche**: Pay minimums on all debts, put extra toward highest interest rate first. Saves the most money long-term.
- **Snowball**: Pay minimums on all debts, put extra toward smallest balance first. Provides faster psychological wins.

Both calculate month-by-month simulation with interest, showing estimated payoff date per debt and total debt-free date.

### Smart Debt Insights

- Debt-to-income ratio with interpretation
- "At current rate, debt-free by [date]"
- "Paying $X extra/month saves $Y in interest"
- Housing priority alerts when rent is unpaid
- Advance cycle cost estimation

### Interactive Features

**Debt-Aware Transactions:** When you add an expense and the description matches an active debt creditor (e.g., "T-Mobile" matches your T-Mobile overdue bill), the system prompts: "Log as debt payment too?" One click reduces the debt balance automatically.

**"What If" Simulator:** Interactive slider ($0-$500 extra/month in $25 steps) with live updates showing new debt-free date, months saved, and total interest saved. Quick-set buttons (+$25/+$50/+$100/+$200). Suggests specific subscriptions to cut from your recurring templates (e.g., "Cutting Netflix + Spotify = $27/mo → debt-free 3 months sooner").

**Paycheck Arrival Prompt:** When a large income transaction is detected in the last 3 days and you have active debts, the dashboard prompts: "You received $2,600. Allocate this paycheck to your debts?" One click opens the paycheck planner pre-filled with the amount.

**Debt Due Date Alerts:** Debts with upcoming due dates appear on the dashboard, color-coded by urgency (red = today/tomorrow, yellow = 2-3 days, gray = 4-7 days). High-balance priority-1 debts show a "CRITICAL" badge.

### Motivational Features

**Debt Balance Chart:** Recharts AreaChart showing total debt balance over time. Red gradient that shrinks as you pay down — visible, tangible progress.

**Progress Banner:** Always-visible banner at top of Debts page showing overall payoff percentage, "X of Y debts paid off", total dollars paid, and monthly debt reduction.

**Celebrations:** When a debt balance reaches $0, the system shows a celebration banner: "🎉 [Debt name] is PAID OFF!" Reinforces the wins that keep people motivated.

**Debt-Free Countdown:** Prominent display: "🎯 X months until debt-free (est. [date])". Updates as payments are made. Shows celebration when debt-free.

**Export/Print Report:** "Export Report" button generates a clean, white-background printable HTML page with full debt summary, progress, all debts with payment histories, and payoff timeline. Opens in new tab with auto-print dialog. "Download JSON" exports raw data. Designed for sharing with case workers, housing programs, or personal records.

## Smart Setup Wizards

Finance Buddy includes guided setup wizards that do the thinking for you. They work together as a pipeline:

**Recurring Quick Setup** → sets up income/expenses → **Budget Smart Setup** → auto-allocates from income → **New months auto-budget** → **Income changes trigger rebalance** → **Dashboard** → tracks actual vs budget

### Recurring Transactions Quick Setup (Settings > Recurring)

3-step wizard for common recurring income and expenses:

1. **Income** — Toggle on sources: Salary (monthly/biweekly), Freelance, Interest/Dividends. Enter amounts.
2. **Expenses** — Checklist of 16 common bills in 4 sections:
   - Housing & Utilities: Rent/Mortgage, Electric, Water, Gas, Internet, Phone
   - Insurance: Health, Car, Home/Renter's
   - Transportation: Car Payment, Gas/Fuel, Transit Pass
   - Subscriptions: Netflix ($15.99), Spotify ($10.99), Gym, Cloud Storage
3. **Review** — Monthly income vs expenses summary with net indicator. One-click "Create All Templates".

### Budget Smart Setup (Budgets page)

3-step wizard that auto-generates monthly budgets from detected income:

1. **Income Detection** — Auto-detects from recurring templates (monthly, biweekly, weekly, yearly frequencies) or averages last 3 months of income transactions. Manual override available.
2. **Framework Selection** — Choose a budgeting methodology:
   - 50/30/20 (Recommended): 50% Needs, 30% Wants, 20% Savings
   - 70/20/10 (Conservative): 70% Needs, 20% Savings, 10% Wants
   - 60/20/20 (Balanced): 60% Needs, 20% Wants, 20% Savings
   - Custom: Set your own percentages
3. **Review & Adjust** — Categories pre-allocated into tiers:
   - **Needs**: Rent/Mortgage (60%), Groceries (20%), Utilities (10%), Transportation (10%)
   - **Wants**: Dining Out, Entertainment, Subscriptions, Clothing, Personal Care
   - **Savings**: Target amount shown separately
   - All amounts editable. Running total vs income (green if under, red if over).

Budget Summary Bar shows Monthly Income, Total Budgeted, Remaining, and Savings Target at a glance.

### Smart Budget Lifecycle

After initial setup, the budget system runs automatically:

- **New month auto-budget**: When you navigate to a month with no budgets, the system auto-creates them using your saved framework (e.g., 50/30/20) and stored income. No need to re-run the wizard each month.
- **Income change detection**: Compares your current detected income (from recurring templates) against the income used in your last budget setup. If it changes by more than 5%, a yellow alert banner appears.
- **One-click rebalance**: The alert offers a "Rebalance Budgets" button that scales all budget amounts proportionally to the new income while keeping the same framework. For example, if income goes from $5,000 to $5,500 (+10%), all budgets increase by 10%.
- **Framework persistence**: Your chosen framework (50/30/20, etc.) and tier percentages are saved locally, so rebalancing and auto-budget use the same methodology you originally selected.
- **Manual override**: You can always dismiss the rebalance alert, manually edit individual budgets, or re-run the Smart Setup Wizard with different settings.

## Screenshot/OCR Import Pipeline

The OCR import processes uploaded images through a multi-stage pipeline:

1. **Image Preprocessing**
   - EXIF auto-rotation (corrects phone photo orientation)
   - Grayscale conversion
   - Contrast enhancement (1.5x) and sharpness enhancement (2.0x)
   - Dark mode detection (if average brightness < 128, image is inverted)
   - Low-res upscaling (images under 1000px width are enlarged)

2. **Text Extraction**
   - Tesseract OCR with `--oem 3 --psm 6` (assumes uniform block of text)

3. **Document Type Detection**
   - **Receipt**: Single merchant, line items with totals → keeps line items, filters totals/subtotals/tax
   - **Statement**: Multiple dated transactions → preserves all, deduplicates identical entries

4. **Amount Parsing**
   - Standard: `$12.99`, `$1,234.56`
   - Round dollars: `$12`, `$1,200` (no decimal required when `$` present)
   - Signed: `-$82.40` (expense), `+$2,600.00` (income)
   - Parenthesized: `(82.40)` treated as expense
   - Without dollar sign: `12.99` (decimal required)

5. **Income/Expense Detection**
   - `+` sign → income
   - `-` sign or `(amount)` → expense
   - Keywords: "deposit", "payroll", "paid you", "refund" → income
   - CC keywords: "Payment - Thank You", "autopay" → income (credit to account)
   - Default: expense

6. **Date Extraction**
   - With year: `03/14/2026`, `2026-03-14`, `March 14, 2026`
   - Without year: `Mar 14`, `03/14` (assumes current year — common in banking apps)
   - Falls back to today's date if no date found

7. **Deduplication**
   - Within results: identical amount + date + description collapsed
   - Against database: flags transactions matching existing entries (same amount within 3 days)

8. **Auto-Categorization**
   - Each extracted transaction is matched against past transaction descriptions
   - Falls back to merchant name matching
   - Suggested categories shown in the review UI (user can accept or change)

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
