from typing import Optional, List
from app.database import get_connection
from app.models.budget import BudgetCreate, BudgetUpdate


def get_by_month(month: str) -> List[dict]:
    conn = get_connection()
    try:
        budgets = conn.execute(
            "SELECT b.*, c.name as category_name, c.color as category_color, c.icon as category_icon "
            "FROM budgets b "
            "JOIN categories c ON b.category_id = c.id "
            "WHERE b.month = ? "
            "ORDER BY c.name",
            (month,),
        ).fetchall()

        result = []
        for b in budgets:
            bd = dict(b)
            # Calculate spending for this category in this month
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

            bd["spent"] = spent
            bd["remaining"] = remaining
            bd["percentage"] = percentage
            bd["status"] = status
            result.append(bd)

        return result
    finally:
        conn.close()


def get_by_id(budget_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM budgets WHERE id = ?", (budget_id,)).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create(dto: BudgetCreate) -> dict:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO budgets (category_id, month, limit_amount, warn_threshold) VALUES (?, ?, ?, ?)",
            (dto.category_id, dto.month, dto.limit_amount, dto.warn_threshold),
        )
        conn.commit()
        budget_id = cursor.lastrowid
        # Return with spending info
        budgets = get_by_month(dto.month)
        return next((b for b in budgets if b["id"] == budget_id), get_by_id(budget_id))
    except Exception as e:
        conn.rollback()
        if "UNIQUE constraint" in str(e):
            raise ValueError("Budget already exists for this category and month")
        raise
    finally:
        conn.close()


def update(budget_id: int, dto: BudgetUpdate) -> Optional[dict]:
    existing = get_by_id(budget_id)
    if not existing:
        return None

    fields = []
    values = []
    if dto.limit_amount is not None:
        fields.append("limit_amount = ?")
        values.append(dto.limit_amount)
    if dto.warn_threshold is not None:
        fields.append("warn_threshold = ?")
        values.append(dto.warn_threshold)

    if not fields:
        budgets = get_by_month(existing["month"])
        return next((b for b in budgets if b["id"] == budget_id), existing)

    values.append(budget_id)
    conn = get_connection()
    try:
        conn.execute(f"UPDATE budgets SET {', '.join(fields)} WHERE id = ?", values)
        conn.commit()
        updated = get_by_id(budget_id)
        budgets = get_by_month(updated["month"])
        return next((b for b in budgets if b["id"] == budget_id), updated)
    finally:
        conn.close()


def delete(budget_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute("DELETE FROM budgets WHERE id = ?", (budget_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def bulk_create(month: str, items: list) -> List[dict]:
    """Create multiple budgets at once, skipping existing ones."""
    conn = get_connection()
    try:
        for item in items:
            try:
                conn.execute(
                    "INSERT INTO budgets (category_id, month, limit_amount, warn_threshold) VALUES (?, ?, ?, ?)",
                    (item["category_id"], month, item["limit_amount"], item.get("warn_threshold", 80)),
                )
            except Exception:
                # Skip if budget already exists for this category+month
                pass
        conn.commit()
        return get_by_month(month)
    finally:
        conn.close()


def copy_forward(target_month: str) -> List[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT DISTINCT month FROM budgets ORDER BY month DESC LIMIT 1"
        ).fetchone()

        if not row:
            raise ValueError("No existing budgets found to copy from")

        source_month = row["month"]

        source_budgets = conn.execute(
            "SELECT category_id, limit_amount, warn_threshold FROM budgets WHERE month = ?",
            (source_month,),
        ).fetchall()

        if not source_budgets:
            raise ValueError(f"No budgets found for month {source_month}")

        for sb in source_budgets:
            try:
                conn.execute(
                    "INSERT INTO budgets (category_id, month, limit_amount, warn_threshold) VALUES (?, ?, ?, ?)",
                    (sb["category_id"], target_month, sb["limit_amount"], sb["warn_threshold"]),
                )
            except Exception:
                # Skip duplicates
                pass
        conn.commit()
        return get_by_month(target_month)
    finally:
        conn.close()
