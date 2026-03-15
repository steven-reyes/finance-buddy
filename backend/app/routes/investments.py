from fastapi import APIRouter, HTTPException
from app.models.investment import InvestmentCreate, InvestmentUpdate, UpdateValueRequest
from app.services import investment_service

router = APIRouter(prefix="/api/investments", tags=["investments"])


@router.get("/")
def list_investments():
    return investment_service.get_all()


@router.get("/summary")
def get_summary():
    return investment_service.get_summary()


@router.get("/{investment_id}")
def get_investment(investment_id: int):
    inv = investment_service.get_by_id(investment_id)
    if not inv:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Investment not found"}},
        )
    return inv


@router.get("/{investment_id}/snapshots")
def get_snapshots(investment_id: int):
    inv = investment_service.get_by_id(investment_id)
    if not inv:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Investment not found"}},
        )
    return investment_service.get_snapshots(investment_id)


@router.post("/", status_code=201)
def create_investment(dto: InvestmentCreate):
    return investment_service.create(dto)


@router.put("/{investment_id}")
def update_investment(investment_id: int, dto: InvestmentUpdate):
    inv = investment_service.update(investment_id, dto)
    if not inv:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Investment not found"}},
        )
    return inv


@router.put("/{investment_id}/value")
def update_value(investment_id: int, dto: UpdateValueRequest):
    inv = investment_service.update_value(investment_id, dto.current_value, dto.contributions)
    if not inv:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Investment not found"}},
        )
    return inv


@router.delete("/{investment_id}", status_code=204)
def delete_investment(investment_id: int):
    deleted = investment_service.delete(investment_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Investment not found"}},
        )
