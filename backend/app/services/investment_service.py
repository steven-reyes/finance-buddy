from typing import Optional, List
from app.database import get_connection
from app.models.investment import InvestmentCreate, InvestmentUpdate, UpdateValueRequest


def get_all() -> List[dict]:
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM investments ORDER BY name").fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_by_id(investment_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM investments WHERE id = ?", (investment_id,)
        ).fetchone()
        return dict(row) if row else None
    finally:
        conn.close()


def get_snapshots(investment_id: int) -> List[dict]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM investment_snapshots WHERE investment_id = ? ORDER BY recorded_at DESC",
            (investment_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def create(dto: InvestmentCreate) -> dict:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO investments (name, type, institution, contributions, current_value, notes) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (dto.name, dto.type, dto.institution, dto.contributions, dto.current_value, dto.notes),
        )
        conn.commit()
        inv_id = cursor.lastrowid

        # Create initial snapshot
        conn.execute(
            "INSERT INTO investment_snapshots (investment_id, value, contributions) VALUES (?, ?, ?)",
            (inv_id, dto.current_value, dto.contributions),
        )
        conn.commit()

        return get_by_id(inv_id)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update(investment_id: int, dto: InvestmentUpdate) -> Optional[dict]:
    existing = get_by_id(investment_id)
    if not existing:
        return None

    fields = []
    values = []
    update_data = dto.model_dump(exclude_unset=True)

    for key in ["name", "type", "institution", "notes"]:
        if key in update_data:
            fields.append(f"{key} = ?")
            values.append(update_data[key])

    if not fields:
        return existing

    values.append(investment_id)
    conn = get_connection()
    try:
        conn.execute(
            f"UPDATE investments SET {', '.join(fields)} WHERE id = ?", values
        )
        conn.commit()
        return get_by_id(investment_id)
    finally:
        conn.close()


def update_value(investment_id: int, current_value: int, contributions: Optional[int] = None) -> Optional[dict]:
    existing = get_by_id(investment_id)
    if not existing:
        return None

    conn = get_connection()
    try:
        contrib = contributions if contributions is not None else existing["contributions"]
        conn.execute(
            "UPDATE investments SET current_value = ?, contributions = ?, last_updated = datetime('now') WHERE id = ?",
            (current_value, contrib, investment_id),
        )
        # Record snapshot
        conn.execute(
            "INSERT INTO investment_snapshots (investment_id, value, contributions) VALUES (?, ?, ?)",
            (investment_id, current_value, contrib),
        )
        conn.commit()
        return get_by_id(investment_id)
    finally:
        conn.close()


def delete(investment_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute("DELETE FROM investments WHERE id = ?", (investment_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def get_summary() -> dict:
    conn = get_connection()
    try:
        rows = conn.execute("SELECT * FROM investments").fetchall()
        total_value = 0
        total_contributions = 0
        by_type = {}

        for r in rows:
            d = dict(r)
            total_value += d["current_value"]
            total_contributions += d["contributions"]
            t = d["type"]
            if t not in by_type:
                by_type[t] = {"type": t, "total_value": 0, "total_contributions": 0, "count": 0}
            by_type[t]["total_value"] += d["current_value"]
            by_type[t]["total_contributions"] += d["contributions"]
            by_type[t]["count"] += 1

        total_gain = total_value - total_contributions
        gain_pct = round((total_gain / total_contributions * 100) if total_contributions > 0 else 0, 2)

        return {
            "total_value": total_value,
            "total_contributions": total_contributions,
            "total_gain": total_gain,
            "gain_percentage": gain_pct,
            "by_type": list(by_type.values()),
        }
    finally:
        conn.close()
