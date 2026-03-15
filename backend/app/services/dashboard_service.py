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
