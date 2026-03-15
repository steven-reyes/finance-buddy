from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Dict, Optional
from app.services import csv_service

router = APIRouter(prefix="/api/csv", tags=["csv-import"])


class ConfirmImportRequest(BaseModel):
    filename: str
    file_hash: str
    column_mapping: Dict[str, str]
    default_type: str = "expense"


# Store uploaded file content temporarily in memory (keyed by file_hash)
_upload_cache: Dict[str, bytes] = {}


@router.post("/upload")
async def upload_csv(file: UploadFile = File(...)):
    if not file.filename or not file.filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_FILE", "message": "File must be a CSV"}},
        )

    content = await file.read()
    if len(content) == 0:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "EMPTY_FILE", "message": "File is empty"}},
        )

    try:
        result = csv_service.parse_csv(content, file.filename)
        # Cache the file content for the confirm step
        _upload_cache[result["file_hash"]] = content
        return result
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "PARSE_ERROR", "message": str(e)}},
        )


@router.post("/confirm")
def confirm_import(dto: ConfirmImportRequest):
    file_content = _upload_cache.get(dto.file_hash)
    if not file_content:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "NO_FILE", "message": "File not found. Please upload again."}},
        )

    try:
        result = csv_service.confirm_import(
            filename=dto.filename,
            file_hash=dto.file_hash,
            file_content=file_content,
            column_mapping=dto.column_mapping,
            default_type=dto.default_type,
        )
        # Clean up cache
        _upload_cache.pop(dto.file_hash, None)
        return result
    except Exception as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "IMPORT_ERROR", "message": str(e)}},
        )
