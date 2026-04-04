# Finance Buddy — Setup & User Guide

A personal finance app that helps you track income, expenses, investments, and savings goals. All data is stored locally on your machine — nothing is sent to the cloud.

## What You Can Do

- **Dashboard** - See your net income, spending by category, monthly trends, budget health, recent transactions, upcoming bills, and insights at a glance.
- **Transactions** - Add, edit, and filter income and expenses. Auto-categorization suggests categories as you type. Duplicate detection prevents accidental double entries.
- **Budgets** - Set monthly spending limits with a Smart Wizard that allocates budgets using proven frameworks (50/30/20, 70/20/10, or custom). Budgets auto-create for new months.
- **Investments** - Track 401k, IRA, brokerage, HSA, and crypto accounts with portfolio summary and value history charts.
- **Savings Goals** - Set target amounts with deadlines and track contributions. 10 preset categories (Emergency Fund, Vacation, Down Payment, etc.).
- **Debt Tracker** - Track all debts with a paycheck planner, payoff strategies (avalanche/snowball), "What if" simulator, progress charts, and exportable reports.
- **Recurring** - Set up templates for salary, rent, and subscriptions. Transactions are auto-generated so you never forget to log them.
- **Import** - Upload bank CSV files or take photos of receipts and bank screenshots. The app extracts and categorizes transactions for you.
- **Bank Sync** - Connect your bank via SimpleFIN Bridge ($1.50/mo) to automatically pull in account balances and transactions.
- **Tags** - Label transactions (e.g., "tax-deductible") and filter by tag.
- **Export** - Download your transactions as CSV, full database as JSON, or a raw backup file.

## What You Need to Install

- **Python 3.12+** - Download from [python.org](https://www.python.org/downloads/)
- **Node.js 18+** - Download from [nodejs.org](https://nodejs.org/) (npm comes included)
- **Tesseract OCR** *(optional — only needed for receipt/screenshot import)*:
  - Mac: `brew install tesseract`
  - Windows: [Download installer](https://github.com/UB-Mannheim/tesseract/wiki)
  - The app works fine without it — the screenshot import tab will show instructions if it's missing

## Setup (One-Time)

### Step 1: Download the app

```bash
git clone https://github.com/steven-reyes/finance-buddy.git
cd finance-buddy
```

### Step 2: Install backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows
pip install -r requirements.txt
```

### Step 3: Install frontend

```bash
cd frontend
npm install
```

That's it — you only do this once.

## Running the App

Open **two terminal windows**:

**Terminal 1 — Backend:**
```bash
cd backend
source venv/bin/activate
python -m uvicorn app.main:app --host 127.0.0.1 --port 3001 --reload
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

Then open **http://localhost:5173** in your browser.

## Connecting Your Bank (Optional)

You can connect your bank to automatically pull in transactions using SimpleFIN Bridge.

### How to Connect

1. Go to [SimpleFIN Bridge](https://beta-bridge.simplefin.org/) and sign up ($1.50/month, paid to SimpleFIN)
2. Go to **Financial Institutions** and add your bank. Wait for the status to show as active (can take a few minutes).
3. Go to **Apps** > **New Connection** and copy the setup token
4. In Finance Buddy, go to **Bank Sync** in the sidebar
5. Paste the token and click **Connect**
6. Click **Sync Now** to pull your accounts and transactions
7. Review the synced transactions, then click **Import** to add them to your main transaction list

> **You only enter the token once.** Your connection persists across app restarts. If you disconnect and want to reconnect later, generate a new token from SimpleFIN.

### Privacy

- Finance Buddy never sees your bank login credentials — SimpleFIN handles that
- All data stays on your computer
- SimpleFIN provides read-only access — no one can make payments or transfers through the app

## Your Data

All your financial data is stored in a single file on your computer: `data/finance-buddy.db`

### Backing Up

- Go to **Settings > Data** and click the backup/export buttons
- Or manually copy the `data/finance-buddy.db` file to a safe location

### Starting Fresh

Delete the database file and restart the app:

```bash
rm data/finance-buddy.db
```

The app will create a fresh database with default categories on next startup.

## Security

- The app only runs on your computer (not accessible from the internet)
- No accounts or passwords — it's your personal tool
- No data is sent anywhere except SimpleFIN during bank sync (if you set it up)
- No tracking or analytics
