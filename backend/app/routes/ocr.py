from fastapi import APIRouter, HTTPException, UploadFile, File
from typing import List
from pydantic import BaseModel
from app.services import ocr_service

router = APIRouter(prefix="/api/ocr", tags=["ocr"])


class OcrTransaction(BaseModel):
    type: str = "expense"
    amount: int
    date: str
    description: str
    category_id: int | None = None


class OcrConfirmRequest(BaseModel):
    upload_id: int
    transactions: List[OcrTransaction]


@router.get("/status")
def check_ocr_status():
    """Check if Tesseract OCR is available on this system."""
    available = ocr_service.check_tesseract()
    return {
        "available": available,
        "message": "Tesseract OCR is ready" if available else (
            "Tesseract OCR is not installed. Install it: "
            "Ubuntu/Debian: sudo apt install tesseract-ocr | "
            "macOS: brew install tesseract | "
            "Windows: download from https://github.com/UB-Mannheim/tesseract/wiki"
        ),
    }


ALLOWED_TYPES = {
    "image/jpeg", "image/png", "image/jpg",
    "application/pdf",
}


@router.post("/upload")
async def upload_image(file: UploadFile = File(...)):
    """Upload an image or PDF for OCR processing."""
    content_type = file.content_type or ""
    is_pdf = content_type == "application/pdf" or (file.filename or "").lower().endswith(".pdf")
    is_image = content_type.startswith("image/")

    if not is_pdf and not is_image:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_FILE", "message": "Only image files (JPG, PNG) and PDF files are accepted"}},
        )

    contents = await file.read()
    if len(contents) > 20 * 1024 * 1024:  # 20MB limit for PDFs
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "FILE_TOO_LARGE", "message": "File must be under 20MB"}},
        )

    try:
        if is_pdf:
            result = ocr_service.process_pdf(file.filename or "upload.pdf", contents)
        else:
            result = ocr_service.process_image(file.filename or "upload.png", contents)
        return result
    except RuntimeError as e:
        raise HTTPException(
            status_code=503,
            detail={"error": {"code": "OCR_UNAVAILABLE", "message": str(e)}},
        )


@router.post("/confirm")
def confirm_ocr(req: OcrConfirmRequest):
    """Confirm and import OCR-extracted transactions."""
    try:
        result = ocr_service.confirm_ocr_transactions(
            req.upload_id,
            [t.model_dump() for t in req.transactions],
        )
        return result
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "IMPORT_FAILED", "message": str(e)}},
        )
