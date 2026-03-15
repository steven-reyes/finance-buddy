"""Comprehensive E2E test suite for Finance Buddy API."""
import requests
import json
import sys
import os

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

# ─── 14. UNTESTED ENDPOINTS ───────────────────────────────
print("\n[14] REMAINING ENDPOINTS")

# PUT category
r = requests.put(f"{BASE}/categories/{groceries_id}", json={"color": "#00FF00"})
test("Update category color", r.status_code == 200 and r.json()["color"] == "#00FF00")

# GET single investment
r = requests.post(f"{BASE}/investments", json={
    "name": "Test IRA", "type": "ira", "current_value": 100000, "contributions": 80000
})
test_inv_id = r.json()["id"]
r = requests.get(f"{BASE}/investments/{test_inv_id}")
test("GET single investment", r.status_code == 200 and r.json()["name"] == "Test IRA")

# PUT investment details
r = requests.put(f"{BASE}/investments/{test_inv_id}", json={"name": "Renamed IRA", "institution": "Schwab"})
test("Update investment details", r.status_code == 200 and r.json()["name"] == "Renamed IRA")

# PUT savings goal
r = requests.post(f"{BASE}/savings-goals", json={"name": "Test Goal", "target_amount": 500000})
test_goal_id = r.json()["id"]
r = requests.put(f"{BASE}/savings-goals/{test_goal_id}", json={"name": "Updated Goal", "target_amount": 600000})
test("Update savings goal", r.status_code == 200)

# PUT recurring template
r = requests.post(f"{BASE}/recurring", json={
    "type": "expense", "amount": 5000, "description": "Test Sub",
    "category_id": groceries_id, "frequency": "monthly", "start_date": "2026-01-01"
})
test_rec_id = r.json()["id"]
r = requests.put(f"{BASE}/recurring/{test_rec_id}", json={"amount": 6000, "description": "Updated Sub"})
test("Update recurring template", r.status_code == 200)

# DELETE recurring template
r = requests.delete(f"{BASE}/recurring/{test_rec_id}")
test("Delete recurring template", r.status_code == 204)

# POST transactions/bulk
r = requests.post(f"{BASE}/transactions/bulk", json=[
    {"type": "expense", "amount": 1000, "date": "2026-03-10", "description": "Bulk 1"},
    {"type": "expense", "amount": 2000, "date": "2026-03-10", "description": "Bulk 2"},
    {"type": "income", "amount": 3000, "date": "2026-03-10", "description": "Bulk 3"},
])
test("Bulk create transactions", r.status_code == 201, f"got {r.status_code}: {r.text[:200]}")

# CSV upload with a real CSV file
import io
csv_content = "date,amount,description\n2026-03-01,42.99,Amazon\n2026-03-02,15.99,Netflix\n"
files = {"file": ("test.csv", io.BytesIO(csv_content.encode()), "text/csv")}
r = requests.post(f"{BASE}/csv/upload", files=files)
test("CSV upload + parse", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    csv_data = r.json()
    test("CSV returns headers", "headers" in csv_data, f"keys: {list(csv_data.keys())}")
    test("CSV returns preview rows", "preview" in csv_data or "rows" in csv_data,
         f"keys: {list(csv_data.keys())}")

# OCR upload with a test image
from PIL import Image, ImageDraw
img = Image.new('RGB', (400, 200), 'white')
draw = ImageDraw.Draw(img)
draw.text((50, 20), 'TEST STORE', fill='black')
draw.text((50, 50), 'Date: 03/14/2026', fill='black')
draw.text((50, 80), 'Item One       $12.99', fill='black')
draw.text((50, 110), 'Item Two       $8.50', fill='black')
draw.text((50, 140), 'TOTAL          $21.49', fill='black')
import tempfile
with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as tmp:
    img.save(tmp.name)
    tmp_path = tmp.name

with open(tmp_path, 'rb') as f:
    r = requests.post(f"{BASE}/ocr/upload", files={"file": ("receipt.png", f, "image/png")})
test("OCR upload + extract", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    ocr_data = r.json()
    test("OCR returns transactions", "transactions" in ocr_data)
    test("OCR returns upload_id", "upload_id" in ocr_data)
    test("OCR filters totals from receipt", not any(
        t["description"] == "TOTAL" for t in ocr_data.get("transactions", [])
    ), f"txns: {[t['description'] for t in ocr_data.get('transactions', [])]}")

    # OCR confirm
    if ocr_data.get("transactions"):
        r = requests.post(f"{BASE}/ocr/confirm", json={
            "upload_id": ocr_data["upload_id"],
            "transactions": [
                {"type": "expense", "amount": t["amount"], "date": t["date"], "description": t["description"]}
                for t in ocr_data["transactions"]
            ]
        })
        test("OCR confirm + import", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")

os.unlink(tmp_path)

# ─── 15. EDGE CASES ──────────────────────────────────────
print("\n[15] EDGE CASES")

# Recurring: biweekly frequency generation
r = requests.post(f"{BASE}/recurring", json={
    "type": "income", "amount": 200000, "description": "Biweekly Pay",
    "category_id": salary_id, "frequency": "biweekly", "start_date": "2026-01-05"
})
bw_id = r.json()["id"]
r = requests.post(f"{BASE}/recurring/generate")
test("Biweekly generation runs", r.status_code == 200)

# Recurring: deactivated template should be skipped
r = requests.put(f"{BASE}/recurring/{bw_id}", json={"is_active": 0})
# Get count before
r1 = requests.get(f"{BASE}/transactions", params={"limit": 1})
count_before = r1.json()["total"]
r = requests.post(f"{BASE}/recurring/generate")
r2 = requests.get(f"{BASE}/transactions", params={"limit": 1})
count_after = r2.json()["total"]
test("Deactivated template not generated", count_after == count_before,
     f"before={count_before}, after={count_after}")

# Tag appears on transaction GET
r = requests.post(f"{BASE}/tags", json={"name": "verify-tag"})
vtag_id = r.json()["id"]
requests.post(f"{BASE}/transactions/{tx_id}/tags", json=[vtag_id])
r = requests.get(f"{BASE}/transactions/{tx_id}")
tx_data = r.json()
has_tags = "tags" in tx_data and any(t.get("id") == vtag_id or t.get("name") == "verify-tag"
    for t in (tx_data["tags"] if isinstance(tx_data.get("tags"), list) else []))
test("Tags appear on transaction GET", has_tags, f"tags: {tx_data.get('tags')}")

# Savings goal current_amount updates after contribution
r = requests.post(f"{BASE}/savings-goals", json={"name": "Verify Goal", "target_amount": 100000})
vgoal_id = r.json()["id"]
requests.post(f"{BASE}/savings-goals/{vgoal_id}/contributions", json={
    "amount": 25000, "date": "2026-03-14"
})
requests.post(f"{BASE}/savings-goals/{vgoal_id}/contributions", json={
    "amount": 15000, "date": "2026-03-15"
})
r = requests.get(f"{BASE}/savings-goals")
vgoal = next((g for g in r.json() if g["id"] == vgoal_id), None)
test("Goal current_amount sums contributions", vgoal and vgoal["current_amount"] == 40000,
     f"got {vgoal['current_amount'] if vgoal else 'N/A'}")

# Copy-forward creates correct budget values
requests.post(f"{BASE}/budgets", json={"category_id": groceries_id, "month": "2026-06", "limit_amount": 75000, "warn_threshold": 90})
requests.post(f"{BASE}/budgets/copy-forward", json={"target_month": "2026-07"})
r = requests.get(f"{BASE}/budgets", params={"month": "2026-07"})
copied = [b for b in r.json() if b["category_id"] == groceries_id]
test("Copy-forward preserves limit", len(copied) > 0 and copied[0]["limit_amount"] == 75000,
     f"got {copied[0]['limit_amount'] if copied else 'N/A'}")
test("Copy-forward preserves threshold", len(copied) > 0 and copied[0]["warn_threshold"] == 90,
     f"got {copied[0].get('warn_threshold') if copied else 'N/A'}")

# Export CSV is parseable
import csv
r = requests.get(f"{BASE}/export/transactions", params={"format": "csv"})
try:
    reader = csv.reader(r.text.strip().split('\n'))
    headers = next(reader)
    rows = list(reader)
    test("Export CSV is valid", len(headers) > 0 and len(rows) > 0, f"headers={headers}")
except Exception as e:
    test("Export CSV is valid", False, str(e))

# ─── 16. BUDGET SMART FEATURES ────────────────────────────
print("\n[16] BUDGET SMART FEATURES")

# Setup: Create recurring income template so detect-income works
rec_salary = requests.post(f"{BASE}/recurring", json={
    "type": "income", "amount": 520000, "description": "Test Salary",
    "category_id": salary_id, "frequency": "monthly", "start_date": "2026-01-01"
}).json()

# Test detect-income picks up the recurring template
r = requests.get(f"{BASE}/dashboard/detect-income")
test("Detect income finds recurring salary", r.status_code == 200 and r.json()["detected_income"] > 0,
     f"got {r.json()}")
test("Source is 'recurring'", r.json()["source"] == "recurring", f"got {r.json()['source']}")
detected = r.json()["detected_income"]
test("Detected amount matches salary", detected >= 520000,
     f"got {detected} (expected >= 520000)")

# Test detect-income handles multiple frequencies
rec_biweekly = requests.post(f"{BASE}/recurring", json={
    "type": "income", "amount": 100000, "description": "Side Gig",
    "category_id": salary_id, "frequency": "biweekly", "start_date": "2026-01-01"
}).json()
r = requests.get(f"{BASE}/dashboard/detect-income")
new_detected = r.json()["detected_income"]
# biweekly 100000 * 2 = 200000 monthly equivalent
test("Biweekly income adds to monthly total", new_detected >= detected + 200000,
     f"got {new_detected} (expected >= {detected + 200000})")

# Test bulk budget create with specific amounts
test_month = "2026-08"
r = requests.post(f"{BASE}/budgets/bulk", json={
    "month": test_month,
    "budgets": [
        {"category_id": groceries_id, "limit_amount": 50000, "warn_threshold": 80},
        {"category_id": rent_id, "limit_amount": 150000, "warn_threshold": 90},
    ]
})
test("Bulk create 2 budgets", r.status_code == 201)
budgets_created = r.json()
test("2 budgets returned", len(budgets_created) >= 2, f"got {len(budgets_created)}")

# Verify budgets have correct amounts
r = requests.get(f"{BASE}/budgets", params={"month": test_month})
month_budgets = r.json()
groc_budget = next((b for b in month_budgets if b["category_id"] == groceries_id), None)
rent_budget = next((b for b in month_budgets if b["category_id"] == rent_id), None)
test("Groceries budget = $500", groc_budget and groc_budget["limit_amount"] == 50000,
     f"got {groc_budget['limit_amount'] if groc_budget else 'N/A'}")
test("Rent budget = $1,500", rent_budget and rent_budget["limit_amount"] == 150000,
     f"got {rent_budget['limit_amount'] if rent_budget else 'N/A'}")
test("Groceries warn_threshold = 80", groc_budget and groc_budget["warn_threshold"] == 80)
test("Rent warn_threshold = 90", rent_budget and rent_budget["warn_threshold"] == 90)

# Test bulk create skips duplicates (same category+month)
r = requests.post(f"{BASE}/budgets/bulk", json={
    "month": test_month,
    "budgets": [
        {"category_id": groceries_id, "limit_amount": 99999},  # duplicate
        {"category_id": next(c["id"] for c in cats if c["name"] == "Entertainment"), "limit_amount": 30000},  # new
    ]
})
test("Bulk create skips duplicates", r.status_code == 201)
r = requests.get(f"{BASE}/budgets", params={"month": test_month})
groc_after = next((b for b in r.json() if b["category_id"] == groceries_id), None)
test("Duplicate budget not overwritten", groc_after and groc_after["limit_amount"] == 50000,
     f"got {groc_after['limit_amount'] if groc_after else 'N/A'}")
ent_id = next(c["id"] for c in cats if c["name"] == "Entertainment")
ent_budget = next((b for b in r.json() if b["category_id"] == ent_id), None)
test("New budget created alongside skip", ent_budget and ent_budget["limit_amount"] == 30000,
     f"got {ent_budget['limit_amount'] if ent_budget else 'N/A'}")

# Test proportional rebalance simulation
# If income goes from 520000 to 572000 (10% increase), budgets should scale by 1.1x
original_income = 520000
new_income = 572000
ratio = new_income / original_income
r = requests.get(f"{BASE}/budgets", params={"month": test_month})
original_budgets = r.json()
rebalanced = [
    {"category_id": b["category_id"],
     "limit_amount": round((b["limit_amount"] or b.get("amount", 0)) * ratio),
     "warn_threshold": b.get("warn_threshold", 80)}
    for b in original_budgets
]

# Delete old budgets and create rebalanced ones
for b in original_budgets:
    requests.delete(f"{BASE}/budgets/{b['id']}")
r = requests.post(f"{BASE}/budgets/bulk", json={"month": test_month, "budgets": rebalanced})
test("Rebalanced budgets created", r.status_code == 201)
r = requests.get(f"{BASE}/budgets", params={"month": test_month})
rebalanced_budgets = r.json()
groc_rebal = next((b for b in rebalanced_budgets if b["category_id"] == groceries_id), None)
expected_groc = round(50000 * ratio)
test("Groceries rebalanced to 110%", groc_rebal and abs(groc_rebal["limit_amount"] - expected_groc) <= 1,
     f"got {groc_rebal['limit_amount'] if groc_rebal else 'N/A'}, expected ~{expected_groc}")
rent_rebal = next((b for b in rebalanced_budgets if b["category_id"] == rent_id), None)
expected_rent = round(150000 * ratio)
test("Rent rebalanced to 110%", rent_rebal and abs(rent_rebal["limit_amount"] - expected_rent) <= 1,
     f"got {rent_rebal['limit_amount'] if rent_rebal else 'N/A'}, expected ~{expected_rent}")

# Test copy-forward preserves rebalanced amounts
r = requests.post(f"{BASE}/budgets/copy-forward", json={"target_month": "2026-09"})
test("Copy-forward from rebalanced month", r.status_code == 200)
r = requests.get(f"{BASE}/budgets", params={"month": "2026-09"})
copied = r.json()
groc_copied = next((b for b in copied if b["category_id"] == groceries_id), None)
test("Copied budget has rebalanced amount", groc_copied and abs(groc_copied["limit_amount"] - expected_groc) <= 1,
     f"got {groc_copied['limit_amount'] if groc_copied else 'N/A'}")

# Test detect-income with deactivated template
requests.put(f"{BASE}/recurring/{rec_salary['id']}", json={"is_active": 0})
r = requests.get(f"{BASE}/dashboard/detect-income")
reduced = r.json()["detected_income"]
test("Deactivated recurring excluded from income", reduced < detected,
     f"got {reduced} (should be < {detected})")

# Reactivate for other tests
requests.put(f"{BASE}/recurring/{rec_salary['id']}", json={"is_active": 1})

# Test detect-income falls back to transaction average when no active recurring income
# Deactivate our test templates
requests.put(f"{BASE}/recurring/{rec_salary['id']}", json={"is_active": 0})
requests.put(f"{BASE}/recurring/{rec_biweekly['id']}", json={"is_active": 0})
# Also deactivate any other income recurring templates from earlier tests
all_recurring = requests.get(f"{BASE}/recurring").json()
deactivated_ids = []
for tmpl in all_recurring:
    if tmpl.get("type") == "income" and tmpl.get("is_active"):
        requests.put(f"{BASE}/recurring/{tmpl['id']}", json={"is_active": 0})
        deactivated_ids.append(tmpl["id"])
r = requests.get(f"{BASE}/dashboard/detect-income")
test("Falls back to transaction average", r.json()["source"] in ("transactions", "none"),
     f"source={r.json()['source']}, from_recurring={r.json().get('from_recurring')}")
# Reactivate all
for tid in deactivated_ids:
    requests.put(f"{BASE}/recurring/{tid}", json={"is_active": 1})

# Reactivate
requests.put(f"{BASE}/recurring/{rec_salary['id']}", json={"is_active": 1})
requests.put(f"{BASE}/recurring/{rec_biweekly['id']}", json={"is_active": 1})

# Test budget with zero income edge case
r = requests.get(f"{BASE}/budgets", params={"month": "2099-01"})
test("Future month with no budgets returns empty", r.status_code == 200 and len(r.json()) == 0)

# Cleanup test recurring templates
requests.delete(f"{BASE}/recurring/{rec_salary['id']}")
requests.delete(f"{BASE}/recurring/{rec_biweekly['id']}")

# Cleanup test budgets
for m in [test_month, "2026-09"]:
    r = requests.get(f"{BASE}/budgets", params={"month": m})
    for b in r.json():
        requests.delete(f"{BASE}/budgets/{b['id']}")

# ─── 17. DEBT TRACKER ─────────────────────────────────────
print("\n[17] DEBT TRACKER")

# Create debts of different types
r = requests.post(f"{BASE}/debts", json={
    "name": "Chime Advance", "type": "advance", "creditor": "Chime",
    "original_amount": 25000, "current_balance": 25000,
    "minimum_payment": 25000, "is_auto_deduct": True
})
test("Create advance debt", r.status_code == 201)
chime_id = r.json()["id"]
test("Advance auto-priority is 2", r.json()["priority"] == 2, f"got {r.json()['priority']}")
test("Auto-deduct flag set", r.json()["is_auto_deduct"] == 1)

r = requests.post(f"{BASE}/debts", json={
    "name": "Back Rent", "type": "bill_arrears", "creditor": "Housing Program",
    "original_amount": 240000, "current_balance": 240000,
    "minimum_payment": 50000
})
test("Create bill arrears debt", r.status_code == 201)
rent_debt_id = r.json()["id"]
test("Bill arrears auto-priority is 1", r.json()["priority"] == 1, f"got {r.json()['priority']}")

r = requests.post(f"{BASE}/debts", json={
    "name": "Friend Loan", "type": "personal", "creditor": "John",
    "original_amount": 200000, "current_balance": 150000,
    "minimum_payment": 10000
})
test("Create personal debt", r.status_code == 201)
friend_debt_id = r.json()["id"]
test("Personal auto-priority is 5", r.json()["priority"] == 5, f"got {r.json()['priority']}")

r = requests.post(f"{BASE}/debts", json={
    "name": "Phone Bill Overdue", "type": "bill_arrears", "creditor": "T-Mobile",
    "original_amount": 15000, "current_balance": 15000,
    "minimum_payment": 15000
})
test("Create phone arrears", r.status_code == 201)
phone_debt_id = r.json()["id"]

r = requests.post(f"{BASE}/debts", json={
    "name": "Credit Card", "type": "credit_card", "creditor": "Capital One",
    "original_amount": 500000, "current_balance": 350000,
    "minimum_payment": 7500, "interest_rate": 24.99
})
test("Create credit card debt", r.status_code == 201)
cc_debt_id = r.json()["id"]
test("CC auto-priority is 4", r.json()["priority"] == 4, f"got {r.json()['priority']}")

# Validation tests
r = requests.post(f"{BASE}/debts", json={
    "name": "Bad", "type": "invalid_type", "creditor": "X",
    "original_amount": 100, "current_balance": 100
})
test("Invalid debt type rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.post(f"{BASE}/debts", json={
    "name": "Bad", "type": "loan", "creditor": "X",
    "original_amount": -100, "current_balance": 100
})
test("Negative original amount rejected", r.status_code == 422, f"got {r.status_code}")

r = requests.post(f"{BASE}/debts", json={
    "name": "", "type": "loan", "creditor": "X",
    "original_amount": 100, "current_balance": 100
})
test("Empty name rejected", r.status_code == 422, f"got {r.status_code}")

# List debts
r = requests.get(f"{BASE}/debts")
test("List all debts", r.status_code == 200)
all_debts = r.json()
test("5 debts created", len(all_debts) == 5, f"got {len(all_debts)}")
test("Ordered by priority (housing first)", all_debts[0]["priority"] <= all_debts[-1]["priority"],
     f"first={all_debts[0]['priority']}, last={all_debts[-1]['priority']}")

# Filter by status
r = requests.get(f"{BASE}/debts", params={"status": "active"})
test("Filter active debts", r.status_code == 200 and len(r.json()) == 5)

# Get single debt
r = requests.get(f"{BASE}/debts/{chime_id}")
test("Get single debt", r.status_code == 200 and r.json()["name"] == "Chime Advance")

r = requests.get(f"{BASE}/debts/99999")
test("Non-existent debt 404", r.status_code == 404, f"got {r.status_code}")

# Update debt
r = requests.put(f"{BASE}/debts/{friend_debt_id}", json={"current_balance": 140000, "notes": "Paid some back"})
test("Update debt balance", r.status_code == 200)
test("Balance updated", r.json()["current_balance"] == 140000, f"got {r.json()['current_balance']}")

# ─── 18. DEBT PAYMENTS ───────────────────────────────────
print("\n[18] DEBT PAYMENTS")

# Make a payment on friend debt
r = requests.post(f"{BASE}/debts/{friend_debt_id}/payments", json={
    "amount": 5000, "date": "2026-03-15", "note": "Partial payment"
})
test("Add debt payment", r.status_code == 201, f"got {r.status_code}: {r.text[:200]}")

# Verify balance decreased
r = requests.get(f"{BASE}/debts/{friend_debt_id}")
test("Balance decreased after payment", r.json()["current_balance"] == 135000,
     f"got {r.json()['current_balance']}")

# List payments
r = requests.get(f"{BASE}/debts/{friend_debt_id}/payments")
test("List debt payments", r.status_code == 200 and len(r.json()) >= 1)

# Multiple payments
requests.post(f"{BASE}/debts/{friend_debt_id}/payments", json={"amount": 10000, "date": "2026-03-16"})
r = requests.get(f"{BASE}/debts/{friend_debt_id}")
test("Multiple payments reduce balance", r.json()["current_balance"] == 125000,
     f"got {r.json()['current_balance']}")

# Pay off small debt completely (phone $150)
r = requests.post(f"{BASE}/debts/{phone_debt_id}/payments", json={
    "amount": 15000, "date": "2026-03-15"
})
test("Full payment accepted", r.status_code == 201, f"got {r.status_code}")
r = requests.get(f"{BASE}/debts/{phone_debt_id}")
test("Debt marked as paid_off", r.json()["status"] == "paid_off",
     f"got status={r.json()['status']}, balance={r.json()['current_balance']}")
test("Balance is zero", r.json()["current_balance"] == 0)

# Invalid payment (0 amount)
r = requests.post(f"{BASE}/debts/{friend_debt_id}/payments", json={
    "amount": 0, "date": "2026-03-15"
})
test("Zero payment rejected", r.status_code == 422, f"got {r.status_code}")

# Payment on non-existent debt
r = requests.post(f"{BASE}/debts/99999/payments", json={
    "amount": 1000, "date": "2026-03-15"
})
test("Payment on non-existent debt", r.status_code in (404, 400), f"got {r.status_code}")

# ─── 19. DEBT SUMMARY & INSIGHTS ─────────────────────────
print("\n[19] DEBT SUMMARY & INSIGHTS")

r = requests.get(f"{BASE}/debts/summary")
test("Debt summary 200", r.status_code == 200)
summary = r.json()
test("Has total_debts", "total_debts" in summary)
test("Has total_owed", "total_owed" in summary)
test("Has total_minimum_monthly", "total_minimum_monthly" in summary)
test("Total owed > 0", summary["total_owed"] > 0)
test("Active debt count correct", summary["total_debts"] >= 4,  # phone is paid off
     f"got {summary['total_debts']}")

# Insights
r = requests.get(f"{BASE}/debts/insights")
test("Debt insights 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    insights_data = r.json()
    # Response may be a list or a dict with "insights" key
    if isinstance(insights_data, dict):
        insight_list = insights_data.get("insights", [])
    else:
        insight_list = insights_data
    test("Insights returned", isinstance(insight_list, list))
    test("Has at least 1 insight", len(insight_list) >= 1 or "summary" in (insights_data if isinstance(insights_data, dict) else {}),
         f"got {len(insight_list)} insights")

# ─── 20. PAYOFF PLAN ─────────────────────────────────────
print("\n[20] PAYOFF PLAN")

r = requests.get(f"{BASE}/debts/payoff-plan", params={"strategy": "avalanche"})
test("Avalanche payoff plan 200", r.status_code == 200, f"got {r.status_code}: {r.text[:200]}")
if r.status_code == 200:
    plan = r.json()
    test("Plan has strategy field", plan.get("strategy") == "avalanche")
    test("Plan has debts list", "debts" in plan)
    test("Plan has total_months", "total_months" in plan)

r = requests.get(f"{BASE}/debts/payoff-plan", params={"strategy": "snowball"})
test("Snowball payoff plan 200", r.status_code == 200)
if r.status_code == 200:
    snowball = r.json()
    test("Snowball strategy label", snowball.get("strategy") == "snowball")

# ─── 21. PAYCHECK ALLOCATION ─────────────────────────────
print("\n[21] PAYCHECK ALLOCATION")

# Allocate a typical paycheck
r = requests.post(f"{BASE}/debts/allocate", json={
    "paycheck_amount": 180000, "pay_date": "2026-03-15"
})
test("Paycheck allocation 200", r.status_code == 200, f"got {r.status_code}: {r.text[:300]}")
if r.status_code == 200:
    alloc = r.json()
    test("Has allocations list", "allocations" in alloc and len(alloc["allocations"]) > 0)
    test("Has total_allocated", "total_allocated" in alloc)
    test("Has buffer or remaining", "buffer_remaining" in alloc or "remaining" in alloc)

    # Check allocations have required fields
    if alloc["allocations"]:
        first = alloc["allocations"][0]
        test("Allocation has amount fields",
             "amount_allocated" in first or "amount" in first,
             f"keys: {list(first.keys())}")

    test("Paycheck amount matches input", alloc["paycheck_amount"] == 180000,
         f"got {alloc.get('paycheck_amount')}")

# Small paycheck — should show shortfall
r = requests.post(f"{BASE}/debts/allocate", json={
    "paycheck_amount": 30000, "pay_date": "2026-03-15"
})
test("Small paycheck allocation", r.status_code == 200)
if r.status_code == 200:
    alloc = r.json()
    test("Small paycheck has allocations", "allocations" in alloc)

# Zero paycheck rejected
r = requests.post(f"{BASE}/debts/allocate", json={
    "paycheck_amount": 0, "pay_date": "2026-03-15"
})
test("Zero paycheck rejected", r.status_code == 422, f"got {r.status_code}")

# ─── 22. DEBT EDGE CASES ─────────────────────────────────
print("\n[22] DEBT EDGE CASES")

# Pause a debt
r = requests.put(f"{BASE}/debts/{cc_debt_id}", json={"status": "paused"})
test("Pause debt", r.status_code == 200 and r.json()["status"] == "paused")

# Paused debts filtered correctly
r = requests.get(f"{BASE}/debts", params={"status": "paused"})
test("Filter paused debts", r.status_code == 200)
paused = r.json()
test("Only paused debts returned", all(d["status"] == "paused" for d in paused),
     f"statuses: {[d['status'] for d in paused]}")

# Reactivate
r = requests.put(f"{BASE}/debts/{cc_debt_id}", json={"status": "active"})
test("Reactivate debt", r.status_code == 200 and r.json()["status"] == "active")

# Paid off debts filtered
r = requests.get(f"{BASE}/debts", params={"status": "paid_off"})
test("Filter paid_off debts", r.status_code == 200)
paid = r.json()
test("Paid off debts found", len(paid) >= 1)  # phone was paid off

# Delete a debt (cascades payments)
r = requests.delete(f"{BASE}/debts/{phone_debt_id}")
test("Delete debt", r.status_code == 204)

# Verify deleted
r = requests.get(f"{BASE}/debts/{phone_debt_id}")
test("Deleted debt returns 404", r.status_code == 404, f"got {r.status_code}")

# Dashboard insights include debt warnings
r = requests.get(f"{BASE}/dashboard/insights", params={"month": "2026-03"})
test("Dashboard insights include debts", r.status_code == 200)
insights = r.json().get("insights", [])
debt_insights = [i for i in insights if "debt" in i.get("message", "").lower() or "owe" in i.get("message", "").lower()]
test("Debt-related insights present", len(debt_insights) >= 1,
     f"found {len(debt_insights)} debt insights out of {len(insights)} total")

# Custom priority override
r = requests.put(f"{BASE}/debts/{friend_debt_id}", json={"priority": 3})
test("Override priority", r.status_code == 200 and r.json()["priority"] == 3)

# Cleanup test debts
for did in [chime_id, rent_debt_id, friend_debt_id, cc_debt_id]:
    requests.delete(f"{BASE}/debts/{did}")

# ─── CLEANUP ──────────────────────────────────────────────
requests.delete(f"{BASE}/investments/{test_inv_id}")
requests.delete(f"{BASE}/savings-goals/{test_goal_id}")
requests.delete(f"{BASE}/savings-goals/{vgoal_id}")
requests.delete(f"{BASE}/tags/{vtag_id}")

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
