from typing import Optional, List
import calendar
from datetime import datetime, timedelta, date
from app.database import get_connection
from app.models.recurring import RecurringCreate, RecurringUpdate


def get_all() -> List[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT rt.*, c.name as category_name "
            "FROM recurring_templates rt "
            "LEFT JOIN categories c ON rt.category_id = c.id "
            "ORDER BY rt.is_active DESC, rt.description"
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_by_id(template_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT rt.*, c.name as category_name "
            "FROM recurring_templates rt "
            "LEFT JOIN categories c ON rt.category_id = c.id "
            "WHERE rt.id = ?",
            (template_id,),
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def create(dto: RecurringCreate) -> dict:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO recurring_templates (type, amount, description, category_id, frequency, start_date, end_date) "
            "VALUES (?, ?, ?, ?, ?, ?, ?)",
            (dto.type, dto.amount, dto.description, dto.category_id, dto.frequency, dto.start_date, dto.end_date),
        )
        conn.commit()
        return get_by_id(cursor.lastrowid)
    finally:
        conn.close()


def update(template_id: int, dto: RecurringUpdate) -> Optional[dict]:
    existing = get_by_id(template_id)
    if not existing:
        return None

    fields = []
    values = []
    update_data = dto.model_dump(exclude_unset=True)

    for key in ["type", "amount", "description", "category_id", "frequency", "end_date", "is_active"]:
        if key in update_data:
            fields.append(f"{key} = ?")
            values.append(update_data[key])

    if not fields:
        return existing

    values.append(template_id)
    conn = get_connection()
    try:
        conn.execute(
            f"UPDATE recurring_templates SET {', '.join(fields)} WHERE id = ?", values
        )
        conn.commit()
        return get_by_id(template_id)
    finally:
        conn.close()


def delete(template_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute("DELETE FROM recurring_templates WHERE id = ?", (template_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def _add_frequency(d: date, frequency: str, original_day: int) -> date:
    """Compute the next date given a frequency, preserving the original day of month."""
    if frequency == "weekly":
        return d + timedelta(weeks=1)
    elif frequency == "biweekly":
        return d + timedelta(weeks=2)
    elif frequency == "monthly":
        month = d.month + 1
        year = d.year
        if month > 12:
            month = 1
            year += 1
        last_day = calendar.monthrange(year, month)[1]
        day = min(original_day, last_day)
        return date(year, month, day)
    elif frequency == "quarterly":
        month = d.month + 3
        year = d.year
        while month > 12:
            month -= 12
            year += 1
        last_day = calendar.monthrange(year, month)[1]
        day = min(original_day, last_day)
        return date(year, month, day)
    elif frequency == "yearly":
        year = d.year + 1
        last_day = calendar.monthrange(year, d.month)[1]
        day = min(original_day, last_day)
        return date(year, d.month, day)
    return d


def bulk_create(templates: list) -> list:
    """Create multiple recurring templates at once."""
    results = []
    for t in templates:
        result = create(t)
        results.append(result)
    return results


def generate_due_transactions() -> int:
    """Generate all due recurring transactions up to today. Returns count of generated transactions."""
    today = date.today()
    conn = get_connection()
    generated_count = 0
    try:
        templates = conn.execute(
            "SELECT * FROM recurring_templates WHERE is_active = 1"
        ).fetchall()

        for tmpl in templates:
            t = dict(tmpl)
            start = datetime.strptime(t["start_date"], "%Y-%m-%d").date()
            end_date = None
            if t["end_date"]:
                end_date = datetime.strptime(t["end_date"], "%Y-%m-%d").date()
                if end_date < today:
                    continue

            original_day = start.day

            # Determine the next date to generate from
            if t["last_generated"]:
                last_gen = datetime.strptime(t["last_generated"], "%Y-%m-%d").date()
                next_date = _add_frequency(last_gen, t["frequency"], original_day)
            else:
                next_date = start

            # Generate transactions for all due dates up to today
            while next_date <= today:
                if end_date and next_date > end_date:
                    break

                conn.execute(
                    "INSERT INTO transactions (type, amount, date, description, category_id, recurring_template_id) "
                    "VALUES (?, ?, ?, ?, ?, ?)",
                    (t["type"], t["amount"], next_date.isoformat(), t["description"], t["category_id"], t["id"]),
                )
                generated_count += 1

                conn.execute(
                    "UPDATE recurring_templates SET last_generated = ? WHERE id = ?",
                    (next_date.isoformat(), t["id"]),
                )

                next_date = _add_frequency(next_date, t["frequency"], original_day)

        conn.commit()
        return generated_count
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()
