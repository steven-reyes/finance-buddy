import base64
import math
import requests
from typing import Optional, List
from datetime import datetime
from app.database import get_connection
from app.services import transaction_service


def _dollars_to_cents(amount_str: str) -> int:
    """Convert SimpleFIN string decimal amount to integer cents."""
    return round(float(amount_str) * 100)


def _unix_to_date(timestamp) -> Optional[str]:
    """Convert Unix timestamp to YYYY-MM-DD string."""
    if timestamp is None:
        return None
    try:
        return datetime.utcfromtimestamp(int(timestamp)).strftime("%Y-%m-%d")
    except (ValueError, TypeError, OSError):
        return None


def exchange_setup_token(token: str) -> dict:
    """Exchange a SimpleFIN setup token for a persistent access URL.

    The token is base64-encoded. Decoding gives a claim URL.
    POST to the claim URL returns the access URL with embedded credentials.
    This is a one-time operation — the token cannot be reused.
    """
    conn = get_connection()
    try:
        # Decode the setup token to get claim URL
        try:
            claim_url = base64.b64decode(token).decode("utf-8")
        except Exception:
            raise ValueError("Invalid setup token format")

        # POST to claim URL to get access URL
        try:
            resp = requests.post(claim_url, timeout=10)
            resp.raise_for_status()
            access_url = resp.text.strip()
        except requests.exceptions.HTTPError as e:
            if e.response is not None and e.response.status_code == 403:
                raise ValueError(
                    "Setup token has already been claimed. Generate a new one from SimpleFIN."
                )
            raise ConnectionError(f"Failed to claim setup token: {e}")
        except requests.exceptions.RequestException as e:
            raise ConnectionError(f"Could not connect to SimpleFIN: {e}")

        if not access_url or "://" not in access_url:
            raise ValueError("Invalid access URL received from SimpleFIN")

        # Store the connection
        cursor = conn.execute(
            "INSERT INTO simplefin_connections (access_url, setup_token, status) "
            "VALUES (?, ?, 'active')",
            (access_url, token),
        )
        conn.commit()
        connection_id = cursor.lastrowid

        row = conn.execute(
            "SELECT * FROM simplefin_connections WHERE id = ?",
            (connection_id,),
        ).fetchone()
        return dict(row)
    finally:
        conn.close()


def get_connection_status() -> Optional[dict]:
    """Get the active SimpleFIN connection status with account count."""
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT sc.*, "
            "(SELECT COUNT(*) FROM linked_accounts la WHERE la.connection_id = sc.id) as account_count "
            "FROM simplefin_connections sc "
            "WHERE sc.status != 'disconnected' "
            "ORDER BY sc.id DESC LIMIT 1"
        ).fetchone()
        if not row:
            return None
        return dict(row)
    finally:
        conn.close()


def disconnect(connection_id: int) -> bool:
    """Disconnect a SimpleFIN connection (soft delete by status change)."""
    conn = get_connection()
    try:
        result = conn.execute(
            "UPDATE simplefin_connections SET status = 'disconnected', "
            "updated_at = datetime('now') WHERE id = ?",
            (connection_id,),
        )
        conn.commit()
        return result.rowcount > 0
    finally:
        conn.close()


def sync_accounts_and_transactions(connection_id: int) -> dict:
    """Sync accounts and transactions from SimpleFIN.

    Fetches data from SimpleFIN API, upserts linked accounts and
    synced transactions, and updates the connection status.
    """
    conn = get_connection()
    try:
        # Get the connection's access URL
        connection = conn.execute(
            "SELECT * FROM simplefin_connections WHERE id = ? AND status = 'active'",
            (connection_id,),
        ).fetchone()
        if not connection:
            raise ValueError("No active connection found")

        access_url = connection["access_url"]

        # Fetch from SimpleFIN API
        try:
            resp = requests.get(f"{access_url}/accounts", timeout=30)
            resp.raise_for_status()
            data = resp.json()
        except requests.exceptions.RequestException as e:
            # Mark connection as error
            conn.execute(
                "UPDATE simplefin_connections SET status = 'error', "
                "error_message = ?, updated_at = datetime('now') WHERE id = ?",
                (str(e), connection_id),
            )
            conn.commit()
            raise ConnectionError(f"Failed to fetch from SimpleFIN: {e}")

        accounts = data.get("accounts", [])
        counts = {
            "new_accounts": 0,
            "updated_accounts": 0,
            "new_transactions": 0,
            "updated_transactions": 0,
        }

        for acct in accounts:
            sf_account_id = acct.get("id", "")
            name = acct.get("name", "Unknown Account")
            institution = (
                acct.get("org", {}).get("name")
                if isinstance(acct.get("org"), dict)
                else None
            )
            balance_cents = _dollars_to_cents(str(acct.get("balance", "0")))
            available_cents = (
                _dollars_to_cents(str(acct.get("available-balance", "0")))
                if acct.get("available-balance") is not None
                else None
            )
            currency = acct.get("currency", "USD")

            # Upsert account
            existing = conn.execute(
                "SELECT id FROM linked_accounts WHERE simplefin_account_id = ?",
                (sf_account_id,),
            ).fetchone()

            if existing:
                conn.execute(
                    "UPDATE linked_accounts SET name = ?, institution = ?, "
                    "balance_cents = ?, available_balance_cents = ?, currency = ?, "
                    "last_synced = datetime('now'), updated_at = datetime('now') "
                    "WHERE id = ?",
                    (
                        name,
                        institution,
                        balance_cents,
                        available_cents,
                        currency,
                        existing["id"],
                    ),
                )
                account_id = existing["id"]
                counts["updated_accounts"] += 1
            else:
                cursor = conn.execute(
                    "INSERT INTO linked_accounts "
                    "(connection_id, simplefin_account_id, name, institution, "
                    "balance_cents, available_balance_cents, currency, last_synced) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))",
                    (
                        connection_id,
                        sf_account_id,
                        name,
                        institution,
                        balance_cents,
                        available_cents,
                        currency,
                    ),
                )
                account_id = cursor.lastrowid
                counts["new_accounts"] += 1

            # Upsert transactions for this account
            for txn in acct.get("transactions", []):
                sf_txn_id = txn.get("id", "")
                amount_cents = _dollars_to_cents(str(txn.get("amount", "0")))
                description = txn.get("description", "").strip() or "Unknown"
                posted_date = _unix_to_date(txn.get("posted"))
                transacted_date = _unix_to_date(txn.get("transacted_date"))
                pending = 1 if txn.get("pending", False) else 0

                existing_txn = conn.execute(
                    "SELECT id FROM synced_transactions WHERE simplefin_transaction_id = ?",
                    (sf_txn_id,),
                ).fetchone()

                if existing_txn:
                    conn.execute(
                        "UPDATE synced_transactions SET amount_cents = ?, description = ?, "
                        "posted_date = ?, transacted_date = ?, pending = ? "
                        "WHERE id = ?",
                        (
                            amount_cents,
                            description,
                            posted_date,
                            transacted_date,
                            pending,
                            existing_txn["id"],
                        ),
                    )
                    counts["updated_transactions"] += 1
                else:
                    conn.execute(
                        "INSERT INTO synced_transactions "
                        "(account_id, simplefin_transaction_id, amount_cents, description, "
                        "posted_date, transacted_date, pending) "
                        "VALUES (?, ?, ?, ?, ?, ?, ?)",
                        (
                            account_id,
                            sf_txn_id,
                            amount_cents,
                            description,
                            posted_date,
                            transacted_date,
                            pending,
                        ),
                    )
                    counts["new_transactions"] += 1

        # Update connection status
        # Try to get institution name from first account
        institution_name = None
        if accounts:
            org = accounts[0].get("org")
            if isinstance(org, dict):
                institution_name = org.get("name")

        conn.execute(
            "UPDATE simplefin_connections SET last_synced = datetime('now'), "
            "status = 'active', error_message = NULL, "
            "institution_name = COALESCE(?, institution_name), "
            "updated_at = datetime('now') WHERE id = ?",
            (institution_name, connection_id),
        )
        conn.commit()
        return counts
    finally:
        conn.close()


def get_linked_accounts(connection_id: int) -> List[dict]:
    """Get all linked accounts for a connection."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM linked_accounts WHERE connection_id = ? ORDER BY name",
            (connection_id,),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_synced_transactions(
    account_id: Optional[int] = None,
    imported: Optional[bool] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    page: int = 1,
    per_page: int = 50,
) -> dict:
    """Get synced transactions with filters and pagination."""
    conn = get_connection()
    try:
        base = (
            "FROM synced_transactions st "
            "JOIN linked_accounts la ON st.account_id = la.id"
        )
        conditions = []
        params = []

        if account_id is not None:
            conditions.append("st.account_id = ?")
            params.append(account_id)
        if imported is not None:
            conditions.append("st.imported = ?")
            params.append(1 if imported else 0)
        if start_date:
            conditions.append("st.posted_date >= ?")
            params.append(start_date)
        if end_date:
            conditions.append("st.posted_date <= ?")
            params.append(end_date)

        where = ""
        if conditions:
            where = " WHERE " + " AND ".join(conditions)

        # Count total
        total = conn.execute(
            f"SELECT COUNT(*) as cnt {base}{where}", params
        ).fetchone()["cnt"]

        # Fetch page
        offset = (page - 1) * per_page
        rows = conn.execute(
            f"SELECT st.*, la.name as account_name, la.institution as account_institution "
            f"{base}{where} "
            f"ORDER BY st.posted_date DESC, st.id DESC "
            f"LIMIT ? OFFSET ?",
            params + [per_page, offset],
        ).fetchall()

        transactions = []
        for r in rows:
            d = dict(r)
            d["pending"] = bool(d["pending"])
            d["imported"] = bool(d["imported"])
            transactions.append(d)

        total_pages = math.ceil(total / per_page) if per_page > 0 else 0

        return {
            "transactions": transactions,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
        }
    finally:
        conn.close()


def import_transaction(
    txn_id: int,
    category_id: Optional[int] = None,
    description_override: Optional[str] = None,
) -> dict:
    """Import a single synced transaction into the main transactions table.

    Determines income/expense from amount sign (negative = expense in SimpleFIN,
    but we store all amounts as positive cents with type field).
    Uses suggest_category from transaction_service if no category specified.
    """
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT st.*, la.name as account_name "
            "FROM synced_transactions st "
            "JOIN linked_accounts la ON st.account_id = la.id "
            "WHERE st.id = ? AND st.imported = 0",
            (txn_id,),
        ).fetchone()
        if not row:
            raise ValueError("Transaction not found or already imported")

        txn = dict(row)
        amount_cents = txn["amount_cents"]
        description = description_override or txn["description"]

        # SimpleFIN: negative amount = money leaving (expense), positive = money coming in (income)
        # Our app: all amounts positive, type determines sign
        if amount_cents >= 0:
            tx_type = "income"
            abs_cents = amount_cents
        else:
            tx_type = "expense"
            abs_cents = abs(amount_cents)

        # Auto-suggest category if not provided
        if category_id is None:
            suggestion = transaction_service.suggest_category(description)
            if suggestion:
                category_id = suggestion["category_id"]

        # Use posted_date, fall back to transacted_date, then today
        tx_date = (
            txn["posted_date"]
            or txn["transacted_date"]
            or datetime.now().strftime("%Y-%m-%d")
        )

        # Insert into main transactions table
        cursor = conn.execute(
            "INSERT INTO transactions (type, amount, description, date, category_id, notes) "
            "VALUES (?, ?, ?, ?, ?, ?)",
            (
                tx_type,
                abs_cents,
                description,
                tx_date,
                category_id,
                f"Imported from bank sync ({txn['account_name']})",
            ),
        )
        new_tx_id = cursor.lastrowid

        # Mark as imported
        conn.execute(
            "UPDATE synced_transactions SET imported = 1, imported_transaction_id = ? WHERE id = ?",
            (new_tx_id, txn_id),
        )
        conn.commit()

        return {
            "imported_transaction_id": new_tx_id,
            "type": tx_type,
            "amount": abs_cents,
            "description": description,
        }
    finally:
        conn.close()


def import_all_unimported(
    account_id: Optional[int] = None,
    default_category_id: Optional[int] = None,
) -> dict:
    """Bulk import all unimported synced transactions."""
    conn = get_connection()
    try:
        query = (
            "SELECT st.*, la.name as account_name "
            "FROM synced_transactions st "
            "JOIN linked_accounts la ON st.account_id = la.id "
            "WHERE st.imported = 0"
        )
        params = []
        if account_id is not None:
            query += " AND st.account_id = ?"
            params.append(account_id)
        query += " ORDER BY st.posted_date ASC"

        rows = conn.execute(query, params).fetchall()
        imported_count = 0

        for row in rows:
            txn = dict(row)
            amount_cents = txn["amount_cents"]
            description = txn["description"]

            if amount_cents >= 0:
                tx_type = "income"
                abs_cents = amount_cents
            else:
                tx_type = "expense"
                abs_cents = abs(amount_cents)

            # Try category suggestion, fall back to default
            cat_id = default_category_id
            suggestion = transaction_service.suggest_category(description)
            if suggestion:
                cat_id = suggestion["category_id"]

            tx_date = (
                txn["posted_date"]
                or txn["transacted_date"]
                or datetime.now().strftime("%Y-%m-%d")
            )

            cursor = conn.execute(
                "INSERT INTO transactions (type, amount, description, date, category_id, notes) "
                "VALUES (?, ?, ?, ?, ?, ?)",
                (
                    tx_type,
                    abs_cents,
                    description,
                    tx_date,
                    cat_id,
                    f"Imported from bank sync ({txn['account_name']})",
                ),
            )
            new_tx_id = cursor.lastrowid

            conn.execute(
                "UPDATE synced_transactions SET imported = 1, imported_transaction_id = ? WHERE id = ?",
                (new_tx_id, txn["id"]),
            )
            imported_count += 1

        conn.commit()
        return {"imported_count": imported_count}
    finally:
        conn.close()
