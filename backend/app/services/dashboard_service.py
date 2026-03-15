from typing import List
from app.database import get_connection


def get_summary(month: str) -> dict:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT "
            "COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) as total_income, "
            "COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) as total_expenses, "
            "COUNT(*) as transaction_count "
            "FROM transactions "
            "WHERE strftime('%Y-%m', date) = ?",
            (month,),
        ).fetchone()
        d = dict(row)
        d["month"] = month
        d["net"] = d["total_income"] - d["total_expenses"]
        return d
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
                "category_id": bd["category_id"],
                "category_name": bd["category_name"],
                "category_color": bd["category_color"],
                "category_icon": bd.get("category_icon"),
                "limit_amount": limit_amt,
                "spent": spent,
                "remaining": remaining,
                "percentage": percentage,
                "status": status,
            })

        return results
    finally:
        conn.close()
