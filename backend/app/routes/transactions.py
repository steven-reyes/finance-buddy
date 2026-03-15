from fastapi import APIRouter, HTTPException, Query
from typing import Optional, Literal, List
from app.models.transaction import (
    Transaction,
    TransactionCreate,
    TransactionUpdate,
    TransactionFilters,
    PaginatedTransactions,
)
from app.services import transaction_service, tag_service

router = APIRouter(prefix="/api/transactions", tags=["transactions"])


@router.get("")
def list_transactions(
    type: Optional[Literal["income", "expense"]] = None,
    category_id: Optional[int] = None,
    tag_id: Optional[int] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=20, ge=1, le=100),
):
    filters = TransactionFilters(
        type=type,
        category_id=category_id,
        tag_id=tag_id,
        start_date=start_date,
        end_date=end_date,
        search=search,
        page=page,
        limit=limit,
    )
    return transaction_service.get_all(filters)


@router.get("/suggest-category")
def suggest_category(description: str = Query(..., min_length=1)):
    result = transaction_service.suggest_category(description)
    if not result:
        return {"suggestion": None}
    return {"suggestion": result}


@router.get("/{transaction_id}")
def get_transaction(transaction_id: int):
    tx = transaction_service.get_by_id(transaction_id)
    if not tx:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Transaction not found"}},
        )
    return tx


@router.post("", status_code=201)
def create_transaction(dto: TransactionCreate):
    tx = transaction_service.create(dto)
    return tx


@router.put("/{transaction_id}")
def update_transaction(transaction_id: int, dto: TransactionUpdate):
    tx = transaction_service.update(transaction_id, dto)
    if not tx:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Transaction not found"}},
        )
    return tx


@router.delete("/{transaction_id}", status_code=204)
def delete_transaction(transaction_id: int):
    deleted = transaction_service.delete(transaction_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Transaction not found"}},
        )


@router.post("/bulk", status_code=201)
def bulk_create_transactions(dtos: List[TransactionCreate]):
    created = transaction_service.bulk_create(dtos)
    return {"created": len(created), "transactions": created}


@router.post("/{transaction_id}/tags")
def set_transaction_tags(transaction_id: int, tag_ids: List[int]):
    try:
        tag_service.set_transaction_tags(transaction_id, tag_ids)
        return {"message": "Tags updated"}
    except ValueError as e:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": str(e)}},
        )
