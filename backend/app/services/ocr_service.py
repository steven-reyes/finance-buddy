import re
import os
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


def parse_amounts(text: str) -> List[dict]:
    """Extract dollar amounts and nearby text from OCR output."""
    results = []
    lines = text.strip().split('\n')

    # Regex for dollar amounts: $1,234.56 or 1234.56 or $12.99
    amount_pattern = re.compile(r'\$?\s*(\d{1,3}(?:,\d{3})*(?:\.\d{2}))')
    # Date patterns
    date_patterns = [
        # MM/DD/YYYY or MM-DD-YYYY
        (re.compile(r'(\d{1,2})[/\-](\d{1,2})[/\-](\d{4})'), '%m/%d/%Y'),
        # YYYY-MM-DD
        (re.compile(r'(\d{4})-(\d{2})-(\d{2})'), '%Y-%m-%d'),
        # Month DD, YYYY (e.g., Mar 14, 2026 or March 14, 2026)
        (re.compile(r'(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})', re.IGNORECASE), '%b %d %Y'),
    ]

    # Try to find a global date in the text
    global_date = None
    for line in lines:
        for pattern, fmt in date_patterns:
            match = pattern.search(line)
            if match:
                try:
                    if fmt == '%m/%d/%Y':
                        date_str = f"{match.group(1)}/{match.group(2)}/{match.group(3)}"
                        global_date = datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
                    elif fmt == '%Y-%m-%d':
                        global_date = f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
                    elif fmt == '%b %d %Y':
                        date_str = f"{match.group(1)} {match.group(2)} {match.group(3)}"
                        global_date = datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
                    break
                except ValueError:
                    continue
        if global_date:
            break

    if not global_date:
        global_date = datetime.now().strftime('%Y-%m-%d')

    for line in lines:
        line = line.strip()
        if not line:
            continue

        amount_match = amount_pattern.search(line)
        if amount_match:
            # Parse the amount
            amount_str = amount_match.group(1).replace(',', '')
            try:
                amount_dollars = float(amount_str)
                amount_cents = round(amount_dollars * 100)
            except ValueError:
                continue

            if amount_cents <= 0:
                continue

            # Extract description (the line minus the amount)
            description = line
            description = amount_pattern.sub('', description)
            description = description.replace('$', '').strip()
            description = re.sub(r'\s+', ' ', description).strip(' -:.')

            if not description:
                description = "OCR extracted item"

            # Check for a date on this specific line
            line_date = global_date
            for pattern, fmt in date_patterns:
                match = pattern.search(line)
                if match:
                    try:
                        if fmt == '%m/%d/%Y':
                            date_str = f"{match.group(1)}/{match.group(2)}/{match.group(3)}"
                            line_date = datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
                        elif fmt == '%Y-%m-%d':
                            line_date = f"{match.group(1)}-{match.group(2)}-{match.group(3)}"
                        elif fmt == '%b %d %Y':
                            date_str = f"{match.group(1)} {match.group(2)} {match.group(3)}"
                            line_date = datetime.strptime(date_str, fmt).strftime('%Y-%m-%d')
                    except ValueError:
                        pass
                    break

            results.append({
                "amount": amount_cents,
                "date": line_date,
                "description": description[:500],
                "type": "expense",
            })

    return results


def process_image(filename: str, file_bytes: bytes) -> dict:
    """Full OCR pipeline: save image, extract text, parse, store in DB."""
    # Save to temp file
    suffix = os.path.splitext(filename)[1] or '.png'
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        # Extract text
        raw_text = extract_text_from_image(tmp_path)

        # Parse transactions
        extracted = parse_amounts(raw_text)

        # Store in DB
        import json
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
            "transactions": extracted,
            "count": len(extracted),
        }
    except RuntimeError as e:
        # Tesseract not available
        conn = get_connection()
        try:
            cursor = conn.execute(
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
