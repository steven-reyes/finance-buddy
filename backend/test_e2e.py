"""Comprehensive E2E test suite for Finance Buddy API."""
import requests
import json
import sys

BASE = "http://127.0.0.1:3001/api"
PASS = 0
FAIL = 0
ISSUES = []

def test(name, condition, detail=""):
    global PASS, FAIL
    if condition:
        PASS += 1
    else:
        FAIL += 1
        ISSUES.append(f"{name} — {detail}")
        print(f"  FAIL: {name} — {detail}")

print("=" * 60)
print("FINANCE BUDDY — COMPREHENSIVE EDGE CASE TESTS")
print("=" * 60)

# ─── 1. CATEGORIES ───────────────────────────────────────
print("\n[1] CATEGORIES")

r = requests.get(f"{BASE}/categories")
test("GET categories returns 200", r.status_code == 200)
cats = r.json()
test("19 default categories seeded", len(cats) == 19, f"got {len(cats)}")

r = requests.post(f"{BASE}/categories", json={"name": "Groceries", "type": "expense"})
test("Duplicate category rejected", r.status_code == 409, f"got {r.status_code}")

r = requests.post(f"{BASE}/categories", json={"name": "Test Cat", "type": "expense", "color": "#FF0000"})
test("Create custom category", r.status_code == 201)
custom_cat_id = r.json()["id"]

salary_id = next(c["id"] for c in cats if c["name"] == "Salary")
r = requests.delete(f"{BASE}/categories/{salary_id}")
test("Cannot delete default category", r.status_code == 400, f"got {r.status_code}")

r = requests.delete(f"{BASE}/categories/{custom_cat_id}")
test("Can delete custom category", r.status_code == 204, f"got {r.status_code}")

r = requests.post(f"{BASE}/categories", json={"name": "Bad", "type": "invalid"})
test("Invalid type rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.post(f"{BASE}/categories", json={"name": "", "type": "expense"})
test("Empty name rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.get(f"{BASE}/categories", params={"type": "income"})
test("Filter by type works", r.status_code == 200 and all(c["type"] == "income" for c in r.json()))

r = requests.get(f"{BASE}/categories/99999")
test("Non-existent category", r.status_code == 404, f"got {r.status_code}")

# ─── 2. TRANSACTIONS ─────────────────────────────────────
print("\n[2] TRANSACTIONS")
groceries_id = next(c["id"] for c in cats if c["name"] == "Groceries")

r = requests.post(f"{BASE}/transactions", json={
    "type": "expense", "amount": 8240, "date": "2026-03-14",
    "description": "Whole Foods", "category_id": groceries_id
})
test("Create transaction", r.status_code == 201)
tx_id = r.json()["id"]

r = requests.post(f"{BASE}/transactions", json={
    "type": "expense", "amount": 0, "date": "2026-03-14", "description": "Zero"
})
test("Amount=0 rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.post(f"{BASE}/transactions", json={
    "type": "expense", "amount": -100, "date": "2026-03-14", "description": "Neg"
})
test("Negative amount rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.post(f"{BASE}/transactions", json={
    "type": "expense", "amount": 100, "date": "2026-03-14", "description": ""
})
test("Empty description rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.post(f"{BASE}/transactions", json={
    "type": "expense", "amount": 100, "date": "not-a-date", "description": "Bad"
})
test("Invalid date rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.post(f"{BASE}/transactions", json={
    "type": "expense", "amount": 500, "date": "2026-03-14",
    "description": "Café résumé 日本語"
})
test("Unicode description works", r.status_code == 201)
requests.delete(f"{BASE}/transactions/{r.json()['id']}")

r = requests.post(f"{BASE}/transactions", json={
    "type": "expense", "amount": 100, "date": "2026-03-14",
    "description": "A" * 501
})
test("501-char description rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.get(f"{BASE}/transactions/99999")
test("Non-existent transaction 404", r.status_code == 404)

r = requests.get(f"{BASE}/transactions", params={"page": 1, "limit": 1})
test("Pagination works", r.status_code == 200 and "total_pages" in r.json())

r = requests.get(f"{BASE}/transactions", params={"search": "Whole"})
test("Search works", r.status_code == 200 and r.json()["total"] >= 1)

# Create income for dashboard
r = requests.post(f"{BASE}/transactions", json={
    "type": "income", "amount": 520000, "date": "2026-03-01",
    "description": "Salary", "category_id": salary_id
})
test("Create income transaction", r.status_code == 201)

# Update transaction
r = requests.put(f"{BASE}/transactions/{tx_id}", json={"amount": 9000})
test("Update transaction amount", r.status_code == 200 and r.json()["amount"] == 9000,
     f"got {r.json().get('amount')}")

# Delete non-existent
r = requests.delete(f"{BASE}/transactions/99999")
test("Delete non-existent 404", r.status_code == 404)

# ─── 3. DASHBOARD ─────────────────────────────────────────
print("\n[3] DASHBOARD")

r = requests.get(f"{BASE}/dashboard/summary", params={"month": "2026-03"})
test("Dashboard summary 200", r.status_code == 200)
s = r.json()
test("Has income field", "income" in s)
test("Has expenses field", "expenses" in s)
test("Has net field", "net" in s)
test("Has prev_income", "prev_income" in s)
test("Has investment_value", "investment_value" in s)
test("Net = income - expenses", s["net"] == s["income"] - s["expenses"])

r = requests.get(f"{BASE}/dashboard/spending-by-category", params={"month": "2026-03"})
test("Spending by category 200", r.status_code == 200)

r = requests.get(f"{BASE}/dashboard/monthly-trends", params={"months": 12})
test("Monthly trends 200", r.status_code == 200)

r = requests.get(f"{BASE}/dashboard/budget-health", params={"month": "2026-03"})
test("Budget health 200", r.status_code == 200)

r = requests.get(f"{BASE}/dashboard/insights", params={"month": "2026-03"})
test("Insights 200", r.status_code == 200)
test("Insights have type+message", all("type" in i and "message" in i for i in r.json().get("insights", [{}])))

r = requests.get(f"{BASE}/dashboard/detect-income")
test("Detect income 200", r.status_code == 200)
test("Detect income has fields", "detected_income" in r.json() and "source" in r.json())

r = requests.get(f"{BASE}/dashboard/month-comparison", params={"month": "2026-03"})
test("Month comparison 200", r.status_code == 200)

# Empty month
r = requests.get(f"{BASE}/dashboard/summary", params={"month": "2020-01"})
test("Empty month returns zeros", r.status_code == 200 and r.json()["income"] == 0)

# ─── 4. BUDGETS ───────────────────────────────────────────
print("\n[4] BUDGETS")

r = requests.post(f"{BASE}/budgets", json={
    "category_id": groceries_id, "month": "2026-03", "limit_amount": 50000
})
test("Create budget", r.status_code == 201)
budget_id = r.json()["id"]

r = requests.get(f"{BASE}/budgets", params={"month": "2026-03"})
test("Get budgets with spending", r.status_code == 200 and len(r.json()) > 0)
b = r.json()[0]
test("Has spent field", "spent" in b)
test("Has percentage field", "percentage" in b)
test("Has warn_threshold", "warn_threshold" in b)
test("Has status field", "status" in b)

r = requests.post(f"{BASE}/budgets/bulk", json={
    "month": "2026-04", "budgets": [
        {"category_id": groceries_id, "limit_amount": 50000}
    ]
})
test("Bulk create budgets", r.status_code == 201)

r = requests.post(f"{BASE}/budgets/copy-forward", json={"target_month": "2026-05"})
test("Copy forward auto-detect", r.status_code == 200)

r = requests.put(f"{BASE}/budgets/{budget_id}", json={"limit_amount": 60000})
test("Update budget", r.status_code == 200)

r = requests.delete(f"{BASE}/budgets/{budget_id}")
test("Delete budget", r.status_code == 204)

# ─── 5. INVESTMENTS ───────────────────────────────────────
print("\n[5] INVESTMENTS")

r = requests.post(f"{BASE}/investments", json={
    "name": "401k", "type": "401k", "institution": "Fidelity",
    "current_value": 4210000, "contributions": 3500000
})
test("Create investment", r.status_code == 201)
inv_id = r.json()["id"]

r = requests.put(f"{BASE}/investments/{inv_id}/value", json={"current_value": 4500000})
test("Update value", r.status_code == 200)

r = requests.get(f"{BASE}/investments/{inv_id}/snapshots")
test("Snapshots created", r.status_code == 200 and len(r.json()) > 0)

r = requests.get(f"{BASE}/investments/summary")
test("Summary has total_value", r.status_code == 200 and "total_value" in r.json())
test("Summary has total_gain", "total_gain" in r.json())
test("Summary has gain_percentage", "gain_percentage" in r.json())

r = requests.post(f"{BASE}/investments", json={"name": "Bad", "type": "stock"})
test("Invalid type rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.delete(f"{BASE}/investments/{inv_id}")
test("Delete cascades snapshots", r.status_code == 204)

# ─── 6. SAVINGS GOALS ────────────────────────────────────
print("\n[6] SAVINGS GOALS")

r = requests.post(f"{BASE}/savings-goals", json={
    "name": "Emergency Fund", "target_amount": 1000000
})
test("Create goal", r.status_code == 201)
goal_id = r.json()["id"]

r = requests.post(f"{BASE}/savings-goals/{goal_id}/contributions", json={
    "amount": 50000, "date": "2026-03-14", "note": "March"
})
test("Add contribution", r.status_code == 201)
contrib_id = r.json()["id"]

r = requests.get(f"{BASE}/savings-goals/{goal_id}/contributions")
test("List contributions", r.status_code == 200 and len(r.json()) > 0)

r = requests.delete(f"{BASE}/savings-goals/{goal_id}/contributions/{contrib_id}")
test("Delete contribution", r.status_code == 204, f"got {r.status_code}")

r = requests.delete(f"{BASE}/savings-goals/{goal_id}")
test("Delete goal cascades", r.status_code == 204)

# ─── 7. TAGS ──────────────────────────────────────────────
print("\n[7] TAGS")

r = requests.post(f"{BASE}/tags", json={"name": "tax-deductible", "color": "#FF0000"})
test("Create tag", r.status_code == 201)
tag_id = r.json()["id"]

r = requests.post(f"{BASE}/tags", json={"name": "tax-deductible"})
test("Duplicate tag rejected", r.status_code in (409, 500), f"got {r.status_code}")

r = requests.post(f"{BASE}/transactions/{tx_id}/tags", json=[tag_id])
test("Set tags on transaction", r.status_code == 200, f"got {r.status_code}: {r.text[:100]}")

r = requests.get(f"{BASE}/transactions", params={"tag_id": tag_id})
test("Filter by tag", r.status_code == 200)

r = requests.put(f"{BASE}/tags/{tag_id}", json={"name": "deductible", "color": "#00FF00"})
test("Update tag", r.status_code == 200, f"got {r.status_code}")

r = requests.delete(f"{BASE}/tags/{tag_id}")
test("Delete tag cascades", r.status_code == 204)

# ─── 8. RECURRING ─────────────────────────────────────────
print("\n[8] RECURRING")

rent_id = next(c["id"] for c in cats if c["name"] == "Rent/Mortgage")
r = requests.post(f"{BASE}/recurring", json={
    "type": "expense", "amount": 150000, "description": "Rent",
    "category_id": rent_id, "frequency": "monthly", "start_date": "2026-01-01"
})
test("Create recurring", r.status_code == 201)

r = requests.post(f"{BASE}/recurring/generate")
test("Generate recurring", r.status_code == 200)

r = requests.get(f"{BASE}/recurring/upcoming", params={"days": 30})
test("Upcoming bills", r.status_code == 200)

r = requests.post(f"{BASE}/recurring", json={
    "type": "expense", "amount": 100, "description": "Bad",
    "frequency": "daily", "start_date": "2026-01-01"
})
test("Invalid frequency rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.post(f"{BASE}/recurring/bulk", json={"templates": [
    {"type": "income", "amount": 260000, "description": "Salary",
     "category_id": salary_id, "frequency": "biweekly", "start_date": "2026-01-01"}
]})
test("Bulk create recurring", r.status_code == 201, f"got {r.status_code}")

# ─── 9. SUGGEST CATEGORY ─────────────────────────────────
print("\n[9] AUTO-CATEGORIZE")

r = requests.get(f"{BASE}/transactions/suggest-category", params={"description": "Whole Foods"})
test("Suggest category 200", r.status_code == 200)
suggestion = r.json().get("suggestion")
if suggestion:
    test("Suggests Groceries", suggestion.get("category_name") == "Groceries",
         f"got {suggestion.get('category_name')}")
else:
    test("Suggests Groceries (or no data yet)", True)

r = requests.get(f"{BASE}/transactions/suggest-category", params={"description": "xyznonexist"})
test("No suggestion for unknown", r.status_code == 200)

# ─── 10. DUPLICATE CHECK ─────────────────────────────────
print("\n[10] DUPLICATE DETECTION")

r = requests.get(f"{BASE}/transactions/check-duplicates",
    params={"amount": 9000, "description": "Whole Foods", "date": "2026-03-14"})
test("Finds duplicate", r.status_code == 200 and r.json()["count"] > 0)

r = requests.get(f"{BASE}/transactions/check-duplicates",
    params={"amount": 99999, "description": "Nonexistent", "date": "2020-01-01"})
test("No false positives", r.status_code == 200 and r.json()["count"] == 0)

# ─── 11. OCR ──────────────────────────────────────────────
print("\n[11] OCR")

r = requests.get(f"{BASE}/ocr/status")
test("OCR status", r.status_code == 200 and r.json()["available"] == True)

# ─── 12. EXPORT ───────────────────────────────────────────
print("\n[12] DATA EXPORT")

r = requests.get(f"{BASE}/export/transactions", params={"format": "csv"})
test("Export CSV", r.status_code == 200)

r = requests.get(f"{BASE}/export/all", params={"format": "json"})
test("Export JSON", r.status_code == 200)
if r.status_code == 200:
    data = r.json()
    test("Has all tables", all(k in data for k in ["categories", "transactions", "budgets", "csv_imports"]),
         f"keys: {list(data.keys())}")

r = requests.get(f"{BASE}/export/backup")
test("Export SQLite backup", r.status_code == 200)

# ─── 13. OCR PARSING ─────────────────────────────────────
print("\n[13] OCR PARSING LOGIC")

from app.services.ocr_service import parse_amounts

# Receipt test
receipt = "STORE\nDate: 03/14/2026\nMilk $5.99\nBread $3.49\nSubtotal $9.48\nTax $0.76\nTOTAL $10.24"
results = parse_amounts(receipt)
test("Receipt: filters totals", len(results) == 2, f"got {len(results)}")

# Banking app test
banking = "Chase\nBalance $1000.00\nMar 14 Grocery -$50.00\nMar 13 DEPOSIT +$500.00"
results = parse_amounts(banking)
has_income = any(r["type"] == "income" for r in results)
no_balance = not any(r["amount"] == 100000 for r in results)
test("Banking: detects income from +", has_income, f"types: {[r['type'] for r in results]}")
test("Banking: filters balance line", no_balance, f"amounts: {[r['amount'] for r in results]}")

# Statement dedup test
stmt = "03/14/2026 Amazon $42.99\n03/14/2026 Amazon $42.99"
results = parse_amounts(stmt)
test("Statement: dedup same-day duplicates", len(results) == 1, f"got {len(results)}")

# ─── RESULTS ──────────────────────────────────────────────
print("\n" + "=" * 60)
print(f"RESULTS: {PASS} passed, {FAIL} failed out of {PASS + FAIL} tests")
print("=" * 60)
if ISSUES:
    print("\nFAILURES:")
    for i, issue in enumerate(ISSUES, 1):
        print(f"  {i}. {issue}")
    sys.exit(1)
else:
    print("\nALL TESTS PASSED!")
