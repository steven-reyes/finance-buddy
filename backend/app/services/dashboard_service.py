from typing import List
from app.database import get_connection


def get_summary(month: str) -> dict:
    from datetime import datetime, timedelta
    conn = get_connection()
    try:
        # Current month
        row = conn.execute(
            "SELECT "
            "COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income, "
            "COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses, "
            "COUNT(*) as transaction_count "
            "FROM transactions "
            "WHERE strftime('%Y-%m', date) = ?",
            (month,),
        ).fetchone()

        income = row["income"]
        expenses = row["expenses"]
        net = income - expenses

        # Previous month
        dt = datetime.strptime(month + "-01", "%Y-%m-%d")
        prev_dt = dt - timedelta(days=1)
        prev_month = prev_dt.strftime("%Y-%m")

        prev_row = conn.execute(
            "SELECT "
            "COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income, "
            "COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses "
            "FROM transactions "
            "WHERE strftime('%Y-%m', date) = ?",
            (prev_month,),
        ).fetchone()

        prev_income = prev_row["income"]
        prev_expenses = prev_row["expenses"]
        prev_net = prev_income - prev_expenses

        # Investment totals
        inv_row = conn.execute(
            "SELECT COALESCE(SUM(current_value), 0) as total_value "
            "FROM investments"
        ).fetchone()
        investment_value = inv_row["total_value"]

        # Previous investment value (from snapshots closest to prev month end)
        prev_inv_row = conn.execute(
            "SELECT COALESCE(SUM(value), 0) as total_value FROM ("
            "  SELECT investment_id, value FROM investment_snapshots "
            "  WHERE recorded_at <= ? "
            "  GROUP BY investment_id "
            "  HAVING recorded_at = MAX(recorded_at)"
            ")",
            (prev_month + "-31",),
        ).fetchone()
        prev_investment_value = prev_inv_row["total_value"] if prev_inv_row else 0

        return {
            "income": income,
            "expenses": expenses,
            "net": net,
            "transaction_count": row["transaction_count"],
            "month": month,
            "investment_value": investment_value,
            "prev_income": prev_income,
            "prev_expenses": prev_expenses,
            "prev_net": prev_net,
            "prev_investment_value": prev_investment_value,
        }
    finally:
        conn.close()


def get_spending_by_category(month: str) -> List[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT c.id as category_id, c.name as category_name, c.color as category_color, "
            "c.icon as category_icon, COALESCE(SUM(t.amount), 0) as amount "
            "FROM transactions t "
            "JOIN categories c ON t.category_id = c.id "
            "WHERE t.type = 'expense' AND strftime('%Y-%m', t.date) = ? "
            "GROUP BY c.id "
            "ORDER BY amount DESC",
            (month,),
        ).fetchall()

        results = [dict(r) for r in rows]
        total = sum(r["amount"] for r in results)

        for r in results:
            r["percentage"] = round((r["amount"] / total * 100) if total > 0 else 0, 1)

        return results
    finally:
        conn.close()


def get_monthly_trends(months: int = 6) -> List[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT strftime('%Y-%m', date) as month, "
            "COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income, "
            "COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses "
            "FROM transactions "
            "GROUP BY strftime('%Y-%m', date) "
            "ORDER BY month DESC "
            "LIMIT ?",
            (months,),
        ).fetchall()

        results = []
        for r in rows:
            d = dict(r)
            d["net"] = d["income"] - d["expenses"]
            results.append(d)

        results.reverse()
        return results
    finally:
        conn.close()


def detect_monthly_income() -> dict:
    """Detect monthly income from recurring templates and recent transactions."""
    conn = get_connection()
    try:
        # Check recurring income templates first
        recurring_income = conn.execute(
            "SELECT SUM(amount) as total FROM recurring_templates "
            "WHERE type = 'income' AND is_active = 1 AND frequency = 'monthly'"
        ).fetchone()
        recurring_total = recurring_income["total"] or 0

        # Also check biweekly (multiply by 2 for monthly equivalent)
        biweekly_income = conn.execute(
            "SELECT SUM(amount) as total FROM recurring_templates "
            "WHERE type = 'income' AND is_active = 1 AND frequency = 'biweekly'"
        ).fetchone()
        biweekly_total = (biweekly_income["total"] or 0) * 2

        # Also check weekly (multiply by 4)
        weekly_income = conn.execute(
            "SELECT SUM(amount) as total FROM recurring_templates "
            "WHERE type = 'income' AND is_active = 1 AND frequency = 'weekly'"
        ).fetchone()
        weekly_total = (weekly_income["total"] or 0) * 4

        # Yearly / 12
        yearly_income = conn.execute(
            "SELECT SUM(amount) as total FROM recurring_templates "
            "WHERE type = 'income' AND is_active = 1 AND frequency = 'yearly'"
        ).fetchone()
        yearly_total = (yearly_income["total"] or 0) // 12

        from_recurring = recurring_total + biweekly_total + weekly_total + yearly_total

        # Fallback: average income from last 3 months of transactions
        from_transactions = 0
        if from_recurring == 0:
            avg_row = conn.execute(
                "SELECT AVG(monthly_income) as avg_income FROM ("
                "  SELECT strftime('%Y-%m', date) as month, SUM(amount) as monthly_income "
                "  FROM transactions WHERE type = 'income' "
                "  GROUP BY strftime('%Y-%m', date) "
                "  ORDER BY month DESC LIMIT 3"
                ")"
            ).fetchone()
            from_transactions = int(avg_row["avg_income"] or 0)

        detected = from_recurring if from_recurring > 0 else from_transactions
        source = "recurring" if from_recurring > 0 else ("transactions" if from_transactions > 0 else "none")

        return {
            "detected_income": detected,
            "source": source,
            "from_recurring": from_recurring,
            "from_transactions": from_transactions,
        }
    finally:
        conn.close()


def _format_dollars(cents: int) -> str:
    """Format cents as a dollar string like $1,360."""
    negative = cents < 0
    cents = abs(cents)
    dollars = cents // 100
    formatted = f"${dollars:,}"
    if negative:
        formatted = f"-{formatted}"
    return formatted


def _pct_change(current: int, previous: int) -> float | None:
    """Return percentage change from previous to current, or None if previous is 0."""
    if previous == 0:
        return None
    return round((current - previous) / previous * 100, 1)


def get_monthly_insights(month: str) -> dict:
    from datetime import datetime, timedelta
    conn = get_connection()
    try:
        insights = []

        # Parse current and previous month
        dt = datetime.strptime(month + "-01", "%Y-%m-%d")
        prev_dt = dt - timedelta(days=1)
        prev_month = prev_dt.strftime("%Y-%m")

        # --- Total income/expenses for current and previous month ---
        row = conn.execute(
            "SELECT "
            "COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income, "
            "COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses "
            "FROM transactions WHERE strftime('%Y-%m', date) = ?",
            (month,),
        ).fetchone()
        income = row["income"]
        expenses = row["expenses"]
        net = income - expenses

        prev_row = conn.execute(
            "SELECT "
            "COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as income, "
            "COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as expenses "
            "FROM transactions WHERE strftime('%Y-%m', date) = ?",
            (prev_month,),
        ).fetchone()
        prev_income = prev_row["income"]
        prev_expenses = prev_row["expenses"]

        # Net income insight
        if net >= 0:
            insights.append({"type": "positive", "message": f"You're net positive by {_format_dollars(net)} this month"})
        else:
            insights.append({"type": "negative", "message": f"Warning: spending exceeds income by {_format_dollars(abs(net))}"})

        # Total expenses comparison
        exp_pct = _pct_change(expenses, prev_expenses)
        if exp_pct is not None:
            direction = "up" if exp_pct > 0 else "down"
            itype = "warning" if exp_pct > 0 else "positive"
            insights.append({"type": itype, "message": f"Total expenses {direction} {abs(exp_pct)}% from last month"})

        # Total income comparison
        inc_pct = _pct_change(income, prev_income)
        if inc_pct is not None:
            direction = "up" if inc_pct > 0 else "down"
            itype = "positive" if inc_pct > 0 else "warning"
            insights.append({"type": itype, "message": f"Total income {direction} {abs(inc_pct)}% from last month"})

        # --- Category-level spending comparison ---
        cat_rows = conn.execute(
            "SELECT c.name, COALESCE(SUM(t.amount), 0) as amount "
            "FROM transactions t JOIN categories c ON t.category_id = c.id "
            "WHERE t.type = 'expense' AND strftime('%Y-%m', t.date) = ? "
            "GROUP BY c.id ORDER BY amount DESC",
            (month,),
        ).fetchall()

        prev_cat_rows = conn.execute(
            "SELECT c.name, COALESCE(SUM(t.amount), 0) as amount "
            "FROM transactions t JOIN categories c ON t.category_id = c.id "
            "WHERE t.type = 'expense' AND strftime('%Y-%m', t.date) = ? "
            "GROUP BY c.id",
            (prev_month,),
        ).fetchall()
        prev_cat_map = {r["name"]: r["amount"] for r in prev_cat_rows}

        # Biggest expense category
        if cat_rows and expenses > 0:
            top = cat_rows[0]
            top_pct = round(top["amount"] / expenses * 100)
            insights.append({"type": "info", "message": f"{top['name']} is your largest expense at {top_pct}% of spending"})

        # Per-category changes
        for cat in cat_rows:
            prev_amt = prev_cat_map.get(cat["name"])
            if prev_amt and prev_amt > 0:
                pct = _pct_change(cat["amount"], prev_amt)
                if pct is not None and abs(pct) >= 10:
                    direction = "up" if pct > 0 else "down"
                    itype = "warning" if pct > 0 else "positive"
                    insights.append({
                        "type": itype,
                        "message": f"{cat['name']} spending {direction} {abs(pct)}% vs last month ({_format_dollars(prev_amt)} \u2192 {_format_dollars(cat['amount'])})",
                    })

        # --- Budget status ---
        budgets = conn.execute(
            "SELECT b.*, c.name as category_name FROM budgets b "
            "JOIN categories c ON b.category_id = c.id WHERE b.month = ?",
            (month,),
        ).fetchall()

        if budgets:
            on_track = 0
            total_budgets = len(budgets)
            for b in budgets:
                spent_row = conn.execute(
                    "SELECT COALESCE(SUM(amount), 0) as total FROM transactions "
                    "WHERE category_id = ? AND type = 'expense' AND strftime('%Y-%m', date) = ?",
                    (b["category_id"], month),
                ).fetchone()
                spent = spent_row["total"]
                if spent <= b["limit_amount"]:
                    on_track += 1
            insights.append({"type": "info", "message": f"{on_track} of {total_budgets} budgets on track this month"})

        # --- Savings goals progress ---
        goals = conn.execute(
            "SELECT name, current_amount, target_amount FROM savings_goals WHERE target_amount > 0"
        ).fetchall()
        for g in goals:
            pct = round(g["current_amount"] / g["target_amount"] * 100)
            insights.append({
                "type": "info",
                "message": f"{g['name']} is {pct}% funded ({_format_dollars(g['current_amount'])} of {_format_dollars(g['target_amount'])})",
            })

        return {"month": month, "insights": insights}
    finally:
        conn.close()


def get_month_comparison(month: str) -> list:
    """Compare spending per category between current and previous month."""
    from datetime import datetime, timedelta
    conn = get_connection()
    try:
        dt = datetime.strptime(month + "-01", "%Y-%m-%d")
        prev_dt = dt - timedelta(days=1)
        prev_month = prev_dt.strftime("%Y-%m")

        # Get all expense categories that have spending in either month
        rows = conn.execute(
            "SELECT c.id as category_id, c.name as category_name, c.color as category_color, c.icon as category_icon, "
            "COALESCE(SUM(CASE WHEN strftime('%Y-%m', t.date) = ? THEN t.amount ELSE 0 END), 0) as current_amount, "
            "COALESCE(SUM(CASE WHEN strftime('%Y-%m', t.date) = ? THEN t.amount ELSE 0 END), 0) as previous_amount "
            "FROM categories c "
            "LEFT JOIN transactions t ON t.category_id = c.id AND t.type = 'expense' "
            "AND strftime('%Y-%m', t.date) IN (?, ?) "
            "WHERE c.type = 'expense' "
            "GROUP BY c.id "
            "HAVING current_amount > 0 OR previous_amount > 0 "
            "ORDER BY current_amount DESC",
            (month, prev_month, month, prev_month),
        ).fetchall()

        results = []
        for r in rows:
            d = dict(r)
            current = d["current_amount"]
            previous = d["previous_amount"]
            d["change_amount"] = current - previous
            if previous > 0:
                d["change_percent"] = round((current - previous) / previous * 100, 1)
            elif current > 0:
                d["change_percent"] = 100.0
            else:
                d["change_percent"] = 0.0
            results.append(d)

        return results
    finally:
        conn.close()


def get_budget_health(month: str) -> List[dict]:
    conn = get_connection()
    try:
        budgets = conn.execute(
            "SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon "
            "FROM budgets b "
            "JOIN categories c ON b.category_id = c.id "
            "WHERE b.month = ?",
            (month,),
        ).fetchall()

        results = []
        for b in budgets:
            bd = dict(b)
            spent_row = conn.execute(
                "SELECT COALESCE(SUM(amount), 0) as total "
                "FROM transactions "
                "WHERE category_id = ? AND type = 'expense' "
                "AND strftime('%Y-%m', date) = ?",
                (bd["category_id"], month),
            ).fetchone()
            spent = spent_row["total"]
            limit_amt = bd["limit_amount"]
            remaining = limit_amt - spent
            percentage = round((spent / limit_amt * 100) if limit_amt > 0 else 0, 1)

            if percentage >= 100:
                status = "over"
            elif percentage >= bd["warn_threshold"]:
                status = "warning"
            else:
                status = "ok"

            results.append({
                "id": bd["id"],
                "category_id": bd["category_id"],
                "category_name": bd["category_name"],
                "category_color": bd["category_color"],
                "category_icon": bd.get("category_icon"),
                "amount": limit_amt,
                "limit_amount": limit_amt,
                "spent": spent,
                "remaining": remaining,
                "percentage": percentage,
                "warn_threshold": bd["warn_threshold"],
                "status": status,
            })

        return results
    finally:
        conn.close()
