# API Reference

The backend exposes a REST API at `http://127.0.0.1:3001/api`. FastAPI auto-generates interactive docs at:

- **Swagger UI:** http://127.0.0.1:3001/docs
- **ReDoc:** http://127.0.0.1:3001/redoc

## Endpoints

### Categories
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/categories` | List all (optional `?type=income\|expense`) |
| POST | `/api/categories` | Create category |
| PUT | `/api/categories/{id}` | Update category |
| DELETE | `/api/categories/{id}` | Delete (non-default only) |

### Transactions
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/transactions` | List with filters: `type`, `category_id`, `tag_id`, `start_date`, `end_date`, `search`, `page`, `limit`, `sort_by` (date/amount/description/category), `sort_order` (asc/desc). Returns `filtered_income`, `filtered_expenses`, `filtered_net` totals. |
| GET | `/api/transactions/{id}` | Get single with category info and tags |
| POST | `/api/transactions` | Create (amount in cents, `tag_ids` optional) |
| PUT | `/api/transactions/{id}` | Update |
| DELETE | `/api/transactions/{id}` | Delete |
| POST | `/api/transactions/bulk` | Bulk create (used by CSV/OCR import) |
| POST | `/api/transactions/{id}/tags` | Set tags for a transaction (replaces existing) |
| GET | `/api/transactions/suggest-category?description=...` | Auto-suggest category based on past transactions with similar descriptions. Returns category with confidence level (high/medium) |
| GET | `/api/transactions/check-duplicates?amount=&description=&date=` | Check for potential duplicate transactions (same amount + similar description within 3 days) |
| POST | `/api/transactions/bulk-delete` | Bulk delete transactions by ID list. Body: `[id1, id2, ...]` |

### Budgets
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/budgets?month=YYYY-MM` | List for month with spending calculations |
| POST | `/api/budgets` | Create budget |
| PUT | `/api/budgets/{id}` | Update limit or threshold |
| DELETE | `/api/budgets/{id}` | Delete |
| POST | `/api/budgets/bulk` | Bulk create budgets for a month (used by Smart Budget Wizard). Body: `{ month, budgets: [{ category_id, limit_amount }] }` |
| POST | `/api/budgets/copy-forward` | Auto-detect most recent month with budgets and copy to `{ target_month }` |

### Investments
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

### Savings Goals
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/savings-goals` | List all with computed progress |
| POST | `/api/savings-goals` | Create goal |
| PUT | `/api/savings-goals/{id}` | Update goal |
| DELETE | `/api/savings-goals/{id}` | Delete (cascades contributions) |
| GET | `/api/savings-goals/{id}/contributions` | List contributions |
| POST | `/api/savings-goals/{id}/contributions` | Add contribution |
| DELETE | `/api/savings-goals/{id}/contributions/{cid}` | Remove contribution |

### Tags
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tags` | List all |
| POST | `/api/tags` | Create tag |
| PUT | `/api/tags/{id}` | Update name/color |
| DELETE | `/api/tags/{id}` | Delete (cascades) |

### Recurring Templates
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/recurring` | List all templates |
| POST | `/api/recurring` | Create template |
| PUT | `/api/recurring/{id}` | Update template |
| DELETE | `/api/recurring/{id}` | Delete (generated transactions remain) |
| POST | `/api/recurring/generate` | Manually trigger generation |
| POST | `/api/recurring/bulk` | Bulk create templates (used by Quick Setup Wizard). Body: `{ templates: [{ type, amount, description, category_id, frequency, start_date }] }` |

### Dashboard
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/dashboard/summary?month=YYYY-MM` | Income, expenses, net, transaction count |
| GET | `/api/dashboard/spending-by-category?month=YYYY-MM` | Expense breakdown with percentages |
| GET | `/api/dashboard/monthly-trends?months=6` | Last N months income vs expenses |
| GET | `/api/dashboard/budget-health?month=YYYY-MM` | Budget progress with status |
| GET | `/api/dashboard/detect-income` | Auto-detect monthly income from recurring templates (monthly/biweekly/weekly/yearly) or average of last 3 months of income transactions |
| GET | `/api/dashboard/month-comparison?month=YYYY-MM` | Per-category spending comparison vs previous month with change amounts and percentages |
| GET | `/api/dashboard/insights?month=YYYY-MM` | Auto-generated insights: net status, category spending changes, budget tracking, savings goal progress |

### CSV Import
| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/csv/upload` | Upload CSV file, returns headers + preview rows |
| POST | `/api/csv/confirm` | Apply column mapping and bulk insert |

### Debts
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

### OCR Import
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

### SimpleFIN Bank Sync
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/simplefin/status` | Connection status and account count |
| POST | `/api/simplefin/setup` | Connect with setup token from SimpleFIN Bridge. Body: `{ "setup_token": "..." }` |
| POST | `/api/simplefin/sync` | Trigger manual sync of accounts and transactions from SimpleFIN |
| GET | `/api/simplefin/accounts` | List linked bank accounts with balances |
| GET | `/api/simplefin/transactions` | List synced transactions. Query params: `account_id`, `imported` (bool), `start_date`, `end_date`, `page`, `per_page` |
| POST | `/api/simplefin/import` | Import a single synced transaction. Body: `{ "transaction_id": 1, "category_id": null }` |
| POST | `/api/simplefin/import-all` | Bulk import all unimported transactions. Body: `{ "account_id": null, "default_category_id": null }` |
| DELETE | `/api/simplefin/connections/{id}` | Disconnect a SimpleFIN connection |

### Data Export
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/export/transactions?format=csv` | Export transactions as CSV. Supports optional filters: `type`, `category_id`, `start_date`, `end_date`, `search` |
| GET | `/api/export/all?format=json` | Export entire database as JSON (all tables including csv_imports, ocr_uploads) |
| GET | `/api/export/backup` | Download raw SQLite file |

## Error Response Format

All errors return a consistent envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Description of what went wrong"
  }
}
```
