import csv
import io
import json
from datetime import datetime
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
from app.database import get_connection

router = APIRouter(prefix="/api/export", tags=["export"])


@router.get("/transactions")
def export_transactions(
    format: str = Query(default="csv"),
    type: str = Query(default=None),
    category_id: int = Query(default=None),
    start_date: str = Query(default=None),
    end_date: str = Query(default=None),
    search: str = Query(default=None),
):
    conn = get_connection()
    try:
        base = (
            "SELECT tx.*, c.name as category_name "
            "FROM transactions tx "
            "LEFT JOIN categories c ON tx.category_id = c.id"
        )
        conditions = []
        params = []
        if type:
            conditions.append("tx.type = ?")
            params.append(type)
        if category_id is not None:
            conditions.append("tx.category_id = ?")
            params.append(category_id)
        if start_date:
            conditions.append("tx.date >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("tx.date <= ?")
            params.append(end_date)
        if search:
            conditions.append("(tx.description LIKE ? OR tx.notes LIKE ?)")
            search_term = f"%{search}%"
            params.extend([search_term, search_term])

        where = ""
        if conditions:
            where = " WHERE " + " AND ".join(conditions)

        rows = conn.execute(f"{base}{where} ORDER BY tx.date DESC", params).fetchall()
        transactions = [dict(r) for r in rows]
    finally:
        conn.close()

    if format == "csv":
        output = io.StringIO()
        if transactions:
            writer = csv.DictWriter(output, fieldnames=transactions[0].keys())
            writer.writeheader()
            writer.writerows(transactions)
        content = output.getvalue()
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=transactions_{datetime.now().strftime('%Y%m%d')}.csv"},
        )
    else:
        content = json.dumps(transactions, indent=2)
        return StreamingResponse(
            io.BytesIO(content.encode("utf-8")),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename=transactions_{datetime.now().strftime('%Y%m%d')}.json"},
        )


@router.get("/all")
def export_all(format: str = Query(default="json")):
    conn = get_connection()
    try:
        data = {}
        tables = ["categories", "transactions", "budgets", "investments",
                   "investment_snapshots", "savings_goals", "savings_goal_contributions",
                   "tags", "transaction_tags", "recurring_templates",
                   "csv_imports", "ocr_uploads"]
        for table in tables:
            rows = conn.execute(f"SELECT * FROM {table}").fetchall()
            data[table] = [dict(r) for r in rows]
    finally:
        conn.close()

    content = json.dumps(data, indent=2)
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=finance_buddy_export_{datetime.now().strftime('%Y%m%d')}.json"},
    )


@router.get("/backup")
def backup_database():
    conn = get_connection()
    try:
        data = {}
        # Get all user tables
        tables = conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE '__%'"
        ).fetchall()
        for table in tables:
            tname = table["name"]
            rows = conn.execute(f"SELECT * FROM {tname}").fetchall()
            data[tname] = [dict(r) for r in rows]

        # Include migrations info
        migrations = conn.execute("SELECT * FROM _migrations").fetchall()
        data["_migrations"] = [dict(r) for r in migrations]
    finally:
        conn.close()

    backup = {
        "version": "1.0",
        "exported_at": datetime.now().isoformat(),
        "data": data,
    }
    content = json.dumps(backup, indent=2)
    return StreamingResponse(
        io.BytesIO(content.encode("utf-8")),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=finance_buddy_backup_{datetime.now().strftime('%Y%m%d')}.json"},
    )
