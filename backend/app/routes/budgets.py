from fastapi import APIRouter, HTTPException, Query
from app.models.budget import BudgetCreate, BudgetUpdate, CopyForwardRequest
from app.services import budget_service

router = APIRouter(prefix="/api/budgets", tags=["budgets"])


@router.get("")
def list_budgets(month: str = Query(..., pattern=r'^\d{4}-\d{2}$')):
    return budget_service.get_by_month(month)


@router.post("", status_code=201)
def create_budget(dto: BudgetCreate):
    try:
        budget = budget_service.create(dto)
        return budget
    except ValueError as e:
        raise HTTPException(
            status_code=409,
            detail={"error": {"code": "DUPLICATE", "message": str(e)}},
        )


@router.put("/{budget_id}")
def update_budget(budget_id: int, dto: BudgetUpdate):
    budget = budget_service.update(budget_id, dto)
    if not budget:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Budget not found"}},
        )
    return budget


@router.delete("/{budget_id}", status_code=204)
def delete_budget(budget_id: int):
    deleted = budget_service.delete(budget_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Budget not found"}},
        )


@router.post("/copy-forward")
def copy_forward(dto: CopyForwardRequest):
    try:
        budgets = budget_service.copy_forward(dto.target_month)
        return budgets
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail={"error": {"code": "INVALID_REQUEST", "message": str(e)}},
        )
