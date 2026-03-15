import csv
import io
import hashlib
import json
from typing import List, Optional
from app.database import get_connection
from app.models.transaction import TransactionCreate
from app.services import transaction_service


def parse_csv(file_content: bytes, filename: str) -> dict:
    """Parse a CSV file and return preview data with detected columns."""
    text = file_content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    headers = reader.fieldnames or []
    rows = []
    for i, row in enumerate(reader):
        if i >= 100:  # Preview limit
            break
        rows.append(dict(row))

    file_hash = hashlib.md5(file_content).hexdigest()

    # Check for duplicate import
    conn = get_connection()
    try:
        existing = conn.execute(
            "SELECT id FROM csv_imports WHERE file_hash = ?", (file_hash,)
        ).fetchone()
        is_duplicate = existing is not None
    finally:
        conn.close()

    # Auto-detect column mapping
    mapping = _detect_mapping(headers)

    return {
        "filename": filename,
        "file_hash": file_hash,
        "headers": headers,
        "row_count": len(rows),
        "preview": rows[:10],
        "suggested_mapping": mapping,
        "is_duplicate": is_duplicate,
    }


def _detect_mapping(headers: List[str]) -> dict:
    """Try to auto-detect column mapping from common header names."""
    mapping = {}
    lower_headers = {h.lower().strip(): h for h in headers}

    # Date detection
    for candidate in ["date", "transaction date", "trans date", "posted date"]:
        if candidate in lower_headers:
            mapping["date"] = lower_headers[candidate]
            break

    # Description detection
    for candidate in ["description", "memo", "name", "payee", "merchant", "details"]:
        if candidate in lower_headers:
            mapping["description"] = lower_headers[candidate]
            break

    # Amount detection
    for candidate in ["amount", "total", "sum", "value"]:
        if candidate in lower_headers:
            mapping["amount"] = lower_headers[candidate]
            break

    # Type detection
    for candidate in ["type", "transaction type", "credit/debit"]:
        if candidate in lower_headers:
            mapping["type"] = lower_headers[candidate]
            break

    # Category detection
    for candidate in ["category", "category name"]:
        if candidate in lower_headers:
            mapping["category"] = lower_headers[candidate]
            break

    return mapping


def confirm_import(
    filename: str,
    file_hash: str,
    file_content: bytes,
    column_mapping: dict,
    default_type: str = "expense",
) -> dict:
    """Import transactions from CSV using the provided column mapping."""
    text = file_content.decode("utf-8-sig")
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)

    # Record the import
    conn = get_connection()
    try:
        cursor = conn.execute(
            "INSERT INTO csv_imports (filename, file_hash, row_count, column_mapping) VALUES (?, ?, ?, ?)",
            (filename, file_hash, len(rows), json.dumps(column_mapping)),
        )
        conn.commit()
        import_id = cursor.lastrowid
    finally:
        conn.close()

    # Build transactions
    transactions = []
    errors = []
    for i, row in enumerate(rows):
        try:
            tx = _row_to_transaction(row, column_mapping, default_type)
            if tx:
                transactions.append(tx)
        except Exception as e:
            errors.append({"row": i + 2, "error": str(e)})

    # Bulk insert
    created = transaction_service.bulk_create(transactions, csv_import_id=import_id)

    return {
        "import_id": import_id,
        "total_rows": len(rows),
        "imported": len(created),
        "errors": errors,
    }


def _row_to_transaction(row: dict, mapping: dict, default_type: str) -> Optional[TransactionCreate]:
    """Convert a CSV row to a TransactionCreate using the column mapping."""
    date_col = mapping.get("date")
    desc_col = mapping.get("description")
    amount_col = mapping.get("amount")
    type_col = mapping.get("type")

    if not date_col or not amount_col:
        return None

    date_val = row.get(date_col, "").strip()
    if not date_val:
        return None

    # Try to normalize date format
    date_val = _normalize_date(date_val)
    if not date_val:
        return None

    amount_str = row.get(amount_col, "").strip()
    if not amount_str:
        return None

    # Parse amount - remove currency symbols, commas
    amount_str = amount_str.replace("$", "").replace(",", "").strip()
    try:
        amount_float = float(amount_str)
    except ValueError:
        return None

    # Determine type
    tx_type = default_type
    if type_col and row.get(type_col):
        type_val = row[type_col].strip().lower()
        if type_val in ("income", "credit", "deposit"):
            tx_type = "income"
        else:
            tx_type = "expense"
    elif amount_float < 0:
        tx_type = "expense"
        amount_float = abs(amount_float)

    # Convert to cents
    amount_cents = int(round(amount_float * 100))
    if amount_cents <= 0:
        return None

    description = row.get(desc_col, "CSV Import").strip() if desc_col else "CSV Import"
    if not description:
        description = "CSV Import"

    return TransactionCreate(
        type=tx_type,
        amount=amount_cents,
        date=date_val,
        description=description,
    )


def _normalize_date(date_str: str) -> Optional[str]:
    """Try to normalize various date formats to YYYY-MM-DD."""
    from datetime import datetime

    formats = [
        "%Y-%m-%d",
        "%m/%d/%Y",
        "%m/%d/%y",
        "%d/%m/%Y",
        "%Y/%m/%d",
        "%m-%d-%Y",
        "%d-%m-%Y",
        "%b %d, %Y",
        "%B %d, %Y",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(date_str.strip(), fmt)
            return dt.strftime("%Y-%m-%d")
        except ValueError:
            continue
    return None
