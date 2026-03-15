import re
import os
import json
import tempfile
from typing import List, Optional
from datetime import datetime
from PIL import Image
from app.database import get_connection

# Try to import pytesseract - graceful fallback if Tesseract not installed
try:
    import pytesseract
    TESSERACT_AVAILABLE = True
except Exception:
    TESSERACT_AVAILABLE = False

# Keywords that indicate summary/total lines (not individual items)
TOTAL_KEYWORDS = re.compile(
    r'\b(subtotal|sub\s*total|total|grand\s*total|balance|amount\s*due|'
    r'tax|sales\s*tax|hst|gst|vat|tip|gratuity|change|cash|credit|debit|'
    r'visa|mastercard|amex|payment|paid|tendered|savings|discount|you\s*saved)\b',
    re.IGNORECASE
)

# Common merchant/store patterns to extract from receipt headers
MERCHANT_STOP_WORDS = re.compile(
    r'\b(receipt|transaction|order|date|time|store|tel|phone|fax|www\.|http|address)\b',
    re.IGNORECASE
)

# Amount pattern: $1,234.56 or 1234.56 or $12.99
AMOUNT_PATTERN = re.compile(r'\$?\s*(\d{1,3}(?:,\d{3})*\.\d{2})')

# Date patterns
DATE_PATTERNS = [
    (re.compile(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})'), '%m/%d/%Y'),
    (re.compile(r'(\d{4})-(\d{2})-(\d{2})'), '%Y-%m-%d'),
    (re.compile(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})', re.IGNORECASE), '%b %d %Y'),
]


def check_tesseract() -> bool:
    """Check if Tesseract is available on the system."""
    if not TESSERACT_AVAILABLE:
        return False
    try:
        pytesseract.get_tesseract_version()
        return True
    except Exception:
        return False


def extract_text_from_image(image_path: str) -> str:
    """Run OCR on an image file and return extracted text."""
    if not check_tesseract():
        raise RuntimeError(
            "Tesseract OCR is not installed. Install it: "
            "Ubuntu/Debian: sudo apt install tesseract-ocr | "
            "macOS: brew install tesseract | "
            "Windows: download from https://github.com/UB-Mannheim/tesseract/wiki"
        )
    img = Image.open(image_path)
    text = pytesseract.image_to_string(img)
    return text


def _parse_date_from_text(text: str) -> Optional[str]:
    """Try to extract a date from a text string."""
    for pattern, fmt in DATE_PATTERNS:
        match = pattern.search(text)
        if match:
            try:
                if fmt == '%m/%d/%Y':
                    date_str = f"{match.group(1)}/{match.group(2)}/{match.group(3)}"
                    return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
                elif fmt == '%Y-%m-%d':
                    return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
                elif fmt == '%b %d %Y':
                    date_str = f"{match.group(1)} {match.group(2)} {match.group(3)}"
                    return datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
            except ValueError:
                continue
    return None


def _extract_merchant_name(lines: List[str]) -> Optional[str]:
    """Extract merchant/store name from the first few lines of a receipt."""
    for line in lines[:5]:
        line = line.strip()
        if not line or len(line) < 3:
            continue
        # Skip lines that are clearly not merchant names
        if MERCHANT_STOP_WORDS.search(line):
            continue
        if AMOUNT_PATTERN.search(line):
            continue
        if _parse_date_from_text(line):
            continue
        # Skip lines that are just numbers/symbols
        if re.match(r'^[\d\s\-\+\(\)#]+$', line):
            continue
        # This is likely the merchant name
        # Clean it up
        name = re.sub(r'\s+', ' ', line).strip()
        if len(name) >= 2:
            return name[:100]
    return None


def _is_total_line(text: str) -> bool:
    """Check if a line is a subtotal/total/tax line (not an individual item)."""
    return bool(TOTAL_KEYWORDS.search(text))


def _detect_document_type(lines: List[str]) -> str:
    """Detect if the document is a receipt or a bank statement.

    Receipt: single merchant, line items with a total
    Statement: multiple dated transactions from different merchants
    """
    dated_lines = 0
    amount_lines = 0
    for line in lines:
        if AMOUNT_PATTERN.search(line):
            amount_lines += 1
        if _parse_date_from_text(line) and AMOUNT_PATTERN.search(line):
            dated_lines += 1

    # If many lines have both dates and amounts, it's likely a statement
    if dated_lines >= 3:
        return "statement"
    return "receipt"


def _suggest_category_for_description(description: str) -> Optional[dict]:
    """Try to match description to a category using past transactions."""
    from app.services.transaction_service import suggest_category
    return suggest_category(description)


def _check_duplicate_in_db(amount: int, description: str, date: str) -> List[dict]:
    """Check if similar transactions already exist in the database."""
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT t.id, t.amount, t.date, t.description, "
            "c.name as category_name, c.icon as category_icon "
            "FROM transactions t "
            "LEFT JOIN categories c ON t.category_id = c.id "
            "WHERE t.amount = ? "
            "AND ABS(julianday(t.date) - julianday(?)) <= 3",
            (amount, date),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def _dedup_within_results(items: List[dict], doc_type: str) -> List[dict]:
    """Remove internal duplicates from extracted results.

    For receipts:
    - Remove total/subtotal/tax lines, keep only line items
    - If only totals found (no line items), keep the largest as a single entry

    For statements:
    - Remove exact duplicate amounts on the same date
    """
    if not items:
        return items

    if doc_type == "receipt":
        line_items = [i for i in items if not i.get("_is_total")]
        totals = [i for i in items if i.get("_is_total")]

        if line_items:
            # We have individual items — drop totals
            for item in line_items:
                item.pop("_is_total", None)
            return line_items
        elif totals:
            # Only totals found — keep the largest as a single transaction
            largest = max(totals, key=lambda x: x["amount"])
            largest.pop("_is_total", None)
            if largest["description"] in ("TOTAL", "Total", "OCR extracted item"):
                largest["description"] = "Purchase"
            return [largest]
        return items

    else:  # statement
        # Remove exact duplicates (same amount + same date + similar description)
        seen = set()
        deduped = []
        for item in items:
            key = (item["amount"], item["date"], item["description"][:20].lower())
            if key not in seen:
                seen.add(key)
                item.pop("_is_total", None)
                deduped.append(item)
        return deduped


def parse_amounts(text: str) -> List[dict]:
    """Extract transactions from OCR text with smart parsing."""
    lines = text.strip().split('\n')
    if not lines:
        return []

    # Detect document type
    doc_type = _detect_document_type(lines)

    # Extract merchant name (for receipts)
    merchant_name = _extract_merchant_name(lines) if doc_type == "receipt" else None

    # Find global date
    global_date = None
    for line in lines:
        global_date = _parse_date_from_text(line)
        if global_date:
            break
    if not global_date:
        global_date = datetime.now().strftime('%Y-%m-%d')

    results = []

    for line in lines:
        line = line.strip()
        if not line:
            continue

        amount_match = AMOUNT_PATTERN.search(line)
        if not amount_match:
            continue

        # Parse amount
        amount_str = amount_match.group(1).replace(',', '')
        try:
            amount_dollars = float(amount_str)
            amount_cents = round(amount_dollars * 100)
        except ValueError:
            continue

        if amount_cents <= 0:
            continue

        # Check if this is a total/subtotal line
        is_total = _is_total_line(line)

        # Extract description
        description = line
        description = AMOUNT_PATTERN.sub('', description)
        description = description.replace('$', '').strip()
        description = re.sub(r'\s+', ' ', description).strip(' -:.')

        # Clean up total-keyword descriptions
        if is_total:
            description = TOTAL_KEYWORDS.sub('', description).strip(' -:.')

        if not description or len(description) < 2:
            if merchant_name and not is_total:
                description = merchant_name
            elif is_total:
                description = "Total"
            else:
                description = "OCR extracted item"

        # Extract line-specific date (for statements)
        line_date = global_date
        if doc_type == "statement":
            parsed_date = _parse_date_from_text(line)
            if parsed_date:
                line_date = parsed_date
                # Remove date from description
                for pattern, _ in DATE_PATTERNS:
                    description = pattern.sub('', description).strip(' -:.')

        results.append({
            "amount": amount_cents,
            "date": line_date,
            "description": description[:500],
            "type": "expense",
            "_is_total": is_total,
        })

    # Deduplicate within results
    results = _dedup_within_results(results, doc_type)

    # Auto-categorize each result
    for item in results:
        suggestion = _suggest_category_for_description(item["description"])
        if suggestion:
            item["suggested_category_id"] = suggestion["category_id"]
            item["suggested_category_name"] = suggestion["category_name"]
            item["suggested_category_icon"] = suggestion.get("category_icon")

        # Also try merchant name for category suggestion
        if not suggestion and merchant_name:
            merchant_suggestion = _suggest_category_for_description(merchant_name)
            if merchant_suggestion:
                item["suggested_category_id"] = merchant_suggestion["category_id"]
                item["suggested_category_name"] = merchant_suggestion["category_name"]
                item["suggested_category_icon"] = merchant_suggestion.get("category_icon")

    # Check for duplicates against existing transactions
    for item in results:
        dupes = _check_duplicate_in_db(item["amount"], item["description"], item["date"])
        if dupes:
            item["potential_duplicates"] = dupes
            item["is_duplicate"] = True
        else:
            item["potential_duplicates"] = []
            item["is_duplicate"] = False

    return results


def process_image(filename: str, file_bytes: bytes) -> dict:
    """Full OCR pipeline: save image, extract text, parse, store in DB."""
    suffix = os.path.splitext(filename)[1] or '.png'
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        # Extract text
        raw_text = extract_text_from_image(tmp_path)

        # Detect document type
        lines = raw_text.strip().split('\n')
        doc_type = _detect_document_type(lines)
        merchant_name = _extract_merchant_name(lines) if doc_type == "receipt" else None

        # Parse transactions
        extracted = parse_amounts(raw_text)

        # Store in DB
        conn = get_connection()
        try:
            cursor = conn.execute(
                "INSERT INTO ocr_uploads (filename, raw_text, extracted_data, status) VALUES (?, ?, ?, ?)",
                (filename, raw_text, json.dumps(extracted), 'processed'),
            )
            conn.commit()
            upload_id = cursor.lastrowid
        finally:
            conn.close()

        return {
            "upload_id": upload_id,
            "filename": filename,
            "raw_text": raw_text,
            "doc_type": doc_type,
            "merchant_name": merchant_name,
            "transactions": extracted,
            "count": len(extracted),
            "duplicate_count": sum(1 for t in extracted if t.get("is_duplicate")),
        }
    except RuntimeError as e:
        conn = get_connection()
        try:
            conn.execute(
                "INSERT INTO ocr_uploads (filename, raw_text, extracted_data, status) VALUES (?, ?, ?, ?)",
                (filename, None, None, 'failed'),
            )
            conn.commit()
        finally:
            conn.close()
        raise
    finally:
        os.unlink(tmp_path)


def confirm_ocr_transactions(upload_id: int, transactions: list) -> dict:
    """Confirm and bulk-insert OCR-extracted transactions."""
    from app.services.transaction_service import bulk_create
    from app.models.transaction import TransactionCreate

    dtos = []
    for tx in transactions:
        dtos.append(TransactionCreate(
            type=tx.get("type", "expense"),
            amount=tx["amount"],
            date=tx["date"],
            description=tx["description"],
            category_id=tx.get("category_id"),
        ))

    created = bulk_create(dtos, ocr_upload_id=upload_id)

    # Update upload status
    conn = get_connection()
    try:
        conn.execute("UPDATE ocr_uploads SET status = 'confirmed' WHERE id = ?", (upload_id,))
        conn.commit()
    finally:
        conn.close()

    return {"upload_id": upload_id, "created": len(created)}
