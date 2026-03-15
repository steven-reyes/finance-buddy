from typing import Optional, List
from app.database import get_connection
from app.models.transaction import TransactionCreate, TransactionUpdate, TransactionFilters
from app.services import tag_service
import math


def _row_to_dict(row) -> dict:
    d = dict(row)
    return d


def _get_tags_for_transaction(conn, tx_id: int) -> List[dict]:
    rows = conn.execute(
        "SELECT t.id, t.name, t.color FROM tags t "
        "JOIN transaction_tags tt ON tt.tag_id = t.id "
        "WHERE tt.transaction_id = ?",
        (tx_id,),
    ).fetchall()
    return [dict(r) for r in rows]


def get_all(filters: TransactionFilters) -> dict:
    conn = get_connection()
    try:
        base_query = (
            "FROM transactions tx "
            "LEFT JOIN categories c ON tx.category_id = c.id"
        )
        conditions = []
        params = []

        if filters.type:
            conditions.append("tx.type = ?")
            params.append(filters.type)
        if filters.category_id is not None:
            conditions.append("tx.category_id = ?")
            params.append(filters.category_id)
        if filters.start_date:
            conditions.append("tx.date >= ?")
            params.append(filters.start_date)
        if filters.end_date:
            conditions.append("tx.date <= ?")
            params.append(filters.end_date)
        if filters.search:
            conditions.append("(tx.description LIKE ? OR tx.notes LIKE ?)")
            search_term = f"%{filters.search}%"
            params.extend([search_term, search_term])
        if filters.tag_id is not None:
            base_query += " JOIN transaction_tags tt ON tt.transaction_id = tx.id"
            conditions.append("tt.tag_id = ?")
            params.append(filters.tag_id)

        where_clause = ""
        if conditions:
            where_clause = " WHERE " + " AND ".join(conditions)

        count_sql = f"SELECT COUNT(DISTINCT tx.id) as total {base_query}{where_clause}"
        total = conn.execute(count_sql, params).fetchone()["total"]

        total_pages = max(1, math.ceil(total / filters.limit))
        offset = (filters.page - 1) * filters.limit

        # Compute filtered totals across all pages
        totals_sql = (
            f"SELECT "
            f"COALESCE(SUM(CASE WHEN tx.type = 'income' THEN tx.amount ELSE 0 END), 0) as filtered_income, "
            f"COALESCE(SUM(CASE WHEN tx.type = 'expense' THEN tx.amount ELSE 0 END), 0) as filtered_expenses "
            f"{base_query}{where_clause}"
        )
        total_row = conn.execute(totals_sql, params).fetchone()
        filtered_income = total_row["filtered_income"]
        filtered_expenses = total_row["filtered_expenses"]

        # Sorting
        valid_sorts = {"date": "tx.date", "description": "tx.description", "amount": "tx.amount", "category": "c.name"}
        sort_col = valid_sorts.get(filters.sort_by, "tx.date")
        sort_dir = "ASC" if filters.sort_order == "asc" else "DESC"
        order_clause = f"ORDER BY {sort_col} {sort_dir}, tx.id DESC"

        select_sql = (
            f"SELECT DISTINCT tx.*, c.name as category_name, c.color as category_color, c.icon as category_icon "
            f"{base_query}{where_clause} "
            f"{order_clause} LIMIT ? OFFSET ?"
        )
        rows = conn.execute(select_sql, params + [filters.limit, offset]).fetchall()

        data = []
        for row in rows:
            d = dict(row)
            d["tags"] = _get_tags_for_transaction(conn, d["id"])
            data.append(d)

        return {
            "data": data,
            "total": total,
            "page": filters.page,
            "limit": filters.limit,
            "total_pages": total_pages,
            "filtered_income": filtered_income,
            "filtered_expenses": filtered_expenses,
            "filtered_net": filtered_income - filtered_expenses,
        }
    finally:
        conn.close()


def get_by_id(tx_id: int) -> Optional[dict]:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT tx.*, c.name as category_name, c.color as category_color, c.icon as category_icon "
            "FROM transactions tx "
            "LEFT JOIN categories c ON tx.category_id = c.id "
            "WHERE tx.id = ?",
            (tx_id,),
        ).fetchone()
        if not row:
            return None
        d = dict(row)
        d["tags"] = _get_tags_for_transaction(conn, d["id"])
        return d
    finally:
        conn.close()


def create(dto: TransactionCreate) -> dict:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO transactions (type, amount, date, description, notes, category_id) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (dto.type, dto.amount, dto.date, dto.description, dto.notes, dto.category_id),
        )
        conn.commit()
        tx_id = cursor.lastrowid

        if dto.tag_ids:
            tag_service.set_transaction_tags(tx_id, dto.tag_ids)

        return get_by_id(tx_id)
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def update(tx_id: int, dto: TransactionUpdate) -> Optional[dict]:
    existing = get_by_id(tx_id)
    if not existing:
        return None

    fields = []
    values = []
    update_data = dto.model_dump(exclude_unset=True)

    tag_ids = update_data.pop("tag_ids", None)

    field_map = {
        "type": "type",
        "amount": "amount",
        "date": "date",
        "description": "description",
        "notes": "notes",
        "category_id": "category_id",
    }

    for key, col in field_map.items():
        if key in update_data:
            fields.append(f"{col} = ?")
            values.append(update_data[key])

    if fields:
        fields.append("updated_at = datetime('now')")
        values.append(tx_id)
        conn = get_connection()
        try:
            conn.execute(
                f"UPDATE transactions SET {', '.join(fields)} WHERE id = ?", values
            )
            conn.commit()
        finally:
            conn.close()

    if tag_ids is not None:
        tag_service.set_transaction_tags(tx_id, tag_ids)

    return get_by_id(tx_id)


def delete(tx_id: int) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def bulk_delete(ids: list) -> int:
    if not ids:
        return 0
    conn = get_connection()
    try:
        placeholders = ",".join("?" * len(ids))
        cursor = conn.execute(f"DELETE FROM transactions WHERE id IN ({placeholders})", ids)
        conn.commit()
        return cursor.rowcount
    finally:
        conn.close()


def suggest_category(description: str) -> dict | None:
    conn = get_connection()
    try:
        # Search for past transactions with similar descriptions
        # Use LIKE with the first significant word(s)
        words = description.strip().split()
        if not words:
            return None

        # Try exact match first, then first word match
        for search_term in [description.strip(), words[0]]:
            row = conn.execute(
                "SELECT t.category_id, c.name, c.icon, c.color, COUNT(*) as cnt "
                "FROM transactions t "
                "JOIN categories c ON t.category_id = c.id "
                "WHERE t.description LIKE ? "
                "GROUP BY t.category_id "
                "ORDER BY cnt DESC LIMIT 1",
                (f"%{search_term}%",),
            ).fetchone()
            if row:
                return {
                    "category_id": row["category_id"],
                    "category_name": row["name"],
                    "category_icon": row["icon"],
                    "category_color": row["color"],
                    "confidence": "high" if search_term == description.strip() else "medium",
                    "match_count": row["cnt"],
                }

        return None
    finally:
        conn.close()


def check_duplicates(amount: int, description: str, date: str) -> list:
    """Check for potential duplicate transactions within 3 days."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT t.id, t.type, t.amount, t.date, t.description, "
            "c.name as category_name, c.icon as category_icon "
            "FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.amount = ? "
            "AND t.description LIKE ? "
            "AND ABS(julianday(t.date) - julianday(?)) <= 3",
            (amount, f"%{description}%", date),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def bulk_create(transactions: List[TransactionCreate], csv_import_id: Optional[int] = None, ocr_upload_id: Optional[int] = None) -> List[dict]:
    conn = get_connection()
    created_ids = []
    try:
        for dto in transactions:
            cursor = conn.execute(
                "INSERT INTO transactions (type, amount, date, description, notes, category_id, csv_import_id, ocr_upload_id) "
                "VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
                (dto.type, dto.amount, dto.date, dto.description, dto.notes, dto.category_id, csv_import_id, ocr_upload_id),
            )
            created_ids.append(cursor.lastrowid)
            if dto.tag_ids:
                for tag_id in dto.tag_ids:
                    conn.execute(
                        "INSERT OR IGNORE INTO transaction_tags (transaction_id, tag_id) VALUES (?, ?)",
                        (cursor.lastrowid, tag_id),
                    )
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

    return [get_by_id(tid) for tid in created_ids]
