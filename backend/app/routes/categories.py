from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.category import Category, CategoryCreate, CategoryUpdate
from app.services import category_service

router = APIRouter(prefix="/api/categories", tags=["categories"])


@router.get("")
def list_categories(type: Optional[str] = Query(None)):
    categories = category_service.get_all(type_filter=type)
    return categories


@router.post("", status_code=201)
def create_category(dto: CategoryCreate):
    try:
        category = category_service.create(dto)
        return category
    except ValueError as e:
        raise HTTPException(status_code=409, detail={"error": {"code": "DUPLICATE", "message": str(e)}})


@router.put("/{category_id}")
def update_category(category_id: int, dto: CategoryUpdate):
    try:
        category = category_service.update(category_id, dto)
        if not category:
            raise HTTPException(
                status_code=404,
                detail={"error": {"code": "NOT_FOUND", "message": "Category not found"}},
            )
        return category
    except ValueError as e:
        raise HTTPException(status_code=409, detail={"error": {"code": "DUPLICATE", "message": str(e)}})


@router.delete("/{category_id}", status_code=204)
def delete_category(category_id: int):
    try:
        deleted = category_service.delete(category_id)
        if not deleted:
            raise HTTPException(
                status_code=404,
                detail={"error": {"code": "NOT_FOUND", "message": "Category not found"}},
            )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "DELETE_DEFAULT", "message": str(e)}},
        )
