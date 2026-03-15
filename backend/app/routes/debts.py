from fastapi import APIRouter, HTTPException, Query
from typing import Optional
from app.models.debt import DebtCreate, DebtUpdate, DebtPaymentCreate, PaycheckAllocation
from app.services import debt_service

router = APIRouter(prefix="/api/debts", tags=["debts"])


# --- Static paths BEFORE dynamic {debt_id} to avoid path conflicts ---

@router.get("/summary")
def get_summary():
    return debt_service.get_summary()


@router.get("/payoff-plan")
def get_payoff_plan(
    strategy: str = Query(default="avalanche", pattern=r'^(avalanche|snowball)$'),
    extra_monthly: int = Query(default=0, ge=0),
):
    return debt_service.get_payoff_plan(strategy=strategy, extra_monthly=extra_monthly)


@router.post("/allocate")
def allocate_paycheck(dto: PaycheckAllocation):
    return debt_service.allocate_paycheck(
        paycheck_amount=dto.paycheck_amount,
        pay_date=dto.pay_date,
    )


@router.get("/insights")
def get_debt_insights():
    return debt_service.get_debt_insights()


# --- List / Create ---

@router.get("")
def list_debts(status: Optional[str] = Query(None, pattern=r'^(active|paid_off|paused)$')):
    return debt_service.get_all(status_filter=status)


@router.post("", status_code=201)
def create_debt(dto: DebtCreate):
    return debt_service.create(dto)


# --- Single debt routes ---

@router.get("/{debt_id}")
def get_debt(debt_id: int):
    debt = debt_service.get_by_id(debt_id)
    if not debt:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Debt not found"}},
        )
    return debt


@router.put("/{debt_id}")
def update_debt(debt_id: int, dto: DebtUpdate):
    debt = debt_service.update(debt_id, dto)
    if not debt:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Debt not found"}},
        )
    return debt


@router.delete("/{debt_id}", status_code=204)
def delete_debt(debt_id: int):
    deleted = debt_service.delete(debt_id)
    if not deleted:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Debt not found"}},
        )


@router.post("/{debt_id}/payments", status_code=201)
def add_payment(debt_id: int, dto: DebtPaymentCreate):
    result = debt_service.add_payment(debt_id, dto)
    if not result:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Debt not found"}},
        )
    return result


@router.get("/{debt_id}/payments")
def get_payments(debt_id: int):
    payments = debt_service.get_payments(debt_id)
    if payments is None:
        raise HTTPException(
            status_code=404,
            detail={"error": {"code": "NOT_FOUND", "message": "Debt not found"}},
        )
    return payments
